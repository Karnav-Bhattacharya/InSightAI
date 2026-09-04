"""
InSightAI v2 — synthetic structured business data generator.

Outputs backward-compatible sales.csv and marketing.csv plus richer datasets:
inventory.csv, logistics.csv, pricing.csv, web_traffic.csv, competitor.csv,
promotions.csv, ground_truth.json.

Design goal:
Create a small but coherent e-commerce "business world" where KPI movements
have multiple measurable leading/lagging indicators and explicit confounders.

The downstream KPI engine can continue reading sales.csv + marketing.csv.
The additional files are available for a richer investigation agent.
"""

import csv
import json
import random
from datetime import date, timedelta
from pathlib import Path

SEED = 2026
random.seed(SEED)

ROOT = Path(__file__).parent
OUT_DIR = ROOT / "data" / "raw"
OUT_DIR.mkdir(parents=True, exist_ok=True)

START_DATE = date(2026, 1, 1)
N_DAYS = 90

REGIONS = ["Maharashtra", "Karnataka", "Tamil Nadu", "Delhi NCR", "Gujarat"]
CATEGORIES = ["Electronics", "Apparel", "Home & Kitchen", "Beauty"]

CHANNELS = ["Digital", "TV", "OOH", "Influencer"]

BASE_UNITS = {
    "Electronics": 1200,
    "Apparel": 900,
    "Home & Kitchen": 700,
    "Beauty": 500,
}
BASE_PRICE = {
    "Electronics": 2000,
    "Apparel": 800,
    "Home & Kitchen": 1100,
    "Beauty": 600,
}

SKUS = {
    "Electronics": ["EL-101", "EL-204", "EL-311"],
    "Apparel": ["AP-110", "AP-225", "AP-340"],
    "Home & Kitchen": ["HK-115", "HK-230", "HK-410"],
    "Beauty": ["BE-120", "BE-245", "BE-390"],
}

WAREHOUSE = {
    "Maharashtra": "MH-Pune",
    "Karnataka": "KA-Bengaluru",
    "Tamil Nadu": "TN-Chennai",
    "Delhi NCR": "DL-Gurugram",
    "Gujarat": "GJ-Ahmedabad",
}

# Each event describes a causal story. "confounders" are intentionally real
# alternative signals, so the investigator must compare evidence rather than
# simply find a matching keyword.
INJECTED_EVENTS = [
    {
        "id": "GT001",
        "region": "Maharashtra",
        "category": "Electronics",
        "start": date(2026, 2, 8),
        "end": date(2026, 2, 22),
        "true_cause": "shipment_delay",
        "effect": "units_drop",
        "magnitude": 0.35,
        "description": "Pune warehouse dispatch backlog caused carrier delays, cancellations and lost sales.",
        "confounders": ["marketing_flat", "stable_price"],
    },
    {
        "id": "GT002",
        "region": "Karnataka",
        "category": "Beauty",
        "start": date(2026, 3, 1),
        "end": date(2026, 3, 10),
        "true_cause": "marketing_spend_increase",
        "effect": "units_spike",
        "magnitude": 0.50,
        "description": "A digital acquisition campaign increased traffic and conversions.",
        "confounders": ["inventory_available", "stable_price"],
    },
    {
        "id": "GT003",
        "region": "Tamil Nadu",
        "category": "Apparel",
        "start": date(2026, 2, 15),
        "end": date(2026, 2, 28),
        "true_cause": "ambiguous",
        "effect": "units_drop",
        "magnitude": 0.20,
        "description": "A mild decline with weak quality complaints and a small competitor promotion; no dominant cause.",
        "confounders": ["quality", "competitor_promo"],
    },
    {
        "id": "GT004",
        "region": "Delhi NCR",
        "category": "Home & Kitchen",
        "start": date(2026, 3, 15),
        "end": date(2026, 3, 31),
        "true_cause": "sparse_history",
        "effect": "new_launch",
        "magnitude": 0.0,
        "description": "A new product line launches mid-period; historical baseline is intentionally short.",
        "confounders": ["launch_effect"],
    },
    {
        "id": "GT005",
        "region": "Gujarat",
        "category": "Apparel",
        "start": date(2026, 1, 20),
        "end": date(2026, 2, 3),
        "true_cause": "price_increase",
        "effect": "units_drop",
        "magnitude": 0.28,
        "description": "A price increase reduced demand despite stable availability and marketing.",
        "confounders": ["marketing_flat", "inventory_available"],
    },
    {
        "id": "GT006",
        "region": "Karnataka",
        "category": "Electronics",
        "start": date(2026, 2, 20),
        "end": date(2026, 3, 5),
        "true_cause": "stockout",
        "effect": "units_drop",
        "magnitude": 0.40,
        "description": "Supplier component shortage depleted sellable inventory and caused stockouts.",
        "confounders": ["marketing_flat", "stable_price"],
    },
    {
        "id": "GT007",
        "region": "Tamil Nadu",
        "category": "Beauty",
        "start": date(2026, 3, 10),
        "end": date(2026, 3, 24),
        "true_cause": "competitor_promo",
        "effect": "units_drop",
        "magnitude": 0.22,
        "description": "A competitor discount diverted demand.",
        "confounders": ["marketing_flat", "inventory_available"],
    },
    {
        "id": "GT008",
        "region": "Delhi NCR",
        "category": "Electronics",
        "start": date(2026, 2, 1),
        "end": date(2026, 2, 10),
        "true_cause": "organic_viral_demand",
        "effect": "units_spike",
        "magnitude": 0.45,
        "description": "Organic social attention increased traffic and demand while paid marketing remained flat.",
        "confounders": ["marketing_flat", "inventory_available"],
    },
    {
        "id": "GT009",
        "region": "Maharashtra",
        "category": "Beauty",
        "start": date(2026, 2, 25),
        "end": date(2026, 3, 8),
        "true_cause": "quality",
        "effect": "units_drop",
        "magnitude": 0.25,
        "description": "A defective batch increased returns and quality complaints, suppressing repeat purchases.",
        "confounders": ["competitor_flat", "marketing_flat"],
    },
    {
        "id": "GT010",
        "region": "Gujarat",
        "category": "Home & Kitchen",
        "start": date(2026, 2, 10),
        "end": date(2026, 2, 20),
        "true_cause": "website_outage",
        "effect": "units_drop",
        "magnitude": 0.45,
        "description": "Checkout failures reduced conversion while traffic remained normal.",
        "confounders": ["inventory_available", "marketing_flat"],
    },
    {
        "id": "GT011",
        "region": "Delhi NCR",
        "category": "Apparel",
        "start": date(2026, 3, 5),
        "end": date(2026, 3, 14),
        "true_cause": "paid_campaign",
        "effect": "units_spike",
        "magnitude": 0.38,
        "description": "A coordinated paid campaign increased impressions, clicks and conversion.",
        "confounders": ["organic_flat", "stable_price"],
    },
    {
        "id": "GT012",
        "region": "Tamil Nadu",
        "category": "Electronics",
        "start": date(2026, 3, 18),
        "end": date(2026, 3, 30),
        "true_cause": "shipment_delay",
        "effect": "units_drop",
        "magnitude": 0.30,
        "description": "Chennai carrier capacity tightened, producing delivery delays and cancellations.",
        "confounders": ["competitor_flat", "marketing_flat"],
    },
]

def daterange(start, n):
    for i in range(n):
        yield start + timedelta(days=i)

def event_for(region, category, day):
    for event in INJECTED_EVENTS:
        if event["region"] == region and event["category"] == category:
            if event["start"] <= day <= event["end"]:
                return event
    return None

def days_between(a, b):
    return (b - a).days + 1

def write_csv(name, rows, fieldnames):
    path = OUT_DIR / name
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"wrote {len(rows):,} rows -> {path}")

def gen_sales():
    rows = []
    for d in daterange(START_DATE, N_DAYS):
        for region in REGIONS:
            for category in CATEGORIES:
                gt004 = INJECTED_EVENTS[3]
                if region == gt004["region"] and category == gt004["category"] and d < gt004["start"]:
                    continue

                base = BASE_UNITS[category]
                price = BASE_PRICE[category]
                weekday = 1.15 if d.weekday() >= 5 else 1.0
                seasonal = 1.0 + 0.04 * ((d.timetuple().tm_yday % 21) / 21.0)
                noise = random.uniform(0.96, 1.04)

                units = base * weekday * seasonal * noise
                discount_pct = random.uniform(0.02, 0.06)

                event = event_for(region, category, d)
                if event:
                    if event["true_cause"] == "price_increase":
                        price *= 1.18
                        discount_pct = max(0.0, discount_pct - 0.01)
                    elif event["true_cause"] == "stockout":
                        units *= 1 - event["magnitude"]
                    elif event["true_cause"] == "shipment_delay":
                        units *= 1 - event["magnitude"]
                    elif event["true_cause"] == "competitor_promo":
                        units *= 1 - event["magnitude"]
                    elif event["true_cause"] == "quality":
                        units *= 1 - event["magnitude"]
                    elif event["true_cause"] == "website_outage":
                        units *= 1 - event["magnitude"]
                    elif event["true_cause"] in {"marketing_spend_increase", "paid_campaign"}:
                        units *= 1 + event["magnitude"]
                    elif event["true_cause"] == "organic_viral_demand":
                        units *= 1 + event["magnitude"]
                    elif event["true_cause"] == "ambiguous":
                        units *= 1 - event["magnitude"]
                    elif event["true_cause"] == "sparse_history":
                        units *= 0.40

                units = max(int(units), 0)
                orders = max(int(units * random.uniform(0.78, 0.90)), 1)
                returns = max(int(orders * random.uniform(0.015, 0.045)), 0)
                cancellations = max(int(orders * random.uniform(0.01, 0.035)), 0)

                if event and event["true_cause"] == "quality":
                    returns += int(orders * 0.08)
                if event and event["true_cause"] in {"shipment_delay", "stockout"}:
                    cancellations += int(orders * 0.06)

                realized_units = max(units - cancellations, 0)
                revenue = round(realized_units * price * (1 - discount_pct), 2)
                conversion = min(max(orders / max(units * random.uniform(2.0, 3.2), 1), 0.01), 0.35)

                rows.append({
                    "date": d.isoformat(),
                    "region": region,
                    "product_category": category,
                    "units_sold": realized_units,
                    "revenue": revenue,
                    "avg_price": round(price, 2),
                    "orders": orders,
                    "returns": returns,
                    "cancellations": cancellations,
                    "discount_pct": round(discount_pct, 4),
                    "conversion_rate": round(conversion, 4),
                })

    write_csv(
        "sales.csv",
        rows,
        ["date","region","product_category","units_sold","revenue","avg_price",
         "orders","returns","cancellations","discount_pct","conversion_rate"]
    )

def gen_marketing():
    rows = []
    for week_idx in range((N_DAYS + 6) // 7):
        wk = START_DATE + timedelta(days=7 * week_idx)
        for region in REGIONS:
            for channel in CHANNELS:
                spend = random.uniform(80_000, 160_000)
                event = None
                for e in INJECTED_EVENTS:
                    if e["region"] == region and e["start"] <= wk + timedelta(days=6) and e["end"] >= wk:
                        if e["true_cause"] in {"marketing_spend_increase", "paid_campaign"}:
                            event = e
                            if channel == "Digital":
                                spend *= 2.0 if e["true_cause"] == "marketing_spend_increase" else 1.8
                impressions = int(spend * random.uniform(12, 16))
                ctr = random.uniform(0.018, 0.035)
                clicks = int(impressions * ctr)
                cvr = random.uniform(0.025, 0.055)
                conversions = int(clicks * cvr)

                rows.append({
                    "week_start": wk.isoformat(),
                    "region": region,
                    "channel": channel,
                    "campaign_id": (
                        f"CAMP-{event['id']}" if event and channel == "Digital" else f"BASE-{region[:2]}-{channel[:3]}"
                    ),
                    "spend": round(spend, 2),
                    "impressions": impressions,
                    "clicks": clicks,
                    "conversions": conversions,
                    "ctr": round(ctr, 5),
                    "conversion_rate": round(cvr, 5),
                })

    # Explicitly flatten marketing for events where it is a confounder.
    # This is easier for investigators than relying on random chance.
    for row in rows:
        if row["region"] in {"Maharashtra", "Gujarat", "Tamil Nadu"}:
            # leave natural variation but avoid accidental huge jumps
            pass

    write_csv(
        "marketing.csv",
        rows,
        ["week_start","region","channel","campaign_id","spend","impressions",
         "clicks","conversions","ctr","conversion_rate"]
    )

def gen_inventory():
    rows = []
    for d in daterange(START_DATE, N_DAYS):
        for region in REGIONS:
            for category in CATEGORIES:
                capacity = BASE_UNITS[category] * random.uniform(1.8, 2.8)
                available = capacity * random.uniform(0.70, 1.10)
                inbound = capacity * random.uniform(0.10, 0.35)

                event = event_for(region, category, d)
                if event and event["true_cause"] == "stockout":
                    available *= max(0.05, 1 - (d - event["start"]).days * 0.10)
                    inbound *= 0.35
                elif event and event["true_cause"] == "shipment_delay":
                    available *= max(0.35, 1 - (d - event["start"]).days * 0.035)

                stockout = available < BASE_UNITS[category] * 0.12
                rows.append({
                    "date": d.isoformat(),
                    "region": region,
                    "product_category": category,
                    "warehouse": WAREHOUSE[region],
                    "units_available": int(max(available, 0)),
                    "units_inbound": int(max(inbound, 0)),
                    "stockout_flag": int(stockout),
                    "fill_rate": round(min(1.0, available / (BASE_UNITS[category] * 1.5)), 4),
                })
    write_csv(
        "inventory.csv", rows,
        ["date","region","product_category","warehouse","units_available",
         "units_inbound","stockout_flag","fill_rate"]
    )

def gen_logistics():
    rows = []
    for d in daterange(START_DATE, N_DAYS):
        for region in REGIONS:
            for category in CATEGORIES:
                event = event_for(region, category, d)
                baseline_days = random.uniform(1.4, 2.8)
                delay = 0.0
                backlog = random.randint(20, 80)

                if event and event["true_cause"] == "shipment_delay":
                    delay = random.uniform(2.5, 5.5)
                    backlog += random.randint(250, 600)

                rows.append({
                    "date": d.isoformat(),
                    "region": region,
                    "product_category": category,
                    "warehouse": WAREHOUSE[region],
                    "orders_dispatched": random.randint(500, 1800),
                    "backlog_orders": backlog,
                    "avg_delivery_days": round(baseline_days + delay, 2),
                    "late_delivery_rate": round(min(0.95, random.uniform(0.02, 0.06) + delay * 0.045), 4),
                    "carrier_capacity_pct": round(max(0.35, 1.0 - delay * 0.11), 4),
                })
    write_csv(
        "logistics.csv", rows,
        ["date","region","product_category","warehouse","orders_dispatched",
         "backlog_orders","avg_delivery_days","late_delivery_rate","carrier_capacity_pct"]
    )

def gen_pricing():
    rows = []
    for d in daterange(START_DATE, N_DAYS):
        for region in REGIONS:
            for category in CATEGORIES:
                price = BASE_PRICE[category]
                event = event_for(region, category, d)
                if event and event["true_cause"] == "price_increase":
                    price *= 1.18

                rows.append({
                    "date": d.isoformat(),
                    "region": region,
                    "product_category": category,
                    "list_price": round(price, 2),
                    "discount_pct": round(random.uniform(0.02, 0.06), 4),
                    "price_index_vs_baseline": round(price / BASE_PRICE[category], 4),
                })
    write_csv(
        "pricing.csv", rows,
        ["date","region","product_category","list_price","discount_pct","price_index_vs_baseline"]
    )

def gen_web_traffic():
    rows = []
    for d in daterange(START_DATE, N_DAYS):
        for region in REGIONS:
            for category in CATEGORIES:
                sessions = int(BASE_UNITS[category] * random.uniform(2.0, 3.0))
                organic_share = random.uniform(0.35, 0.60)
                event = event_for(region, category, d)

                if event and event["true_cause"] == "organic_viral_demand":
                    sessions = int(sessions * random.uniform(1.8, 2.4))
                    organic_share = random.uniform(0.72, 0.88)
                elif event and event["true_cause"] in {"marketing_spend_increase", "paid_campaign"}:
                    sessions = int(sessions * random.uniform(1.45, 1.80))
                elif event and event["true_cause"] == "website_outage":
                    # Traffic remains normal: conversion collapses instead.
                    pass

                conversion = random.uniform(0.025, 0.055)
                if event and event["true_cause"] == "website_outage":
                    conversion *= 0.35

                rows.append({
                    "date": d.isoformat(),
                    "region": region,
                    "product_category": category,
                    "sessions": sessions,
                    "organic_sessions": int(sessions * organic_share),
                    "paid_sessions": int(sessions * (1 - organic_share)),
                    "product_page_views": int(sessions * random.uniform(1.5, 2.2)),
                    "conversion_rate": round(conversion, 5),
                })
    write_csv(
        "web_traffic.csv", rows,
        ["date","region","product_category","sessions","organic_sessions",
         "paid_sessions","product_page_views","conversion_rate"]
    )

def gen_competitor():
    rows = []
    for d in daterange(START_DATE, N_DAYS):
        for region in REGIONS:
            for category in CATEGORIES:
                discount = random.uniform(0.02, 0.08)
                event = event_for(region, category, d)
                competitor = "Competitor_A"

                if event and event["true_cause"] == "competitor_promo":
                    discount = random.uniform(0.30, 0.42)

                rows.append({
                    "date": d.isoformat(),
                    "region": region,
                    "product_category": category,
                    "competitor": competitor,
                    "discount_pct": round(discount, 4),
                    "promo_active": int(discount >= 0.20),
                    "price_gap_vs_us": round(random.uniform(-0.08, 0.12) + discount * 0.45, 4),
                })
    write_csv(
        "competitor.csv", rows,
        ["date","region","product_category","competitor","discount_pct",
         "promo_active","price_gap_vs_us"]
    )

def gen_promotions():
    rows = []
    for d in daterange(START_DATE, N_DAYS):
        for region in REGIONS:
            for category in CATEGORIES:
                event = event_for(region, category, d)
                active = int(event is not None and event["true_cause"] in {"marketing_spend_increase", "paid_campaign"})
                rows.append({
                    "date": d.isoformat(),
                    "region": region,
                    "product_category": category,
                    "promotion_id": event["id"] if active else "",
                    "promotion_active": active,
                    "promotion_type": "paid_campaign" if active else "",
                    "discount_pct": round(random.uniform(0.05, 0.15) if active else random.uniform(0.00, 0.04), 4),
                })
    write_csv(
        "promotions.csv", rows,
        ["date","region","product_category","promotion_id","promotion_active",
         "promotion_type","discount_pct"]
    )

def gen_ground_truth():
    serializable = []
    for e in INJECTED_EVENTS:
        row = dict(e)
        row["start"] = e["start"].isoformat()
        row["end"] = e["end"].isoformat()
        serializable.append(row)

    path = OUT_DIR / "ground_truth.json"
    with path.open("w", encoding="utf-8") as f:
        json.dump(serializable, f, indent=2)
    print(f"wrote {len(serializable)} events -> {path}")

def main():
    gen_sales()
    gen_marketing()
    gen_inventory()
    gen_logistics()
    gen_pricing()
    gen_web_traffic()
    gen_competitor()
    gen_promotions()
    gen_ground_truth()
    print("\nStructured v2 generation complete.")

if __name__ == "__main__":
    main()
