"""
InSightAI v2 — evidence-rich unstructured synthetic data generator.

Consumes INJECTED_EVENTS from generate_structured_data.py and emits:
  data/raw/unstructured_data.jsonl
  data/raw/unstructured_ground_truth.jsonl

The output remains compatible with the current SLM input contract:
source_id, source_type, date, region, product_category, channel, raw_input.

Unlike the old generator, each event produces:
- multiple independent source types
- concrete entities (SKU, warehouse, campaign, ticket/PO IDs)
- quantitative facts
- timestamps spread across the event
- corroborating evidence
- explicit negative/control evidence
- realistic background records
- varied language instead of repeated one-line templates

Ground truth is never included in raw_input.
"""

import json
import random
from datetime import date, datetime, timedelta
from pathlib import Path

from generate_structured_data import (
    CATEGORIES,
    INJECTED_EVENTS,
    REGIONS,
    SKUS,
    WAREHOUSE,
    START_DATE,
    N_DAYS,
)

RNG_SEED = 2027
random.seed(RNG_SEED)

ROOT = Path(__file__).parent
OUT_DIR = ROOT / "data" / "raw"
OUT_DIR.mkdir(parents=True, exist_ok=True)

SOURCE_DISTRIBUTION = {
    "shipment_delay": ["ticket", "slack", "news", "review"],
    "marketing_spend_increase": ["slack", "social", "review", "news"],
    "ambiguous": ["review", "ticket", "social", "news"],
    "price_increase": ["ticket", "review", "social", "slack"],
    "stockout": ["ticket", "slack", "review", "news"],
    "competitor_promo": ["social", "review", "news", "slack"],
    "organic_viral_demand": ["social", "review", "news", "slack"],
    "quality": ["ticket", "review", "slack", "social"],
    "website_outage": ["ticket", "slack", "social", "news"],
    "paid_campaign": ["slack", "social", "review", "news"],
    "sparse_history": ["slack", "review", "news"],
}

def rand_day(event):
    span = (event["end"] - event["start"]).days
    return event["start"] + timedelta(days=random.randint(0, max(span, 0)))

def iso_dt(d):
    return f"{d.isoformat()}T{random.randint(8,20):02d}:{random.randint(0,59):02d}:00"

def sku_for(category):
    return random.choice(SKUS[category])

def choose_source(cause):
    return random.choice(SOURCE_DISTRIBUTION.get(cause, ["ticket", "review", "social"]))

def event_facts(event):
    category = event["category"]
    region = event["region"]
    sku = sku_for(category)
    warehouse = WAREHOUSE[region]
    return {
        "sku": sku,
        "warehouse": warehouse,
        "campaign_id": f"CAMP-{event['id']}",
        "po_id": f"PO-{random.randint(41000, 49999)}",
        "competitor": "Competitor_A",
    }

def render(event, source_type, d, facts):
    cause = event["true_cause"]
    region = event["region"]
    category = event["category"]
    sku = facts["sku"]
    warehouse = facts["warehouse"]

    if cause == "shipment_delay":
        variants = {
            "ticket": [
                f"Order {random.randint(81000,99999)} for {sku} was dispatched but has not moved from {warehouse} for {random.randint(4,8)} days. Support said the regional outbound queue is backed up.",
                f"Customer requested cancellation after a delivery estimate slipped by {random.randint(4,7)} days. Tracking still shows the parcel at {warehouse}.",
            ],
            "slack": [
                f"Ops update: {warehouse} backlog is now {random.randint(280,520)} orders above normal. Carrier pickup capacity is constrained; average handoff time is about {random.uniform(2.5,4.5):.1f} days.",
                f"Regional dispatch queue for {category} is elevated. We are manually prioritising older orders because the carrier is short on pickup capacity.",
            ],
            "news": [
                f"Parcel operators reported temporary capacity constraints affecting outbound movement through the {region} corridor. The disruption is expected to be short-lived.",
                f"A regional carrier notice warned of processing delays around {region}; merchants using the affected hub may see longer delivery times.",
            ],
            "review": [
                f"The {category} item itself is good, but delivery to {region} took nearly twice the promised time.",
                f"Several buyers mention unusually long delivery times this week; one said the order remained at the regional hub for days.",
            ],
        }
        return random.choice(variants[source_type])

    if cause == "marketing_spend_increase":
        variants = {
            "slack": [
                f"Campaign {facts['campaign_id']} launched in {region}. Digital spend is roughly 2x the prior weekly level and landing-page traffic is up materially.",
                f"Marketing reports a large reach increase for {facts['campaign_id']}; the team expects incremental demand for {category} this week.",
            ],
            "social": [
                f"I keep seeing the new campaign for {category} in {region}; finally clicked through to the product page.",
                f"The new promotion is showing up repeatedly in my feed and pushed me to check out {category}.",
            ],
            "review": [
                f"I purchased this {category} after seeing the new online campaign several times this week.",
                f"The promotional offer was the reason I decided to try this product.",
            ],
            "news": [
                f"The retailer increased digital promotional activity in {region}, with a new campaign targeting {category}.",
                f"A new digital campaign is receiving substantially more reach than the retailer's prior campaign in the region.",
            ],
        }
        return random.choice(variants[source_type])

    if cause == "ambiguous":
        variants = {
            "review": [
                f"The {category} item is okay, but the finish feels a little worse than my previous purchase.",
                f"Not a serious quality problem, but I noticed a minor issue with the {category} product.",
            ],
            "ticket": [
                f"Customer says the product is usable but has a minor finish/stitching issue. They also mention a cheaper alternative elsewhere.",
                f"Customer is considering another seller because of a small price gap; no major product defect reported.",
            ],
            "social": [
                f"Seeing some mixed comments about {category} quality in {region}, but nothing looks widespread yet.",
                f"A few people are comparing this category unfavorably with another retailer's current offer.",
            ],
            "news": [
                f"Competitive pricing in {category} appears somewhat more aggressive this period, although no major market disruption is reported.",
            ],
        }
        return random.choice(variants[source_type])

    if cause == "price_increase":
        variants = {
            "ticket": [
                f"Customer noticed the {sku} price is about 18% higher than last month and says they may postpone the purchase.",
                f"Customer asks why the {category} price increased; they are considering a lower-priced alternative.",
            ],
            "review": [
                f"The product is fine, but the new price makes it harder to justify buying again.",
                f"I would have reordered, but the price is noticeably higher than before.",
            ],
            "social": [
                f"People in {region} are discussing the higher price of {category} and comparing alternatives.",
                f"The price jump is getting more attention than the product itself this week.",
            ],
            "slack": [
                f"Pricing team confirms a list-price increase of roughly 18% for {category} in {region}; no logistics or inventory incident is active.",
                f"Regional pricing was changed this week. Marketing allocation is unchanged and stock coverage remains normal.",
            ],
        }
        return random.choice(variants[source_type])

    if cause == "stockout":
        variants = {
            "ticket": [
                f"{sku} has shown out of stock in {region} repeatedly. Customer placed an order and it was cancelled after payment.",
                f"Customer cannot purchase {sku}; the product page says unavailable and support has no confirmed restock date.",
            ],
            "slack": [
                f"Inventory alert: {sku} at {warehouse} is down to roughly {random.randint(0,40)} sellable units. Supplier component shortage is delaying replenishment.",
                f"Supply planning says the next inbound shipment for {sku} is late because a component is unavailable. Sellable inventory is nearly exhausted.",
            ],
            "review": [
                f"I wanted to buy {sku}, but it has been unavailable in my area for several days.",
                f"The product looks good, but I could not order because it was out of stock.",
            ],
            "news": [
                f"Suppliers are reporting a temporary component shortage affecting some {category} products.",
                f"A supplier disruption is limiting availability of selected {category} components in the region.",
            ],
        }
        return random.choice(variants[source_type])

    if cause == "competitor_promo":
        variants = {
            "social": [
                f"{facts['competitor']} is advertising roughly 35–40% off comparable {category} products in {region}.",
                f"I switched to {facts['competitor']} this week because their {category} offer is substantially cheaper.",
            ],
            "review": [
                f"The product is fine, but {facts['competitor']}'s current deal made me choose them instead.",
                f"I was ready to buy, then saw a much larger discount from {facts['competitor']}.",
            ],
            "news": [
                f"{facts['competitor']} launched an aggressive regional promotion in {region} for {category}.",
                f"Competitive pricing has intensified in {region}; {facts['competitor']} is offering a deep temporary discount.",
            ],
            "slack": [
                f"Competitive intelligence: {facts['competitor']} promotion is active in {region}; observed discount is around 38%.",
                f"Sales team is reporting lost deals to {facts['competitor']} during the current promotional period.",
            ],
        }
        return random.choice(variants[source_type])

    if cause == "organic_viral_demand":
        variants = {
            "social": [
                f"This {category} product is suddenly all over my feed. I was not planning to buy it, but I ordered after seeing several posts.",
                f"Organic discussion around {category} has exploded this week; multiple creators are mentioning the product without a paid campaign.",
            ],
            "review": [
                f"I bought this after a friend sent me a video about it. I had not seen the product before this week.",
                f"The product suddenly seems to be everywhere online, which convinced me to try it.",
            ],
            "news": [
                f"Online attention around the {category} product has increased sharply in {region}, driven mainly by organic social discussion.",
                f"Consumer interest in the product has risen rapidly without a corresponding change in paid advertising.",
            ],
            "slack": [
                f"Analytics note: organic traffic for {category} is up sharply in {region}; paid media spend is approximately flat versus the prior week.",
                f"Social listening shows a sudden rise in unpaid mentions. No major paid-media change is recorded for the region.",
            ],
        }
        return random.choice(variants[source_type])

    if cause == "quality":
        variants = {
            "ticket": [
                f"Multiple customers report a similar defect on {sku}; one batch appears to have a loose component and return requests are increasing.",
                f"Support has received repeated complaints about a manufacturing defect affecting recent {sku} orders.",
            ],
            "review": [
                f"Several recent reviews mention the same defect on this {category} product, unlike older reviews.",
                f"The latest batch seems less reliable; I experienced the same issue described by other buyers.",
            ],
            "slack": [
                f"Quality team flagged an elevated defect rate for {sku}. Returns for this SKU are above normal and a batch review is underway.",
                f"Customer experience reports a cluster of complaints tied to the latest {sku} production batch.",
            ],
            "social": [
                f"People are starting to discuss a recurring defect in this {category} product.",
                f"I have seen several posts about the same issue with the latest batch.",
            ],
        }
        return random.choice(variants[source_type])

    if cause == "website_outage":
        variants = {
            "ticket": [
                f"Customer reports repeated checkout failures in {region}; product pages load, but payment submission errors out.",
                f"Several customers say they can browse {category} but cannot complete checkout.",
            ],
            "slack": [
                f"Incident update: checkout error rate in {region} peaked at {random.randint(18,35)}% between {random.randint(11,15)}:00 and {random.randint(16,20)}:00.",
                f"Web operations is investigating elevated payment failures. Traffic volume is normal but conversion has fallen sharply.",
            ],
            "social": [
                f"Is anyone else unable to complete checkout in {region}? The site keeps failing after payment.",
                f"Browsing works, but checkout appears broken for several users.",
            ],
            "news": [
                f"The retailer experienced a short-lived checkout incident affecting some customers in {region}.",
            ],
        }
        return random.choice(variants[source_type])

    if cause == "paid_campaign":
        variants = {
            "slack": [
                f"Campaign {facts['campaign_id']} is live in {region}. Paid impressions are up materially and the team is seeing higher click-through rates.",
                f"Performance report: {facts['campaign_id']} increased paid traffic and conversions for {category}; organic traffic is broadly unchanged.",
            ],
            "social": [
                f"The sponsored campaign for {category} has been appearing frequently in my feed and led me to click through.",
                f"I saw the sponsored offer several times and ended up purchasing the product.",
            ],
            "review": [
                f"I first noticed this product through the retailer's sponsored campaign.",
                f"The promotion I saw online was what convinced me to try this product.",
            ],
            "news": [
                f"The retailer has launched a coordinated paid campaign for {category} in {region}.",
            ],
        }
        return random.choice(variants[source_type])

    # sparse_history
    variants = {
        "slack": [
            f"New {category} line launched in {region}; this product family has no comparable pre-launch history in the current dataset.",
            f"Launch tracking for {category} begins mid-March. Treat year-over-year and long trailing-baseline comparisons as unavailable.",
        ],
        "review": [
            f"First impressions of the new {category} line are starting to appear; there is not enough history to compare with prior periods.",
            f"Early buyers are reviewing the new product, but it is too new to judge a stable demand baseline.",
        ],
        "news": [
            f"The retailer introduced a new {category} line in {region} during March.",
        ],
    }
    return random.choice(variants[source_type])

def make_record(source_id, event, source_type, d, facts):
    return {
        "source_id": source_id,
        "source_type": source_type,
        "date": iso_dt(d),
        "region": event["region"],
        "product_category": event["category"],
        "channel": {
            "ticket": "customer_support",
            "review": "review",
            "social": "social",
            "slack": "internal",
            "news": "external",
        }[source_type],
        "raw_input": render(event, source_type, d, facts),
    }

def make_background(source_id, d):
    region = random.choice(REGIONS)
    category = random.choice(CATEGORIES)
    templates = [
        f"Customer says the {category} product arrived on time and matched expectations.",
        f"Support answered a routine return-policy question for a {category} order.",
        f"Warehouse team reports normal outbound processing for {category} in {region}.",
        f"Customer likes the product quality and did not report any delivery problem.",
        f"Routine weekly operations review: no material issue reported for {category} in {region}.",
        f"Buyer asks whether the {category} item is available in another size or color.",
        f"Product page received normal traffic with no unusual checkout complaints.",
    ]
    source_type = random.choice(["ticket", "review", "social", "slack"])
    return {
        "source_id": source_id,
        "source_type": source_type,
        "date": iso_dt(d),
        "region": region,
        "product_category": category,
        "channel": {
            "ticket": "customer_support",
            "review": "review",
            "social": "social",
            "slack": "internal",
        }[source_type],
        "raw_input": random.choice(templates),
    }

def generate():
    records = []
    truth = []
    counter = 10000

    for event in INJECTED_EVENTS:
        facts = event_facts(event)
        # 8–12 records per source family, rather than one template repeated many times.
        counts = {"ticket": 7, "review": 7, "social": 7, "slack": 6, "news": 4}
        for source_type, count in counts.items():
            if source_type not in SOURCE_DISTRIBUTION.get(event["true_cause"], []):
                continue
            for _ in range(count):
                counter += 1
                d = rand_day(event)
                record = make_record(f"U{counter}", event, source_type, d, facts)
                records.append(record)
                truth.append({
                    "source_id": record["source_id"],
                    "signal_theme": event["true_cause"],
                    "region": event["region"],
                    "product_category": event["category"],
                    "source_type": source_type,
                    "ground_truth_event": event["id"],
                })

    # Negative controls: enough noise to make retrieval meaningful.
    for _ in range(500):
        counter += 1
        d = START_DATE + timedelta(days=random.randint(0, N_DAYS - 1))
        record = make_background(f"U{counter}", d)
        records.append(record)
        truth.append({
            "source_id": record["source_id"],
            "signal_theme": None,
            "region": record["region"],
            "product_category": record["product_category"],
            "source_type": record["source_type"],
            "ground_truth_event": None,
        })

    records.sort(key=lambda r: r["date"])

    input_path = OUT_DIR / "unstructured_data.jsonl"
    truth_path = OUT_DIR / "unstructured_ground_truth.jsonl"

    with input_path.open("w", encoding="utf-8") as f:
        for row in records:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    with truth_path.open("w", encoding="utf-8") as f:
        for row in truth:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"wrote {len(records):,} records -> {input_path}")
    print(f"wrote {len(truth):,} labels -> {truth_path}")

if __name__ == "__main__":
    generate()
