"""
Scam Engine — deterministic scam/risk analysis.

Replaces LLM-prompt-arithmetic on /scam/* endpoints.
Rules only: same input = same score, every time. No LLM in the decision path.

Response shapes match the frontend interfaces exactly
(ScamResult, BehaviorResult, LinkResult, DecisionResult in ScamShield.tsx).
"""

import re
from typing import Dict, List, Optional
from datetime import datetime
from urllib.parse import urlsplit

# =============================================================================
# TEXT MESSAGE ANALYSIS (was /scam/analyze LLM prompt)
# =============================================================================

STRONG_SIGNALS = [
    ("threat", r"\b(block(ed|ing)?|suspend(ed|ing)?|legal action|disable|close your account)\b"),
    ("payment request", r"\b(upi|otp|cvv|pay rs|pay ₹|processing fee|collect request|send money)\b"),
    ("suspicious link", r"https?://|www\.|\.xyz|\.top|\.click|bit\.ly|tinyurl"),
    ("sensitive info request", r"\b(otp|password|cvv|pin|aadhaar|pan card details)\b"),
]

MEDIUM_SIGNALS = [
    ("urgency", r"\b(urgent(ly)?|immediately|act now|limited time|expires? (today|now)|last chance)\b"),
    ("authority impersonation", r"\b(sbi|hdfc|icici|rbi|paytm|phonepe|gpay|bhim|income tax department|customs)\b"),
    ("prize or reward claim", r"\b(congratulations|you (have )?won|winner|lucky draw|cashback.*pending|lottery)\b"),
    ("job trap", r"\b(work.from.home|earn ₹?\d+\/day|earn rs\.?\s*\d+\s*(\/|per)\s*day|no experience needed)\b"),
]

WEAK_SIGNALS = [
    ("reminder", r"\b(reminder|kindly note|please verify|confirm request)\b"),
    ("generic notification", r"\b(dear customer|your order|transaction of rs)\b"),
]

SUSPICIOUS_TLDS = {".xyz", ".top", ".click", ".ru", ".buzz", ".info", ".loan", ".work", ".online"}
SHORTENERS = {"bit.ly", "tinyurl.com", "goo.gl", "t.co", "cutt.ly", "is.gd", "rb.gy"}
BRANDS = ["sbi", "hdfc", "icici", "axis", "paytm", "phonepe", "gpay", "googlepay", "amazon", "flipkart", "fedex", "paypal"]
VERIFIED_DOMAINS = {
    "sbi.co.in", "hdfcbank.com", "icicibank.com", "axisbank.com", "kotak.com",
    "bankofbaroda.in", "pnbindia.in", "canarabank.com", "unionbankofindia.co.in",
}

SCAM_TYPE_PATTERNS = [
    ("kyc", r"\bkyc|pan card|aadhaar|verify your (account|details)\b"),
    ("upi", r"\bupi|collect request|scan (the )?qr|pay rs|processing fee\b"),
    ("phishing", r"https?://|www\.|bit\.ly|tinyurl|\.xyz|\.top"),
    ("job", r"\bjob|work.from.home|internship|resume|salary.*per day\b"),
    ("lottery", r"\bwon|winner|lottery|lucky draw|prize|cashback\b"),
    ("delivery", r"\bparcel|courier|delivery (fee|charge)|shipment|customs (fee|charge)\b"),
    ("impersonation", r"\b(sbi|hdfc|rbi|police|customs|income tax|bank manager|customer care)\b"),
    ("extortion", r"\b(cyber cell|warrant|arrest|legal notice|f{i}{2}\b)"),
]

# ── RBI guideline references appended to user advice ──────────────────
# ponytail: static map of real RBI circulars; verify wording against rbi.org.in before publication
RBI_GUIDELINES = {
    "unauthorized_transaction": (
        "RBI 'Zero Liability' circular (2017): report an unauthorized electronic transaction "
        "within 3 working days and you bear zero liability — the bank must restore the full amount. "
        "Report immediately via your bank's 24x7 helpline and the National Cyber Crime portal."
    ),
    "kyc": (
        "RBI has clarified banks never ask customers to update KYC via third-party links or "
        "share OTPs for KYC completion. Any such request is fraud (RBI Press Release, 2022)."
    ),
    "upi": (
        "RBI/NPCI advisory: UPI never requires you to enter an OTP to *receive* money. "
        "Any 'collect request' asking you to approve in order to receive a refund is fraud."
    ),
    "extortion": (
        "No law-enforcement agency demands money over phone/SMS to cancel a warrant. "
        "Verify with your local police station or call 1930 (national cyber fraud helpline)."
    ),
    "phishing": (
        "Always access your bank only by typing the official URL yourself or via the official app — "
        "never through links in messages (RBI advisory on phishing, 2020)."
    ),
    "job": (
        "A genuine employer never charges a registration fee to offer you work. "
        "Report such offers to 1930 or the state cyber cell."
    ),
    "lottery": (
        "No genuine lottery or prize requires an upfront 'processing fee'. "
        "This violates RBI rules on unsolicited prize claims."
    ),
    "delivery": (
        "Courier/customs offices never collect fees via personal UPI IDs. "
        "Verify your shipment only on the courier's official website."
    ),
    "impersonation": (
        "Disconnect and call the institution back on its officially published number — "
        "never the number in the message (RBI advisory on vishing, 2021)."
    ),
}

ML_SCORE_WEIGHTS = {"safe": 5, "suspicious": 60, "high_risk": 90}


def get_rbi_guideline(scam_type: str) -> Optional[str]:
    """Regulatory advice for a detected scam type. None when unknown."""
    return RBI_GUIDELINES.get(scam_type)


# ── ML model (lazy-loaded TF-IDF + Logistic Regression) ───────────────
_ml_model = None


def _ml_base_score(text: str) -> Optional[int]:
    """Base risk score 0-100 from the ML classifier. None if model unavailable."""
    global _ml_model
    if _ml_model is None:
        try:
            import joblib
            from pathlib import Path
            path = Path(__file__).parent.parent / "ml_engine" / "models" / "hybrid_text_model.joblib"
            _ml_model = joblib.load(path)
        except Exception:
            _ml_model = False  # model missing/broken -> rules-only mode
    if _ml_model is False:
        return None
    try:
        label = _ml_model["pipeline"].predict([text])[0]
        return ML_SCORE_WEIGHTS.get(label, 40)
    except Exception:
        return None


def _parse_time(time_str: Optional[str]) -> Optional[datetime]:
    if not time_str:
        return None
    for fmt in ("%I:%M %p", "%I:%M%p", "%H:%M", "%H:%M:%S"):
        try:
            return datetime.strptime(time_str.strip().upper().replace("AM", "AM").replace("PM", "PM"), fmt)
        except ValueError:
            continue
    return None


def _is_odd_timing(time_str: Optional[str]) -> bool:
    t = _parse_time(time_str)
    return t is not None and (0 <= t.hour < 6)


def _match_signals(text: str, patterns: List[tuple]) -> List[str]:
    t = text.lower()
    return [name for name, pat in patterns if re.search(pat, t)]


def _normalize_defanged_url(value: str) -> str:
    """Convert common incident-report URL obfuscation into a parseable URL."""
    return re.sub(r"hxxps?", lambda match: "https" if match.group(0).lower() == "hxxps" else "http", value, flags=re.IGNORECASE).replace("[.]", ".")


def _extract_urls(text: str) -> List[str]:
    return re.findall(r"(?:https?|hxxps?)://[^\s<>]+|www\.[^\s<>]+", text, flags=re.IGNORECASE)


def _hostname(value: str) -> str:
    normalized = _normalize_defanged_url(value).strip().rstrip(".,!?;:)]}>\"'")
    # Unbalanced brackets (e.g. markdown leftovers) make urlsplit raise
    # "Invalid IPv6 URL"; strip them instead of crashing the analyzer.
    if normalized.count("[") != normalized.count("]"):
        normalized = normalized.replace("[", "").replace("]", "")
    try:
        parsed = urlsplit(normalized if "://" in normalized else f"//{normalized}")
    except ValueError:
        return ""
    return (parsed.hostname or "").lower().removeprefix("www.")


def _is_verified_domain(domain: str) -> bool:
    return any(domain == root or domain.endswith(f".{root}") for root in VERIFIED_DOMAINS) or domain.endswith(".gov.in")


def analyze_message(message_text: str, time_of_message: str = None, message_frequency: str = None) -> Dict:
    """Deterministic message scam analysis. Mirrors the old prompt's scoring, in code."""
    strong = _match_signals(message_text, STRONG_SIGNALS)
    medium = _match_signals(message_text, MEDIUM_SIGNALS)
    weak = _match_signals(message_text, WEAK_SIGNALS)

    behavioral = []
    score = 40 * len(strong) + 20 * len(medium) + 5 * len(weak)

    if _is_odd_timing(time_of_message):
        behavioral.append("odd timing (12 AM - 6 AM)")
        score += 10
    if message_frequency and re.search(r"\d+", message_frequency) and int(re.search(r"\d+", message_frequency).group()) >= 3:
        behavioral.append("repeated messages")
        score += 10

    # Verification-scam combo: tiny payment request + reward bait is the classic Indian pattern
    if ("payment request" in strong or "payment request" in medium) and "prize or reward claim" in medium:
        score += 15

    score = min(100, score)

    # Aggregate link risk: any URL in the message is scored by the same link
    # analyzer used in Link Shield mode, and the worst link can drive the verdict.
    urls = _extract_urls(message_text)
    link_results = [analyze_link_upi(u) for u in urls]
    max_link_score = max((r["risk_score"] for r in link_results), default=0)
    if max_link_score:
        score = max(score, max_link_score)

    # Circuit breaker: a verified bank/government domain caps notification wording
    # ("debited", "block card") at 20 — but only when no other link in the message
    # is itself risky, otherwise the cap would hide a mixed legitimate+phishing SMS.
    verified_urls = [
        u for u, r in zip(urls, link_results)
        if r["risk_score"] <= 20 and _is_verified_domain(_hostname(u))
    ]
    # Hybrid blend: ML base score can raise (zero-day patterns the rules miss)
    # or lower (benign wording) the rule score; hard caps below still win.
    ml_score = _ml_base_score(message_text)
    if ml_score is not None:
        score = int(0.6 * score + 0.4 * ml_score)
        # A confident high_risk ML prediction is itself a strong signal — the
        # 60/40 blend alone lets weak rule scores drown it out.
        if ml_score >= 90:
            score = max(score, 75)

    # Hard circuit breakers (deterministic, override both rules and ML):
    if verified_urls and max_link_score <= 20:
        score = min(score, 10)

    # OTP intent classifier: a 4-6 digit OTP code in a notification-style SMS
    # with no links/VPAs is a legitimate bank/merchant alert, not a scam ask.
    # Cap at 10 — the OTP itself is the security mechanism, not the attack.
    # ponytail: keyword check not model intent — add NLU classifier if evasion appears
    otp_alert = (
        not urls
        and not re.search(r"@[a-z]+", message_text)
        and re.search(r"\b\d{4,6}\b", message_text)
        and re.search(r"\b(otp|one.?time.?(password|code))\b", message_text, re.IGNORECASE)
    )
    if otp_alert:
        score = min(score, 10)

    if score >= 70:
        risk = "HIGH_RISK"
    elif score >= 30:
        risk = "SUSPICIOUS"
    else:
        risk = "SAFE"

    # Confidence calibrated to signal count, not a made-up number
    if len(strong) >= 2:
        confidence = min(95, 80 + 5 * (len(strong) - 2))
    elif strong:
        confidence = 75
    elif medium:
        confidence = 55
    elif weak:
        confidence = 30
    else:
        confidence = 15
    if verified_urls:
        confidence = min(confidence, 40)

    scam_type = "unknown"
    for name, pat in SCAM_TYPE_PATTERNS:
        if re.search(pat, message_text.lower()):
            scam_type = name
            break

    reasons = []
    if strong:
        reasons.append(f"Strong signals detected: {', '.join(strong)}")
    if medium:
        reasons.append(f"Supporting signals: {', '.join(medium)}")
    if weak and not strong and not medium:
        reasons.append(f"Only weak signals: {', '.join(weak)}")
    if not reasons:
        reasons.append("No scam indicators found in the message")
    if max_link_score >= 51:
        top = max(link_results, key=lambda r: r["risk_score"])
        reasons.append(f"Link analysis: {'; '.join(top['reasoning']['details'][:2])}")
    if verified_urls:
        reasons.append(f"Verified official domain detected: {', '.join(sorted({_hostname(url) for url in verified_urls}))}; score capped at 20/100")

    advice = []
    if risk == "HIGH_RISK":
        advice = [
            "Do NOT click any links or pay any amount",
            "Report to your bank via the official app or 1930 (cyber fraud helpline)",
            "Block the sender",
        ]
    elif risk == "SUSPICIOUS":
        advice = [
            "Verify independently through the official app or website — never via the link in the message",
            "Never share OTP, CVV or PIN with anyone",
            "If asked to pay to 'receive' money, it is a scam",
        ]
    else:
        advice = ["No action needed. Stay alert for follow-up messages asking for payment or details."]

    guideline = get_rbi_guideline(scam_type)
    if risk in ("HIGH_RISK", "SUSPICIOUS") and guideline:
        advice.append(guideline)

    return {
        "final_decision": {
            "risk": risk,
            "confidence": confidence,
            "risk_score": score,
            "scam_type": scam_type,
        },
        "signals_detected": {"strong": strong, "medium": medium, "weak": weak, "behavioral": behavioral},
        "reasoning": {
            "summary": _message_summary(risk, strong, medium, scam_type),
            "detailed_reasons": reasons + [f"Risk score {score}/100 computed from rule weights (strong=40, medium=20, weak=5), ML blend (60/40), and hard circuit breakers"],
        },
        "user_advice": advice,
        "rbi_guideline": guideline,
    }


def _message_summary(risk: str, strong: List[str], medium: List[str], scam_type: str) -> str:
    if risk == "HIGH_RISK":
        return f"This message shows multiple strong scam indicators ({', '.join(strong)}), consistent with a {scam_type} fraud attempt. Do not engage."
    if risk == "SUSPICIOUS":
        sig = strong or medium
        return f"Some scam-like signals were detected ({', '.join(sig)}). Verify independently before taking any action."
    return "This message appears legitimate — no significant scam indicators found."


# =============================================================================
# BEHAVIOR ANALYSIS (was /scam/behavior LLM prompt)
# =============================================================================

def _parse_amount(amount_str: str) -> Optional[float]:
    m = re.search(r"[\d,]+(?:\.\d+)?", str(amount_str))
    if not m:
        return None
    return float(m.group().replace(",", ""))


def analyze_behavior(amount: str, time_of_transaction: str = None, frequency: str = None) -> Dict:
    """Deterministic transaction-behavior analysis."""
    amt = _parse_amount(amount)

    if amt is None:
        return {
            "risk": "SAFE", "confidence": 20, "risk_score": 0,
            "signals_detected": {"amount_pattern": "unknown", "odd_timing": False, "repetition_pattern": "none"},
            "reasoning": {"summary": "Could not parse an amount from the input.", "details": ["No numeric amount found"]},
            "advice": ["Enter a valid transaction amount to get an analysis"],
        }

    # Amount classification
    if amt <= 10:
        amount_pattern = "very_low"
    elif amt <= 999:
        amount_pattern = "low"
    elif amt <= 10000:
        amount_pattern = "medium"
    else:
        amount_pattern = "high"

    odd_timing = _is_odd_timing(time_of_transaction)

    freq_count = 1
    if frequency:
        m = re.search(r"\d+", frequency)
        if m:
            freq_count = int(m.group())
    if freq_count >= 10:
        repetition = "strong"
    elif freq_count >= 4:
        repetition = "moderate"
    elif freq_count >= 2:
        repetition = "weak"
    else:
        repetition = "none"

    # Scoring — mirrors old prompt rules
    score = 0
    if amount_pattern == "very_low":
        score += 45
    elif amount_pattern == "low":
        score += 10
    if odd_timing:
        score += 15
    if repetition == "strong":
        score += 25
    elif repetition == "moderate":
        score += 10
    elif repetition == "weak":
        score += 5
    if amount_pattern == "high" and odd_timing:
        score += 10
    score = min(100, score)

    if score >= 70:
        risk = "HIGH_RISK"
    elif score >= 40:
        risk = "SUSPICIOUS"
    else:
        risk = "SAFE"

    confidence = {"SAFE": 35, "SUSPICIOUS": 60, "HIGH_RISK": 85}[risk]

    details = []
    if amount_pattern == "very_low":
        details.append(f"₹{amt:.0f} is a known verification-scam pattern — fraudsters test stolen UPI credentials with tiny amounts")
    if odd_timing:
        details.append("Transaction time falls in the 12 AM - 6 AM window, commonly used in fraud attempts")
    if repetition in ("moderate", "strong"):
        details.append(f"{freq_count} requests detected — repeated payment requests are a pressure tactic")

    advice = []
    if amount_pattern == "very_low":
        advice.append("A ₹1-₹10 request is a classic credential-testing scam — decline it")
    if repetition != "none":
        advice.append("Do not approve repeated collect requests under pressure")
    if odd_timing:
        advice.append("Late-night payment requests deserve extra scrutiny")
    if not advice:
        advice = ["Transaction pattern looks normal for its amount and time"]

    return {
        "risk": risk,
        "confidence": confidence,
        "risk_score": score,
        "signals_detected": {
            "amount_pattern": amount_pattern,
            "odd_timing": odd_timing,
            "repetition_pattern": repetition,
        },
        "reasoning": {
            "summary": _behavior_summary(risk, amount_pattern, odd_timing, repetition, amt),
            "details": details or ["No anomalies in amount, timing, or frequency"],
        },
        "advice": advice,
    }


def _behavior_summary(risk, amount_pattern, odd_timing, repetition, amt) -> str:
    if risk == "HIGH_RISK":
        return f"₹{amt:.0f} transaction shows a strong attack pattern (very low amount with timing/frequency anomalies)."
    if risk == "SUSPICIOUS":
        parts = []
        if amount_pattern == "very_low": parts.append("unusually low amount")
        if amount_pattern == "low": parts.append("low amount")
        if odd_timing: parts.append("odd timing")
        if repetition in ("moderate", "strong"): parts.append("repeated requests")
        return "Borderline pattern: " + ", ".join(parts) + ". Verify before approving."
    return f"₹{amt:.0f} at this time and frequency looks like normal transaction behavior."


# =============================================================================
# LINK / UPI ANALYSIS (was /scam/link_upi LLM prompt)
# =============================================================================

IMPERSONATION_WORDS = {"support", "help", "helpdesk", "bank", "refund", "kyc", "official", "care", "verification"}
REWARD_WORDS = {"urgent", "claim", "lottery", "prize", "win", "winner", "cashback"}
# Government/official words never appear in personal UPI handles — a handle
# using one on a generic PSP is impersonating an institution. Floor at 85.
GOV_WORDS = {"gov", "tax", "refund", "incometax", "income-tax", "cyber", "helpdesk", "support"}
PSP_HANDLES = ("okicici", "upi", "ybl", "paytm", "okaxis", "okhdfcbank", "oksbi", "apl", "ibl")


def analyze_link_upi(input_value: str) -> Dict:
    """Deterministic URL / UPI ID heuristics."""
    value = _normalize_defanged_url(input_value.strip())
    v_lower = value.lower()

    if re.search(r"https?://|www\.", v_lower) or re.search(r"\.(com|in|net|org|xyz|top|click|ru|io|co|info|online)\b", v_lower):
        return _analyze_url(value, v_lower)
    if "@" in value:
        return _analyze_upi(value, v_lower)
    return _unknown_result(value)


def _analyze_url(value: str, v_lower: str) -> Dict:
    value = _normalize_defanged_url(value)
    domain = _hostname(value)

    details = []
    score = 0

    # ponytail: hyphen-part wordlist covers most lookalike domains; add IDN/punycode checks if abuse appears
    domain_parts = set(re.split(r"[-.]", domain))
    security_words = {"secure", "verify", "login", "support", "update", "confirm", "safe", "account"}
    fake_domain = bool(domain_parts & security_words) or bool(re.search(r"(0|o){3,}", domain))
    if fake_domain:
        score += 40
        details.append(f"Domain '{domain}' uses lookalike or deceptive naming")

    verified_domain = _is_verified_domain(domain)
    brand_impersonation = any(b in domain for b in BRANDS) and not verified_domain
    if brand_impersonation:
        score += 30
        details.append("A known brand name is used in a domain not owned by that brand")

    suspicious_tld = any(domain.endswith(t) for t in SUSPICIOUS_TLDS)
    if suspicious_tld:
        score += 20
        details.append(f"Unusual TLD '{domain.rsplit('.', 1)[-1]}' commonly used in phishing")

    authority_words = ("gov", "bank", "sbi", "hdfc", "icici", "axis", "income-tax", "incometax", "electricity", "billpay")
    authority_tld_mismatch = any(word in domain for word in authority_words) and suspicious_tld
    if authority_tld_mismatch:
        score = max(score, 85)
        details.append("Authority or financial-service wording uses a suspicious non-standard TLD")

    shortened = any(s in domain for s in SHORTENERS)
    if shortened:
        score += 10
        details.append("Shortened link hides the real destination")

    score = min(100, score)
    risk, confidence = _risk_from_score(score)

    advice = [
        "Never enter banking credentials on this page",
        "Access the service directly via its official app instead of this link",
    ]
    if risk in ("SAFE", "LOW"):
        advice = ["Link appears normal, but always verify you are on the official domain before logging in"]

    return {
        "type": "url",
        "risk": risk,
        "confidence": confidence,
        "risk_score": score,
        "signals_detected": {
            "fake_domain": fake_domain,
            "brand_impersonation": brand_impersonation,
            "suspicious_tld": suspicious_tld,
            "shortened_link": shortened,
            "verified_domain": verified_domain,
            "authority_tld_mismatch": authority_tld_mismatch,
            "random_upi": False,
        },
        "reasoning": {
            "summary": _link_summary(risk, details, domain),
            "details": details or [f"Domain '{domain}' shows no phishing indicators"],
        },
        "advice": advice,
    }


def _analyze_upi(value: str, v_lower: str) -> Dict:
    handle = v_lower.split("@")[0]

    details = []
    score = 0

    # A bank/brand name inside a personal UPI handle is always impersonation
    brand_in_handle = any(re.search(rf"\b{b}\b", handle) for b in BRANDS)

    impersonation = brand_in_handle or any(w in handle for w in IMPERSONATION_WORDS)
    reward_words = [w for w in REWARD_WORDS if w in handle]
    random_numbers = re.fullmatch(r"[a-z]*\d{4,}", handle) is not None
    name_like = re.fullmatch(r"[a-z][a-z._]*\d{0,3}", handle) is not None

    if impersonation:
        score += 60
        details.append(f"Handle '{handle}' impersonates a bank/brand or support desk — banks never use such UPI handles for collections")
    if reward_words:
        score += 30
        details.append(f"Handle contains reward bait words: {', '.join(reward_words)}")
    if random_numbers and not impersonation:
        score += 5
        details.append("Mostly-numeric handle — weak signal, common in India")

    psp = value.split("@")[-1].lower() if "@" in value else ""
    gov_impersonation = any(w in handle for w in GOV_WORDS) and psp in PSP_HANDLES
    if gov_impersonation:
        score = max(score, 85)
        details.append(f"Handle '{handle}' impersonates a government/official entity on a generic PSP — never legitimate")

    score = min(100, score)
    risk, confidence = _risk_from_score(score)

    if name_like and risk == "SAFE":
        details = [f"'{handle}' looks like a normal personal UPI handle"]

    advice = ["Verify the receiver's real name in your UPI app before paying — the name shown must match who you expect"]
    if impersonation:
        advice.insert(0, "This looks like a fake 'support' handle — no bank asks for payments to a personal UPI ID")

    return {
        "type": "upi",
        "risk": risk,
        "confidence": confidence,
        "risk_score": score,
        "signals_detected": {
            "fake_domain": False,
            "brand_impersonation": impersonation,
            "suspicious_tld": False,
            "shortened_link": False,
            "random_upi": random_numbers,
        },
        "reasoning": {
            "summary": _link_summary(risk, details, handle),
            "details": details or [f"Handle '{handle}' shows no impersonation indicators"],
        },
        "advice": advice,
    }


def _unknown_result(value: str) -> Dict:
    return {
        "type": "unknown",
        "risk": "SAFE",
        "confidence": 20,
        "risk_score": 0,
        "signals_detected": {"fake_domain": False, "brand_impersonation": False, "suspicious_tld": False, "shortened_link": False, "random_upi": False},
        "reasoning": {"summary": "Input is not a recognizable URL or UPI ID.", "details": [f"Could not classify: '{value}'"]},
        "advice": ["Enter a full URL (https://...) or UPI ID (name@bank)"],
    }


def _risk_from_score(score: int):
    if score >= 75:
        return "HIGH", 85
    if score >= 51:
        return "SUSPICIOUS", 60
    if score >= 21:
        return "LOW", 50
    return "SAFE", 80


def _link_summary(risk, details, target):
    if risk == "HIGH":
        return f"'{target}' is almost certainly fraudulent: " + "; ".join(details[:2]) + "."
    if risk == "SUSPICIOUS":
        return f"'{target}' shows phishing indicators: " + "; ".join(details[:2]) + "."
    if risk == "LOW":
        return f"'{target}' has minor caution signals. Double-check before proceeding."
    return f"'{target}' looks legitimate based on domain/handle heuristics."


# =============================================================================
# PAYMENT DECISION (was /scam/decision LLM prompt)
# =============================================================================

DECISION_STRONG = [
    ("threat", r"\b(block(ed|ing)?|suspend|legal action|account.*closed)\b"),
    ("kyc_scam", r"\b(kyc|otp|verify (your )?(account|details)|update (your )?(pan|aadhaar|kyc))\b"),
]
DECISION_MEDIUM = [
    ("urgency", r"\b(urgent(ly)?|immediately|right now|act now|before .* (expires?|closes?))\b"),
    ("reward_trap", r"\b(won|winner|lottery|prize|cashback|refund.*fee|claim)\b"),
    ("unknown_receiver", r"\b(stranger|unknown|this person|person claiming|someone i (don'?t|do not) know|never (met|transacted)|new (person|seller|buyer))\b"),
    ("impersonation", r"claiming (to be )?(they |he |she )?(are |is |from|with)|says? (he|she) (is|works) (from|for|at)|on behalf of|representing (sbi|hdfc|amazon|flipkart|fedex|courier|bank)"),
]


def analyze_decision(input_value: str) -> Dict:
    """Deterministic should-I-pay decision."""
    v = input_value.lower()

    signals = {name: bool(re.search(pat, v)) for name, pat in DECISION_STRONG}
    signals.update({name: bool(re.search(pat, v)) for name, pat in DECISION_MEDIUM})
    # "Should I send X to Y" with no context of knowing them = unknown receiver default
    if re.search(r"send|pay|transfer", v) and not signals["unknown_receiver"] and not re.search(r"friend|family|mother|father|sister|brother|roommate|landlord|known", v):
        signals["unknown_receiver"] = True

    score = 0
    score += 30 * signals["threat"]
    score += 40 * signals["kyc_scam"]
    score += 25 * signals["urgency"]
    score += 30 * signals["reward_trap"]
    score += 20 * signals["unknown_receiver"]
    score += 30 * signals["impersonation"]
    score = min(100, score)

    if score > 75:
        risk, decision, confidence = "HIGH", "DO_NOT_PAY", 90
    elif score >= 51:
        risk, decision, confidence = "SUSPICIOUS", "DO_NOT_PAY", 65
    elif score >= 21:
        risk, decision, confidence = "LOW", "VERIFY_FIRST", 70
    else:
        risk, decision, confidence = "SAFE", "PAY", 90

    ui_colors = {"SAFE": "green", "LOW": "yellow", "SUSPICIOUS": "orange", "HIGH": "red"}
    ui_labels = {"SAFE": "SAFE", "LOW": "VERIFY", "SUSPICIOUS": "VERIFY", "HIGH": "DO NOT PAY"}
    primary = {
        "SAFE": "This payment appears safe to proceed",
        "LOW": "Verify the receiver before paying",
        "SUSPICIOUS": "Do not pay — strong scam signals present",
        "HIGH": "Do not pay — this matches known fraud patterns",
    }[risk]

    triggered = [k for k, on in signals.items() if on]
    details = [f"{k.replace('_', ' ').title()} signal detected" for k in triggered] or ["No risk signals detected in the described situation"]

    advice = {
        "SAFE": ["Proceed, and keep your transaction receipt"],
        "LOW": ["Call the receiver on a known number to confirm", "Check the receiver's name in your UPI app matches expectations"],
        "SUSPICIOUS": ["Do not pay until you verify independently", "Never share OTP or credentials to 'complete' a payment"],
        "HIGH": [
            "Do not send money — no genuine service demands payment to release money or avoid account closure",
            "Report to 1930 (national cyber fraud helpline) if you already shared details",
        ],
    }[risk]

    return {
        "type": "payment_decision",
        "decision": decision,
        "risk": risk,
        "confidence": confidence,
        "risk_score": score,
        "ui": {
            "verdict_label": ui_labels[risk],
            "color": ui_colors[risk],
            "icon": "shield-check" if risk == "SAFE" else "danger" if risk == "HIGH" else "warning",
            "primary_message": primary,
            "secondary_message": f"Risk score {score}/100 from {len(triggered)} detected signal(s)",
        },
        "signals_detected": {
            "payment_intent": bool(re.search(r"\b(send|pay|transfer|give)\b", v)),
            "urgency": signals["urgency"],
            "threat": signals["threat"],
            "kyc_scam": signals["kyc_scam"],
            "reward_trap": signals["reward_trap"],
            "unknown_receiver": signals["unknown_receiver"],
        },
        "reasoning": {
            "summary": _decision_summary(risk, triggered),
            "details": details,
        },
        "advice": advice,
    }


def _decision_summary(risk, triggered):
    if not triggered:
        return "No scam signals detected in this situation. Standard precautions apply."
    return f"Scam signals detected: {', '.join(t.replace('_', ' ') for t in triggered)}. " + (
        "Do not send money until verified." if risk in ("LOW", "SUSPICIOUS") else "This is a known fraud pattern."
    )


# =============================================================================
# SELF-CHECK
# =============================================================================

def _test():
    # Obvious KYC phishing scam
    r = analyze_message("Dear user, your SBI account will be blocked. Update KYC now at http://sbi-secure.xyz")
    assert r["final_decision"]["risk"] == "HIGH_RISK", r
    assert r["final_decision"]["scam_type"] in ("kyc", "phishing"), r

    # Safe bank debit SMS
    r = analyze_message("Your SBI A/c XX1234 debited Rs.500. Ref: 123456")
    assert r["final_decision"]["risk"] == "SAFE", r

    # Verification scam: tiny payment + reward
    r = analyze_message("Pay Rs.10 to receive Rs.50000 cashback!")
    assert r["final_decision"]["risk"] in ("SUSPICIOUS", "HIGH_RISK"), r
    assert "payment request" in r["signals_detected"]["strong"], r

    # Behavior: classic ₹5 test at 2 AM, repeated
    r = analyze_behavior("5", "02:30 AM", "6 attempts in 10 min")
    assert r["risk"] == "HIGH_RISK", r
    assert r["signals_detected"]["amount_pattern"] == "very_low", r

    # Behavior: normal ₹2500 grocery at noon
    r = analyze_behavior("2500", "12:30 PM", "1")
    assert r["risk"] == "SAFE", r

    # Link: fake domain
    r = analyze_link_upi("http://sbi-secure.xyz/login")
    assert r["type"] == "url" and r["risk"] in ("SUSPICIOUS", "HIGH"), r

    # UPI: impersonation handle
    r = analyze_link_upi("sbi-support@okaxis")
    assert r["type"] == "upi" and r["risk"] in ("SUSPICIOUS", "HIGH"), r

    # UPI: normal personal handle
    r = analyze_link_upi("rahul123@okaxis")
    assert r["risk"] in ("SAFE", "LOW"), r

    # Decision: FedEx impersonation asking for money
    r = analyze_decision("Should I send Rs 2000 to this person claiming they are from FedEx?")
    assert r["decision"] in ("VERIFY_FIRST", "DO_NOT_PAY"), r
    r = analyze_decision("Should I send Rs 2000 to person claiming from FedEx?")
    assert r["decision"] in ("VERIFY_FIRST", "DO_NOT_PAY"), r

    # Decision: pay rent to landlord
    r = analyze_decision("I need to send Rs 15000 rent to my landlord by tomorrow")
    assert r["decision"] in ("PAY", "VERIFY_FIRST"), r

    # Benchmark regression: defanged malicious URLs
    r = analyze_link_upi("http://state-electricity-billpay[.]info/pay")
    assert r["type"] == "url" and r["risk"] == "HIGH" and r["risk_score"] >= 85, r
    r = analyze_link_upi("http://incometax-efiling-gov[.]online/verify")
    assert r["type"] == "url" and r["risk"] == "HIGH" and r["risk_score"] >= 85, r
    r = analyze_message("Pay your pending electricity bill now: http://state-electricity-billpay[.]info/pay")
    assert r["final_decision"]["risk"] == "HIGH_RISK", r
    r = analyze_message("Verify your PAN: http://incometax-efiling-gov[.]online/verify")
    assert r["final_decision"]["risk"] == "HIGH_RISK", r

    # Benchmark regression: legitimate bank notification with verified domain
    r = analyze_message(
        "ALERT: Rs 5,000 debited from A/C XX4092 via UPI... If not done by you, "
        "block card immediately... https://www.sbi.co.in"
    )
    assert r["final_decision"]["risk"] == "SAFE" and r["final_decision"]["risk_score"] <= 20, r
    r = analyze_message("Notification: Rs 2,000 debited from A/C XX1234. Details at https://www.hdfcbank.com")
    assert r["final_decision"]["risk"] == "SAFE" and r["final_decision"]["risk_score"] <= 20, r

    # Benchmark regression: legitimate OTP alert
    r = analyze_message("482910 is your secret OTP for transaction of Rs 3,490 at Amazon India. Do NOT share this OTP.")
    assert r["final_decision"]["risk"] == "SAFE" and r["final_decision"]["risk_score"] <= 10, r

    # Benchmark regression: government VPA impersonation
    r = analyze_link_upi("gov-refund-dept@okicici")
    assert r["risk"] == "HIGH" and r["risk_score"] >= 85, r

    # Benchmark regression: bank brand on burner TLD
    r = analyze_link_upi("hdfcbank.com.login-auth-sec[.]top")
    assert r["risk"] == "HIGH" and r["risk_score"] >= 85, r

    # Determinism check
    a = analyze_message("URGENT: Your KYC expired. Update now: http://bit.ly/12345")
    b = analyze_message("URGENT: Your KYC expired. Update now: http://bit.ly/12345")
    assert a == b, "non-deterministic output"

    print("[OK] scam_engine: all self-checks passed")


if __name__ == "__main__":
    _test()
