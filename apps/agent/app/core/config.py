from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "yeho-ai-agent"
    environment: str = "local"

    model_config = SettingsConfigDict(
        env_prefix="YEHO_AGENT_",
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
