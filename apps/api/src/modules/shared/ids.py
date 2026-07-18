import secrets
import time
from uuid import UUID


def uuid7() -> UUID:
    timestamp_ms = (time.time_ns() // 1_000_000) & ((1 << 48) - 1)
    rand_a = secrets.randbits(12)
    rand_b = secrets.randbits(62)

    return UUID(
        int=(
            (timestamp_ms << 80)
            | (0x7 << 76)
            | (rand_a << 64)
            | (0b10 << 62)
            | rand_b
        )
    )
