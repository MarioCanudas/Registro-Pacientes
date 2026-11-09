"""Endpoints CRUD para expedientes de tutores, pacientes, consultas y cirugías."""

from typing import Any, Literal, Optional
from fastapi import APIRouter, Depends, Path, Query, Response, status
from pymongo.collection import Collection

from app.db import get_collection
from app.models import (
    Cirugia,
    CirugiaUpdate,
    Consulta,
    ConsultaUpdate,
    ExpedienteTutor,
    Paciente,
    PacienteUpdate,
    TutorUpdate,
)
from app.services import pacientes_service

router = APIRouter(prefix="/api/v1", tags=["Registro de Pacientes"])


# =====================================================================
# 1. ENDPOINTS DE EXPEDIENTES DE TUTORES (Colección REGISTRO-PACIENTES)
# =====================================================================


@router.post(
    "/tutores",
    status_code=status.HTTP_201_CREATED,
    summary="Crear un nuevo expediente de tutor con sus pacientes",
)
def crear_tutor(
    expediente: ExpedienteTutor,
    collection: Collection = Depends(get_collection),
) -> dict[str, Any]:
    return pacientes_service.crear_expediente(collection, expediente)


@router.get(
    "/tutores",
    status_code=status.HTTP_200_OK,
    summary="Listar expedientes de tutores con paginación y filtros",
)
def listar_tutores(
    skip: int = Query(default=0, ge=0, description="Documentos a omitir."),
    limit: int = Query(default=20, ge=1, le=100, description="Máximo de documentos a devolver."),
    tutor: Optional[str] = Query(default=None, min_length=1, max_length=120, description="Filtro por nombre de tutor."),
    genero: Optional[Literal["M", "F"]] = Query(default=None, description="Filtrar expedientes con pacientes de este género."),
    edad_min: Optional[int] = Query(default=None, ge=0, le=120, description="Edad mínima del paciente."),
    edad_max: Optional[int] = Query(default=None, ge=0, le=120, description="Edad máxima del paciente."),
    padecimiento: Optional[str] = Query(default=None, min_length=1, max_length=120, description="Filtrar por padecimiento en consultas."),
    collection: Collection = Depends(get_collection),
) -> dict[str, Any]:
    return pacientes_service.listar_expedientes(
        collection=collection,
        skip=skip,
        limit=limit,
        tutor=tutor,
        genero=genero,
        edad_min=edad_min,
        edad_max=edad_max,
        padecimiento=padecimiento,
    )


@router.get(
    "/tutores/{id_tutor}",
    status_code=status.HTTP_200_OK,
    summary="Obtener un expediente por su llave natural (id_tutor)",
)
def obtener_tutor(
    id_tutor: int = Path(..., ge=1, description="Llave natural única del tutor."),
    collection: Collection = Depends(get_collection),
) -> dict[str, Any]:
    return pacientes_service.obtener_expediente_por_id_tutor(collection, id_tutor)


@router.put(
    "/tutores/{id_tutor}",
    status_code=status.HTTP_200_OK,
    summary="Reemplazar completamente un expediente de tutor",
)
def reemplazar_tutor(
    expediente: ExpedienteTutor,
    id_tutor: int = Path(..., ge=1, description="Llave natural única del tutor."),
    collection: Collection = Depends(get_collection),
) -> dict[str, Any]:
    return pacientes_service.reemplazar_expediente(collection, id_tutor, expediente)


@router.patch(
    "/tutores/{id_tutor}",
    status_code=status.HTTP_200_OK,
    summary="Actualizar parcialmente los datos de un tutor o su lista de pacientes",
)
def actualizar_tutor(
    datos: TutorUpdate,
    id_tutor: int = Path(..., ge=1, description="Llave natural única del tutor."),
    collection: Collection = Depends(get_collection),
) -> dict[str, Any]:
    return pacientes_service.actualizar_expediente_parcial(collection, id_tutor, datos)


@router.delete(
    "/tutores/{id_tutor}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un expediente de tutor por su llave natural",
)
def eliminar_tutor(
    id_tutor: int = Path(..., ge=1, description="Llave natural única del tutor."),
    collection: Collection = Depends(get_collection),
) -> Response:
    pacientes_service.eliminar_expediente(collection, id_tutor)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# =====================================================================
# 2. ENDPOINTS DE PACIENTES (Por llave natural id_paciente)
# =====================================================================


@router.get(
    "/pacientes",
    status_code=status.HTTP_200_OK,
    summary="Listar pacientes de todos los expedientes con paginación y filtros",
)
def listar_pacientes(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    genero: Optional[Literal["M", "F"]] = Query(default=None),
    edad_min: Optional[int] = Query(default=None, ge=0, le=120),
    edad_max: Optional[int] = Query(default=None, ge=0, le=120),
    nombre: Optional[str] = Query(default=None, min_length=1, max_length=120),
    collection: Collection = Depends(get_collection),
) -> dict[str, Any]:
    return pacientes_service.listar_pacientes(
        collection=collection,
        skip=skip,
        limit=limit,
        genero=genero,
        edad_min=edad_min,
        edad_max=edad_max,
        nombre=nombre,
    )


@router.get(
    "/pacientes/{id_paciente}",
    status_code=status.HTTP_200_OK,
    summary="Obtener un paciente por su llave natural (id_paciente)",
)
def obtener_paciente(
    id_paciente: int = Path(..., ge=1, description="Llave natural única del paciente."),
    collection: Collection = Depends(get_collection),
) -> dict[str, Any]:
    return pacientes_service.obtener_paciente_por_id(collection, id_paciente)


@router.post(
    "/tutores/{id_tutor}/pacientes",
    status_code=status.HTTP_201_CREATED,
    summary="Agregar un nuevo paciente al expediente de un tutor",
)
def agregar_paciente(
    paciente: Paciente,
    id_tutor: int = Path(..., ge=1, description="Llave natural del tutor."),
    collection: Collection = Depends(get_collection),
) -> dict[str, Any]:
    return pacientes_service.agregar_paciente_a_tutor(collection, id_tutor, paciente)


@router.patch(
    "/pacientes/{id_paciente}",
    status_code=status.HTTP_200_OK,
    summary="Actualizar los datos de un paciente por su id_paciente",
)
def actualizar_paciente(
    datos: PacienteUpdate,
    id_paciente: int = Path(..., ge=1, description="Llave natural única del paciente."),
    collection: Collection = Depends(get_collection),
) -> dict[str, Any]:
    return pacientes_service.actualizar_paciente(collection, id_paciente, datos)


@router.delete(
    "/pacientes/{id_paciente}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un paciente del expediente de su tutor",
)
def eliminar_paciente(
    id_paciente: int = Path(..., ge=1, description="Llave natural única del paciente."),
    collection: Collection = Depends(get_collection),
) -> Response:
    pacientes_service.eliminar_paciente(collection, id_paciente)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# =====================================================================
# 3. ENDPOINTS DE CONSULTAS (Por id_paciente)
# =====================================================================


@router.get(
    "/pacientes/{id_paciente}/consultas",
    status_code=status.HTTP_200_OK,
    summary="Listar el historial de consultas de un paciente",
)
def listar_consultas(
    id_paciente: int = Path(..., ge=1, description="Llave natural del paciente."),
    collection: Collection = Depends(get_collection),
) -> list[dict[str, Any]]:
    return pacientes_service.listar_consultas_paciente(collection, id_paciente)


@router.post(
    "/pacientes/{id_paciente}/consultas",
    status_code=status.HTTP_201_CREATED,
    summary="Registrar una nueva consulta para un paciente",
)
def agregar_consulta(
    consulta: Consulta,
    id_paciente: int = Path(..., ge=1, description="Llave natural del paciente."),
    collection: Collection = Depends(get_collection),
) -> dict[str, Any]:
    return pacientes_service.agregar_consulta_paciente(collection, id_paciente, consulta)


@router.patch(
    "/pacientes/{id_paciente}/consultas/{indice}",
    status_code=status.HTTP_200_OK,
    summary="Editar una consulta específica de un paciente por su índice (0-based)",
)
def actualizar_consulta(
    datos: ConsultaUpdate,
    id_paciente: int = Path(..., ge=1, description="Llave natural del paciente."),
    indice: int = Path(..., ge=0, description="Posición de la consulta en la lista (0-based)."),
    collection: Collection = Depends(get_collection),
) -> dict[str, Any]:
    return pacientes_service.actualizar_consulta_paciente(
        collection, id_paciente, indice, datos
    )


@router.delete(
    "/pacientes/{id_paciente}/consultas/{indice}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar una consulta específica de un paciente por su índice (0-based)",
)
def eliminar_consulta(
    id_paciente: int = Path(..., ge=1, description="Llave natural del paciente."),
    indice: int = Path(..., ge=0, description="Posición de la consulta en la lista (0-based)."),
    collection: Collection = Depends(get_collection),
) -> Response:
    pacientes_service.eliminar_consulta_paciente(collection, id_paciente, indice)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# =====================================================================
# 4. ENDPOINTS DE CIRUGÍAS (Por id_paciente e id_cirugia)
# =====================================================================


@router.get(
    "/pacientes/{id_paciente}/cirugias",
    status_code=status.HTTP_200_OK,
    summary="Listar el historial de cirugías de un paciente",
)
def listar_cirugias(
    id_paciente: int = Path(..., ge=1, description="Llave natural del paciente."),
    collection: Collection = Depends(get_collection),
) -> list[dict[str, Any]]:
    return pacientes_service.listar_cirugias_paciente(collection, id_paciente)


@router.post(
    "/pacientes/{id_paciente}/cirugias",
    status_code=status.HTTP_201_CREATED,
    summary="Registrar una nueva cirugía para un paciente",
)
def agregar_cirugia(
    cirugia: Cirugia,
    id_paciente: int = Path(..., ge=1, description="Llave natural del paciente."),
    collection: Collection = Depends(get_collection),
) -> dict[str, Any]:
    return pacientes_service.agregar_cirugia_paciente(collection, id_paciente, cirugia)


@router.patch(
    "/pacientes/{id_paciente}/cirugias/{id_cirugia}",
    status_code=status.HTTP_200_OK,
    summary="Actualizar una cirugía de un paciente por su id_cirugia",
)
def actualizar_cirugia(
    datos: CirugiaUpdate,
    id_paciente: int = Path(..., ge=1, description="Llave natural del paciente."),
    id_cirugia: int = Path(..., ge=1, description="Identificador de la cirugía."),
    collection: Collection = Depends(get_collection),
) -> dict[str, Any]:
    return pacientes_service.actualizar_cirugia_paciente(
        collection, id_paciente, id_cirugia, datos
    )


@router.delete(
    "/pacientes/{id_paciente}/cirugias/{id_cirugia}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar una cirugía de un paciente por su id_cirugia",
)
def eliminar_cirugia(
    id_paciente: int = Path(..., ge=1, description="Llave natural del paciente."),
    id_cirugia: int = Path(..., ge=1, description="Identificador de la cirugía."),
    collection: Collection = Depends(get_collection),
) -> Response:
    pacientes_service.eliminar_cirugia_paciente(collection, id_paciente, id_cirugia)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
