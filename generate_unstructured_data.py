import json
import random
from datetime import date, timedelta
from pathlib import Path

from generate_synthetic_data import INJECTED_EVENTS


# ============================================================
# Configuration
# ============================================================

RNG_SEED = 42
random.seed(RNG_SEED)

ROOT = Path(__file__).parent
OUT_DIR = ROOT / "data" / "raw"
OUT_DIR.mkdir(parents=True, exist_ok=True)

START_DATE = date(2026, 1, 1)
N_DAYS = 90

REGIONS = [
    "Maharashtra",
    "Karnataka",
    "Tamil Nadu",
    "Delhi NCR",
    "Gujarat",
]

CATEGORIES = [
    "Electronics",
    "Apparel",
    "Home & Kitchen",
    "Beauty",
]

CHANNELS = [
    "customer_support",
    "review",
    "social",
    "internal",
]


# ============================================================
# Templates
#
# IMPORTANT:
# These templates intentionally DO NOT contain the canonical
# signal label. The SLM has to infer the signal.
# ============================================================

TEMPLATES = {

    # --------------------------------------------------------
    # SHIPMENT DELAY
    # --------------------------------------------------------
    "shipment_delay": {
        "ticket": [
            "My order has been sitting at the regional warehouse for {n} days and the tracking has not changed.",
            "Delivery was supposed to arrive earlier this week but there has been no movement since dispatch.",
            "I am still waiting for my order. Customer support said the regional hub is backed up.",
            "This is the second order this month that has arrived much later than promised.",
            "Please refund the order if it cannot be delivered soon. The tracking has been stuck for days.",
        ],
        "review": [
            "The product is fine but delivery took almost twice as long as expected.",
            "Would have given this a higher rating if shipping had not taken so long.",
            "Several people in my area seem to be waiting much longer for deliveries lately.",
            "The order eventually arrived, but the delay was frustrating.",
        ],
        "slack": [
            "Warehouse lead says outbound batches are piling up at the regional hub.",
            "Carrier pickup capacity looks constrained this week and several orders are waiting for dispatch.",
            "The dispatch queue at the regional warehouse is much larger than normal.",
            "Ops team is manually prioritizing older orders because the outbound queue is backed up.",
        ],
        "news": [
            "Regional logistics operators are reporting temporary capacity constraints affecting parcel movement.",
            "A major delivery provider warned of short-term processing delays at several regional hubs.",
        ],
    },

    # --------------------------------------------------------
    # MARKETING SPEND
    # --------------------------------------------------------
    "marketing_spend_increase": {
        "review": [
            "I first noticed this product because of the new campaign that kept showing up online.",
            "The discount code from the recent promotion convinced me to finally place an order.",
            "I had not heard much about the product before seeing the campaign everywhere this week.",
            "The new online promotion definitely got me interested in trying this.",
        ],
        "social": [
            "Seeing this product all over my feed lately.",
            "That new campaign is everywhere. Finally curious enough to try it.",
            "The ads for this product have been showing up constantly this week.",
            "The promotion convinced me to check out the product.",
        ],
        "slack": [
            "The latest campaign is getting substantially more reach than the previous one.",
            "Marketing has increased campaign activity across digital channels this week.",
            "The new promotion is driving noticeably more traffic into the product pages.",
        ],
    },

    # --------------------------------------------------------
    # QUALITY
    # --------------------------------------------------------
    "ambiguous_quality": {
        "ticket": [
            "The product works, but the build quality feels a little worse than I expected.",
            "There is a small stitching issue that makes the item feel less premium.",
            "I noticed a minor manufacturing issue with the product.",
            "Not a complete failure, but the finish is not as good as previous purchases.",
        ],
        "review": [
            "Quality seems slightly lower than I remember from the previous version.",
            "The product is usable but the finish could definitely be better.",
            "A competitor's version feels better made at a similar price.",
            "Minor quality problems are starting to show up.",
        ],
        "slack": [
            "Support has started receiving a few comments about inconsistent product finish.",
            "Quality team is reviewing several minor complaints about the latest batch.",
            "There are some early reports of inconsistent manufacturing quality.",
        ],
    },

    # --------------------------------------------------------
    # PRICE INCREASE
    # --------------------------------------------------------
    "price_increase": {
        "ticket": [
            "Why is this product so much more expensive than it was last month?",
            "I used to buy this regularly but the new price is making me reconsider.",
            "The same item costs significantly more than it did recently.",
            "I was ready to buy but decided to wait because of the higher price.",
        ],
        "review": [
            "The price increase makes this much harder to justify.",
            "I switched to another option because the price has gone up.",
            "This used to be good value, but the current price feels excessive.",
            "Same product, noticeably higher price than before.",
        ],
        "social": [
            "Has anyone else noticed how much this product costs now?",
            "Prices seem to have jumped recently.",
            "At this price I would rather buy the competitor.",
        ],
        "news": [
            "Retailers are raising prices across several categories amid higher input costs.",
            "Consumers are increasingly comparing prices as product prices rise.",
        ],
    },

    # --------------------------------------------------------
    # STOCKOUT
    # --------------------------------------------------------
    "stockout": {
        "ticket": [
            "This item has been unavailable every time I check.",
            "I paid for the order and then received a cancellation because the item was unavailable.",
            "Can you tell me when this product will actually be back in stock?",
            "The item has been unavailable in my region for weeks.",
            "I had to cancel my purchase because there was no inventory available.",
        ],
        "review": [
            "Would have bought it but it has been unavailable for weeks.",
            "I ended up buying another brand because this one was not available.",
            "The product looks good but finding it in stock is nearly impossible.",
            "Every time I check, the item is unavailable.",
        ],
        "slack": [
            "Inventory for the affected SKU is below safety stock again.",
            "Supplier replenishment has not arrived yet and available units are running low.",
            "Several stores are reporting zero inventory for the product.",
            "The replenishment shipment is later than expected.",
        ],
    },

    # --------------------------------------------------------
    # COMPETITOR PROMOTION
    # --------------------------------------------------------
    "competitor_promo": {
        "review": [
            "I went with another brand because they were offering a much bigger discount.",
            "The competitor had a better deal, so I bought there instead.",
            "It is difficult to justify buying this when another brand is offering a much larger promotion.",
            "I was comparing prices and the competitor won because of their current discount.",
        ],
        "social": [
            "Competitor X has a huge sale going on right now.",
            "The competitor's current discount is hard to ignore.",
            "Everyone seems to be talking about Competitor X's latest promotion.",
            "That competitor deal is much better than what is available here.",
        ],
        "news": [
            "Competitor X announced a major promotional campaign with discounts of up to 40 percent.",
            "Competitor X has launched an aggressive regional promotion this month.",
            "The competitor is increasing promotional activity across the category.",
        ],
    },

    # --------------------------------------------------------
    # ORGANIC VIRAL DEMAND
    # --------------------------------------------------------
    "organic_viral_demand": {
        "review": [
            "I wasn't planning to buy this, but I kept seeing people talking about it and decided to try it.",
            "A friend recommended this after seeing a video about it online.",
            "I bought this because it suddenly seems to be everywhere.",
            "The product became popular very quickly and that convinced me to try it.",
        ],
        "social": [
            "This product is suddenly all over my feed.",
            "Everyone seems to be talking about this right now.",
            "Saw another video about this product and immediately wanted one.",
            "This thing went from unknown to everywhere in just a few days.",
            "My whole feed is talking about this product.",
        ],
        "news": [
            "The product is gaining significant attention on social platforms.",
            "Online discussion around the product has increased sharply in recent days.",
            "The product is seeing a sudden rise in consumer interest.",
        ],
    },
}


# ============================================================
# Background noise
#
# These are intentionally not connected to injected events.
# ============================================================

NOISE_TEMPLATES = {
    "Electronics": [
        "Battery life is exactly as described and delivery was quick.",
        "Customer support helped me with a warranty question.",
        "Setup was straightforward and everything works as expected.",
        "The screen quality is excellent.",
        "The product arrived safely and was easy to configure.",
    ],

    "Apparel": [
        "The fit was exactly as described.",
        "The color looks the same as it did online.",
        "Customer support helped with a sizing question.",
        "The fabric quality is good.",
        "Packaging was slightly creased but the item was fine.",
    ],

    "Home & Kitchen": [
        "The product feels sturdy and works as expected.",
        "Assembly instructions were easy to follow.",
        "Customer service helped with an assembly question.",
        "The build quality is good.",
        "The item arrived safely and works well.",
    ],

    "Beauty": [
        "The product was exactly as described.",
        "I liked the packaging and finish.",
        "Customer support helped with a shade question.",
        "The texture is good and the product works well.",
        "The product arrived quickly and was packaged nicely.",
    ],

    "App/Platform": [
        "The app keeps freezing when I try to check my order.",
        "The website was slow during checkout.",
        "Push notifications for order updates are not working.",
        "The login screen froze and I had to restart the app.",
        "The order-status page took several attempts to load.",
    ],
}


# ============================================================
# Helpers
# ============================================================

def as_date(value):
    """Convert date/datetime/string into a date."""
    if isinstance(value, date):
        return value

    if hasattr(value, "date"):
        return value.date()

    return date.fromisoformat(str(value))


def random_event_date(event):
    start = as_date(event["start"])
    end = as_date(event["end"])

    days = (end - start).days + 1
    return start + timedelta(days=random.randint(0, days - 1))


def random_background_date():
    return START_DATE + timedelta(days=random.randint(0, N_DAYS - 1))


def choose_source(theme):
    """
    Different themes naturally have different source distributions.
    """

    distributions = {
        "shipment_delay": [
            ("ticket", 0.35),
            ("review", 0.20),
            ("slack", 0.35),
            ("news", 0.10),
        ],
        "marketing_spend_increase": [
            ("review", 0.30),
            ("social", 0.40),
            ("slack", 0.30),
        ],
        "ambiguous_quality": [
            ("ticket", 0.40),
            ("review", 0.35),
            ("slack", 0.25),
        ],
        "price_increase": [
            ("ticket", 0.30),
            ("review", 0.30),
            ("social", 0.20),
            ("news", 0.20),
        ],
        "stockout": [
            ("ticket", 0.40),
            ("review", 0.25),
            ("slack", 0.35),
        ],
        "competitor_promo": [
            ("review", 0.25),
            ("social", 0.35),
            ("news", 0.40),
        ],
        "organic_viral_demand": [
            ("review", 0.25),
            ("social", 0.50),
            ("news", 0.25),
        ],
    }

    choices = distributions[theme]

    r = random.random()
    cumulative = 0

    for source_type, probability in choices:
        cumulative += probability
        if r <= cumulative:
            return source_type

    return choices[-1][0]


def make_signal_record(
    source_id,
    event,
    theme,
    source_type,
):
    event_date = random_event_date(event)

    category = event["category"]
    region = event["region"]

    templates = TEMPLATES[theme].get(source_type, [])

    if not templates:
        # fallback to ticket/review if this source has no template
        source_type = random.choice(
            list(TEMPLATES[theme].keys())
        )
        templates = TEMPLATES[theme][source_type]

    text = random.choice(templates)

    # Only some templates need an explicit variable.
    if "{n}" in text:
        text = text.format(
            n=random.randint(4, 11)
        )

    channel_map = {
        "ticket": "customer_support",
        "review": "review",
        "social": "social",
        "slack": "internal",
        "news": "external",
    }

    return {
        "source_id": source_id,
        "source_type": source_type,
        "date": event_date.isoformat(),

        # Known metadata. The SLM does not have to infer these.
        "region": region,
        "product_category": category,

        "channel": channel_map[source_type],

        "raw_input": text,
    }


def make_ground_truth(record, theme):
    """
    Separate evaluation label.

    IMPORTANT:
    This file should NOT be passed to the SLM.
    """

    return {
        "source_id": record["source_id"],
        "signal_theme": theme,
        "region": record["region"],
        "product_category": record["product_category"],
        "source_type": record["source_type"],
    }


def make_noise_record(source_id):
    d = random_background_date()
    region = random.choice(REGIONS)

    # Mostly real product categories, some app/platform noise.
    if random.random() < 0.12:
        category = "App/Platform"
    else:
        category = random.choice(CATEGORIES)

    if category == "App/Platform":
        source_type = random.choice(["ticket", "social"])
    else:
        source_type = random.choice([
            "ticket",
            "review",
            "social",
        ])

    text = random.choice(NOISE_TEMPLATES[category])

    channel_map = {
        "ticket": "customer_support",
        "review": "review",
        "social": "social",
    }

    return {
        "source_id": source_id,
        "source_type": source_type,
        "date": d.isoformat(),
        "region": region,
        "product_category": category,
        "channel": channel_map[source_type],
        "raw_input": text,
    }


# ============================================================
# Main generation
# ============================================================

def generate():
    records = []
    ground_truth = []

    source_counter = 10000

    def next_id():
        nonlocal source_counter
        source_counter += 1
        return f"U{source_counter}"

    # --------------------------------------------------------
    # Event -> semantic theme mapping
    #
    # This assumes the same INJECTED_EVENTS ordering that your
    # current synthetic-data generator uses.
    # --------------------------------------------------------

    event_specs = [
        (0, "shipment_delay", 45),
        (1, "marketing_spend_increase", 35),
        (2, "ambiguous_quality", 30),
        (4, "price_increase", 40),
        (5, "stockout", 45),
        (6, "competitor_promo", 35),
        (7, "organic_viral_demand", 45),
    ]

    # --------------------------------------------------------
    # Generate correlated signal evidence
    # --------------------------------------------------------

    for event_index, theme, count in event_specs:

        event = INJECTED_EVENTS[event_index]

        for _ in range(count):
            source_id = next_id()

            source_type = choose_source(theme)

            record = make_signal_record(
                source_id=source_id,
                event=event,
                theme=theme,
                source_type=source_type,
            )

            records.append(record)

            ground_truth.append(
                make_ground_truth(record, theme)
            )

    # --------------------------------------------------------
    # Generate unrelated background noise
    # --------------------------------------------------------

    for _ in range(300):
        source_id = next_id()

        record = make_noise_record(source_id)

        records.append(record)

        ground_truth.append({
            "source_id": source_id,
            "signal_theme": None,
            "region": record["region"],
            "product_category": record["product_category"],
            "source_type": record["source_type"],
        })

    # --------------------------------------------------------
    # Sort chronologically
    # --------------------------------------------------------

    records.sort(key=lambda x: x["date"])
    ground_truth.sort(key=lambda x: x["source_id"])

    # --------------------------------------------------------
    # Write files
    # --------------------------------------------------------

    input_path = OUT_DIR / "unstructured_data.jsonl"
    truth_path = OUT_DIR / "unstructured_ground_truth.jsonl"

    with open(input_path, "w", encoding="utf-8") as f:
        for row in records:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    with open(truth_path, "w", encoding="utf-8") as f:
        for row in ground_truth:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"Generated {len(records)} unstructured records")
    print(f"  Signal records: {len(records) - 300}")
    print(f"  Noise records: 300")
    print()
    print(f"Input data:")
    print(f"  {input_path}")
    print()
    print(f"Ground truth:")
    print(f"  {truth_path}")


if __name__ == "__main__":
    generate()