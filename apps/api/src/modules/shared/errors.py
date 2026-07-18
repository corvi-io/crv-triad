class ApplicationError(Exception):
    code = "application_error"
    message = "Application operation failed."

    def __init__(
        self, message: str | None = None, fields: dict[str, str] | None = None
    ) -> None:
        super().__init__(message or self.message)
        self.message = message or self.message
        self.fields = fields


class UnauthorizedError(ApplicationError):
    code = "unauthorized"
    message = "Missing or invalid credential."
