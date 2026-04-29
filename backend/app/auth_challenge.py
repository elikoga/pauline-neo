import base64
import hashlib
import hmac
import json
import secrets
import time
from dataclasses import dataclass

from app.config.api import api_settings

CHALLENGE_TTL_SECONDS = 10 * 60


@dataclass(frozen=True)
class Challenge:
    question: str
    answers: tuple[str, ...]


NUMBER_WORDS = {
    1: "eins",
    2: "zwei",
    3: "drei",
    4: "vier",
    5: "fünf",
    6: "sechs",
    7: "sieben",
    8: "acht",
    9: "neun",
    10: "zehn",
    11: "elf",
    12: "zwölf",
    13: "dreizehn",
    14: "vierzehn",
    15: "fünfzehn",
    16: "sechzehn",
    17: "siebzehn",
    18: "achtzehn",
}

COLOR_QUESTIONS = [
    Challenge("Welche Farbe hat eine reife Banane meistens?", ("gelb",)),
    Challenge("Welche Farbe hat Gras meistens?", ("grün", "gruen")),
    Challenge("Welche Farbe hat Schnee meistens?", ("weiß", "weiss")),
]


def _signing_key() -> bytes:
    material = ",".join(str(key) for key in api_settings.API_KEYS) or api_settings.PROJECT_NAME
    return hashlib.sha256(f"pauline-auth-challenge:{material}".encode("utf-8")).digest()


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64decode(encoded: str) -> bytes:
    padding = "=" * (-len(encoded) % 4)
    return base64.urlsafe_b64decode(encoded + padding)


def normalize_answer(answer: str) -> str:
    return (
        answer.strip()
        .casefold()
        .replace(" ", "")
        .replace("-", "")
        .replace("+", "")
        .replace(".", "")
        .replace(",", "")
    )


def numeric_answers(value: int) -> tuple[str, ...]:
    word = NUMBER_WORDS[value]
    ascii_word = word.replace("ü", "ue").replace("ö", "oe").replace("ä", "ae").replace("ß", "ss")
    return (str(value), word, ascii_word, f"={value}")


def arithmetic_challenge() -> Challenge:
    left = secrets.randbelow(8) + 2
    right = secrets.randbelow(8) + 2
    result = left + right
    return Challenge(
        f"Was ist {NUMBER_WORDS[left]} plus {NUMBER_WORDS[right]}?",
        numeric_answers(result),
    )


def generate_challenge() -> Challenge:
    challenge_factories = [arithmetic_challenge, lambda: secrets.choice(COLOR_QUESTIONS)]
    return secrets.choice(challenge_factories)()


def issue_challenge() -> tuple[str, str]:
    challenge = generate_challenge()
    payload = {
        "question": challenge.question,
        "answers": list(challenge.answers),
        "expires_at": int(time.time()) + CHALLENGE_TTL_SECONDS,
        "nonce": secrets.token_urlsafe(16),
    }
    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = _b64encode(payload_json)
    signature = hmac.new(_signing_key(), payload_b64.encode("ascii"), hashlib.sha256).digest()
    return challenge.question, f"{payload_b64}.{_b64encode(signature)}"


def verify_challenge(challenge_token: str, answer: str) -> bool:
    try:
        payload_b64, signature_b64 = challenge_token.split(".", 1)
        expected_signature = hmac.new(
            _signing_key(), payload_b64.encode("ascii"), hashlib.sha256
        ).digest()
        if not hmac.compare_digest(expected_signature, _b64decode(signature_b64)):
            return False
        payload = json.loads(_b64decode(payload_b64))
    except (ValueError, json.JSONDecodeError, TypeError):
        return False

    if int(payload.get("expires_at", 0)) < int(time.time()):
        return False

    normalized = normalize_answer(answer)
    return normalized in {normalize_answer(answer) for answer in payload.get("answers", [])}
