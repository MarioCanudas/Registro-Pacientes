"""Servicios de análisis estadístico y financiero mediante Aggregation Pipelines de MongoDB."""

from typing import Any
from pymongo.collection import Collection


def obtener_resumen_general(collection: Collection) -> dict[str, Any]:
    """
    Ejecuta un aggregation pipeline sobre REGISTRO-PACIENTES para obtener indicadores
    globales: total de tutores, pacientes, edad promedio, distribución por género,
    total de consultas y total de cirugías.
    """
    total_tutores = collection.count_documents({})
    if total_tutores == 0:
        return {
            "total_tutores": 0,
            "total_pacientes": 0,
            "edad_promedio": 0.0,
            "pacientes_masculinos": 0,
            "pacientes_femeninos": 0,
            "total_consultas": 0,
            "total_cirugias": 0,
        }

    pipeline: list[dict[str, Any]] = [
        {"$unwind": "$pacientes"},
        {
            "$project": {
                "edad": "$pacientes.edad",
                "genero": "$pacientes.genero",
                "num_consultas": {
                    "$size": {"$ifNull": ["$pacientes.consultas", []]}
                },
                "num_cirugias": {
                    "$size": {"$ifNull": ["$pacientes.cirugias", []]}
                },
            }
        },
        {
            "$group": {
                "_id": None,
                "total_pacientes": {"$sum": 1},
                "edad_promedio": {"$avg": "$edad"},
                "pacientes_masculinos": {
                    "$sum": {"$cond": [{"$eq": ["$genero", "M"]}, 1, 0]}
                },
                "pacientes_femeninos": {
                    "$sum": {"$cond": [{"$eq": ["$genero", "F"]}, 1, 0]}
                },
                "total_consultas": {"$sum": "$num_consultas"},
                "total_cirugias": {"$sum": "$num_cirugias"},
            }
        },
        {
            "$project": {
                "_id": 0,
                "total_pacientes": 1,
                "edad_promedio": 1,
                "pacientes_masculinos": 1,
                "pacientes_femeninos": 1,
                "total_consultas": 1,
                "total_cirugias": 1,
            }
        },
    ]

    resultado = list(collection.aggregate(pipeline))
    if not resultado:
        return {
            "total_tutores": total_tutores,
            "total_pacientes": 0,
            "edad_promedio": 0.0,
            "pacientes_masculinos": 0,
            "pacientes_femeninos": 0,
            "total_consultas": 0,
            "total_cirugias": 0,
        }

    metricas = resultado[0]
    metricas["total_tutores"] = total_tutores
    metricas["edad_promedio"] = round(float(metricas.get("edad_promedio") or 0.0), 2)
    return metricas


def obtener_padecimientos_frecuentes(
    collection: Collection, limit: int = 10
) -> list[dict[str, Any]]:
    """
    Pipeline de agregación que desglosa pacientes -> consultas -> padecimientos
    para encontrar los motivos de visita más frecuentes.
    """
    pipeline: list[dict[str, Any]] = [
        {"$unwind": "$pacientes"},
        {"$unwind": "$pacientes.consultas"},
        {"$unwind": "$pacientes.consultas.padecimientos"},
        {
            "$group": {
                "_id": "$pacientes.consultas.padecimientos",
                "frecuencia": {"$sum": 1},
                "pacientes_unicos": {"$addToSet": "$pacientes.id_paciente"},
            }
        },
        {
            "$project": {
                "_id": 0,
                "padecimiento": "$_id",
                "frecuencia": 1,
                "total_pacientes_afectados": {"$size": "$pacientes_unicos"},
            }
        },
        {"$sort": {"frecuencia": -1, "padecimiento": 1}},
        {"$limit": limit},
    ]
    return list(collection.aggregate(pipeline))


def obtener_ingresos_por_forma_pago(collection: Collection) -> dict[str, Any]:
    """
    Analiza los ingresos provenientes de consultas y cirugías mediante pipelines
    de agregación agrupados por forma_pago ('efectivo', 'tarjeta', 'transferencia'),
    calculando monto bruto, monto neto con descuento y cantidad de facturas.
    """
    pipeline_consultas: list[dict[str, Any]] = [
        {"$unwind": "$pacientes"},
        {"$unwind": "$pacientes.consultas"},
        {
            "$project": {
                "forma_pago": "$pacientes.consultas.pago.forma_pago",
                "cantidad": "$pacientes.consultas.pago.cantidad",
                "factura": {
                    "$ifNull": ["$pacientes.consultas.pago.factura", False]
                },
                "descuento": {
                    "$ifNull": ["$pacientes.consultas.pago.descuento", 0]
                },
            }
        },
        {
            "$project": {
                "forma_pago": 1,
                "cantidad": 1,
                "factura": 1,
                "monto_neto": {
                    "$multiply": [
                        "$cantidad",
                        {
                            "$subtract": [
                                1,
                                {"$divide": ["$descuento", 100]},
                            ]
                        },
                    ]
                },
            }
        },
        {
            "$group": {
                "_id": "$forma_pago",
                "operaciones_consultas": {"$sum": 1},
                "monto_bruto_consultas": {"$sum": "$cantidad"},
                "monto_neto_consultas": {"$sum": "$monto_neto"},
                "facturas_consultas": {
                    "$sum": {"$cond": [{"$eq": ["$factura", True]}, 1, 0]}
                },
            }
        },
    ]

    pipeline_cirugias: list[dict[str, Any]] = [
        {"$unwind": "$pacientes"},
        {"$unwind": "$pacientes.cirugias"},
        {
            "$project": {
                "forma_pago": "$pacientes.cirugias.pago.forma_pago",
                "cantidad": "$pacientes.cirugias.pago.cantidad",
                "factura": {
                    "$ifNull": ["$pacientes.cirugias.pago.factura", False]
                },
                "descuento": {
                    "$ifNull": ["$pacientes.cirugias.pago.descuento", 0]
                },
            }
        },
        {
            "$project": {
                "forma_pago": 1,
                "cantidad": 1,
                "factura": 1,
                "monto_neto": {
                    "$multiply": [
                        "$cantidad",
                        {
                            "$subtract": [
                                1,
                                {"$divide": ["$descuento", 100]},
                            ]
                        },
                    ]
                },
            }
        },
        {
            "$group": {
                "_id": "$forma_pago",
                "operaciones_cirugias": {"$sum": 1},
                "monto_bruto_cirugias": {"$sum": "$cantidad"},
                "monto_neto_cirugias": {"$sum": "$monto_neto"},
                "facturas_cirugias": {
                    "$sum": {"$cond": [{"$eq": ["$factura", True]}, 1, 0]}
                },
            }
        },
    ]

    res_consultas = {
        r["_id"]: r for r in collection.aggregate(pipeline_consultas)
    }
    res_cirugias = {
        r["_id"]: r for r in collection.aggregate(pipeline_cirugias)
    }

    formas_pago = sorted(set(res_consultas.keys()) | set(res_cirugias.keys()))
    desglose = []
    gran_total_bruto = 0.0
    gran_total_neto = 0.0
    gran_total_operaciones = 0
    gran_total_facturas = 0

    for fp in formas_pago:
        c = res_consultas.get(fp, {})
        q = res_cirugias.get(fp, {})

        ops = int(c.get("operaciones_consultas", 0)) + int(
            q.get("operaciones_cirugias", 0)
        )
        bruto = float(c.get("monto_bruto_consultas", 0.0)) + float(
            q.get("monto_bruto_cirugias", 0.0)
        )
        neto = float(c.get("monto_neto_consultas", 0.0)) + float(
            q.get("monto_neto_cirugias", 0.0)
        )
        facturas = int(c.get("facturas_consultas", 0)) + int(
            q.get("facturas_cirugias", 0)
        )

        gran_total_operaciones += ops
        gran_total_bruto += bruto
        gran_total_neto += neto
        gran_total_facturas += facturas

        desglose.append(
            {
                "forma_pago": fp,
                "total_operaciones": ops,
                "monto_bruto": round(bruto, 2),
                "monto_neto": round(neto, 2),
                "total_facturas": facturas,
            }
        )

    return {
        "total_operaciones": gran_total_operaciones,
        "monto_bruto_total": round(gran_total_bruto, 2),
        "monto_neto_total": round(gran_total_neto, 2),
        "total_facturas": gran_total_facturas,
        "por_forma_pago": desglose,
    }


def obtener_resumen_cirugias(collection: Collection) -> list[dict[str, Any]]:
    """
    Pipeline de agregación que analiza las cirugías agrupadas por tipo,
    contando cuántas requirieron anestesia y el ingreso bruto generado.
    """
    pipeline: list[dict[str, Any]] = [
        {"$unwind": "$pacientes"},
        {"$unwind": "$pacientes.cirugias"},
        {
            "$group": {
                "_id": "$pacientes.cirugias.tipo",
                "total_cirugias": {"$sum": 1},
                "con_anestesia": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$pacientes.cirugias.anestesia", True]},
                            1,
                            0,
                        ]
                    }
                },
                "ingreso_bruto": {"$sum": "$pacientes.cirugias.pago.cantidad"},
            }
        },
        {
            "$project": {
                "_id": 0,
                "tipo": "$_id",
                "total_cirugias": 1,
                "con_anestesia": 1,
                "ingreso_bruto": 1,
            }
        },
        {"$sort": {"total_cirugias": -1, "tipo": 1}},
    ]
    resultados = list(collection.aggregate(pipeline))
    for item in resultados:
        item["ingreso_bruto"] = round(float(item.get("ingreso_bruto", 0.0)), 2)
    return resultados


def obtener_resumen_por_tutor(collection: Collection) -> list[dict[str, Any]]:
    """
    Pipeline de agregación que resume por cada tutor la cantidad de pacientes,
    total de consultas realizadas y total de cirugías practicadas.
    """
    pipeline: list[dict[str, Any]] = [
        {"$unwind": "$pacientes"},
        {
            "$project": {
                "id_tutor": 1,
                "tutor": 1,
                "id_paciente": "$pacientes.id_paciente",
                "num_consultas": {
                    "$size": {"$ifNull": ["$pacientes.consultas", []]}
                },
                "num_cirugias": {
                    "$size": {"$ifNull": ["$pacientes.cirugias", []]}
                },
            }
        },
        {
            "$group": {
                "_id": {"id_tutor": "$id_tutor", "tutor": "$tutor"},
                "total_pacientes": {"$sum": 1},
                "total_consultas": {"$sum": "$num_consultas"},
                "total_cirugias": {"$sum": "$num_cirugias"},
            }
        },
        {
            "$project": {
                "_id": 0,
                "id_tutor": "$_id.id_tutor",
                "tutor": "$_id.tutor",
                "total_pacientes": 1,
                "total_consultas": 1,
                "total_cirugias": 1,
            }
        },
        {"$sort": {"id_tutor": 1}},
    ]
    return list(collection.aggregate(pipeline))
