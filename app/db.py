"""Gestión de la conexión a MongoDB e inicialización de índices únicos."""

import logging
from typing import Optional
from pymongo import ASCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.config import get_settings

logger = logging.getLogger(__name__)

_client: Optional[MongoClient] = None


def get_mongo_client() -> MongoClient:
    """Obtiene o inicializa el cliente de MongoDB sin exponer credenciales en logs."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = MongoClient(
            settings.mongo_uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
        )
    return _client


def get_database() -> Database:
    """Devuelve la instancia de la base de datos configurada (optaGestionDeDatos)."""
    settings = get_settings()
    client = get_mongo_client()
    return client[settings.mongo_db_name]


def get_collection() -> Collection:
    """Devuelve la colección principal REGISTRO-PACIENTES."""
    settings = get_settings()
    db = get_database()
    return db[settings.mongo_collection_name]


def ensure_indexes(collection: Optional[Collection] = None) -> None:
    """
    Crea los índices únicos para las llaves naturales de la colección:
    - id_tutor (único por documento de tutor)
    - pacientes.id_paciente (único por paciente dentro del arreglo anidado)
    """
    target_collection = collection if collection is not None else get_collection()
    try:
        target_collection.create_index(
            [("id_tutor", ASCENDING)],
            unique=True,
            name="idx_unique_id_tutor",
        )
        target_collection.create_index(
            [("pacientes.id_paciente", ASCENDING)],
            unique=True,
            name="idx_unique_id_paciente",
        )
    except Exception:
        logger.warning(
            "No se pudieron verificar o crear los índices al iniciar. "
            "Verifique la conectividad o permisos del usuario en la base de datos."
        )


def close_mongo_client() -> None:
    """Cierra la conexión activa de MongoDB si existe."""
    global _client
    if _client is not None:
        _client.close()
        _client = None
