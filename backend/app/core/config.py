from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480          # 8 horas (era 7 días)
    refresh_token_expire_minutes: int = 10080       # 7 días para refresh
    app_env: str = "development"
    cors_origins: str = "http://localhost:5173"
    timezone: str = "America/Bogota"

    # Rate limiting login
    login_max_attempts: int = 5
    login_window_seconds: int = 300                 # 5 minutos

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
