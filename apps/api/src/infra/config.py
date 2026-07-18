from urllib.parse import urlparse

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = Field(min_length=1)
    idp_base_url: str = "http://localhost:8001"
    idp_auth_timeout_seconds: float = Field(default=2.0, gt=0)

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, url: str) -> str:
        normalized_url = url.strip()
        if not normalized_url:
            raise ValueError("must be set")
        parsed_url = urlparse(normalized_url)
        if parsed_url.scheme not in {
            "postgres",
            "postgresql",
            "postgresql+psycopg",
        }:
            raise ValueError("must be a Postgres-compatible URL")
        if not parsed_url.netloc or not parsed_url.path.strip("/"):
            raise ValueError("must include host and database name")
        return normalized_url

    @field_validator("idp_base_url")
    @classmethod
    def validate_idp_base_url(cls, url: str) -> str:
        return cls._validate_optional_http_url(url) or "http://localhost:8001"

    @classmethod
    def _validate_optional_http_url(cls, url: str) -> str:
        normalized_url = url.strip().rstrip("/")
        if not normalized_url:
            return ""

        parsed_url = urlparse(normalized_url)
        if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
            raise ValueError("must be an absolute HTTP(S) URL")
        if parsed_url.query or parsed_url.fragment:
            raise ValueError("must not include query or fragment")
        return normalized_url
