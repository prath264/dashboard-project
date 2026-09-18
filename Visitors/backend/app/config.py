from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ms_client_id: str = ""
    ms_tenant_id: str = ""
    ms_client_secret: str = ""
    ms_service_account_email: str = ""

    graph_scope: str = "https://graph.microsoft.com/.default"
    graph_base_url: str = "https://graph.microsoft.com/v1.0"

    # Base URL for generating approval links in emails
    # Defaults to localhost for development
    app_base_url: str = "http://localhost:8000"

    @property
    def graph_configured(self) -> bool:
        return bool(
            self.ms_client_id
            and self.ms_tenant_id
            and self.ms_client_secret
            and self.ms_service_account_email
        )

    @property
    def msal_authority(self) -> str:
        return f"https://login.microsoftonline.com/{self.ms_tenant_id}"


@lru_cache
def get_settings() -> Settings:
    return Settings()