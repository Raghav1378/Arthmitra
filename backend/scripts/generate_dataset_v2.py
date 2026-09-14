"""
Synthetic Indian financial scam/legit message dataset generator — v2.

Outputs: scripts/data/synthetic_scams_v2.csv
Columns: text, label, category, language, family, split,
         is_hard_negative, is_adversarial

Design decisions (see engineering report):
- ~20k rows, 75% safe / 10% suspicious / 15% high_risk (realistic imbalance,
  but 5k scam rows is plenty for recall estimation).
- Every row belongs to a template FAMILY made of PHRASING FRAMES. Frames are
  split round-robin (i%3) into train/val/test, so every category appears in
  every split, but test rows use phrasings never seen in train (no frame
  reuse; QC asserts zero normalized-text overlap between train and test).
- Legit families deliberately contain scam-adjacent wording (OTP, KYC,
  verify, urgent, blocked, links) to kill keyword-only false positives.
- All URLs/domains are synthetic or reserved (example.test, burner TLDs,
  real bank domains appear only in LEGIT rows as senders, never as bait).
- Deterministic: seed everything.

Run: python scripts/generate_dataset_v2.py [n]   (from backend/)
"""

import csv
import random
import re
import sys
import unicodedata
from collections import Counter
from datetime import date
from pathlib import Path

SEED = 42
rng = random.Random(SEED)

OUT = Path(__file__).parent / "data" / "synthetic_scams_v2.csv"
TODAY = date.today().isoformat()

# ── shared slots ──────────────────────────────────────────────────────
BANKS = ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak", "PNB", "BOB", "Yes Bank", "IDFC First", "IndusInd"]
MERCHANTS = ["Amazon India", "Flipkart", "Swiggy", "Zomato", "BigBasket", "Myntra", "IRCTC", "Paytm", "PhonePe", "Google Pay", "BookMyShow", "Uber"]
VERIFIED_DOMAINS = ["onlinesbi.sbi", "hdfcbank.com", "icicibank.com", "axisbank.com", "kotak.com", "pnbindia.in", "paytm.com"]
BURNER_TLDS = [".xyz", ".top", ".online", ".info", ".click", ".site", ".work", ".buzz", ".monster"]
FAKE_BRAND = ["sbi", "hdfc", "icici", "axis", "kotak", "paytm", "phonepe", "upi", "npci", "ybl"]
PS_SUFFIX = ["@okicici", "@ybl", "@paytm", "@okaxis", "@upi", "@oksbi", "@okhdfcbank"]
GOV_WORDS = ["gov", "tax", "refund", "incometax", "cyber", "helpdesk", "support", "seva", "kendra"]
UTILITIES = ["BSES", "Tata Power", "MSEDCL", "Adani Electricity", "Indane", "HP Gas"]
COURIERS = ["fedex", "bluedart", "dhl", "delhivery", "ekart"]
INSURERS = ["LIC", "HDFC Life", "ICICI Prudential", "SBI Life", "Star Health"]
TELECOM = ["Airtel", "Jio", "Vi", "BSNL"]
CITIES = ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Pune", "Hyderabad", "Jaipur", "Lucknow", "Patna"]
DEPARTMENTS = ["Cyber Cell", "Income Tax Dept", "Enforcement Directorate", "Mumbai Police", "Narcotics Control"]
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def amt(a=10, b=99999):
    return f"{rng.randint(a, b):,}"


def acc():
    return f"XX{rng.randint(1000, 9999)}"


def refno(n=12):
    return str(rng.randint(10 ** (n - 1), 10 ** n - 1))


def phone():
    return f"{rng.randint(70, 99)}{rng.randint(10, 99)}{rng.randint(100000, 999999)}"


def upi_id(word):
    return f"{word}{rng.choice(PS_SUFFIX)}"


def scam_url(words):
    """Synthetic scam URL: brand-bait words on burner TLD or example.test."""
    if rng.random() < 0.5:
        return f"http://{words}{rng.choice(BURNER_TLDS)}"
    return f"http://{words}.example.test"


# ── noise / adversarial transforms ────────────────────────────────────

ZWSP = "​"
ZWJ = "‍"

HINGLISH_SWAPS = [
    ("update now", "abhi update karo"), ("send money", "paisa bhejo"),
    ("act immediately", "turant karo"), ("do it fast", "jaldi karo"),
    ("or account will be closed", "warna account band ho jayega"),
    ("click the link", "link open karo"), ("verify", "verify karo"),
    ("your account", "aapka account"), ("give the otp", "otp batao"),
    ("refund", "refund"), ("immediately", "abhi ke abhi"),
]

TYPOS = [("your", "ur"), ("account", "accnt"), ("verify", "verlfy"),
         ("immediately", "immediatly"), ("urgent", "urgnt"), ("blocked", "blockd"),
         ("please", "pls"), ("customer", "custmer"), ("suspended", "suspendd"),
         ("expire", "expier"), ("payment", "paymant"), ("transaction", "transacton")]

ABBR = [("before", "b4"), ("you", "u"), ("your", "ur"), ("are", "r"),
        ("thanks", "thx"), ("please", "pls"), ("message", "msg"),
        ("number", "no."), ("okay", "ok"), ("right now", "rn")]

EMOJI = ["⚠️", "🔴", "🚨", "✅", "🎉", "🙏", "💰", "📩", "❗"]


def noise(text, aggressive=False):
    """Apply 1-3 random noise transforms. Returns (text, transform_names)."""
    applied = []
    if rng.random() < 0.25:  # defang URL
        text = text.replace("http", rng.choice(["hxxp", "hxxps"]), 1)
        text = re.sub(r"\.(?=[a-z0-9]{2,6}/|\b)", "[.]", text, count=1)
        applied.append("defang")
    if rng.random() < 0.30:
        en, hi = rng.choice(HINGLISH_SWAPS)
        if en in text.lower():
            text = re.sub(re.escape(en), hi, text, count=1, flags=re.I)
            applied.append("hinglish")
    if rng.random() < 0.35 or aggressive:
        correct, typo = rng.choice(TYPOS if aggressive else ABBR + TYPOS)
        text = re.sub(rf"\b{re.escape(correct)}\b", typo, text, count=1, flags=re.I)
        applied.append("typo")
    if rng.random() < 0.15:
        word = rng.choice(["blocked", "verify", "urgent", "kyc", "otp", "link", "refund"])
        if word in text.lower():
            text = re.sub(re.escape(word), word[0] + ZWSP + word[1:], text, count=1, flags=re.I)
            applied.append("zero-width")
    if rng.random() < 0.12:
        text = rng.choice([text.upper(), text.lower()])
        applied.append("case")
    if rng.random() < 0.12:
        text = f"{rng.choice(EMOJI)} {text} {rng.choice(EMOJI)}"
        applied.append("emoji")
    if rng.random() < 0.10:
        text = text.replace(".", rng.choice(["!!", "...", " !!!"]))
        applied.append("punct")
    if rng.random() < 0.08:  # missing space
        words = text.split()
        if len(words) > 4:
            i = rng.randrange(len(words) - 1)
            words[i] = words[i] + words[i + 1]
            del words[i + 1]
            text = " ".join(words)
            applied.append("nospace")
    if rng.random() < 0.08:  # inserted punctuation inside a word
        word = rng.choice(["verify", "urgent", "click", "account", "kyc"])
        if word in text.lower():
            text = re.sub(re.escape(word), word[:2] + rng.choice([".", "-", "*"]) + word[2:], text, count=1, flags=re.I)
            applied.append("split-word")
    return text, applied


# ── LEGITIMATE families ───────────────────────────────────────────────
# Each entry: (family_id, category, is_hard_negative, make()) -> text
# Several families have explicit Hinglish / Devanagari variants; language is
# chosen per row and recorded.

LEGIT_FAMILIES = []


def legit(family, category, hard=False):
    def deco(fn):
        fn.family, fn.category, fn.hard = family, category, hard
        LEGIT_FAMILIES.append(fn)
        return fn
    return deco


@legit("otp_sms", "legit_otp", hard=True)
def f_otp_sms():
    b = rng.choice(BANKS + MERCHANTS)
    code = rng.randint(100000, 999999)
    return ([
        f"{code} aapka {b} OTP hai Rs {amt(100, 50000)} ke transaction ke liye. Is OTP ko kisi ko share na karein.",
        f"{code} is your OTP for {b} transaction of Rs {amt(100, 50000)}. Valid for 10 mins. Do NOT share it with anyone.",
        f"Use {code} to complete your Rs {amt(100, 50000)} payment at {b}. Never share this OTP, even with bank staff.",
        f"{b}: One Time Password is {code}. Please do not share this with anyone, including {b} employees.",
        f"{code} is your one-time login code for {b}. It expires in 5 minutes. Bank staff will never ask for it.",
    ])


@legit("debit_alert", "legit_debit", hard=True)
def f_debit():
    b = rng.choice(BANKS)
    return ([
        f"ALERT: Rs {amt(100, 50000)} debited from A/C {acc()} on {rng.randint(1, 28):02d}-{rng.choice(MONTHS)} via UPI. Not you? Call {b} helpline 1800-{rng.randint(100, 999)}-{rng.randint(1000, 9999)}. Info: https://www.{rng.choice(VERIFIED_DOMAINS)}/help",
        f"Rs {amt(100, 25000)} spent on your {b} debit card at {rng.choice(MERCHANTS)}. Avl bal Rs {amt(500, 200000)}. Call 1800-{rng.randint(100, 999)}-{rng.randint(1000, 9999)} if unauthorized.",
        f"Debit of Rs {amt(100, 75000)} from your {b} account {acc()}. Ref {refno()}. To block your card call our 24x7 helpline.",
    ])


@legit("credit_alert", "legit_credit")
def f_credit():
    b = rng.choice(BANKS)
    return ([
        f"Rs {amt(500, 100000)} credited to your {b} A/C {acc()} on {rng.randint(1, 28):02d}-{rng.choice(MONTHS)}. UPI Ref No {refno()}.",
        f"Your {b} account {acc()} received Rs {amt(500, 200000)} via NEFT from {rng.choice(['SELF', 'RENT', 'FAMILY', 'ACC PAYMENT'])}. Avl bal Rs {amt(1000, 500000)}.",
        f"Credit alert: Rs {amt(200, 150000)} added to A/C {acc()}. Ref {refno()}. For details check {b} net banking.",
    ])


@legit("salary_credit", "legit_credit", hard=True)
def f_salary():
    b = rng.choice(BANKS)
    return ([
        f"Salary of Rs {amt(35000, 250000)} credited to A/C {acc()} by {rng.choice(['ACCENTURE', 'TCS', 'INFOSYS', 'WIPRO', 'ZUVER SAP'])} on {rng.randint(1, 5):02d}-{rng.choice(MONTHS)}. Avl bal Rs {amt(40000, 400000)}.",
        f"NEFT credit Rs {amt(50000, 400000)} in your {b} account {acc()}. Remarks: SALARY {rng.choice(MONTHS)}.",
    ])


@legit("upi_confirm", "legit_upi", hard=True)
def f_upi_confirm():
    m = rng.choice(MERCHANTS)
    return ([
        f"Rs {amt(20, 3000)} ka payment {m} ko bheja gaya. UPI Ref {refno()}. Koi problem ho to app me report karein.",
        f"Payment of Rs {amt(20, 3000)} to {m} successful. UPI Ref No {refno()}. Balance Rs {amt(100, 50000)}.",
        f"You paid Rs {amt(20, 5000)} via UPI to {m}. Txn ID {refno()}. Not authorized? Report in app immediately.",
        f"UPI transaction of Rs {amt(20, 10000)} completed at {m}. Ref {refno()}. Raise dispute within 24h via the app if needed.",
    ])


@legit("txn_failed", "legit_failed", hard=True)
def f_failed():
    b = rng.choice(BANKS + MERCHANTS)
    return ([
        f"Your payment of Rs {amt(100, 30000)} to {rng.choice(MERCHANTS)} has failed. Amount, if debited, will be auto-refunded within 3 working days. Ref {refno()}.",
        f"Transaction failed: Rs {amt(50, 20000)} could not be processed at {b}. No amount was debited. Do not retry from unverified links.",
        f"Rs {amt(100, 15000)} debited but beneficiary credit pending for Txn {refno()}. Auto-reversal in 5 days. Helpline 1800-{rng.randint(100, 999)}-{rng.randint(1000, 9999)}.",
    ])


@legit("refund_notify", "legit_refund", hard=True)
def f_refund_legit():
    m = rng.choice(MERCHANTS)
    return ([
        f"Refund of Rs {amt(99, 25000)} from {m} processed to your source account. Reflects in 3-5 business days. Ref {refno()}.",
        f"Good news! Your {m} return is approved. Rs {amt(99, 15000)} refund initiated to original payment method. Track in Your Orders.",
        f"Rs {amt(199, 30000)} refund credited to A/C {acc()} for cancelled order {refno(8)}. - {m}",
    ])


@legit("emi_reminder", "legit_emi", hard=True)
def f_emi():
    b = rng.choice(BANKS)
    return ([
        f"{b}: EMI of Rs {amt(2000, 50000)} for Loan A/C {acc()} is due on {rng.randint(1, 28):02d}-{rng.choice(MONTHS)}. Maintain sufficient balance to avoid bounce charges.",
        f"Reminder: your {b} home loan EMI Rs {amt(8000, 60000)} due in {rng.randint(2, 7)} days. Pay via {b} app or branch. No charges on scheduled debit.",
        f"Personal loan EMI Rs {amt(1500, 25000)} will auto-debit from A/C {acc()} on {rng.randint(1, 28):02d}-{rng.choice(MONTHS)}. Ignore if already paid.",
    ])


@legit("kyc_reminder", "legit_kyc", hard=True)
def f_kyc_legit():
    b = rng.choice(BANKS)
    return ([
        f"{b}: aapka KYC renewal pending hai. Kripaya {b} official app ya nearest branch me jaa ke complete karein. Koi link par click na karein.",
        f"{b}: Your KYC verification is pending. Please complete it via the official {b} mobile app or by visiting your nearest branch.",
        f"Dear Customer, re-KYC for your {b} account {acc()} is due by {rng.randint(1, 28):02d}-{rng.choice(MONTHS)}. Visit any branch or use the {b} app. We never send KYC links over SMS.",
        f"Reminder: complete your KYC update at your {b} branch to keep your account active. No fee is charged for re-KYC.",
        f"Your KYC verification is pending. Please use the official {b} application or visit a branch. KYC is always free of charge.",
        f"KYC update reminder: carry your Aadhaar and PAN to any {b} branch, or update from the {b} app's profile section. There is no deadline fee or penalty.",
        f"Action needed: your KYC details need re-verification. Walk into any {b} branch with valid ID, or self-update via video KYC inside the {b} app. Never share documents over WhatsApp.",
        f"Pending KYC on your {b} account. Complete it at your convenience — in-app video KYC takes 5 minutes. No charges, no links, no calls.",
    ])


@legit("security_alert", "legit_security", hard=True)
def f_security():
    b = rng.choice(BANKS)
    return ([
        f"{b}: Aapke account ki suraksha ke liye — OTP ya PIN kisi ko na batayein. Hum kabhi OTP nahi maangte. - {b} Suraksha Alert",
        f"{b} Security Alert: OTP, PIN ya CVV kisi ko share na karein. {b} staff kabhi ye detail nahi maangta. Fraud ho to turant helpline call karein.",
        f"{b} Security Alert: Never share OTP, PIN, CVV or passwords with anyone, even if the caller claims to be from {b}. We will never ask for these.",
        f"Your account security alert: {b} never asks you to install remote access apps like AnyDesk or TeamViewer. Beware of fraudsters impersonating bank officials.",
        f"Stay safe: bank, government and police officials never ask for OTPs or ask you to transfer money to a 'safe account'. Report fraud at cybercrime.gov.in.",
    ])


@legit("card_expiry", "legit_card")
def f_card_expiry():
    b = rng.choice(BANKS)
    return ([
        f"{b}: Your debit card ending {rng.randint(1000, 9999)} expires this month. New card dispatched to your registered address. Track via {b} app.",
        f"Your {b} credit card XX{rng.randint(1000, 9999)} is valid till {rng.randint(26, 30)}/{rng.randint(10, 12)}. Call 1800-{rng.randint(100, 999)}-{rng.randint(1000, 9999)} for renewal.",
    ])


@legit("dispute_update", "legit_dispute", hard=True)
def f_dispute():
    b = rng.choice(BANKS)
    return ([
        f"{b}: Update on your dispute for Rs {amt(200, 30000)} (Card XX{rng.randint(1000, 9999)}, Txn {refno(8)}): under investigation, resolution within 45 days as per RBI rules. No action needed from you.",
        f"{b}: Dispute for Rs {amt(200, 30000)} (Txn {refno(8)}) is under investigation per RBI ombudsman timelines. Status available in net banking. You will not be asked to pay any fee.",
    ])


@legit("merchant_notify", "legit_merchant")
def f_merchant():
    m = rng.choice(MERCHANTS)
    return ([
        f"Your {m} order of Rs {amt(199, 9999)} is confirmed and will ship by {rng.randint(1, 28):02d}-{rng.choice(MONTHS)}. Track: https://www.{m.split()[0].lower()}.com/track",
        f"Thanks for shopping with {m}! Rs {amt(99, 5000)} paid via UPI. Invoice attached in your account. Delivery in {rng.randint(2, 7)} days.",
        f"{m}: Your order {refno(8)} is out for delivery today. Please keep Rs {amt(0, 500)} handy if COD.",
    ])


@legit("delivery_notify", "legit_delivery")
def f_delivery():
    c = rng.choice(COURIERS)
    return ([
        f"{c}: Shipment {refno(10)} arriving today {rng.randint(9, 20)}:00-{rng.randint(21, 23)}:00. Reschedule at https://www.{c}.example.test/reschedule. Do not pay cash to courier for prepaid orders.",
        f"{c}: Your parcel {refno(10)} is out for delivery, {rng.choice(CITIES)} hub. Track at https://www.{c}.example.test/track. Prepaid shipments never require cash on delivery.",
    ])


@legit("gov_notify", "legit_gov", hard=True)
def f_gov():
    return ([
        f"Income Tax Dept: Your ITR refund of Rs {amt(2000, 150000)} has been processed. It will be credited to your pre-validated bank account. Refund Request Ref: {refno(10)}. No action or payment needed.",
        f"Aadhaar (UIDAI): Your address update request {refno(8)} has been approved. Download e-Aadhaar from uidai.gov.in.",
        f"EPFO: Rs {amt(5000, 300000)} has been credited to your PF account. Check passbook at passbook.epfindia.gov.in.",
        f"GST Portal: GSTR-3B filing for {rng.choice(MONTHS)} is due on {rng.randint(11, 20):02d}. File at gst.gov.in. Helpline does not ask for OTPs.",
    ])


@legit("tax_notice", "legit_tax", hard=True)
def f_tax():
    return ([
        f"Dear Taxpayer, a high-value transaction of Rs {amt(200000, 2000000)} was reported in your AIS. Verify it at incometax.gov.in and report discrepancies if any.",
        f"Income Tax Dept: Your refund of Rs {amt(1000, 80000)} is under process. Bank account validation pending — update via the official e-filing portal only.",
    ])


@legit("utility_bill", "legit_utility", hard=True)
def f_utility():
    u = rng.choice(UTILITIES)
    return ([
        f"{u}: Electricity bill of Rs {amt(500, 8000)} for Consumer No {refno(9)} is due on {rng.randint(10, 25):02d}-{rng.choice(MONTHS)}. Pay via official {u} app, Paytm or your bank app.",
        f"{u} bill reminder: Rs {amt(300, 5000)} due in {rng.randint(1, 9)} days. Pay before due date to avoid late fee of Rs {rng.randint(25, 200)}. Official payment links only at {u.lower().replace(' ', '')}.example.test",
        f"Gas booking reminder: your {u} subsidy of Rs {amt(100, 600)} has been credited to your Aadhaar-linked account.",
    ])


@legit("insurance", "legit_insurance", hard=True)
def f_insurance():
    ins = rng.choice(INSURERS)
    return ([
        f"{ins}: Your premium of Rs {amt(2000, 60000)} is due on {rng.randint(1, 28):02d}-{rng.choice(MONTHS)}. Pay via {ins} official portal or app to keep your policy active.",
        f"{ins} policy {refno(9)} premium paid. Receipt available in your policy account. Grace period: 30 days. Helpline never asks for OTP.",
    ])


@legit("telecom_bill", "legit_telecom")
def f_telecom():
    t = rng.choice(TELECOM)
    return ([
        f"{t}: Your postpaid bill of Rs {amt(199, 3000)} is due on {rng.randint(5, 25):02d}-{rng.choice(MONTHS)}. Pay via {t} app. Data used: {rng.randint(1, 200)}GB of 210GB.",
        f"{t}: Bill of Rs {amt(199, 3000)} generated for this cycle. Pay via {t} official app or website. Reminder: {t} never asks for payment over a phone call.",
    ])


@legit("subscription", "legit_subscription", hard=True)
def f_subscription():
    s = rng.choice(["Netflix", "Amazon Prime", "Spotify", "Hotstar", "YouTube Premium"])
    return ([
        f"Your {s} subscription renews on {rng.randint(1, 28):02d}-{rng.choice(MONTHS)} for Rs {amt(149, 1499)}/month. Manage or cancel anytime in account settings — we never call to cancel.",
        f"{s}: Payment of Rs {amt(149, 999)} successful for your monthly plan. Receipt in your registered email.",
    ])


@legit("password_reset", "legit_reset", hard=True)
def f_reset():
    b = rng.choice(BANKS + MERCHANTS)
    return ([
        f"{b}: We received a password reset request for your account. If this was you, click https://www.{rng.choice(VERIFIED_DOMAINS)}/reset?token={refno(10)} within 15 minutes. If not, ignore — no action needed.",
        f"Reset your {b} password using OTP {rng.randint(100000, 999999)}. This code was requested from {rng.choice(CITIES)}. Never share it.",
    ])


@legit("login_alert", "legit_login", hard=True)
def f_login():
    b = rng.choice(BANKS)
    return ([
        f"{b}: New login to your account from a new device at {rng.randint(10, 22):02d}:{rng.randint(10, 59)} hrs from {rng.choice(CITIES)}. If this wasn't you, call 1800-{rng.randint(100, 999)}-{rng.randint(1000, 9999)} immediately. We will never ask you to install any app.",
        f"{b}: Login attempt from a new device ({rng.choice(CITIES)}, {rng.choice(['Chrome', 'Android', 'iPhone'])}). If this was not you, change your password via the {b} app. Helpline never asks for OTP or remote access.",
    ])


@legit("block_warning_legit", "legit_security", hard=True)
def f_block_legit():
    b = rng.choice(BANKS)
    return ([
        f"{b}: Aapke card par 3 galat PIN attempts hue hain. Security ke liye card temporarily block ho gaya. Unblock ke liye {b} app ya branch use karein.",
        f"{b}: Your card XX{rng.randint(1000, 9999)} is temporarily blocked due to {rng.choice(['3 incorrect PIN attempts', 'a reported suspicious merchant', 'your request'])}. Unblock only via the {b} app or by visiting a branch.",
        f"For your security, internet banking on your {b} account is blocked after multiple failed logins. Reset at the branch or via the official app.",
    ])


@legit("cashback_legit", "legit_cashback", hard=True)
def f_cashback_legit():
    m = rng.choice(MERCHANTS + ["CRED", "Paytm"])
    return ([
        f"{m}: You've earned Rs {amt(10, 500)} cashback on your last transaction! Credited to your {m} wallet. Check rewards section in the app.",
        f"Scratch card unlocked: Rs {amt(5, 2000)} cashback from your UPI payment. Open the {m} app to redeem — no fees ever to claim rewards.",
    ])


@legit("loan_offer_legit", "legit_loan", hard=True)
def f_loan_legit():
    b = rng.choice(BANKS)
    return ([
        f"{b}: Based on your account history, you're eligible for a pre-approved personal loan of Rs {amt(50000, 1000000)} at {rng.choice([10.5, 11.25, 12.0])}% p.a. Apply via the {b} app. We never charge upfront fees.",
        f"Your {b} home loan statement for {rng.choice(MONTHS)} is ready. Principal outstanding Rs {amt(100000, 8000000)}. Download from {b} net banking.",
    ])


@legit("card_block_legit", "legit_card", hard=True)
def f_card_block():
    b = rng.choice(BANKS)
    return ([
        f"{b}: International usage on card XX{rng.randint(1000, 9999)} has been blocked as per your request. To re-enable, use the {b} app. Helpline will never ask for your full card number.",
        f"{b}: As requested, online transactions on card XX{rng.randint(1000, 9999)} are disabled. Manage card controls anytime in the {b} app — never through links sent by SMS or callers.",
    ])


@legit("upi_limit", "legit_upi", hard=True)
def f_upi_limit():
    return ([
        "UPI transaction limit alert: daily limit of Rs 1,00,000 reached. Resets at midnight. NPCI never calls users about limits.",
        f"You have exceeded your per-day UPI transfer limit. Remaining balance Rs {amt(100, 50000)} can be transferred after 00:00 IST. - Your bank",
    ])


@legit("locker_reminder", "legit_bank_misc")
def f_locker():
    b = rng.choice(BANKS)
    return ([
        f"{b}: Annual locker rent of Rs {amt(500, 5000)} for Locker No {rng.randint(100, 999)} will be debited from A/C {acc()} on {rng.randint(1, 28):02d}-{rng.choice(MONTHS)}. Visit branch for queries.",
        f"{b}: Locker {rng.randint(100, 999)} rent Rs {amt(500, 5000)} due this month; auto-debit from A/C {acc()}. Branch visit optional — no agent will collect cash for locker rent.",
    ])


@legit("nomination_reminder", "legit_bank_misc")
def f_nomination():
    b = rng.choice(BANKS)
    return ([
        f"{b}: No nominee is registered for your savings account {acc()}. Add a nominee via net banking or branch to ease claim settlement. No deadline or fee applies.",
        f"{b}: Reminder to register a nominee for A/C {acc()} — free of cost via net banking or any branch. No third party can do this on your behalf and no OTP is needed.",
    ])


@legit("atm_cash", "legit_bank_misc")
def f_atm():
    b = rng.choice(BANKS)
    return ([
        f"Rs {amt(500, 20000)} withdrawn from {b} ATM at {rng.choice(CITIES)} on {rng.randint(1, 28):02d}-{rng.choice(MONTHS)} {rng.randint(10, 21):02d}:{rng.randint(10, 59)} PM. Avl bal Rs {amt(100, 100000)}.",
        f"ATM withdrawal of Rs {amt(500, 20000)} at {b} {rng.choice(CITIES)} branch. Avl bal Rs {amt(100, 100000)}. Card ending {rng.randint(1000, 9999)}.",
    ])


@legit("insurance_claim", "legit_insurance", hard=True)
def f_claim():
    ins = rng.choice(INSURERS)
    return ([
        f"{ins}: Your health insurance claim {refno(8)} for Rs {amt(10000, 500000)} has been approved and will be settled with the hospital directly. No payment needed from you for claim processing.",
        f"{ins}: Claim {refno(8)} approved — Rs {amt(10000, 500000)} settled directly with the network hospital. We never ask for a 'processing fee' to release claims.",
    ])


@legit("exam_fee", "legit_gov")
def f_exam():
    return ([
        f"NTA: Your exam application fee of Rs {amt(500, 2500)} has been received. Admit card releases {rng.randint(10, 28):02d}-{rng.choice(MONTHS)} at nta.ac.in. Helpline never asks for OTP.",
        f"UPSC: Application for CSE {rng.randint(2026, 2030)} submitted. Fee Rs {amt(100, 2000)} paid. Download e-admit card from upsconline.gov.in.",
    ])


# BUG-001/BUG-002 blind-spot families: the original safe set contained zero
# personal family messages and zero bank security ADVICE (as opposed to OTP
# alerts), so TF-IDF learned family words and "verify/credentials" as pure
# scam signals. These two families close that gap (train-split coverage).
FAMILY_MEMBERS = ["Papa", "Mummy", "Bhai", "Bhaiyya", "Dost", "Mom", "Dad", "Sister", "Beti", "Beta"]
HINDI_URGENT = ["turant", "jaldi", "abhi"]


@legit("personal_family_message", "legit_personal", hard=True)
def f_personal_family():
    p = rng.choice(FAMILY_MEMBERS)
    h = rng.choice(HINDI_URGENT)
    return ([
        f"{p} urgent: call me back when you see this",
        f"{p}, I'll be home by {rng.randint(6, 10)}",
        f"{p} {h} ghar aa ja",
        f"{p}, sab theek hai?",
        f"{p} is waiting, come quickly",
        f"{p} needs help, please respond",
        f"{p}, where are you? Call me",
        f"{p}, I'm stuck in traffic, will be late",
        f"{p} ko batao I'm running late",
        f"{p} {h} ghar aa jao",
        f"{p} called you twice, call back when free",
        f"{p}, dinner is ready, come home",
    ])


@legit("bank_security_advice", "legit_security", hard=True)
def f_bank_advice():
    b = rng.choice(BANKS)
    return ([
        f"{b}: Never share your password with anyone, even for verification",
        f"{b} support will never ask for your PIN or CVV",
        f"Bank: Don't share OTP with anyone, not even bank staff",
        f"{b}: We never ask customers to verify credentials via SMS",
        f"Your bank will never request password confirmation",
        f"Genuine banks never ask for 2FA codes via email or SMS",
        f"RBI advisory: Banks will never ask for sensitive info via SMS",
        f"If someone asks for your password, it's a scam",
        f"Never confirm card details with anyone calling",
        f"Your bank's official policy: we never ask for OTP verification",
    ])


# ── SCAM families ─────────────────────────────────────────────────────

SCAM_FAMILIES = []


def scam(family, category, label, test_only=False):
    """test_only=True: family is HELD OUT of train/val entirely (emitted into
    test only). Used for the semantic impersonation class (family_emergency,
    wrong_number) so its test rows are OOD for the ML model — measuring
    semantic-layer coverage that rules/ML cannot learn from training."""
    def deco(fn):
        fn.family, fn.category, fn.label = family, category, label
        fn.test_only = test_only
        SCAM_FAMILIES.append(fn)
        return fn
    return deco


@scam("kyc_phish", "kyc", "high_risk")
def s_kyc():
    b = rng.choice(BANKS)
    return ([
        f"Dear Customer, your {b} KYC has expired. Update within 24 hours to avoid account suspension: {scam_url(rng.choice(FAKE_BRAND) + '-kyc-verify')}",
        f"Your KYC is expiring today. Verify immediately using this link: {scam_url('verify-' + rng.choice(FAKE_BRAND))} or your account will be permanently closed.",
        f"{b} Alert!! KYC update pending. Last chance — click {scam_url(rng.choice(FAKE_BRAND) + '-kyc')} within 2 hours else account blocked.",
        f"Your {b} net banking is suspended due to incomplete KYC. Re-activate now at {scam_url('kyc-update-' + rng.choice(FAKE_BRAND))}",
    ])


@scam("kyc_phish_hi", "kyc", "high_risk")
def s_kyc_hi():
    b = rng.choice(BANKS)
    return ([
        f"Sir aapka {b} KYC expire ho gaya hai. Abhi verify nahi kiya to account block ho jayega. Link: {scam_url('kyc-' + rng.choice(FAKE_BRAND))}",
        f"{b}: aapka KYC update pending hai. Turant is link par click karo warna account band ho jayega: {scam_url('verify-kyc')}",
        f"KYC अधूरा है। अकाउंट बंद होने से पहले तुरंत वेरिफाई करें: {scam_url('kyc-update')}. समय केवल 3 घंटे।",
        f"आपका KYC आज समाप्त हो रहा है। तुरंत इस लिंक पर क्लिक करें वरना खाता बंद हो जाएगा: {scam_url('kyc-verify')}",
    ])


@scam("account_suspend", "bank_suspension", "high_risk")
def s_suspend():
    b = rng.choice(BANKS)
    return ([
        f"Your {b} account will be suspended in 6 hours due to suspicious activity. Verify your identity here: {scam_url(rng.choice(FAKE_BRAND) + '-secure')}",
        f"{b}: A/C {acc()} marked for closure. To stop it, confirm your PAN and mobile number at {scam_url('account-verify')}",
        f"FINAL NOTICE: account {acc()} will be blocked permanently. Immediate verification required at {scam_url('secure-' + rng.choice(FAKE_BRAND))} or call {phone()}.",
        f"Sir aapka {b} account band hone wala hai — 6 ghante me. Bachane ke liye turant verify karo: {scam_url('account-verify')}",
        f"आपका {b} खाता संदिग्ध गतिविधि के कारण निलंबित किया जाएगा। तुरंत वेरिफिकेशन करें: {scam_url('secure-' + rng.choice(FAKE_BRAND))}",
    ])


@scam("otp_phish", "otp_harvest", "high_risk")
def s_otp():
    b = rng.choice(BANKS)
    return ([
        f"{b}: Someone is trying to log into your account. If this was not you, share the OTP you received to verify your identity and block them. Urgent!",
        f"Sir I am calling from {b} bank. We are stopping a fraudulent debit of Rs {amt(5000, 90000)}. Please tell me the OTP sent to your mobile so we can reverse it.",
        f"To secure your account, reply with the OTP you just received. Your money is at risk — respond within 5 minutes!",
        f"Madam, your card is being misused right now. Read out the 6-digit OTP quickly so we can block the transaction.",
        f"Sir, {b} bank se bol raha hoon. Fraud transaction rokne ke liye jo OTP aaya hai wo turant batao, warna paisa kat jayega!",
        f"आपके खाते से गलत ट्रांजैक्शन हो रहा है। OTP तुरंत बताइए ताकि पैसा बचाया जा सके। 5 मिनट में जवाब दें!",
    ])


@scam("upi_collect", "upi_collect", "high_risk")
def s_collect():
    word = rng.choice(GOV_WORDS)
    return ([
        f"Government refund of Rs {amt(1000, 25000)} pending. Approve the collect request from {word}-refund-dept{rng.choice(PS_SUFFIX)} to receive your money today.",
        f"Rs {amt(500, 15000)} cashback approved! Enter your UPI PIN to accept the collect request from {rng.choice(FAKE_BRAND)}-rewards{rng.choice(PS_SUFFIX)}",
        f"Your refund of Rs {amt(999, 9999)} is stuck. Approve pending request in your UPI app from {word}{rng.choice(PS_SUFFIX)} within 1 hour or money returns to government.",
        f"Sarkari refund Rs {amt(1000, 20000)} aapke liye pending hai. Collect request approve karo {word}-refund{rng.choice(PS_SUFFIX)} se — warna paisa wapas ho jayega.",
        f"सरकारी रिफंड ₹{amt(1000, 20000)} आपके नाम लंबित है। अपने UPI ऐप में collect request तुरंत approve करें और UPI PIN डालें — {word}-refund{rng.choice(PS_SUFFIX)}",
    ])


@scam("qr_scam", "qr_code", "high_risk")
def s_qr():
    return ([
        f"To receive your refund of Rs {amt(2000, 20000)}, scan the QR code sent on WhatsApp and enter your UPI PIN when asked. This is required for verification.",
        f"Sir, galti se aapka payment aa gaya hai. Wapas bhejne ke liye ye QR scan karo aur PIN daalo — warna complaint hogi.",
        f"Refund process: 1) Scan QR 2) Enter UPI PIN 3) Get Rs {amt(1000, 50000)} instantly. QR valid for 10 minutes only!",
    ])


@scam("fake_refund", "fake_refund", "high_risk")
def s_refund():
    m = rng.choice(MERCHANTS + ["IRCTC", "Flipkart"])
    return ([
        f"Your {m} refund of Rs {amt(999, 25000)} is pending. Call {phone()} and complete verification to process it today, otherwise it will be cancelled.",
        f"{m} customer care: your refund Rs {amt(499, 15000)} failed. To get money back, open {scam_url('refund-' + rng.choice(FAKE_BRAND))} and fill your bank details + UPI PIN.",
        f"Refund lene ke liye link open karo aur apna account number, IFSC aur UPI PIN enter karo: {scam_url('refund-verify')}",
    ])


@scam("cashback_bait", "cashback", "suspicious")
def s_cashback():
    return ([
        f"Congratulations! You have won a ₹{amt(500, 5000)} cashback from {rng.choice(TELECOM)}. Claim within 30 minutes: {scam_url('cashback-claim')}",
        f"Rs {amt(100, 999)} reward unlocked for you! 100% genuine. Claim fast — only today: {scam_url('rewards')}",
        f"₹500 cashback pending in your name. Click now to claim before it expires tonight!",
    ])


@scam("fake_support", "fake_support", "high_risk")
def s_support():
    m = rng.choice(MERCHANTS + TELECOM + ["IRCTC"])
    return ([
        f"{m} helpline {phone()}: Your order is stuck. Pay Rs {amt(199, 999)} processing fee to release it. Call now, lines close in 10 minutes.",
        f"Hello sir, {m} support team. Your package needs customs clearance. Pay Rs {amt(1500, 8000)} immediately to {upi_id(rng.choice(COURIERS) + '-support')} for delivery today.",
        f"Problem in your {m} account? Talk to our executive on WhatsApp {phone()}. Registration fee Rs {amt(99, 499)} applies.",
    ])


@scam("bank_rep", "bank_impersonation", "high_risk")
def s_bankrep():
    b = rng.choice(BANKS)
    return ([
        f"This is {b} verification desk. We have detected unusual activity. Install the {b} security app from {scam_url('security-' + rng.choice(FAKE_BRAND))} so we can protect your account.",
        f"{b} officer speaking. To upgrade your account security, please share your debit card number, expiry and CVV. This call is recorded for quality.",
        f"Sir, main {b} bank se bol raha hoon. Aapke account me koi galti se paisa debit ho raha hai. rokne ke liye turant OTP batao.",
    ])


@scam("gov_impersonation", "gov_impersonation", "high_risk")
def s_gov():
    d = rng.choice(DEPARTMENTS)
    return ([
        f"This is {d} {rng.choice(CITIES)}. A cyber warrant has been issued against {rng.choice(['you', 'your son', 'your family'])} for illegal activity. Pay Rs {amt(5000, 50000)} immediately to close the case or face arrest within 2 hours. Call officer on {phone()}.",
        f"{d}: Your Aadhaar is linked to a money laundering case. To clear your name, cooperate in video verification and keep Rs {amt(20000, 200000)} ready for 'verification deposit'.",
        f"DIGITAL ARREST NOTICE: You are under online surveillance. Do not disconnect this video call. Transfer Rs {amt(25000, 150000)} to the Supreme Court 'safe account' to avoid arrest.",
        f"Your PAN card has been misused in a narcotics case. Pay penalty Rs {amt(10000, 80000)} now on {scam_url('cyber-verify')} else police will visit your home today.",
    ])


@scam("tax_refund_bait", "tax_refund", "high_risk")
def s_tax():
    return ([
        f"Income Tax Dept: Rs {amt(5000, 200000)} refund approved in your name. Click {scam_url('incometax-refund')} and enter PAN + bank login to claim before {rng.randint(1, 28):02d}-{rng.choice(MONTHS)}.",
        f"Your IT refund of Rs {amt(9999, 99999)} is ready. Verify at {scam_url('tax-refund-verify')} — refund cancelled if not claimed in 24 hrs.",
    ])


@scam("utility_disconnect", "utility_disconnect", "high_risk")
def s_utility():
    u = rng.choice(UTILITIES)
    return ([
        f"{u}: Your electricity will be disconnected TONIGHT at 9 PM due to unpaid bill. Pay Rs {amt(1200, 8000)} immediately at {scam_url('bill-pay-' + rng.choice(FAKE_BRAND))} or call {phone()}.",
        f"BILL OVERDUE — {u} will cut your connection in 2 hours. Last warning! Pay Rs {amt(999, 6000)} now: {scam_url('electricity-pay')}",
        f"Sir bijli connection kat jayega aaj raat. Rs {amt(1500, 5000)} turant is number par bhejo: {upi_id('bijli-board')}. Complaint nahi suni jayegi.",
        f"आपका बिजली कनेक्शन आज रात 9 बजे काट दिया जाएगा। ₹{amt(1200, 6000)} तुरंत इस लिंक पर भरें: {scam_url('bijli-bill')} — अंतिम चेतावनी!",
    ])


@scam("parcel_customs", "parcel_customs", "high_risk")
def s_parcel():
    c = rng.choice(COURIERS)
    return ([
        f"Your parcel containing 1 iPhone is held at customs. Pay customs fee of Rs {rng.randint(1500, 8000)} to {c}-support{rng.choice(PS_SUFFIX)} to release delivery today.",
        f"{c}: Your shipment {refno(10)} is confiscated by customs. Fine Rs {amt(2000, 10000)} — pay via this link to avoid legal action: {scam_url(c + '-customs')}",
        f"Courier se aapka parcel atka hai. Customs charge Rs {amt(1500, 7000)} bharo warna parcel wapas ho jayega aur case ban jayega. Pay: {upi_id(c + '-help')}",
    ])


@scam("loan_bait", "fake_loan", "suspicious")
def s_loan():
    return ([
        f"Get instant loan of Rs {amt(50000, 500000)} approved in 5 minutes! No documents. 0% interest for 3 months. Apply: {scam_url('instant-loan-apni')} Processing fee Rs {rng.randint(99, 999)} only.",
        f"LOAN APPROVED! Rs {amt(25000, 800000)} credited soon. Pay one-time insurance fee Rs {rng.randint(499, 5000)} first. Send to {upi_id('loan-fee')}. 100% guarantee.",
        f"Sir aapka loan Rs {amt(30000, 500000)} approve ho gaya. Pehle processing fee Rs {rng.randint(299, 2999)} bhejo, turant paisa milega. Bhai trust karo.",
    ])


@scam("job_trap", "job_scam", "high_risk")
def s_job():
    return ([
        f"WORK FROM HOME! Earn Rs {amt(2000, 8000)}/day. No experience needed. Only Rs {rng.randint(99, 499)} registration fee to start. WhatsApp {phone()} ASAP. Limited seats!",
        f"Part-time job: like YouTube videos and earn Rs {amt(500, 3000)}/day. First task free! Joining fee Rs {rng.randint(199, 999)}: {scam_url('task-job')}",
        f"Telegram prepaid tasks — earn daily Rs 5000 by completing simple tasks. Invest {amt(1000, 10000)} and get 30% return in 2 hours. DM {phone()}.",
    ])


@scam("investment", "investment_scam", "suspicious")
def s_invest():
    return ([
        f"Guaranteed 2% daily return on crypto/forex investment! Minimum Rs {amt(5000, 25000)}. Our expert traders manage everything. Withdraw anytime. Join: {scam_url('profit-traders')}",
        f"Sir, share market me 100% guaranteed profit. Aapka paisa double in 45 days. Invest Rs {amt(10000, 100000)} in our premium tips group: {phone()}",
        f"₹50,000 → ₹5,00,000 in 6 months, guaranteed. SEBI-registered* tips. Fee Rs {amt(1999, 9999)}/month. Limited slots: {scam_url('multibagger-tips')}",
    ])


@scam("lottery", "lottery", "high_risk")
def s_lottery():
    return ([
        f"CONGRATULATIONS! You have WON Rs {amt(50000, 1000000)} in the {rng.choice(['KBC', 'Diwali', 'Jio', 'Airtel'])} lucky draw! Claim before midnight: {rng.choice(['http://bit.ly/', 'http://tinyurl.com/', 'http://t.me/'])}{refno(8).lower()}",
        f"Aapka number lucky draw me select hua hai! Rs {amt(25000, 500000)} jeeta hai aapne. Claim karo: {scam_url('lucky-draw')} — aaj raat tak!",
        f"🏆 You are the 1,00,000th visitor! Claim your iPhone 15 + Rs {amt(10000, 50000)} now: {scam_url('winner-claim')} (pay Rs 199 delivery only)",
        # lure phrasing without "won/winner" words: offer/award/claim-via-link
        f"Hey click here to avail your offer of {rng.choice(['$', 'Rs '])}{amt(500, 5000)} just click this link and you would receive the award: https://www.{rng.choice(['motapanda', 'quickprizes', 'rewardhub', 'offerlandy'])}.com",
        f"Special offer selected for you! Avail the reward now before it expires: {scam_url('offer-claim')} Limited period deal of the day.",
        f"Your award is ready Sir, bas is link par click karo aur apna gift claim karo: https://www.{rng.choice(['giftpanda', 'bigrward', 'claimzone'])}.com",
    ])


@scam("sim_swap", "sim_takeover", "high_risk")
def s_sim():
    t = rng.choice(TELECOM)
    return ([
        f"{t}: Your SIM will be deactivated tonight for verification failure. To continue service, reply with your Aadhaar number and recent call details to {phone()}.",
        f"Sir, your number will be blocked in 30 min as per government order. Share OTP (sent shortly) to keep SIM active. - {t} network team",
        f"KYC of your SIM is 2 years old. Update today by calling {phone()} and sharing your details, else outgoing calls will stop.",
    ])


@scam("remote_access", "remote_access", "high_risk")
def s_remote():
    return ([
        f"RBI refund department: to receive Rs {amt(5000, 50000)}, download the 'RBI Verify' app from {scam_url('rbi-verify')} and share your screen so we can guide you.",
        f"{rng.choice(BANKS)} tech team will call you. Install AnyDesk / ScreenShare app before the call so we can fix your account issue. Do not tell anyone, it's a security process.",
        f"Madam, for KYC video verification, please install this app and allow screen recording: {scam_url('kyc-screen')}. Your account will be blocked otherwise.",
    ])


@scam("screen_share", "screen_share", "high_risk")
def s_screen():
    return ([
        f"Bank verification in progress. Please join the WhatsApp video call and share your screen while you open your UPI app. Do not cut the call.",
        f"For your refund of Rs {amt(1999, 29999)}, our officer will guide you on screen. Open GPay, choose 'refund' option, and enter the PIN he reads out.",
    ])


@scam("wrong_number", "wrong_number", "high_risk", test_only=True)
def s_wrong_number():
    return ([
        f"Hi beta, this is your new number saved? — Mummy. Beta please bhej do Rs {amt(2000, 20000)} urgently, papa ki medicine ke liye. Mera phone kho gaya, ye friend ka number hai.",
        f"Hi, I got a job offer at {rng.choice(['TCS', 'Infosys'])} — is this about the placement fee? (wrong number?) ... oh actually since you're on WhatsApp, we pay students Rs 3000/day for reviews, interested?",
        f"Sorry wrong number! Btw I'm selling iPhone 13 for Rs {amt(15000, 30000)} only, box packed, urgent sale, delivery via courier. Pay advance?",
    ])


@scam("romance", "romance_scam", "suspicious")
def s_romance():
    return ([
        f"Dear, I'm stuck at Mumbai airport customs with a parcel of $50,000 gift for you. Please pay Rs {amt(25000, 100000)} clearance fee and I'll come to you. I love you, don't tell anyone.",
        f"Baby I want to come to India next month but my bank is frozen. Send Rs {amt(15000, 80000)} for the ticket, I'll return double when we meet. Pinky promise.",
    ])


@scam("family_emergency", "family_impersonation", "high_risk", test_only=True)
def s_family():
    return ([
        f"Papa, mera phone gir gaya, ye meri dost ka number hai. mujhe urgent Rs {amt(5000, 50000)} bhejo is UPI par {upi_id('help-emergency')} — hospital me hu, baad me samjhaunga.",
        f"Sir, aapka beta accident me hai, operation ke liye turant Rs {amt(30000, 200000)} chahiye. Doctor bol raha hai 30 min me. Is number par paytm karo {phone()}. Jaldi karo!",
        f"Your son is in our custody. Send Rs {amt(50000, 500000)} immediately or he will be harmed. Do not inform police or family.",
    ])


@scam("phishing_generic", "phishing", "high_risk")
def s_phish():
    brand = rng.choice(FAKE_BRAND)
    return ([
        f"Dear Customer, your {brand} account shows unusual login attempts. Confirm your identity at {scam_url(brand + '-secure-login')} to avoid permanent deactivation.",
        f"Security check required. Your profile will be deleted in 12 hours unless verified: {scam_url('profile-verify')}",
        f"Update your mobile number & email immediately to continue services: {scam_url('account-update')} — {brand} Team",
        f"You have 1 unread secure message regarding your account suspension. Read now: {scam_url('secure-msg')}",
        f"Dear customer, galti se aapka {brand} account deactivate ho raha hai. Wapas activate karo: {scam_url(brand + '-reactivate')}",
        f"आपके {brand} खाते में असामान्य लॉगिन देखे गए हैं। पहचान सत्यापित करें: {scam_url(brand + '-verify')} वरना खाता हट जाएगा।",
    ])


@scam("brand_subdomain", "phishing", "high_risk")
def s_subdomain():
    brand = rng.choice(FAKE_BRAND)
    return ([
        f"Your {brand} account needs re-verification. Continue at http://{brand}.example.test/verify (official link, safe) within today.",
        f"Refund update: http://refund-{brand}.example.test/claim — enter your UPI PIN to accept Rs {amt(999, 19999)}.",
        f"Secure KYC: http://secure-kyc.{brand}.example.test — update now to keep account active.",
        f"http://{brand}-login.example{rng.choice(BURNER_TLDS)} — your session expired, sign in again or account closes.",
    ])


@scam("lookalike_domain", "phishing", "high_risk")
def s_lookalike():
    pairs = [("sbi", "sbl"), ("paytm", "paytrn"), ("hdfc", "hdfe"), ("icici", "lcici"), ("upi", "upl")]
    real, fake = rng.choice(pairs)
    return ([
        f"Your {real} account is on hold. Verify card details at http://{fake}{rng.choice(BURNER_TLDS)}/unblock — expires in 3 hours.",
        f"Update your {real} profile: http://www.{fake}-bank.example{rng.choice(BURNER_TLDS)} (or services stop tonight)",
    ])


@scam("punycode_url", "phishing", "high_risk")
def s_punycode():
    brand = rng.choice(FAKE_BRAND)
    return ([
        f"Your {brand} KYC expires today. Renew at http://xn--{brand}-kyc{rng.choice(BURNER_TLDS)}/update within 24 hours.",
        f"Account suspension notice. Verify at xn--secure-{brand}{rng.choice(BURNER_TLDS)} to keep banking active.",
    ])


@scam("defanged_phish", "phishing", "high_risk")
def s_defanged():
    brand = rng.choice(FAKE_BRAND)
    return ([
        f"URGENT: your {brand} account is compromised. Reset now: hxxps://{brand}-verify.example[.]top/recover",
        f"Refund of Rs {amt(1999, 15000)} waiting. Claim: hxxp://refund-{brand}.example[.]click — link dies in 1 hour!!",
    ])


@scam("credential_harvest", "credential_harvest", "high_risk")
def s_cred():
    b = rng.choice(BANKS)
    return ([
        f"{b} customers: redeem your festive bonus Rs {amt(500, 5000)}. Enter customer ID and password at {scam_url('bonus-' + rng.choice(FAKE_BRAND))}",
        f"Net banking maintenance tonight. Confirm your login credentials here to avoid de-registration: {scam_url('netbanking-confirm')}",
        f"Sir, apna net banking customer ID aur password is form me daalo — aapke account me security update ke liye zaroori hai: {scam_url('security-form')}",
    ])


@scam("merchant_request", "fake_merchant", "suspicious")
def s_merchant():
    return ([
        f"Your rent payment of Rs {amt(8000, 60000)} is overdue. Send it now to {upi_id('landlord-office')} or face legal notice from society.",
        f"Sir, you ordered food at our restaurant? Payment of Rs {amt(200, 2000)} pending. Kindly pay on this number {phone()} or we will file police complaint.",
        f"Society maintenance Rs {amt(1000, 10000)} due TODAY. Pay instantly to mgmt-office{rng.choice(PS_SUFFIX)} to avoid penalty. — RWA (this is not official channel)",
    ])


@scam("payment_failure_reverse", "payment_failure", "high_risk")
def s_fail_reverse():
    return ([
        f"Sir your payment of Rs {amt(500, 5000)} has FAILED but money is stuck. To get it back, send the same amount again to this VPA {upi_id('refund-bridge')} — it will auto-return double.",
        f"Your transaction was debited twice by mistake. Reply with the last OTP to cancel the duplicate charge.",
        f"Payment failed at merchant. Get instant reversal — approve the collect request we just sent in your UPI app for Rs {amt(500, 10000)}.",
    ])


@scam("sebi_bait", "investment_scam", "suspicious")
def s_sebi():
    return ([
        f"SEBI-registered advisor: 95% accurate intraday calls. Turn Rs {amt(10000, 100000)} into {amt(30000, 300000)} this month. First 2 days free, then Rs {rng.randint(4999, 19999)}/month. WhatsApp {phone()}.",
        f"IPO allotment guaranteed!! Pay Rs {rng.randint(1999, 9999)} per application to {upi_id('ipo-desk')}. Full refund if no shares. 100% confirmed.",
    ])


@scam("crypto_pump", "investment_scam", "suspicious")
def s_crypto():
    return ([
        f"Join our Telegram crypto signals — 500 members earned 8x last month. Minimum deposit Rs {amt(5000, 50000)} USDT. Admin: {phone()}",
        f"Mining app download karke daily Rs {amt(200, 2000)} kamao — free me! Bas registration me Rs {rng.randint(99, 499)} lagta hai: {scam_url('mining-app')}",
    ])


@scam("insurance_bait", "fake_insurance", "suspicious")
def s_insurance():
    ins = rng.choice(INSURERS)
    return ([
        f"Your {ins} policy is being CANCELLED today due to premium bounce. Pay Rs {amt(2000, 25000)} immediately at {scam_url(ins.lower().replace(' ', '') + '-premium')} to keep it active.",
        f"Sir your policy matured — Rs {amt(50000, 500000)} payout ready. Pay Rs {rng.randint(1999, 9999)} 'release fee' to {upi_id('payout-desk')} to receive it.",
    ])


@scam("card_upgrade", "card_phishing", "high_risk")
def s_card():
    b = rng.choice(BANKS)
    return ([
        f"{b}: You qualify for a FREE lifetime credit card upgrade. Share card number, expiry & CVV on {scam_url('card-upgrade')} for doorstep delivery of Rs {amt(500, 5000)} voucher.",
        f"Your card ending {rng.randint(1000, 9999)} will be blocked for online payments. To continue, verify CVV with our executive on {phone()}.",
    ])


@scam("insurance_fine", "gov_impersonation", "suspicious")
def s_fine():
    return ([
        f"Traffic Police {rng.choice(CITIES)}: challan of Rs {amt(1000, 5000)} pending against your vehicle. Pay immediately at {scam_url('echallan-pay')} or license will be suspended.",
        f"GST dept: your GST number will be cancelled for late filing. Pay penalty Rs {amt(2000, 15000)} on {scam_url('gst-penalty')} today.",
    ])


@scam("loan_recovery", "loan_recovery", "suspicious")
def s_recovery():
    return ([
        f"Recovery agent: your cash app loan of Rs {amt(5000, 50000)} is overdue with 200% interest. Pay NOW to {upi_id('recovery-desk')} or we will call all your contacts. We have your photos.",
        f"Sir, loan ki installment bhool gaye? Aaj hi pay karo warna aapki photo viral ho jayegi. Abhi bhejo {upi_id('settle-now')}. Last chance.",
    ])


# ── split design (frame-level, leakage-safe) ──────────────────────────
# Every family is a list of PHRASING FRAMES (lexically distinct sentences).
# Frame i belongs to split GROUP[i % 3]: train / val / test. So:
#   - every category is represented in all three splits (family-level splits
#     were tried first and held whole scam categories out of train, making
#     test recall collapse — see engineering report), and
#   - test rows still use phrasings never seen in train (no frame reuse),
#     only slot values (bank, amount, URL) are re-randomized.
HINGLISH_RE = re.compile(
    r"\b(karo|karein|karna|bhejo|warna|turant|jaldi|nahi|gaya|gayi|aapka|aapke|paisa|"
    r"raha|rahi|batao|batayein|liye|maangte|maangta|band ho|ka number)\b", re.IGNORECASE)


def frame_for(fn, split):
    """Pick a phrasing frame for this split.

    Frame i belongs to test if i%3==2, val if i%3==1, else train. Families
    with fewer than 3 frames keep TEST on its own unseen frame (the last)
    and let val fall back to a train frame — the untouched test split is
    what must stay clean; val is only used for threshold tuning.
    test_only families never appear in train/val, so ALL their frames are
    clean for test — no round-robin restriction needed.
    """
    frames = fn()
    if isinstance(frames, str):
        frames = [frames]
    if getattr(fn, "test_only", False):
        return frames[rng.randrange(len(frames))]
    if split == "test":
        mine = [i for i in range(len(frames)) if i % 3 == 2] or [len(frames) - 1]
    elif split == "val":
        mine = [i for i in range(len(frames)) if i % 3 == 1] or [0]
    else:
        mine = [i for i in range(len(frames)) if i % 3 == 0] or [0]
    return frames[rng.choice(mine)]


def generate(n=20000):
    # Target: 75% safe / 10% suspicious / 15% high_risk
    n_safe = int(n * 0.75)
    n_susp = int(n * 0.10)
    n_high = n - n_safe - n_susp
    split_share = {"train": 0.72, "val": 0.13, "test": 0.15}

    rows = []
    seen_texts = set()  # rejection sampling: no exact duplicates
    devanagari_re = re.compile(r"[ऀ-ॿ]")

    def emit(fn, label, category, split):
        for _ in range(12):  # retry until unique text
            text = frame_for(fn, split)
            if label != "safe":
                text, transforms = noise(text, aggressive=rng.random() < 0.35)
                adversarial = len(transforms) >= 2 or "zero-width" in transforms or "defang" in transforms
            else:
                text, transforms = noise(text, aggressive=False) if rng.random() < 0.30 else (text, [])
                adversarial = False
            if text not in seen_texts:
                break
        seen_texts.add(text)
        # language: detected from actual content, not family metadata
        if devanagari_re.search(text):
            lang = "hindi"
        elif HINGLISH_RE.search(text):
            lang = "hinglish"
        else:
            lang = "english"
        rows.append({
            "text": text,
            "label": label,
            "category": category,
            "language": lang,
            "family": fn.family,
            "split": split,
            "is_hard_negative": int(bool(getattr(fn, "hard", False)) and label == "safe"),
            "is_adversarial": int(adversarial),
        })

    for split, share in split_share.items():
        want = int(n_safe * share) + 1
        for _ in range(want):
            f = rng.choice(LEGIT_FAMILIES)
            emit(f, "safe", f.category, split)
        want = int(n_susp * share) + 1
        for _ in range(want):
            f = rng.choice([f for f in SCAM_FAMILIES if f.label == "suspicious"])
            emit(f, "suspicious", f.category, split)
        want = int(n_high * share) + 1
        for _ in range(want):
            # test_only families are held out of train/val (OOD test class)
            pool = [f for f in SCAM_FAMILIES
                    if f.label == "high_risk" and not getattr(f, "test_only", False)]
            if split == "test":
                pool += [f for f in SCAM_FAMILIES if getattr(f, "test_only", False)]
            f = rng.choice(pool)
            emit(f, "high_risk", f.category, split)

    # Dedicated test-only block: the semantic impersonation class must have
    # enough test rows for per-family recall analysis (~30/frame-group).
    test_only_fams = [f for f in SCAM_FAMILIES if getattr(f, "test_only", False)]
    for _ in range(30 * len(test_only_fams)):
        f = rng.choice(test_only_fams)
        emit(f, f.label, f.category, "test")

    rng.shuffle(rows)
    return rows


# ── validation / QC ────────────────────────────────────────────────────

def normalize_for_dedup(text):
    """Strip all slots & noise so near-duplicates collapse to the same key."""
    t = unicodedata.normalize("NFKC", text).lower()
    t = t.replace(ZWSP, "").replace(ZWJ, "")
    t = re.sub(r"\d[\d,]*", "N", t)          # amounts/refs/phones -> N
    t = re.sub(r"https?://\S+|hxxps?://\S+", "URL", t)
    t = re.sub(r"xn--[a-z0-9-]+", "PUNY", t)
    t = re.sub(r"[^a-zऀ-ॿ ]", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def validate(rows):
    issues = []
    texts = [r["text"] for r in rows]
    if any(not t.strip() for t in texts):
        issues.append("empty messages present")
    bad_labels = [r["label"] for r in rows if r["label"] not in ("safe", "suspicious", "high_risk")]
    if bad_labels:
        issues.append(f"invalid labels: {set(bad_labels)}")
    exact_dupes = len(texts) - len(set(texts))
    # Leakage guard: a slot-normalized key appearing in BOTH train and test.
    # (val may share frames with train by design — val is only used for
    # threshold tuning, never for reported test metrics. Within-split
    # near-dupes are inherent — one frame, many slot draws.)
    train_keys = {normalize_for_dedup(r["text"]) for r in rows if r["split"] == "train"}
    test_keys = {normalize_for_dedup(r["text"]) for r in rows if r["split"] == "test"}
    cross_leak = len(train_keys & test_keys)
    near_dupes = len(texts) - len(set(normalize_for_dedup(t) for t in texts))
    if exact_dupes > len(rows) * 0.01:
        issues.append(f"exact dupes {exact_dupes} > 1%")
    if cross_leak > 0:
        issues.append(f"normalized-text leakage between train and test: {cross_leak} keys")
    return issues, {"exact_dupes": exact_dupes, "near_dupes": near_dupes, "train_test_leak": cross_leak}


def report(rows, dup_stats):
    c_label = Counter(r["label"] for r in rows)
    c_cat = Counter(r["category"] for r in rows)
    c_lang = Counter(r["language"] for r in rows)
    c_split = Counter(r["split"] for r in rows)
    lens = sorted(len(r["text"]) for r in rows)
    hard = sum(r["is_hard_negative"] for r in rows)
    adv = sum(r["is_adversarial"] for r in rows)
    print(f"\n=== DATASET v2 REPORT ({TODAY}) ===")
    print(f"total: {len(rows)}")
    print(f"labels: {dict(c_label)}  (scam = suspicious+high_risk = {c_label['suspicious'] + c_label['high_risk']})")
    print(f"splits (rows): {dict(c_split)}")
    print(f"families: {len(set(r['family'] for r in rows))}  (frame-level split — phrasings never shared across splits)")
    print(f"hard negatives: {hard} | adversarial: {adv}")
    print(f"duplicates: exact={dup_stats['exact_dupes']} near={dup_stats['near_dupes']}")
    print(f"length: avg={sum(lens)//len(lens)} median={lens[len(lens)//2]} min={lens[0]} max={lens[-1]}")
    print(f"languages: {dict(c_lang)}")
    print("categories:")
    for cat, n in c_cat.most_common():
        print(f"  {cat:24s} {n}")


FIELDS = ["text", "label", "category", "language", "family", "split", "is_hard_negative", "is_adversarial"]


def main(n=20000):
    rows = generate(n)
    # drop retry-exhausted exact dupes (low-entropy frames); count kept for report
    seen = set()
    unique_rows = []
    for r in rows:
        if r["text"] not in seen:
            seen.add(r["text"])
            unique_rows.append(r)
    rows = unique_rows
    issues, dup_stats = validate(rows)
    report(rows, dup_stats)
    if issues:
        sys.exit(f"QC FAILED: {issues}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)
    print(f"\n[OK] {len(rows)} rows -> {OUT}")
    print(f"seed={SEED} | schema=v2 | generated={TODAY}")


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 20000)
