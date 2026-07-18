from uuid import RFC_4122

from modules.shared.ids import uuid7


def test_uuid7_generates_rfc_compatible_version_7_uuid() -> None:
    value = uuid7()

    assert value.version == 7
    assert value.variant == RFC_4122
