from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

SAFE_VALIDATION_ERROR = {
    "error": {
        "code": "validation_error",
        "message": "Request input is invalid.",
        "fields": None,
    }
}


def register_rest_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    def validation_exception_handler(
        _request: Request, _exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content=SAFE_VALIDATION_ERROR,
        )
