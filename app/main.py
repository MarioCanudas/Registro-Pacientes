"""Punto de entrada principal de la aplicación FastAPI para Registro de Pacientes."""

from contextlib import asynccontextmanager
from typing import Any
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.collection import Collection
from pymongo.errors import PyMongoError

from app.config import get_settings
from app.db import close_mongo_client, ensure_indexes, get_collection
from app.routers import analisis, pacientes


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    """Inicializa índices únicos al arrancar y cierra conexiones al apagar."""
    override_fn = app_instance.dependency_overrides.get(get_collection)
    target_collection = override_fn() if override_fn is not None else None
    ensure_indexes(target_collection)
    yield
    close_mongo_client()


settings = get_settings()

app = FastAPI(
    title="API REST - Registro de Pacientes Pediátricos",
    description=(
        "Expediente clínico digital de tutores con pacientes, historial de consultas, "
        "padecimientos, cirugías y pagos sobre MongoDB Atlas (optaGestionDeDatos / REGISTRO-PACIENTES)."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)


@app.exception_handler(PyMongoError)
async def pymongo_exception_handler(_request: Request, _exc: PyMongoError) -> JSONResponse:
    """Captura errores de PyMongo evitando filtrar cadenas de conexión o credenciales."""
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "detail": "Error de comunicación con la base de datos. Intente nuevamente más tarde."
        },
    )


@app.get(
    "/health",
    status_code=status.HTTP_200_OK,
    tags=["Salud del Sistema"],
    summary="Verificar la conexión con MongoDB",
)
def health_check(
    collection: Collection = Depends(get_collection),
) -> dict[str, Any]:
    """Ejecuta un comando ping en la base de datos para comprobar disponibilidad."""
    try:
        collection.database.command("ping")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No fue posible establecer conexión con la base de datos MongoDB.",
        ) from exc

    return {
        "status": "ok",
        "database": collection.database.name,
        "collection": collection.name,
    }


app.include_router(pacientes.router)
app.include_router(analisis.router)
