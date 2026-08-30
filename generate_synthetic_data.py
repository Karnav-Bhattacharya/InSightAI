
import json
import random
from datetime import date, timedelta
from pathlib import Path

RNG_SEED = 42
random.seed(RNG_SEED)

ROOT = Path(__file__).parent
OUT_DIR = Path(__file__).parent / "data" /"raw"
OUT_DIR.mkdir(parents=True, exist_ok=True)

REGIONS = ["Maharashtra", "Karnataka", "Tamil Nadu", "Delhi NCR", "Gujarat"]
CATEGORIES = ["Electronics", "Apparel", "Home & Kitchen", "Beauty"]
CHANNELS = ["Digital", "TV", "OOH", "Influencer"]

START_DATE = date(2026, 1, 1)
N_DAYS = 90  # Jan 1 - Mar 31 2026

BASE_UNITS = {
    "Electronics": 1200, "Apparel": 900, "Home & Kitchen": 700, "Beauty": 500,
}
BASE_PRICE = {
    "Electronics": 2000, "Apparel": 800, "Home & Kitchen": 1100, "Beauty": 600,
}

# ---------------------------------------------------------------------------
# Ground-truth injected anomalies. Each entry defines a real, engineered cause
# for a KPI movement. Keep these SEPARATE from what the pipeline sees at
# runtime -- they only get consulted by the eval script.
# ---------------------------------------------------------------------------
INJECTED_EVENTS = [
    {
        "id": "GT001",
        "region": "Maharashtra",
        "category": "Electronics",
        "start": date(2026, 2, 8),
        "end": date(2026, 2, 22),
        "effect": "units_drop",
        "magnitude": 0.35,  # 35% unit drop
        "true_cause": "shipment_delay",
        "description": "Warehouse dispatch backlog at Pune hub caused delivery delays, "
                        "driving cancellations and a unit sales drop.",
        "marketing_confound": False,  # marketing spend stays flat -> should NOT be top driver
    },
    {
        "id": "GT002",
        "region": "Karnataka",
        "category": "Beauty",
        "start": date(2026, 3, 1),
        "end": date(2026, 3, 10),
        "effect": "units_spike",
        "magnitude": 0.50,  # 50% unit increase
        "true_cause": "marketing_spend_increase",
        "description": "A digital ad spend surge in Bangalore drove a genuine demand spike.",
        "marketing_confound": True,  # marketing spend really does jump here -> should BE top driver
    },
    {
        "id": "GT003",
        "region": "Tamil Nadu",
        "category": "Apparel",
        "start": date(2026, 2, 15),
        "end": date(2026, 2, 28),
        "effect": "units_drop",
        "magnitude": 0.20,  # smaller, ambiguous movement -> intended low-confidence case
        "true_cause": "ambiguous",
        "description": "Small dip with mixed, weak signals (a few quality complaints AND a "
                        "minor competitor promo) -- no single dominant cause. Intended as the "
                        "low-confidence / abstention test case.",
        "marketing_confound": False,
    },
    {
        "id": "GT004",
        "region": "Delhi NCR",
        "category": "Home & Kitchen",
        "start": date(2026, 3, 15),
        "end": date(2026, 3, 31),
        "effect": "new_launch_sparse",
        "magnitude": 0.0,
        "true_cause": "sparse_history",
        "description": "Simulated new product line launch in Delhi NCR with only 16 days of "
                        "history by period end -- intended as the sparse-history test case.",
        "marketing_confound": False,
    },
    {
        "id": "GT005",
        "region": "Gujarat",
        "category": "Apparel",
        "start": date(2026, 1, 20),
        "end": date(2026, 2, 3),
        "effect": "units_drop",
        "magnitude": 0.28,
        "true_cause": "price_increase",
        "description": "A price hike in Gujarat Apparel (unrelated to marketing or shipping) "
                        "drove a demand drop -- tests whether the system correctly attributes "
                        "cause to a pricing/business-lever signal instead of defaulting to ops "
                        "or marketing explanations.",
        "marketing_confound": False,
        "price_confound": True,  # avg_price actually rises in this window
    },
    {
        "id": "GT006",
        "region": "Karnataka",
        "category": "Electronics",
        "start": date(2026, 2, 20),
        "end": date(2026, 3, 5),
        "effect": "units_drop",
        "magnitude": 0.40,
        "true_cause": "stockout",
        "description": "A supplier-side component shortage caused a stockout in Karnataka "
                        "Electronics, distinct from the shipment-delay pattern in GT001 -- tests "
                        "whether the system can tell 'delay' apart from 'unavailable' from "
                        "ticket text alone.",
        "marketing_confound": False,
    },
    {
        "id": "GT007",
        "region": "Tamil Nadu",
        "category": "Beauty",
        "start": date(2026, 3, 10),
        "end": date(2026, 3, 24),
        "effect": "units_drop",
        "magnitude": 0.22,
        "true_cause": "competitor_promo",
        "description": "A competitor's aggressive discount campaign in Tamil Nadu Beauty pulled "
                        "demand away -- an external/competitive cause rather than an internal "
                        "operational one.",
        "marketing_confound": False,
    },
    {
        "id": "GT008",
        "region": "Delhi NCR",
        "category": "Electronics",
        "start": date(2026, 2, 1),
        "end": date(2026, 2, 10),
        "effect": "units_spike",
        "magnitude": 0.45,
        "true_cause": "organic_viral_demand",
        "description": "Organic social buzz (not paid marketing) drove a demand spike in Delhi "
                        "NCR Electronics -- marketing spend stays flat here, so this tests "
                        "whether the system wrongly credits marketing just because a spike "
                        "coincides with some ad activity elsewhere.",
        "marketing_confound": False,
    },
]


def daterange(start, n):
    for i in range(n):
        yield start + timedelta(days=i)


def event_active(event, day):
    return event["start"] <= day <= event["end"]


def find_event(region, category, day):
    for event in INJECTED_EVENTS:
        if event["region"] == region and event["category"] == category and event_active(event, day):
            return event
    return None


# ---------------------------------------------------------------------------
# 1. sales.csv -- daily grain
# ---------------------------------------------------------------------------
def gen_sales():
    rows = []
    for d in daterange(START_DATE, N_DAYS):
        # skip most rows for GT004's region+category before launch to simulate sparse history
        for region in REGIONS:
            for category in CATEGORIES:
                gt004 = INJECTED_EVENTS[3]
                if (region == gt004["region"] and category == gt004["category"]
                        and d < gt004["start"]):
                    continue  # no history before "launch"

                base_units = BASE_UNITS[category]
                price = BASE_PRICE[category]

                # normal weekly seasonality + noise
                weekday_factor = 1.15 if d.weekday() >= 5 else 1.0
                noise = random.uniform(0.92, 1.08)
                units = base_units * weekday_factor * noise


                event = find_event(region, category, d)
                if event:
                    if event.get("price_confound"):
                        price = round(price * 1.18, 2)  # real price hike, drives the drop
                    if event["effect"] == "units_drop":
                        units *= (1 - event["magnitude"])
                    elif event["effect"] == "units_spike":
                        units *= (1 + event["magnitude"])
                    elif event["effect"] == "new_launch_sparse":
                        units *= 0.4  # ramping launch volume

                units = max(int(units), 0)
                revenue = round(units * price, 2)

                rows.append({
                    "date": d.isoformat(),
                    "region": region,
                    "product_category": category,
                    "units_sold": units,
                    "revenue": revenue,
                    "avg_price": price,
                })

    path = OUT_DIR / "sales.csv"
    with open(path, "w") as f:
        f.write("date,region,product_category,units_sold,revenue,avg_price\n")
        for r in rows:
            f.write(f"{r['date']},{r['region']},{r['product_category']},"
                    f"{r['units_sold']},{r['revenue']},{r['avg_price']}\n")
    print(f"wrote {len(rows)} rows -> {path}")


# ---------------------------------------------------------------------------
# 2. marketing.csv -- weekly grain (different cadence than sales)
# ---------------------------------------------------------------------------
def gen_marketing():
    rows = []
    week_starts = [START_DATE + timedelta(days=7 * i) for i in range(N_DAYS // 7 + 1)]
    for wk in week_starts:
        for region in REGIONS:
            for channel in CHANNELS:
                base_spend = random.uniform(80_000, 160_000)
                noise = random.uniform(0.9, 1.1)
                spend = base_spend * noise

                # GT002: real marketing spike, digital only, Karnataka, around March 1-10
                gt002 = INJECTED_EVENTS[1]
                event = find_event(region, "marketing", wk)
                if (region == gt002["region"] and channel == "Digital"
                        and wk <= gt002["start"] <= wk + timedelta(days=6)):
                    spend *= (1 + gt002["magnitude"] + 0.3)  # spend jumps ahead of/with the sales spike

                # GT001: explicitly keep marketing FLAT during the shipment-delay window
                # (already flat by default -- no adjustment needed, this is the point)

                impressions = int(spend * random.uniform(12, 16))
                rows.append({
                    "week_start": wk.isoformat(),
                    "region": region,
                    "channel": channel,
                    "spend": round(spend, 2),
                    "impressions": impressions,
                })

    path = OUT_DIR / "marketing.csv"
    with open(path, "w") as f:
        f.write("week_start,region,channel,spend,impressions\n")
        for r in rows:
            f.write(f"{r['week_start']},{r['region']},{r['channel']},"
                    f"{r['spend']},{r['impressions']}\n")
    print(f"wrote {len(rows)} rows -> {path}")


# ---------------------------------------------------------------------------
# 3. tickets.jsonl -- unstructured, event-level, irregular grain
# ---------------------------------------------------------------------------
SIGNAL_TEMPLATES = {
    "shipment_delay": [
        "Order #{oid} delayed by {n} days, courier says warehouse dispatch backlog in Pune hub.",
        "Still waiting on my order, tracking hasn't moved in {n} days. Very frustrated.",
        "Product itself is fine but shipping took forever, almost cancelled the order twice.",
        "Delivery partner mentioned a backlog at the regional warehouse causing delays.",
        "Requesting refund due to shipment delay of over a week.",
    ],
    "marketing_spend_increase": [
        "Saw your new ad campaign online, decided to finally try the product.",
        "Bought this after seeing it recommended everywhere on social media this week.",
        "Great promo, got a good deal because of the digital ad discount code.",
    ],
    "ambiguous_quality": [
        "Product quality felt slightly below what I expected, minor stitching issue.",
        "Not bad, but a competitor's version seems cheaper right now.",
    ],
    "price_increase": [
        "Price jumped a lot since last month, feels overpriced now, might hold off buying.",
        "Used to buy this every month but the new price isn't worth it anymore.",
        "Noticed the cost went up significantly, switched to a cheaper alternative.",
        "Why did the price increase so much? Same product, way pricier now.",
    ],
    "stockout": [
        "Item shows 'out of stock' every time I check, been weeks now.",
        "Order got cancelled because you ran out of stock after I paid.",
        "Supplier shortage apparently, no restock date given, very disappointing.",
        "Wanted to buy but it's unavailable in my size/region for a while now.",
    ],
    "competitor_promo": [
        "Switched to [competitor] this month, they had a much bigger discount running.",
        "Your competitor is offering 40% off right now, hard to justify buying here instead.",
        "Saw a much better deal elsewhere, went with that instead this time.",
    ],
    "organic_viral_demand": [
        "Everyone on my feed is talking about this product right now, had to get one.",
        "Saw it go viral online, wasn't even planning to buy but couldn't resist.",
        "A friend shared a video about this and now I'm obsessed, ordered immediately.",
    ],
    "noise": [
        "Great product, exactly as described, fast delivery, thanks!",
        "Customer service was helpful when I had a sizing question.",
        "App keeps crashing when I try to check order status.",
        "Packaging could be better, item arrived slightly dented but still usable.",
        "Loved the color options available this season.",
        "Asked about return policy, got a clear and quick answer.",
        "Price seems a bit high compared to last month.",
        "Really happy with the build quality of this purchase.",
    ],
}


def gen_tickets():
    rows = []
    ticket_counter = 10000

    def next_id():
        nonlocal ticket_counter
        ticket_counter += 1
        return f"T{ticket_counter}"

    # Signal tickets for GT001 (shipment delay, Maharashtra, Feb 8-22)
    gt001 = INJECTED_EVENTS[0]
    n_days_gt001 = (gt001["end"] - gt001["start"]).days + 1
    for _ in range(18):
        d = gt001["start"] + timedelta(days=random.randint(0, n_days_gt001 - 1))
        text = random.choice(SIGNAL_TEMPLATES["shipment_delay"]).format(
            oid=random.randint(80000, 99999), n=random.randint(5, 11)
        )
        rows.append({
            "ticket_id": next_id(), "date": d.isoformat(), "region": gt001["region"],
            "channel": random.choice(["customer_support", "review"]), "text": text,
        })

    # Signal tickets for GT002 (marketing-driven, Karnataka, Mar 1-10)
    gt002 = INJECTED_EVENTS[1]
    n_days_gt002 = (gt002["end"] - gt002["start"]).days + 1
    for _ in range(10):
        d = gt002["start"] + timedelta(days=random.randint(0, n_days_gt002 - 1))
        text = random.choice(SIGNAL_TEMPLATES["marketing_spend_increase"])
        rows.append({
            "ticket_id": next_id(), "date": d.isoformat(), "region": gt002["region"],
            "channel": "review", "text": text,
        })

    # Weak/mixed tickets for GT003 (ambiguous, Tamil Nadu, Feb 15-28)
    gt003 = INJECTED_EVENTS[2]
    n_days_gt003 = (gt003["end"] - gt003["start"]).days + 1
    for _ in range(6):
        d = gt003["start"] + timedelta(days=random.randint(0, n_days_gt003 - 1))
        text = random.choice(SIGNAL_TEMPLATES["ambiguous_quality"])
        rows.append({
            "ticket_id": next_id(), "date": d.isoformat(), "region": gt003["region"],
            "channel": random.choice(["customer_support", "review"]), "text": text,
        })

    # Signal tickets for GT005 (price increase, Gujarat Apparel, Jan 20-Feb 3)
    gt005 = INJECTED_EVENTS[4]
    n_days_gt005 = (gt005["end"] - gt005["start"]).days + 1
    for _ in range(12):
        d = gt005["start"] + timedelta(days=random.randint(0, n_days_gt005 - 1))
        text = random.choice(SIGNAL_TEMPLATES["price_increase"])
        rows.append({
            "ticket_id": next_id(), "date": d.isoformat(), "region": gt005["region"],
            "channel": random.choice(["customer_support", "review"]), "text": text,
        })

    # Signal tickets for GT006 (stockout, Karnataka Electronics, Feb 20-Mar 5)
    gt006 = INJECTED_EVENTS[5]
    n_days_gt006 = (gt006["end"] - gt006["start"]).days + 1
    for _ in range(15):
        d = gt006["start"] + timedelta(days=random.randint(0, n_days_gt006 - 1))
        text = random.choice(SIGNAL_TEMPLATES["stockout"])
        rows.append({
            "ticket_id": next_id(), "date": d.isoformat(), "region": gt006["region"],
            "channel": random.choice(["customer_support", "review"]), "text": text,
        })

    # Signal tickets for GT007 (competitor promo, Tamil Nadu Beauty, Mar 10-24)
    gt007 = INJECTED_EVENTS[6]
    n_days_gt007 = (gt007["end"] - gt007["start"]).days + 1
    for _ in range(10):
        d = gt007["start"] + timedelta(days=random.randint(0, n_days_gt007 - 1))
        text = random.choice(SIGNAL_TEMPLATES["competitor_promo"])
        rows.append({
            "ticket_id": next_id(), "date": d.isoformat(), "region": gt007["region"],
            "channel": "review", "text": text,
        })

    # Signal tickets for GT008 (organic viral demand, Delhi NCR Electronics, Feb 1-10)
    gt008 = INJECTED_EVENTS[7]
    n_days_gt008 = (gt008["end"] - gt008["start"]).days + 1
    for _ in range(10):
        d = gt008["start"] + timedelta(days=random.randint(0, n_days_gt008 - 1))
        text = random.choice(SIGNAL_TEMPLATES["organic_viral_demand"])
        rows.append({
            "ticket_id": next_id(), "date": d.isoformat(), "region": gt008["region"],
            "channel": random.choice(["social", "review"]), "text": text,
        })

    # Background noise tickets, spread across everything (mostly unrelated)
    for _ in range(220):
        d = START_DATE + timedelta(days=random.randint(0, N_DAYS - 1))
        region = random.choice(REGIONS)
        text = random.choice(SIGNAL_TEMPLATES["noise"])
        rows.append({
            "ticket_id": next_id(), "date": d.isoformat(), "region": region,
            "channel": random.choice(["customer_support", "review", "social"]), "text": text,
        })

    rows.sort(key=lambda r: r["date"])
    path = OUT_DIR / "tickets.jsonl"
    with open(path, "w") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")
    print(f"wrote {len(rows)} rows -> {path}")


# ---------------------------------------------------------------------------
# 4. ground_truth.json -- eval-only, never fed to the pipeline
# ---------------------------------------------------------------------------
def gen_ground_truth():
    path = OUT_DIR / "ground_truth.json"
    serializable = []
    for ev in INJECTED_EVENTS:
        e = dict(ev)
        e["start"] = ev["start"].isoformat()
        e["end"] = ev["end"].isoformat()
        serializable.append(e)
    with open(path, "w") as f:
        json.dump(serializable, f, indent=2)
    print(f"wrote {len(serializable)} events -> {path}")


if __name__ == "__main__":
    gen_sales()
    gen_marketing()
    gen_tickets()
    gen_ground_truth()
    print("\nDone. Files in data/raw/:")
    for p in sorted(OUT_DIR.iterdir()):
        print(" -", p.name)