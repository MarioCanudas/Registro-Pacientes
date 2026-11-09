"""Pruebas integrales del API REST de Registro de Pacientes con pytest."""

from typing import Any
from fastapi.testclient import TestClient
import mongomock
import pytest

from app.db import ensure_indexes, get_collection
from app.main import app


@pytest.fixture()
def mock_collection():
    """Proporciona una colección MongoDB aislada con índices únicos reales para cada prueba."""
    client = mongomock.MongoClient()
    db = client["optaGestionDeDatos"]
    collection = db["REGISTRO-PACIENTES"]
    ensure_indexes(collection)
    return collection


@pytest.fixture()
def client(mock_collection):
    """Cliente de pruebas FastAPI conectado a la colección con índices únicos."""
    app.dependency_overrides[get_collection] = lambda: mock_collection
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def ejemplo_expediente_valido(
    id_tutor: int = 101, id_paciente: int = 5001
) -> dict[str, Any]:
    """Genera un payload JSON válido conforme al JSON Schema de REGISTRO-PACIENTES."""
    return {
        "id_tutor": id_tutor,
        "tutor": "María Fernanda Gómez López",
        "pacientes": [
            {
                "id_paciente": id_paciente,
                "nombre": "Santiago Gómez",
                "fecha_nacimiento": "2019-05-14",
                "edad": 7,
                "genero": "M",
                "consultas": [
                    {
                        "fecha": "2026-02-10",
                        "padecimientos": ["fiebre", "dolor de garganta"],
                        "diagnostico": "Faringoamigdalitis aguda",
                        "medicamentos_recetados": ["Amoxicilina", "Paracetamol"],
                        "notas": "Reposo por 3 días e hidratación abundante.",
                        "pago": {
                            "cantidad": 800,
                            "forma_pago": "tarjeta",
                            "factura": True,
                            "descuento": 10,
                        },
                    }
                ],
                "cirugias": [
                    {
                        "id_cirugia": 1,
                        "fecha": "2025-08-20",
                        "tipo": "Amigdalectomía",
                        "anestesia": True,
                        "anestesiologo": "Dr. Roberto Sánchez",
                        "pago": {
                            "cantidad": 15000,
                            "forma_pago": "transferencia",
                            "factura": True,
                            "descuento": None,
                        },
                        "notas": "Sin complicaciones postoperatorias.",
                    }
                ],
            }
        ],
    }


def test_health_endpoint(client: TestClient) -> None:
    """Verifica que GET /health responda 200 OK y confirme la base y colección."""
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "optaGestionDeDatos"
    assert body["collection"] == "REGISTRO-PACIENTES"


def test_crear_documento_valido(client: TestClient) -> None:
    """Verifica la creación de un expediente válido con código 201 Created."""
    payload = ejemplo_expediente_valido()
    response = client.post("/api/v1/tutores", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id_tutor"] == 101
    assert data["tutor"] == "María Fernanda Gómez López"
    assert len(data["pacientes"]) == 1
    assert data["pacientes"][0]["id_paciente"] == 5001
    assert "_id" not in data


def test_rechazar_documento_invalido_esquema(client: TestClient) -> None:
    """Verifica que documentos que violan el JSON Schema sean rechazados con 422."""
    # Caso 1: Propiedad adicional no permitida (additionalProperties: false)
    invalido_extra = ejemplo_expediente_valido()
    invalido_extra["telefono_extra"] = "5512345678"
    res_extra = client.post("/api/v1/tutores", json=invalido_extra)
    assert res_extra.status_code == 422

    # Caso 2: Género fuera del enum ['M', 'F']
    invalido_genero = ejemplo_expediente_valido(id_tutor=102, id_paciente=5002)
    invalido_genero["pacientes"][0]["genero"] = "X"
    res_genero = client.post("/api/v1/tutores", json=invalido_genero)
    assert res_genero.status_code == 422

    # Caso 3: Fecha con formato incorrecto (debe ser AAAA-MM-DD)
    invalido_fecha = ejemplo_expediente_valido(id_tutor=103, id_paciente=5003)
    invalido_fecha["pacientes"][0]["fecha_nacimiento"] = "14/05/2019"
    res_fecha = client.post("/api/v1/tutores", json=invalido_fecha)
    assert res_fecha.status_code == 422

    # Caso 4: Cantidad de pago <= 0 (exclusiveMinimum: 0)
    invalido_pago = ejemplo_expediente_valido(id_tutor=104, id_paciente=5004)
    invalido_pago["pacientes"][0]["consultas"][0]["pago"]["cantidad"] = 0
    res_pago = client.post("/api/v1/tutores", json=invalido_pago)
    assert res_pago.status_code == 422


def test_rechazar_documento_duplicado_409(client: TestClient) -> None:
    """Verifica que duplicar id_tutor o id_paciente devuelva 409 Conflict."""
    payload = ejemplo_expediente_valido(id_tutor=200, id_paciente=6001)
    res1 = client.post("/api/v1/tutores", json=payload)
    assert res1.status_code == 201

    # Mismo id_tutor con distinto id_paciente -> 409 Conflict por índice único en id_tutor
    dup_tutor = ejemplo_expediente_valido(id_tutor=200, id_paciente=6002)
    res_dup_tutor = client.post("/api/v1/tutores", json=dup_tutor)
    assert res_dup_tutor.status_code == 409

    # Distinto id_tutor pero mismo id_paciente -> 409 Conflict por unicidad de id_paciente
    dup_paciente = ejemplo_expediente_valido(id_tutor=201, id_paciente=6001)
    res_dup_pac = client.post("/api/v1/tutores", json=dup_paciente)
    assert res_dup_pac.status_code == 409


def test_crud_completo_tutor_pacientes_consultas_y_cirugias(client: TestClient) -> None:
    """Prueba operaciones de lectura, edición, adición y eliminación en todos los niveles."""
    payload = ejemplo_expediente_valido(id_tutor=300, id_paciente=7001)
    assert client.post("/api/v1/tutores", json=payload).status_code == 201

    # Obtener tutor por llave natural
    res_get = client.get("/api/v1/tutores/300")
    assert res_get.status_code == 200
    assert res_get.json()["id_tutor"] == 300

    # Actualizar nombre del tutor (PATCH)
    res_patch_tutor = client.patch(
        "/api/v1/tutores/300", json={"tutor": "María F. Gómez Actualizada"}
    )
    assert res_patch_tutor.status_code == 200
    assert res_patch_tutor.json()["tutor"] == "María F. Gómez Actualizada"

    # Agregar un segundo paciente al tutor
    nuevo_paciente = {
        "id_paciente": 7002,
        "nombre": "Valeria Gómez",
        "fecha_nacimiento": "2021-11-03",
        "edad": 4,
        "genero": "F",
        "consultas": [
            {
                "fecha": "2026-03-01",
                "padecimientos": ["tos", "fiebre"],
                "diagnostico": "Bronquiolitis leve",
                "medicamentos_recetados": ["Salbutamol"],
                "pago": {
                    "cantidad": 900,
                    "forma_pago": "efectivo",
                    "factura": False,
                },
            }
        ],
    }
    res_add_pac = client.post("/api/v1/tutores/300/pacientes", json=nuevo_paciente)
    assert res_add_pac.status_code == 201
    assert res_add_pac.json()["paciente"]["nombre"] == "Valeria Gómez"

    # Editar datos del paciente 7002
    res_upd_pac = client.patch("/api/v1/pacientes/7002", json={"edad": 5})
    assert res_upd_pac.status_code == 200
    assert res_upd_pac.json()["paciente"]["edad"] == 5

    # Agregar una consulta al paciente 7002
    nueva_consulta = {
        "fecha": "2026-04-15",
        "padecimientos": ["control pediátrico"],
        "diagnostico": "Paciente sana",
        "medicamentos_recetados": ["Vitaminas"],
        "pago": {"cantidad": 750, "forma_pago": "tarjeta", "factura": True},
    }
    res_add_con = client.post("/api/v1/pacientes/7002/consultas", json=nueva_consulta)
    assert res_add_con.status_code == 201

    # Editar la consulta en índice 1 del paciente 7002
    res_upd_con = client.patch(
        "/api/v1/pacientes/7002/consultas/1",
        json={"diagnostico": "Crecimiento óptimo"},
    )
    assert res_upd_con.status_code == 200
    assert res_upd_con.json()["diagnostico"] == "Crecimiento óptimo"

    # Eliminar la consulta en índice 1
    res_del_con = client.delete("/api/v1/pacientes/7002/consultas/1")
    assert res_del_con.status_code == 204

    # Agregar cirugía al paciente 7002
    nueva_cirugia = {
        "id_cirugia": 10,
        "fecha": "2026-05-01",
        "tipo": "Hernioplastía umbilical",
        "anestesia": True,
        "anestesiologo": "Dra. Elena Ruiz",
        "pago": {"cantidad": 12000, "forma_pago": "transferencia", "factura": True},
    }
    res_add_cir = client.post("/api/v1/pacientes/7002/cirugias", json=nueva_cirugia)
    assert res_add_cir.status_code == 201

    # Editar cirugía 10 del paciente 7002
    res_upd_cir = client.patch(
        "/api/v1/pacientes/7002/cirugias/10",
        json={"notas": "Alta el mismo día."},
    )
    assert res_upd_cir.status_code == 200
    assert res_upd_cir.json()["notas"] == "Alta el mismo día."

    # Eliminar cirugía 10 del paciente 7002
    res_del_cir = client.delete("/api/v1/pacientes/7002/cirugias/10")
    assert res_del_cir.status_code == 204

    # Eliminar paciente 7002 (permitido porque el tutor aún tiene al paciente 7001)
    res_del_pac = client.delete("/api/v1/pacientes/7002")
    assert res_del_pac.status_code == 204

    # Intentar eliminar el último paciente (7001) debe dar 422 por minItems: 1
    res_del_ultimo = client.delete("/api/v1/pacientes/7001")
    assert res_del_ultimo.status_code == 422

    # Eliminar el expediente completo del tutor 300
    res_del_tutor = client.delete("/api/v1/tutores/300")
    assert res_del_tutor.status_code == 204

    # Verificar que ya no existe (404)
    assert client.get("/api/v1/tutores/300").status_code == 404


def test_endpoints_de_analisis(client: TestClient) -> None:
    """Verifica los endpoints de análisis con aggregation pipelines de MongoDB."""
    exp1 = ejemplo_expediente_valido(id_tutor=401, id_paciente=8001)
    exp2 = ejemplo_expediente_valido(id_tutor=402, id_paciente=8002)
    exp2["pacientes"][0]["genero"] = "F"
    exp2["pacientes"][0]["edad"] = 5

    assert client.post("/api/v1/tutores", json=exp1).status_code == 201
    assert client.post("/api/v1/tutores", json=exp2).status_code == 201

    # 1. Resumen general
    res_resumen = client.get("/api/v1/analisis/resumen-general")
    assert res_resumen.status_code == 200
    datos_resumen = res_resumen.json()
    assert datos_resumen["total_tutores"] == 2
    assert datos_resumen["total_pacientes"] == 2
    assert datos_resumen["edad_promedio"] == 6.0
    assert datos_resumen["pacientes_masculinos"] == 1
    assert datos_resumen["pacientes_femeninos"] == 1
    assert datos_resumen["total_consultas"] == 2
    assert datos_resumen["total_cirugias"] == 2

    # 2. Padecimientos frecuentes
    res_pad = client.get("/api/v1/analisis/padecimientos-frecuentes")
    assert res_pad.status_code == 200
    padecimientos = res_pad.json()
    assert len(padecimientos) >= 2
    assert padecimientos[0]["frecuencia"] == 2

    # 3. Ingresos por forma de pago
    res_ingresos = client.get("/api/v1/analisis/ingresos")
    assert res_ingresos.status_code == 200
    ingresos = res_ingresos.json()
    assert ingresos["total_operaciones"] == 4
    # 2 consultas de 800 (1600 bruto, con 10% desc = 1440 neto) + 2 cirugías de 15000 (30000)
    assert ingresos["monto_bruto_total"] == 31600.0
    assert ingresos["monto_neto_total"] == 31440.0

    # 4. Resumen de cirugías
    res_cir = client.get("/api/v1/analisis/cirugias-resumen")
    assert res_cir.status_code == 200
    cirugias_stats = res_cir.json()
    assert len(cirugias_stats) == 1
    assert cirugias_stats[0]["tipo"] == "Amigdalectomía"
    assert cirugias_stats[0]["total_cirugias"] == 2

    # 5. Expedientes por tutor
    res_tutores = client.get("/api/v1/analisis/expedientes-por-tutor")
    assert res_tutores.status_code == 200
    assert len(res_tutores.json()) == 2
