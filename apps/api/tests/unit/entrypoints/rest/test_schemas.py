from entrypoints.rest.schemas import error_response_content
from modules.shared.errors import ApplicationError, UnauthorizedError


def test_error_response_content_maps_application_errors() -> None:
    error = ApplicationError(
        message="Invalid operation.",
        fields={"name": "Name is required."},
    )

    assert error_response_content(error) == {
        "error": {
            "code": "application_error",
            "message": "Invalid operation.",
            "fields": {"name": "Name is required."},
        }
    }


def test_unauthorized_error_uses_shared_error_contract() -> None:
    error = UnauthorizedError()

    assert error.code == "unauthorized"
    assert error.message == "Missing or invalid credential."
    assert error.fields is None
