"""
Synthetic Indian financial scam/legit message dataset generator.

Outputs CSV: scripts/data/synthetic_scams.csv
Columns: text, has_link, has_vpa, urgency_flags, label (safe/suspicious/high_risk)

Run: python scripts/generate_synthetic_scams.py [n]
"""

import csv
import random
import re
import sys
from pathlib import Path

try:
    from faker import Faker
except ImportError:
    sys.exit("pip install faker")

fake = Faker("en_IN")
Faker.seed(42)
random.seed(42)

OUT = Path(__file__).parent / "data" / "synthetic_scams.csv"

BANKS = ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak", "PNB", "BOB", "Yes Bank"]
MERCHANTS = ["Amazon India", "Flipkart", "Swiggy", "Zomato", "BigBasket", "Myntra", "IRCTC", "Paytm"]
BURNER_TLDS = [".xyz", ".top", ".online", ".info", ".click", ".site", ".work"]
VERIFIED = ["onlinesbi.sbi", "hdfcbank.com", "icicibank.com", "axisbank.com", "kotak.com"]
PSPS = ["okicici", "okaxis", "ybl", "paytm", "upi", "okhdfcbank", "oksbi"]
GOV_WORDS = ["gov", "tax", "refund", "incometax", "cyber", "helpdesk", "support"]
PS = ["@okicici", "@ybl", "@paytm", "@okaxis", "@upi"]
HINGLISH = [
    ("update karo", "update now"), ("paisa bhejo", "send money"),
    ("turant karo", "act immediately"), ("jaldi karo", "do it fast"),
    ("warna account band", "or account will be closed"),
]
TYPOS = [("your", "youre"), ("account", "acount"), ("verify", "verfiy"),
         ("immediately", "immediatly"), ("urgent", "urgnt")]

URGENCY_RE = re.compile(
    r"\b(urgent(ly)?|immediat\w*|act now|right now|jaldi|turant|last chance|expires? (today|now)|final (warning|notice)|within \d+ (hours?|mins?|minutes))\b",
    re.IGNORECASE,
)


def amount(a=None, b=None):
    return f"{random.randint(a or 10, b or 99999):,}"


def _noise(text: str, p=0.25) -> str:
    """Defanged URLs, Hinglish swaps, typos — randomly applied."""
    if random.random() < p and ("http" in text):
        text = text.replace("http", random.choice(["hxxp", "hxxps"]))
        text = re.sub(r"\.(?=[a-z]{2,4}/|\b)", "[.]", text, count=1)
    if random.random() < p:
        en, hi = random.choice(HINGLISH)
        text = text.replace(en, hi)
    if random.random() < p:
        correct, typo = random.choice(TYPOS)
        text = text.replace(correct, typo, 1)
    return text


# ── Legitimate templates ─────────────────────────────────────────────

def gen_otp():
    bank = random.choice(BANKS + MERCHANTS)
    return f"{random.randint(100000, 999999)} is your secret OTP for transaction of Rs {amount(100, 50000)} at {bank}. Do NOT share this OTP with anyone."


def gen_debit_alert():
    bank = random.choice(BANKS)
    return (f"ALERT: Rs {amount(100, 50000)} debited from A/C XX{random.randint(1000, 9999)} "
            f"on {fake.date_this_month():%d-%m} via UPI. If not done by you, call {bank} helpline "
            f"1800-{random.randint(100, 999)}-{random.randint(1000, 9999)}. Info: https://www.{random.choice(VERIFIED)}/help")


def gen_credit_alert():
    bank = random.choice(BANKS)
    return f"Rs {amount(500, 100000)} credited to your {bank} A/C XX{random.randint(1000, 9999)} on {fake.date_this_month():%d-%m}. UPI Ref No {random.randint(10**11, 10**12 - 1)}."


def gen_delivery():
    m = random.choice(MERCHANTS)
    return (f"Your {m} order for Rs {amount(199, 9999)} is out for delivery and will arrive "
            f"today by {random.randint(2, 9)} PM. Track: https://www.{m.split()[0].lower()}.com/track")


def gen_balance():
    bank = random.choice(BANKS)
    return f"Your {bank} A/C XX{random.randint(1000, 9999)} balance is Rs {amount(100, 900000)} as on {fake.date_this_month():%d-%m} {fake.time(pattern='%I:%M %p')} IST."


LEGIT = [gen_otp, gen_debit_alert, gen_credit_alert, gen_delivery, gen_balance]

# ── Malicious templates ──────────────────────────────────────────────

def gen_kyc_phish():
    bank = random.choice(BANKS)
    tld = random.choice(BURNER_TLDS)
    brand = random.choice(["sbi", "hdfc", "icici", "axis", "kotak"]).replace(" ", "")
    return (f"Dear Customer, your {bank} KYC has expired. Update within 24 hours "
            f"to avoid account suspension: http://{brand}-kyc-verify{tld}/update")


def gen_extortion():
    name = fake.name().split()[0]
    return (f"This is Cyber Cell Delhi. A cyber warrant has been issued against {name} "
            f"for illegal activity. Pay Rs {amount(5000, 50000)} immediately to close the case "
            f"or face arrest within 2 hours. Call officer {fake.name()} at {fake.phone_number()[:10]}.")


def gen_job_trap():
    return (f"WORK FROM HOME! Earn Rs {amount(2000, 8000)}/day. No experience needed. "
            f"Only Rs {random.randint(99, 499)} registration fee to start. "
            f"WhatsApp {fake.phone_number()[:10]} ASAP. Limited seats!")


def gen_upi_collect():
    word = random.choice(GOV_WORDS)
    psp = random.choice(PSPS)
    return (f"Government refund of Rs {amount(1000, 25000)} pending. Approve the collect request "
            f"from {word}-refund-dept{psp} to receive your money today.")


def gen_lottery():
    return (f"CONGRATULATIONS! You have WON Rs {amount(50000, 1000000)} in the "
            f"{random.choice(['KBC', 'Diwali', 'Jio', 'Airtel'])} lucky draw! "
            f"Claim before midnight: {random.choice(['http://bit.ly/', 'http://tinyurl.com/'])}{fake.lexify('????????')}")


def gen_parcel_scam():
    return (f"Your parcel containing 1 iPhone is held at customs. Pay customs fee of Rs "
            f"{random.randint(1500, 8000)} to {random.choice(['fedex', 'bluedart', 'dhl'])}-support"
            f"{random.choice(PS)} to release delivery today.")


def gen_otp_phish():
    bank = random.choice(BANKS)
    return (f"{bank}: Someone is trying to log into your account. If this was not you, "
            f"share the OTP you received to verify your identity and block them. Urgent!")


def gen_loan_bait():
    tld = random.choice(BURNER_TLDS)
    return (f"Get instant loan of Rs {amount(50000, 500000)} approved in 5 minutes! "
            f"No documents. 0% interest for 3 months. Apply: http://instant-loan-apni{tld} "
            f"Processing fee Rs {random.randint(99, 999)} only.")


# label: suspicious = ambiguous/pressure but no hard attack; high_risk = clear attack
MALICIOUS = [
    (gen_kyc_phish, "high_risk"), (gen_extortion, "high_risk"), (gen_job_trap, "high_risk"),
    (gen_upi_collect, "high_risk"), (gen_lottery, "high_risk"), (gen_parcel_scam, "high_risk"),
    (gen_otp_phish, "suspicious"), (gen_loan_bait, "suspicious"),
]


def main(n=5000):
    rows = []
    # ~55% legit, ~45% malicious (weighted toward hard cases for training)
    for _ in range(int(n * 0.55)):
        rows.append((random.choice(LEGIT)(), "safe"))
    for _ in range(n - len(rows)):
        fn, label = random.choice(MALICIOUS)
        rows.append((fn(), label))
    random.shuffle(rows)

    out = []
    for text, label in rows:
        text = _noise(text) if label != "safe" or random.random() < 0.15 else text
        has_link = bool(re.search(r"https?://|hxxps?://|www\.|\[.\]", text, re.I))
        has_vpa = bool(re.search(r"@[a-z]{2,}", text, re.I))
        out.append({
            "text": text,
            "has_link": has_link,
            "has_vpa": has_vpa,
            "urgency_flags": len(URGENCY_RE.findall(text)),
            "label": label,
        })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["text", "has_link", "has_vpa", "urgency_flags", "label"])
        w.writeheader()
        w.writerows(out)

    from collections import Counter
    print(f"[OK] {len(out)} rows -> {OUT}")
    print(Counter(r["label"] for r in out))


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 5000)
