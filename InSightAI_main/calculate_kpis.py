import json
from datetime import datetime, UTC
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).parent
RAW_DIR = ROOT / "data" / "raw"
OUT_PATH = ROOT / "data" / "kpi_output.json"

ROLLING_WINDOW_DAYS = 14
Z_SCORE_THRESHOLD = 2.5
MIN_REVENUE_IMPACT_PCT = 0.15
MIN_HISTORY_DAYS = 5

def read_csv(name, dates=()):
    p = RAW_DIR / name
    return pd.read_csv(p, parse_dates=list(dates)) if p.exists() else pd.DataFrame()

def load_data():
    return (
        read_csv("sales.csv", ["date"]),
        read_csv("marketing.csv", ["week_start"]),
        read_csv("inventory.csv", ["date"]),
        read_csv("logistics.csv", ["date"]),
        read_csv("pricing.csv", ["date"]),
        read_csv("web_traffic.csv", ["date"]),
        read_csv("competitor.csv", ["date"]),
        read_csv("promotions.csv", ["date"]),
    )

def compute_daily_kpis(sales):
    frames = []
    for (region, category), grp in sales.groupby(["region", "product_category"]):
        grp = grp.sort_values("date").reset_index(drop=True)
        u = grp["units_sold"].shift(1).rolling(ROLLING_WINDOW_DAYS, min_periods=MIN_HISTORY_DAYS)
        r = grp["revenue"].shift(1).rolling(ROLLING_WINDOW_DAYS, min_periods=MIN_HISTORY_DAYS)
        grp["units_trailing_avg"] = u.mean()
        grp["units_trailing_std"] = u.std(ddof=0)
        grp["revenue_trailing_avg"] = r.mean()
        grp["units_zscore"] = (grp["units_sold"] - grp["units_trailing_avg"]) / grp["units_trailing_std"].replace(0, np.nan)
        grp["revenue_pct_deviation"] = (grp["revenue"] - grp["revenue_trailing_avg"]) / grp["revenue_trailing_avg"].replace(0, np.nan)
        grp["units_wow_pct_change"] = grp["units_sold"].pct_change(7) * 100
        grp["revenue_wow_pct_change"] = grp["revenue"].pct_change(7) * 100
        grp["n_history_days"] = np.arange(len(grp))
        grp["return_rate"] = grp["returns"] / grp["orders"].replace(0, np.nan)
        grp["cancellation_rate"] = grp["cancellations"] / grp["orders"].replace(0, np.nan)
        frames.append(grp)
    return pd.concat(frames, ignore_index=True)

def flag_material_movements(df):
    df = df.copy()
    baseline = df["units_trailing_std"].notna() & (df["n_history_days"] >= MIN_HISTORY_DAYS)
    unusual = df["units_zscore"].abs() > Z_SCORE_THRESHOLD
    material = df["revenue_pct_deviation"].abs() >= MIN_REVENUE_IMPACT_PCT
    df["flag_status"] = np.select(
        [baseline & unusual & material, ~baseline],
        ["material_movement", "insufficient_history"], default="normal")
    return df

def compute_marketing_weekly(marketing):
    if marketing.empty:
        return pd.DataFrame()
    w = (marketing.groupby(["week_start", "region"], as_index=False)
         .agg(total_spend=("spend","sum"), total_impressions=("impressions","sum"),
              total_clicks=("clicks","sum"), total_conversions=("conversions","sum"))
         .sort_values(["region","week_start"]))
    for col, out in [("total_spend","spend_wow_pct_change"),
                     ("total_impressions","impressions_wow_pct_change"),
                     ("total_clicks","clicks_wow_pct_change"),
                     ("total_conversions","conversion_wow_pct_change")]:
        w[out] = w.groupby("region")[col].pct_change() * 100
    return w

def pre_post(df, region, category, start, end):
    if df.empty:
        return {}
    x = df[(df.region == region) & (df.product_category == category)].sort_values("date")
    before = x[x.date < pd.Timestamp(start)].tail(14)
    during = x[(x.date >= pd.Timestamp(start)) & (x.date <= pd.Timestamp(end))]
    result = {}
    for label, frame in [("baseline_14d", before), ("movement", during)]:
        if frame.empty: continue
        nums = frame.select_dtypes(include=[np.number])
        result[label] = {"n_rows": len(frame), **{c: round(float(nums[c].mean()),4) for c in nums.columns}}
    return result

def build_windows(kpi):
    flagged = kpi[kpi.flag_status == "material_movement"]
    out = []
    for (region, category), g in flagged.groupby(["region","product_category"]):
        g = g.sort_values("date")
        run = (g.date.diff().dt.days.fillna(999) > 4).cumsum()
        for _, x in g.groupby(run):
            out.append({
                "region": region, "product_category": category,
                "start_date": x.date.min().strftime("%Y-%m-%d"),
                "end_date": x.date.max().strftime("%Y-%m-%d"),
                "peak_abs_zscore": float(x.units_zscore.abs().max()),
                "avg_units_in_window": float(x.units_sold.mean()),
                "avg_units_trailing_baseline": float(x.units_trailing_avg.mean()),
                "avg_revenue_in_window": float(x.revenue.mean()),
                "avg_revenue_trailing_baseline": float(x.revenue_trailing_avg.mean()),
                "revenue_deviation_pct": float(x.revenue_pct_deviation.mean()*100),
                "direction": "drop" if x.units_zscore.mean() < 0 else "spike",
                "n_days_flagged": len(x),
                "history_days_at_start": int(x.n_history_days.min())
            })
    return out

def add_diagnostics(windows, datasets, marketing_weekly):
    names = ["inventory","logistics","pricing","web_traffic","competitor","promotions"]
    for m in windows:
        d = m["diagnostics"] = {}
        for name, df in zip(names, datasets):
            d[name] = pre_post(df, m["region"], m["product_category"], m["start_date"], m["end_date"])
        if not marketing_weekly.empty:
            mw = marketing_weekly[
                (marketing_weekly.region == m["region"]) &
                (marketing_weekly.week_start <= pd.Timestamp(m["end_date"])) &
                (marketing_weekly.week_start >= pd.Timestamp(m["start_date"]) - pd.Timedelta(days=14))
            ].tail(3)
            d["marketing"] = {"weeks": mw.to_dict("records")}
        hints = []
        inv = d["inventory"]
        if inv.get("baseline_14d") and inv.get("movement"):
            b, v = inv["baseline_14d"].get("units_available"), inv["movement"].get("units_available")
            if b and v is not None:
                if v < b*0.5: hints.append("inventory_available_much_lower")
                if v < b*0.15: hints.append("possible_stockout")
        log = d["logistics"]
        if log.get("baseline_14d") and log.get("movement"):
            b, v = log["baseline_14d"].get("avg_delivery_days"), log["movement"].get("avg_delivery_days")
            if b and v and v > b*1.5: hints.append("delivery_time_elevated")
            b, v = log["baseline_14d"].get("backlog_orders"), log["movement"].get("backlog_orders")
            if b and v and v > b*2: hints.append("dispatch_backlog_elevated")
        pr = d["pricing"].get("movement", {})
        if pr.get("price_index_vs_baseline", 0) > 1.10: hints.append("price_elevated")
        tr = d["web_traffic"]
        if tr.get("baseline_14d") and tr.get("movement"):
            b, v = tr["baseline_14d"].get("sessions"), tr["movement"].get("sessions")
            if b and v and v > b*1.5: hints.append("traffic_elevated")
            b, v = tr["baseline_14d"].get("conversion_rate"), tr["movement"].get("conversion_rate")
            if b and v and v < b*0.6: hints.append("conversion_collapsed")
        cp = d["competitor"].get("movement", {})
        if cp.get("promo_active", 0) >= 0.5: hints.append("competitor_promotion_active")
        m["diagnostic_hints"] = hints

def safe(df):
    if df.empty: return []
    x = df.copy()
    for c in x.columns:
        if pd.api.types.is_datetime64_any_dtype(x[c]): x[c] = x[c].dt.strftime("%Y-%m-%d")
    return x.replace({np.nan: None}).to_dict("records")

def main():
    sales, marketing, inventory, logistics, pricing, traffic, competitor, promotions = load_data()
    if sales.empty: raise FileNotFoundError(f"Missing {RAW_DIR/'sales.csv'}")
    kpi = flag_material_movements(compute_daily_kpis(sales))
    mw = compute_marketing_weekly(marketing)
    windows = build_windows(kpi)
    add_diagnostics(windows, [inventory,logistics,pricing,traffic,competitor,promotions], mw)
    output = {
        "generated_at": datetime.now(UTC).isoformat(),
        "config": {"rolling_window_days":ROLLING_WINDOW_DAYS,"z_score_threshold":Z_SCORE_THRESHOLD,
                   "min_revenue_impact_pct":MIN_REVENUE_IMPACT_PCT,"min_history_days":MIN_HISTORY_DAYS},
        "flagged_movements": windows, "kpi_table": safe(kpi), "marketing_weekly": safe(mw),
        "data_quality": {"sales_rows":len(sales),"marketing_rows":len(marketing),
                         "inventory_rows":len(inventory),"logistics_rows":len(logistics),
                         "pricing_rows":len(pricing),"web_traffic_rows":len(traffic),
                         "competitor_rows":len(competitor),"promotion_rows":len(promotions),
                         "material_movements":len(windows)}
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(output, indent=2, default=str), encoding="utf-8")
    print(f"Material movement windows: {len(windows)}")
    print(f"Wrote: {OUT_PATH}")

if __name__ == "__main__":
    main()
