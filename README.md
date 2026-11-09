# API REST - Registro de Pacientes Pediátricos

API RESTful construida con **Python 3.11+**, **FastAPI**, **PyMongo** y **Pydantic v2** para gestionar expedientes clínicos digitales de tutores y pacientes (consultas, padecimientos, cirugías y pagos) sobre la base de datos **`optaGestionDeDatos`** y la colección **`REGISTRO-PACIENTES`** en **MongoDB Atlas**.

---

## Estructura del Proyecto

```text
Registro-Pacientes/
├── app/
│   ├── __init__.py
│   ├── main.py                  # Punto de entrada FastAPI, CORS, lifespan y GET /health
│   ├── config.py                # Lectura de variables de entorno (.env) con pydantic-settings
│   ├── db.py                    # Cliente PyMongo e inicialización de índices únicos
│   ├── models.py                # Modelos Pydantic estrictos (JSON Schema draft/2020-12)
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── pacientes.py         # Endpoints CRUD (tutores, pacientes, consultas, cirugías)
│   │   └── analisis.py          # Endpoints de análisis con Aggregation Pipelines
│   └── services/
│       ├── __init__.py
│       ├── pacientes_service.py # Lógica CRUD y manejo de índices únicos (409 / 422 / 404)
│       └── analisis_service.py  # Pipelines de agregación en MongoDB
├── tests/
│   ├── __init__.py
│   └── test_api.py              # Pruebas automatizadas con pytest y mongomock
├── .env.example                 # Plantilla de variables de entorno sin datos sensibles
├── .gitignore                   # Exclusión de .env, .venv y archivos temporales
├── agents.md                    # Reglas y objetivos para agentes de IA
├── pyproject.toml               # Configuración del proyecto gestionado con uv
├── requirements.txt             # Lista de dependencias compatibles
└── README.md                    # Documentación del proyecto
```

---

## Decisiones de Diseño e Índices

1. **Índices únicos sobre llaves naturales (`app/db.py`):**
   - `idx_unique_id_tutor` sobre `id_tutor` (`unique=True`): garantiza a nivel de motor de base de datos que no existan dos expedientes con el mismo `id_tutor`.
   - `idx_unique_id_paciente` sobre `pacientes.id_paciente` (`unique=True`): índice único multikey que impide registrar el mismo `id_paciente` en cualquier documento de la colección. Ante un duplicado, se captura `DuplicateKeyError` de PyMongo y se responde `409 Conflict`.
2. **Validación estricta del JSON Schema (`app/models.py`):**
   - Se configuró `extra="forbid"` (`additionalProperties: false`) en todos los modelos (`ExpedienteTutor`, `Paciente`, `Consulta`, `Cirugia`, `Pago`) para rechazar cualquier campo no contemplado en el esquema con `422 Unprocessable Entity`.
3. **Rutas jerárquicas y por llave natural (`app/routers/pacientes.py`):**
   - Permite operar tanto sobre el documento raíz (`/api/v1/tutores/{id_tutor}`) como directamente sobre cada paciente por su llave natural (`/api/v1/pacientes/{id_paciente}`) y sus subcolecciones anidadas (`/consultas` y `/cirugias`), cumpliendo la edición, adición y eliminación en cada punto del documento.

---

## Guía Rápida: Cómo Ejecutar el Proyecto

### Requisitos previos
- **Python 3.11+**
- **[uv](https://docs.astral.sh/uv/)** instalado (`powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`)
- Una instancia en **MongoDB Atlas** con la base de datos `optaGestionDeDatos` y la colección `REGISTRO-PACIENTES`.

### Paso 1: Clonar e instalar dependencias con `uv`
```powershell
git clone <URL_DEL_REPOSITORIO>
cd Registro-Pacientes
uv sync
```

### Paso 2: Configurar las variables de entorno (`.env`)
1. Crea tu archivo `.env` a partir de la plantilla `.env.example`:
   ```powershell
   # En PowerShell (Windows)
   Copy-Item .env.example .env

   # En Linux / macOS
   cp .env.example .env
   ```
2. Abre `.env` y define `MONGO_URI` usando un usuario de MongoDB Atlas con **privilegios mínimos** (rol `readWrite` únicamente sobre `optaGestionDeDatos`, nunca un administrador):
   ```ini
   MONGO_URI="mongodb+srv://usuario_app:TU_PASSWORD@cluster.mongodb.net/?retryWrites=true&w=majority"
   MONGO_DB_NAME="optaGestionDeDatos"
   MONGO_COLLECTION_NAME="REGISTRO-PACIENTES"
   CORS_ORIGINS="http://localhost:3000,http://localhost:8000"
   ```

### Paso 3: Iniciar el servidor del API REST
Puedes levantar el servidor en modo desarrollo con recarga automática usando `uvicorn` a través de `uv`:

```powershell
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

O bien ejecutando el script principal:

```powershell
uv run python main.py
```

Una vez corriendo el servidor, puedes acceder a:
- **Healthcheck (estado de conexión a MongoDB):** `http://127.0.0.1:8000/health`
- **Swagger UI (documentación interactiva para probar endpoints):** `http://127.0.0.1:8000/docs`
- **ReDoc (documentación técnica):** `http://127.0.0.1:8000/redoc`

### Paso 4: Ejecutar las pruebas automatizadas
Para correr la suite completa de pruebas (`pytest` + `mongomock`):

```powershell
uv run pytest -v
```

---

## Lista de Endpoints y Ejemplos de Petición

### 1. Salud del Sistema

#### `GET /health` — Verifica la conexión con MongoDB
```bash
curl -X GET "http://127.0.0.1:8000/health"
```

---

### 2. Expedientes de Tutores (`REGISTRO-PACIENTES`)

#### `POST /api/v1/tutores` — Crear expediente completo de tutor con pacientes (`201 Created`)
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/tutores" \
  -H "Content-Type: application/json" \
  -d '{
    "id_tutor": 101,
    "tutor": "María Fernanda Gómez López",
    "pacientes": [
      {
        "id_paciente": 5001,
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
            "notas": "Reposo por 3 días.",
            "pago": {
              "cantidad": 800,
              "forma_pago": "tarjeta",
              "factura": true,
              "descuento": 10
            }
          }
        ],
        "cirugias": [
          {
            "id_cirugia": 1,
            "fecha": "2025-08-20",
            "tipo": "Amigdalectomía",
            "anestesia": true,
            "anestesiologo": "Dr. Roberto Sánchez",
            "pago": {
              "cantidad": 15000,
              "forma_pago": "transferencia",
              "factura": true,
              "descuento": null
            },
            "notas": "Sin complicaciones."
          }
        ]
      }
    ]
  }'
```

#### `GET /api/v1/tutores` — Listar expedientes con paginación y filtros (`200 OK`)
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/tutores?skip=0&limit=10&genero=M&padecimiento=fiebre"
```

#### `GET /api/v1/tutores/{id_tutor}` — Obtener un expediente por su llave natural (`200 OK`)
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/tutores/101"
```

#### `PUT /api/v1/tutores/{id_tutor}` — Reemplazar expediente completo (`200 OK`)
```bash
curl -X PUT "http://127.0.0.1:8000/api/v1/tutores/101" \
  -H "Content-Type: application/json" \
  -d '{
    "id_tutor": 101,
    "tutor": "María Fernanda Gómez López",
    "pacientes": [
      {
        "id_paciente": 5001,
        "nombre": "Santiago Gómez",
        "fecha_nacimiento": "2019-05-14",
        "edad": 7,
        "genero": "M",
        "consultas": []
      }
    ]
  }'
```

#### `PATCH /api/v1/tutores/{id_tutor}` — Actualizar parcialmente el nombre del tutor (`200 OK`)
```bash
curl -X PATCH "http://127.0.0.1:8000/api/v1/tutores/101" \
  -H "Content-Type: application/json" \
  -d '{"tutor": "María F. Gómez López"}'
```

#### `DELETE /api/v1/tutores/{id_tutor}` — Eliminar expediente de tutor (`204 No Content`)
```bash
curl -X DELETE "http://127.0.0.1:8000/api/v1/tutores/101"
```

---

### 3. Gestión de Pacientes (por `id_paciente` e `id_tutor`)

#### `GET /api/v1/pacientes` — Listar pacientes con paginación y filtros (`200 OK`)
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/pacientes?skip=0&limit=20&edad_min=1&edad_max=12"
```

#### `GET /api/v1/pacientes/{id_paciente}` — Obtener un paciente por su llave natural (`200 OK`)
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/pacientes/5001"
```

#### `POST /api/v1/tutores/{id_tutor}/pacientes` — Agregar un paciente a un tutor (`201 Created`)
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/tutores/101/pacientes" \
  -H "Content-Type: application/json" \
  -d '{
    "id_paciente": 5002,
    "nombre": "Valeria Gómez",
    "fecha_nacimiento": "2021-11-03",
    "edad": 4,
    "genero": "F",
    "consultas": []
  }'
```

#### `PATCH /api/v1/pacientes/{id_paciente}` — Editar datos de un paciente (`200 OK`)
```bash
curl -X PATCH "http://127.0.0.1:8000/api/v1/pacientes/5002" \
  -H "Content-Type: application/json" \
  -d '{"edad": 5}'
```

#### `DELETE /api/v1/pacientes/{id_paciente}` — Eliminar un paciente del expediente de su tutor (`204 No Content`)
```bash
curl -X DELETE "http://127.0.0.1:8000/api/v1/pacientes/5002"
```

---

### 4. Gestión de Consultas (Historial de Padecimientos)

#### `GET /api/v1/pacientes/{id_paciente}/consultas` — Listar consultas del paciente (`200 OK`)
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/pacientes/5001/consultas"
```

#### `POST /api/v1/pacientes/{id_paciente}/consultas` — Agregar consulta (`201 Created`)
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/pacientes/5001/consultas" \
  -H "Content-Type: application/json" \
  -d '{
    "fecha": "2026-06-01",
    "padecimientos": ["tos seca", "congestión nasal"],
    "diagnostico": "Rinofaringitis viral",
    "medicamentos_recetados": ["Loratadina", "Paracetamol"],
    "notas": "Lavados nasales cada 8 horas.",
    "pago": {
      "cantidad": 750,
      "forma_pago": "efectivo",
      "factura": false
    }
  }'
```

#### `PATCH /api/v1/pacientes/{id_paciente}/consultas/{indice}` — Editar consulta por índice (`200 OK`)
```bash
curl -X PATCH "http://127.0.0.1:8000/api/v1/pacientes/5001/consultas/0" \
  -H "Content-Type: application/json" \
  -d '{"notas": "Evolución favorable tras tratamiento."}'
```

#### `DELETE /api/v1/pacientes/{id_paciente}/consultas/{indice}` — Eliminar consulta por índice (`204 No Content`)
```bash
curl -X DELETE "http://127.0.0.1:8000/api/v1/pacientes/5001/consultas/0"
```

---

### 5. Gestión de Cirugías

#### `GET /api/v1/pacientes/{id_paciente}/cirugias` — Listar cirugías del paciente (`200 OK`)
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/pacientes/5001/cirugias"
```

#### `POST /api/v1/pacientes/{id_paciente}/cirugias` — Agregar cirugía (`201 Created`)
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/pacientes/5001/cirugias" \
  -H "Content-Type: application/json" \
  -d '{
    "id_cirugia": 2,
    "fecha": "2026-07-10",
    "tipo": "Apendicectomía laparoscópica",
    "anestesia": true,
    "anestesiologo": "Dra. Laura Méndez",
    "pago": {
      "cantidad": 28000,
      "forma_pago": "transferencia",
      "factura": true,
      "descuento": 5
    },
    "notas": "Recuperación en piso 24h."
  }'
```

#### `PATCH /api/v1/pacientes/{id_paciente}/cirugias/{id_cirugia}` — Editar cirugía (`200 OK`)
```bash
curl -X PATCH "http://127.0.0.1:8000/api/v1/pacientes/5001/cirugias/2" \
  -H "Content-Type: application/json" \
  -d '{"notas": "Alta médica sin incidentes."}'
```

#### `DELETE /api/v1/pacientes/{id_paciente}/cirugias/{id_cirugia}` — Eliminar cirugía (`204 No Content`)
```bash
curl -X DELETE "http://127.0.0.1:8000/api/v1/pacientes/5001/cirugias/2"
```

---

### 6. Endpoints de Análisis (MongoDB Aggregation Pipelines)

#### `GET /api/v1/analisis/resumen-general` — Indicadores demográficos y clínicos globales
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/analisis/resumen-general"
```

#### `GET /api/v1/analisis/padecimientos-frecuentes` — Top padecimientos/motivos de visita
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/analisis/padecimientos-frecuentes?limit=10"
```

#### `GET /api/v1/analisis/ingresos` — Ingresos brutos, netos (con descuento) y facturas por forma de pago
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/analisis/ingresos"
```

#### `GET /api/v1/analisis/cirugias-resumen` — Estadísticas de cirugías por tipo y uso de anestesia
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/analisis/cirugias-resumen"
```

#### `GET /api/v1/analisis/expedientes-por-tutor` — Conteo de pacientes, consultas y cirugías por tutor
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/analisis/expedientes-por-tutor"
```

---

## Cómo correr las pruebas

Ejecuta la suite completa de pruebas con `pytest` a través de `uv`:

```powershell
uv run pytest -v
```
