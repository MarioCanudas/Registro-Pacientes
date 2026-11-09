"""Servicio CRUD para expedientes de tutores, pacientes, consultas y cirugías."""

import re
from typing import Any, Optional
from fastapi import HTTPException, status
from pymongo.collection import Collection
from pymongo.errors import DuplicateKeyError, WriteError

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


def limpiar_documento_para_mongo(data: dict[str, Any]) -> dict[str, Any]:
    """
    Limpia campos opcionales cuyo valor sea None cuando el JSON Schema
    define su tipo únicamente como 'string' o 'array' (sin incluir 'null'),
    como 'notas' y 'cirugias'.
    """
    doc = dict(data)
    if "pacientes" in doc and isinstance(doc["pacientes"], list):
        pacientes_limpios = []
        for pac in doc["pacientes"]:
            pac_dict = limpiar_paciente_para_mongo(pac)
            pacientes_limpios.append(pac_dict)
        doc["pacientes"] = pacientes_limpios
    return doc


def limpiar_paciente_para_mongo(pac: dict[str, Any]) -> dict[str, Any]:
    """Limpia un subdocumento de paciente para cumplir con el JSON Schema en MongoDB."""
    pac_dict = dict(pac)
    if pac_dict.get("cirugias") is None:
        pac_dict.pop("cirugias", None)
    else:
        pac_dict["cirugias"] = [
            limpiar_cirugia_para_mongo(cir) for cir in pac_dict["cirugias"]
        ]

    if "consultas" in pac_dict and isinstance(pac_dict["consultas"], list):
        pac_dict["consultas"] = [
            limpiar_consulta_para_mongo(con) for con in pac_dict["consultas"]
        ]
    return pac_dict


def limpiar_consulta_para_mongo(con: dict[str, Any]) -> dict[str, Any]:
    """Elimina 'notas' si es None ya que en el JSON Schema 'notas' es de tipo string."""
    con_dict = dict(con)
    if con_dict.get("notas") is None:
        con_dict.pop("notas", None)
    return con_dict


def limpiar_cirugia_para_mongo(cir: dict[str, Any]) -> dict[str, Any]:
    """Elimina 'notas' si es None ya que en el JSON Schema 'notas' es de tipo string."""
    cir_dict = dict(cir)
    if cir_dict.get("notas") is None:
        cir_dict.pop("notas", None)
    return cir_dict


def _sin_object_id(doc: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
    """Remueve el campo interno _id de MongoDB antes de retornar la respuesta."""
    if doc is not None and "_id" in doc:
        copia = dict(doc)
        copia.pop("_id", None)
        return copia
    return doc


def _manejar_error_duplicado(exc: DuplicateKeyError, mensaje_defecto: str) -> HTTPException:
    """Construye un error HTTP 409 claro a partir de un DuplicateKeyError sin exponer datos sensibles."""
    detalle = str(exc.details) if exc.details else ""
    if "id_tutor" in detalle:
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un expediente registrado con ese id_tutor.",
        )
    if "id_paciente" in detalle:
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un paciente registrado con ese id_paciente en la colección.",
        )
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=mensaje_defecto,
    )


# =====================================================================
# 1. CRUD DE EXPEDIENTES DE TUTORES (Colección principal)
# =====================================================================


def crear_expediente(collection: Collection, expediente: ExpedienteTutor) -> dict[str, Any]:
    """Crea un nuevo expediente de tutor respetando los índices únicos de id_tutor e id_paciente."""
    payload = limpiar_documento_para_mongo(expediente.model_dump())

    # Verificación adicional sobre id_paciente en caso de motores en memoria
    ids_pacientes = [p["id_paciente"] for p in payload["pacientes"]]
    conflicto_paciente = collection.find_one(
        {"pacientes.id_paciente": {"$in": ids_pacientes}}, {"_id": 1}
    )
    if conflicto_paciente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Uno o más id_paciente ya existen en otro expediente de la colección.",
        )

    try:
        collection.insert_one(payload)
    except DuplicateKeyError as exc:
        raise _manejar_error_duplicado(
            exc, "Conflicto de llave única: id_tutor o id_paciente ya existe."
        ) from exc
    except WriteError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El documento no cumple las reglas de validación de la colección en MongoDB.",
        ) from exc

    return _sin_object_id(payload)  # type: ignore[return-value]


def listar_expedientes(
    collection: Collection,
    skip: int = 0,
    limit: int = 20,
    tutor: Optional[str] = None,
    genero: Optional[str] = None,
    edad_min: Optional[int] = None,
    edad_max: Optional[int] = None,
    padecimiento: Optional[str] = None,
) -> dict[str, Any]:
    """Lista expedientes con paginación y filtros sanitizados."""
    filtro: dict[str, Any] = {}

    if tutor:
        patron_seguro = re.escape(tutor.strip())
        filtro["tutor"] = {"$regex": patron_seguro, "$options": "i"}

    condiciones_paciente: dict[str, Any] = {}
    if genero:
        condiciones_paciente["genero"] = genero
    if edad_min is not None or edad_max is not None:
        rango_edad: dict[str, int] = {}
        if edad_min is not None:
            rango_edad["$gte"] = edad_min
        if edad_max is not None:
            rango_edad["$lte"] = edad_max
        condiciones_paciente["edad"] = rango_edad
    if padecimiento:
        patron_pad = re.escape(padecimiento.strip())
        condiciones_paciente["consultas.padecimientos"] = {
            "$regex": patron_pad,
            "$options": "i",
        }

    if condiciones_paciente:
        filtro["pacientes"] = {"$elemMatch": condiciones_paciente}

    total = collection.count_documents(filtro)
    cursor = (
        collection.find(filtro, {"_id": 0})
        .sort("id_tutor", 1)
        .skip(skip)
        .limit(limit)
    )
    items = list(cursor)

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": items,
    }


def obtener_expediente_por_id_tutor(
    collection: Collection, id_tutor: int
) -> dict[str, Any]:
    """Obtiene el expediente completo de un tutor por su llave natural id_tutor."""
    doc = collection.find_one({"id_tutor": id_tutor}, {"_id": 0})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró ningún expediente con id_tutor={id_tutor}.",
        )
    return doc


def reemplazar_expediente(
    collection: Collection, id_tutor: int, expediente: ExpedienteTutor
) -> dict[str, Any]:
    """Reemplaza por completo un expediente existente (PUT)."""
    if expediente.id_tutor != id_tutor:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El id_tutor del cuerpo debe coincidir con el id_tutor de la ruta.",
        )

    existente = collection.find_one({"id_tutor": id_tutor}, {"_id": 1})
    if not existente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró ningún expediente con id_tutor={id_tutor}.",
        )

    ids_pacientes = [p.id_paciente for p in expediente.pacientes]
    conflicto = collection.find_one(
        {
            "id_tutor": {"$ne": id_tutor},
            "pacientes.id_paciente": {"$in": ids_pacientes},
        },
        {"_id": 1},
    )
    if conflicto:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Uno o más id_paciente ya pertenecen a otro tutor.",
        )

    payload = limpiar_documento_para_mongo(expediente.model_dump())
    try:
        collection.replace_one({"id_tutor": id_tutor}, payload)
    except DuplicateKeyError as exc:
        raise _manejar_error_duplicado(
            exc, "Conflicto de llave única al actualizar el expediente."
        ) from exc

    return _sin_object_id(payload)  # type: ignore[return-value]


def actualizar_expediente_parcial(
    collection: Collection, id_tutor: int, datos: TutorUpdate
) -> dict[str, Any]:
    """Actualiza parcialmente los campos de un tutor (PATCH)."""
    existente = collection.find_one({"id_tutor": id_tutor}, {"_id": 0})
    if not existente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró ningún expediente con id_tutor={id_tutor}.",
        )

    campos_actualizar: dict[str, Any] = {}
    if datos.tutor is not None:
        campos_actualizar["tutor"] = datos.tutor

    if datos.pacientes is not None:
        ids_pacientes = [p.id_paciente for p in datos.pacientes]
        conflicto = collection.find_one(
            {
                "id_tutor": {"$ne": id_tutor},
                "pacientes.id_paciente": {"$in": ids_pacientes},
            },
            {"_id": 1},
        )
        if conflicto:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Uno o más id_paciente ya pertenecen a otro tutor.",
            )
        campos_actualizar["pacientes"] = [
            limpiar_paciente_para_mongo(p.model_dump()) for p in datos.pacientes
        ]

    try:
        collection.update_one({"id_tutor": id_tutor}, {"$set": campos_actualizar})
    except DuplicateKeyError as exc:
        raise _manejar_error_duplicado(
            exc, "Conflicto de llave única al actualizar el tutor."
        ) from exc

    actualizado = collection.find_one({"id_tutor": id_tutor}, {"_id": 0})
    return actualizado  # type: ignore[return-value]


def eliminar_expediente(collection: Collection, id_tutor: int) -> None:
    """Elimina el expediente de un tutor por su id_tutor."""
    resultado = collection.delete_one({"id_tutor": id_tutor})
    if resultado.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró ningún expediente con id_tutor={id_tutor}.",
        )


# =====================================================================
# 2. CRUD DE PACIENTES (Nivel anidado pacientes[])
# =====================================================================


def listar_pacientes(
    collection: Collection,
    skip: int = 0,
    limit: int = 20,
    genero: Optional[str] = None,
    edad_min: Optional[int] = None,
    edad_max: Optional[int] = None,
    nombre: Optional[str] = None,
) -> dict[str, Any]:
    """Desglosa y lista los pacientes de todos los tutores con filtros y paginación."""
    pipeline: list[dict[str, Any]] = [{"$unwind": "$pacientes"}]

    match_stage: dict[str, Any] = {}
    if genero:
        match_stage["pacientes.genero"] = genero
    if edad_min is not None or edad_max is not None:
        rango: dict[str, int] = {}
        if edad_min is not None:
            rango["$gte"] = edad_min
        if edad_max is not None:
            rango["$lte"] = edad_max
        match_stage["pacientes.edad"] = rango
    if nombre:
        patron_nombre = re.escape(nombre.strip())
        match_stage["pacientes.nombre"] = {"$regex": patron_nombre, "$options": "i"}

    if match_stage:
        pipeline.append({"$match": match_stage})

    pipeline_conteo = list(pipeline) + [{"$count": "total"}]
    conteo_res = list(collection.aggregate(pipeline_conteo))
    total = conteo_res[0]["total"] if conteo_res else 0

    pipeline.extend(
        [
            {"$sort": {"pacientes.id_paciente": 1}},
            {"$skip": skip},
            {"$limit": limit},
            {
                "$project": {
                    "_id": 0,
                    "id_tutor": 1,
                    "tutor": 1,
                    "paciente": "$pacientes",
                }
            },
        ]
    )

    items = list(collection.aggregate(pipeline))
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": items,
    }


def obtener_paciente_por_id(
    collection: Collection, id_paciente: int
) -> dict[str, Any]:
    """Obtiene un paciente específico por su llave natural id_paciente."""
    doc = collection.find_one(
        {"pacientes.id_paciente": id_paciente},
        {"_id": 0, "id_tutor": 1, "tutor": 1, "pacientes": 1},
    )
    if not doc or not doc.get("pacientes"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró ningún paciente con id_paciente={id_paciente}.",
        )
    paciente_encontrado = next(
        (p for p in doc["pacientes"] if p.get("id_paciente") == id_paciente),
        None,
    )
    if not paciente_encontrado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró ningún paciente con id_paciente={id_paciente}.",
        )
    return {
        "id_tutor": doc["id_tutor"],
        "tutor": doc["tutor"],
        "paciente": paciente_encontrado,
    }


def agregar_paciente_a_tutor(
    collection: Collection, id_tutor: int, paciente: Paciente
) -> dict[str, Any]:
    """Agrega un nuevo paciente al expediente de un tutor existente."""
    tutor_doc = collection.find_one({"id_tutor": id_tutor}, {"_id": 1})
    if not tutor_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró ningún expediente con id_tutor={id_tutor}.",
        )

    duplicado = collection.find_one(
        {"pacientes.id_paciente": paciente.id_paciente}, {"_id": 1}
    )
    if duplicado:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un paciente registrado con id_paciente={paciente.id_paciente}.",
        )

    pac_limpio = limpiar_paciente_para_mongo(paciente.model_dump())
    try:
        collection.update_one(
            {"id_tutor": id_tutor},
            {"$push": {"pacientes": pac_limpio}},
        )
    except DuplicateKeyError as exc:
        raise _manejar_error_duplicado(
            exc, f"Ya existe un paciente con id_paciente={paciente.id_paciente}."
        ) from exc

    return obtener_paciente_por_id(collection, paciente.id_paciente)


def actualizar_paciente(
    collection: Collection, id_paciente: int, datos: PacienteUpdate
) -> dict[str, Any]:
    """Actualiza los datos de un paciente existente por su id_paciente."""
    actual = obtener_paciente_por_id(collection, id_paciente)
    paciente_actual = dict(actual["paciente"])

    campos_enviados = datos.model_dump(exclude_unset=True)
    for clave, valor in campos_enviados.items():
        paciente_actual[clave] = valor

    # Re-validamos el paciente resultante con el modelo Pydantic
    paciente_validado = Paciente.model_validate(paciente_actual)
    pac_limpio = limpiar_paciente_para_mongo(paciente_validado.model_dump())

    collection.update_one(
        {"pacientes.id_paciente": id_paciente},
        {"$set": {"pacientes.$": pac_limpio}},
    )
    return obtener_paciente_por_id(collection, id_paciente)


def eliminar_paciente(collection: Collection, id_paciente: int) -> None:
    """
    Elimina un paciente de la lista de su tutor, verificando que el tutor
    no quede con 0 pacientes (el esquema exige minItems: 1 en pacientes).
    """
    doc = collection.find_one(
        {"pacientes.id_paciente": id_paciente},
        {"_id": 0, "id_tutor": 1, "pacientes": 1},
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró ningún paciente con id_paciente={id_paciente}.",
        )

    if len(doc.get("pacientes", [])) <= 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "No se puede eliminar el único paciente del tutor porque el esquema "
                "exige al menos un paciente por expediente (minItems: 1). "
                "Elimine el expediente del tutor si desea borrar todo el registro."
            ),
        )

    collection.update_one(
        {"id_tutor": doc["id_tutor"]},
        {"$pull": {"pacientes": {"id_paciente": id_paciente}}},
    )


# =====================================================================
# 3. CRUD DE CONSULTAS (Nivel anidado pacientes[].consultas[])
# =====================================================================


def listar_consultas_paciente(
    collection: Collection, id_paciente: int
) -> list[dict[str, Any]]:
    """Devuelve todas las consultas de un paciente."""
    info = obtener_paciente_por_id(collection, id_paciente)
    return info["paciente"].get("consultas", [])


def agregar_consulta_paciente(
    collection: Collection, id_paciente: int, consulta: Consulta
) -> dict[str, Any]:
    """Agrega una nueva consulta médica al historial de un paciente."""
    info = obtener_paciente_por_id(collection, id_paciente)
    consultas: list[dict[str, Any]] = list(info["paciente"].get("consultas", []))
    con_limpia = limpiar_consulta_para_mongo(consulta.model_dump())
    consultas.append(con_limpia)

    collection.update_one(
        {"pacientes.id_paciente": id_paciente},
        {"$set": {"pacientes.$.consultas": consultas}},
    )
    return con_limpia


def actualizar_consulta_paciente(
    collection: Collection, id_paciente: int, indice: int, datos: ConsultaUpdate
) -> dict[str, Any]:
    """Actualiza una consulta específica de un paciente según su índice (0-based)."""
    info = obtener_paciente_por_id(collection, id_paciente)
    consultas: list[dict[str, Any]] = list(info["paciente"].get("consultas", []))

    if indice < 0 or indice >= len(consultas):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No existe una consulta en el índice {indice} para el paciente {id_paciente}.",
        )

    consulta_actual = dict(consultas[indice])
    for clave, valor in datos.model_dump(exclude_unset=True).items():
        consulta_actual[clave] = valor

    consulta_validada = Consulta.model_validate(consulta_actual)
    con_limpia = limpiar_consulta_para_mongo(consulta_validada.model_dump())
    consultas[indice] = con_limpia

    collection.update_one(
        {"pacientes.id_paciente": id_paciente},
        {"$set": {"pacientes.$.consultas": consultas}},
    )
    return con_limpia


def eliminar_consulta_paciente(
    collection: Collection, id_paciente: int, indice: int
) -> None:
    """Elimina una consulta específica de un paciente por su índice (0-based)."""
    info = obtener_paciente_por_id(collection, id_paciente)
    consultas: list[dict[str, Any]] = list(info["paciente"].get("consultas", []))

    if indice < 0 or indice >= len(consultas):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No existe una consulta en el índice {indice} para el paciente {id_paciente}.",
        )

    consultas.pop(indice)
    collection.update_one(
        {"pacientes.id_paciente": id_paciente},
        {"$set": {"pacientes.$.consultas": consultas}},
    )


# =====================================================================
# 4. CRUD DE CIRUGÍAS (Nivel anidado pacientes[].cirugias[])
# =====================================================================


def listar_cirugias_paciente(
    collection: Collection, id_paciente: int
) -> list[dict[str, Any]]:
    """Lista las cirugías registradas para un paciente."""
    info = obtener_paciente_por_id(collection, id_paciente)
    return info["paciente"].get("cirugias") or []


def agregar_cirugia_paciente(
    collection: Collection, id_paciente: int, cirugia: Cirugia
) -> dict[str, Any]:
    """Agrega una cirugía a un paciente verificando que id_cirugia no se duplique."""
    info = obtener_paciente_por_id(collection, id_paciente)
    cirugias_actuales: list[dict[str, Any]] = list(
        info["paciente"].get("cirugias") or []
    )

    for existente in cirugias_actuales:
        if existente.get("id_cirugia") == cirugia.id_cirugia:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"El paciente {id_paciente} ya tiene una cirugía con "
                    f"id_cirugia={cirugia.id_cirugia}."
                ),
            )

    cir_limpia = limpiar_cirugia_para_mongo(cirugia.model_dump())
    cirugias_actuales.append(cir_limpia)

    collection.update_one(
        {"pacientes.id_paciente": id_paciente},
        {"$set": {"pacientes.$.cirugias": cirugias_actuales}},
    )
    return cir_limpia


def actualizar_cirugia_paciente(
    collection: Collection, id_paciente: int, id_cirugia: int, datos: CirugiaUpdate
) -> dict[str, Any]:
    """Actualiza una cirugía específica de un paciente por su id_cirugia."""
    info = obtener_paciente_por_id(collection, id_paciente)
    cirugias_actuales: list[dict[str, Any]] = list(
        info["paciente"].get("cirugias") or []
    )

    indice_encontrado = -1
    for idx, cir in enumerate(cirugias_actuales):
        if cir.get("id_cirugia") == id_cirugia:
            indice_encontrado = idx
            break

    if indice_encontrado == -1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"No se encontró la cirugía con id_cirugia={id_cirugia} "
                f"en el paciente {id_paciente}."
            ),
        )

    cirugia_actual = dict(cirugias_actuales[indice_encontrado])
    for clave, valor in datos.model_dump(exclude_unset=True).items():
        cirugia_actual[clave] = valor

    cirugia_validada = Cirugia.model_validate(cirugia_actual)
    cir_limpia = limpiar_cirugia_para_mongo(cirugia_validada.model_dump())
    cirugias_actuales[indice_encontrado] = cir_limpia

    collection.update_one(
        {"pacientes.id_paciente": id_paciente},
        {"$set": {"pacientes.$.cirugias": cirugias_actuales}},
    )
    return cir_limpia


def eliminar_cirugia_paciente(
    collection: Collection, id_paciente: int, id_cirugia: int
) -> None:
    """Elimina una cirugía específica de un paciente por su id_cirugia."""
    info = obtener_paciente_por_id(collection, id_paciente)
    cirugias_actuales: list[dict[str, Any]] = list(
        info["paciente"].get("cirugias") or []
    )

    nuevas_cirugias = [
        c for c in cirugias_actuales if c.get("id_cirugia") != id_cirugia
    ]
    if len(nuevas_cirugias) == len(cirugias_actuales):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"No se encontró la cirugía con id_cirugia={id_cirugia} "
                f"en el paciente {id_paciente}."
            ),
        )

    collection.update_one(
        {"pacientes.id_paciente": id_paciente},
        {"$set": {"pacientes.$.cirugias": nuevas_cirugias}},
    )
