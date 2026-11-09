"""Endpoints de análisis estadístico y financiero con Aggregation Pipelines de MongoDB."""

from typing import Any
from fastapi import APIRouter, Depends, Query, status
from pymongo.collection import Collection

from app.db import get_collection
from app.services import analisis_service

router = APIRouter(prefix="/api/v1/analisis", tags=["Análisis y Estadísticas"])


@router.get(
    "/resumen-general",
    status_code=status.HTTP_200_OK,
    summary="Resumen demográfico y clínico global de la colección",
)
def resumen_general(
    collection: Collection = Depends(get_collection),
) -> dict[str, Any]:
    return analisis_service.obtener_resumen_general(collection)


@router.get(
    "/padecimientos-frecuentes",
    status_code=status.HTTP_200_OK,
    summary="Top de padecimientos o motivos de visita más comunes",
)
def padecimientos_frecuentes(
    limit: int = Query(default=10, ge=1, le=50, description="Cantidad máxima de resultados."),
    collection: Collection = Depends(get_collection),
) -> list[dict[str, Any]]:
    return analisis_service.obtener_padecimientos_frecuentes(collection, limit=limit)


@router.get(
    "/ingresos",
    status_code=status.HTTP_200_OK,
    summary="Análisis de ingresos brutos, netos (con descuento) y facturas por forma de pago",
)
def ingresos_por_forma_pago(
    collection: Collection = Depends(get_collection),
) -> dict[str, Any]:
    return analisis_service.obtener_ingresos_por_forma_pago(collection)


@router.get(
    "/cirugias-resumen",
    status_code=status.HTTP_200_OK,
    summary="Estadísticas de cirugías agrupadas por tipo y uso de anestesia",
)
def resumen_cirugias(
    collection: Collection = Depends(get_collection),
) -> list[dict[str, Any]]:
    return analisis_service.obtener_resumen_cirugias(collection)


@router.get(
    "/expedientes-por-tutor",
    status_code=status.HTTP_200_OK,
    summary="Resumen de pacientes, consultas y cirugías agrupado por tutor",
)
def resumen_por_tutor(
    collection: Collection = Depends(get_collection),
) -> list[dict[str, Any]]:
    return analisis_service.obtener_resumen_por_tutor(collection)
