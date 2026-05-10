"""
Transaction type classification for insider transactions.

All classification of raw transaction_type strings flows through
categorize_transaction_type(). Backend (serializer, signal computation)
and any future consumers should import from here.
"""

# Grant keywords checked first so they take priority over buy keywords.
# "tildelt" appears in the DB in many surface forms:
#   Tildeling, Tildelt, Tildeles, Grant, Award, Allocation, Subscription,
#   Tegningsret, Vesting, Warrantprogram …
_GRANT_KEYWORDS = (
    # Danish
    "tildeling",    # grant / allocation
    "tildelt",      # granted
    "tildeles",     # is granted
    "modtaget",     # received (shares/options)
    "modnede",      # matured/vested (modnede præstationsaktier)
    "allokering",   # allocation (allokering af aktieoptioner)
    "levering",     # delivery (levering af aktier ved vesting)
    "tegningsret",  # subscription right / warrant
    "warrantprogram",
    "betinget tildeling",  # conditional grant
    # English
    "grant",
    "award",
    "allocation",
    "subscription",
    "vesting",
    "delivery",     # delivery of shares upon vesting
)

_BUY_KEYWORDS = (
    "køb",
    "erhvervelse",
    "udnyttelse",
    "tegning",
    "buy",
    "purchase",
    "acquisition",
    "exercise",
)

_SELL_KEYWORDS = (
    "salg",
    "afhændelse",
    "afståelse",
    "sell",
    "sale",
    "disposal",
)


def categorize_transaction_type(ttype: str) -> str:
    """Return 'buy', 'sell', 'grant', or 'other' for a raw transaction_type string."""
    t = (ttype or "").lower()
    if any(k in t for k in _GRANT_KEYWORDS):
        return "grant"
    if any(k in t for k in _BUY_KEYWORDS):
        return "buy"
    if any(k in t for k in _SELL_KEYWORDS):
        return "sell"
    return "other"
