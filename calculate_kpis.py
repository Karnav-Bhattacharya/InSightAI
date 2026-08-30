
import json
from datetime import datetime, UTC
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).parent
RAW_DIR = ROOT / "data" / "raw"
OUT_PATH = ROOT / "data" / "kpi_output.json"

ROLLING_WINDOW_DAYS = 14
Z_SCORE_THRESHOLD = 2.5  # |z| above this = statistically unusual
MIN_REVENUE_IMPACT_PCT = 0.15  # revenue must also deviate >=15% from its
                                 # trailing baseline to count as material --
                                 # materiality = statistical significance AND
                                 # business impact, not statistics alone


# ---------------------------------------------------------------------------
# Load
# ---------------------------------------------------------------------------
def load_sales() -> pd.DataFrame:
    df = pd.read_csv(RAW_DIR / "sales.csv", parse_dates=["date"])
    df = df.sort_values(["region", "product_category", "date"]).reset_index(drop=True)
    return df


def load_marketing() -> pd.DataFrame:
    df = pd.read_csv(RAW_DIR / "marketing.csv", parse_dates=["week_start"])
    return df


# ---------------------------------------------------------------------------
# KPI calculation: rolling baseline + z-score anomaly flagging
# ---------------------------------------------------------------------------
def compute_daily_kpis(sales: pd.DataFrame) -> pd.DataFrame:
    out_frames = []

    for (region, category), grp in sales.groupby(["region", "product_category"]):
        grp = grp.sort_values("date").reset_index(drop=True)

        # trailing window EXCLUDES the current day, so today's value can't
        # contaminate its own baseline (shift(1) before rolling)
        trailing = grp["units_sold"].shift(1).rolling(window=ROLLING_WINDOW_DAYS, min_periods=5)
        grp["units_trailing_avg"] = trailing.mean()
        grp["units_trailing_std"] = trailing.std(ddof=0)

        # z-score of today's units vs trailing baseline
        # guard against std == 0 (constant baseline) -> avoid div-by-zero
        std_safe = grp["units_trailing_std"].replace(0, np.nan)
        grp["units_zscore"] = (grp["units_sold"] - grp["units_trailing_avg"]) / std_safe

        # revenue impact vs trailing baseline, as a % -- this is the
        # "business impact" half of materiality (statistical significance
        # alone isn't enough, per the brief)
        revenue_trailing = grp["revenue"].shift(1).rolling(window=ROLLING_WINDOW_DAYS, min_periods=5).mean()
        grp["revenue_trailing_avg"] = revenue_trailing
        grp["revenue_pct_deviation"] = (
            (grp["revenue"] - grp["revenue_trailing_avg"]) / grp["revenue_trailing_avg"].replace(0, np.nan)
        )

        # week-over-week % change (7 days back, same region+category)
        grp["units_wow_pct_change"] = grp["units_sold"].pct_change(periods=7) * 100
        grp["revenue_wow_pct_change"] = grp["revenue"].pct_change(periods=7) * 100

        # n_history_days: how many prior days of data exist for this
        # region+category as of this row -- used to flag sparse-history cases
        grp["n_history_days"] = np.arange(len(grp))

        out_frames.append(grp)

    result = pd.concat(out_frames, ignore_index=True)
    return result


def flag_material_movements(kpi_df: pd.DataFrame) -> pd.DataFrame:
    """
    A movement is 'material' if BOTH hold (statistical significance AND
    business impact, per the brief -- not statistics alone):
      - |z-score| exceeds threshold, AND
      - revenue deviates from its trailing baseline by >= MIN_REVENUE_IMPACT_PCT
    and there's enough history to trust the baseline (>= 5 trailing days).
    Sparse-history rows (< 5 trailing days) get flagged separately as
    'insufficient_history' rather than silently skipped or falsely flagged.
    """
    df = kpi_df.copy()

    has_baseline = df["units_trailing_std"].notna() & (df["n_history_days"] >= 5)
    is_statistically_unusual = df["units_zscore"].abs() > Z_SCORE_THRESHOLD
    is_business_material = df["revenue_pct_deviation"].abs() >= MIN_REVENUE_IMPACT_PCT
    is_material = has_baseline & is_statistically_unusual & is_business_material
    is_sparse = ~has_baseline

    df["flag_status"] = np.select(
        [is_material, is_sparse],
        ["material_movement", "insufficient_history"],
        default="normal",
    )
    return df


# ---------------------------------------------------------------------------
# Marketing rollup (weekly, region grain -- matches what investigation layer
# needs to cross-check against a flagged sales movement)
# ---------------------------------------------------------------------------
def compute_marketing_weekly(marketing: pd.DataFrame) -> pd.DataFrame:
    weekly = (
        marketing.groupby(["week_start", "region"], as_index=False)
        .agg(total_spend=("spend", "sum"), total_impressions=("impressions", "sum"))
        .sort_values(["region", "week_start"])
    )
    weekly["spend_wow_pct_change"] = weekly.groupby("region")["total_spend"].pct_change() * 100
    return weekly


# ---------------------------------------------------------------------------
# Serialize to system-variable JSON for LangGraph state
# ---------------------------------------------------------------------------
def to_json_safe_records(df: pd.DataFrame) -> list:
    df = df.copy()
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = df[col].dt.strftime("%Y-%m-%d")
    df = df.replace({np.nan: None})
    return df.to_dict(orient="records")


def main():
    sales = load_sales()
    marketing = load_marketing()

    kpi_df = compute_daily_kpis(sales)
    kpi_df = flag_material_movements(kpi_df)
    marketing_weekly = compute_marketing_weekly(marketing)

    flagged = kpi_df[kpi_df["flag_status"] != "normal"].copy()

    print(f"Total daily KPI rows: {len(kpi_df)}")
    print(f"Material movements flagged: {(kpi_df['flag_status'] == 'material_movement').sum()}")
    print(f"Insufficient-history rows flagged: {(kpi_df['flag_status'] == 'insufficient_history').sum()}")

    # collapse consecutive flagged days per region+category into movement
    # windows (cleaner for the investigation agent than one row per day)
    movement_windows = []
    for (region, category), grp in flagged[flagged["flag_status"] == "material_movement"].groupby(
        ["region", "product_category"]
    ):
        grp = grp.sort_values("date")
        dates = pd.to_datetime(grp["date"])
        # split into contiguous runs where gap <= 2 days
        gap = dates.diff().dt.days.fillna(99)
        run_id = (gap > 4).cumsum()  # allow up to a 4-day dip within a movement window
        for _, run in grp.groupby(run_id):
            movement_windows.append({
                "region": region,
                "product_category": category,
                "start_date": run["date"].min().strftime("%Y-%m-%d"),
                "end_date": run["date"].max().strftime("%Y-%m-%d"),
                "peak_abs_zscore": float(run["units_zscore"].abs().max()),
                "avg_units_in_window": float(run["units_sold"].mean()),
                "avg_units_trailing_baseline": float(run["units_trailing_avg"].mean()),
                "direction": "drop" if run["units_zscore"].mean() < 0 else "spike",
                "n_days_flagged": len(run),
            })

    output = {
        "generated_at": datetime.now(UTC).isoformat(),
        "config": {
            "rolling_window_days": ROLLING_WINDOW_DAYS,
            "z_score_threshold": Z_SCORE_THRESHOLD,
        },
        "flagged_movements": movement_windows,
        "kpi_table": to_json_safe_records(kpi_df),
        "marketing_weekly": to_json_safe_records(marketing_weekly),
    }

    with open(OUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nCollapsed into {len(movement_windows)} distinct movement windows:")
    for m in movement_windows:
        print(f"  {m['region']:15s} {m['product_category']:15s} "
              f"{m['start_date']} to {m['end_date']}  "
              f"({m['direction']}, peak|z|={m['peak_abs_zscore']:.2f})")

    print(f"\nWrote system variables -> {OUT_PATH}")


if __name__ == "__main__":
    main()