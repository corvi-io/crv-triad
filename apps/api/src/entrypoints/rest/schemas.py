from pydantic import BaseModel

from modules.shared.errors import ApplicationError


class ErrorBody(BaseModel):
    code: str
    message: str
    fields: dict[str, str] | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody


def error_response_content(error: ApplicationError) -> dict[str, object]:
    return {
        "error": {
            "code": error.code,
            "message": error.message,
            "fields": error.fields,
        }
    }
