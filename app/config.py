"""Configuración centralizada del proyecto mediante variables de entorno."""

from functools import lru_cache
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración leída desde variables de entorno o archivo .env."""

    mongo_uri: str = Field(
        ...,
        validation_alias=AliasChoices("MONGO_URI", "MONGODB_URI"),
        min_length=1,
    )
    mongo_db_name: str = Field(default="optaGestionDeDatos", alias="MONGO_DB_NAME")
    mongo_collection_name: str = Field(
        default="REGISTRO-PACIENTES", alias="MONGO_COLLECTION_NAME"
    )
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:8000",
        alias="CORS_ORIGINS",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    @property
    def allowed_origins(self) -> list[str]:
        """Devuelve la lista de orígenes permitidos para CORS, evitando '*' por defecto."""
        origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        return origins or ["http://localhost:8000"]


@lru_cache
def get_settings() -> Settings:
    """Retorna la instancia cacheada de configuración."""
    return Settings()
