# Guía y Reglas para Agentes de IA (`agents.md`)

Este documento define los objetivos, la arquitectura, las restricciones de seguridad y las reglas operativas obligatorias para cualquier agente de codificación que interactúe con el repositorio **Registro-Pacientes**.

---

## 1. Objetivo del Proyecto
Mantener y evolucionar un API REST en **Python + FastAPI + PyMongo** para la gestión de expedientes clínicos digitales (principalmente de pediatría) sobre una base de datos existente en **MongoDB Atlas**:
- **Base de datos:** `optaGestionDeDatos`
- **Colección principal:** `REGISTRO-PACIENTES`
- **Relación de datos:** Documento anidado donde cada registro raíz representa un **tutor** (`id_tutor`, `tutor`) que contiene su lista de **pacientes** (`pacientes[]`), y cada paciente anida su historial de **consultas** (`consultas[]`) y **cirugías** (`cirugias[]`), incluyendo sus respectivos **pagos** (`pago`).

---

## 2. Regla de Ejecución con `uv` (Obligatoria)
- **SIEMPRE usa `uv`** para ejecutar cualquier comando relacionado con Python, gestión de paquetes, servidor de desarrollo o pruebas:
  - Instalar o sincronizar dependencias: `uv sync` o `uv add <paquete>`
  - Levantar el servidor: `uv run uvicorn app.main:app --reload`
  - Ejecutar pruebas: `uv run pytest -v`
  - Ejecutar scripts de Python: `uv run python <script.py>`
- No utilices `pip`, `python` ni `pytest` de forma global fuera de `uv`.

---

## 3. Fidelidad Estricta al Esquema (Cero Campos Inventados)
- **Prohibido inventar colecciones o campos** que no estén definidos en el JSON Schema oficial (`draft/2020-12`) de `REGISTRO-PACIENTES`.
- Todos los modelos de entrada en [`app/models.py`](file:///c:/Users/a1920/Proyectos/Registro-Pacientes/app/models.py) deben mantener `ConfigDict(extra="forbid")` (`additionalProperties: false`).
- **Llaves naturales e índices únicos:**
  1. `id_tutor` (entero $\ge 1$, único a nivel de documento raíz).
  2. `pacientes.id_paciente` (entero $\ge 1$, único en toda la colección mediante índice multikey).
- **Reglas de negocio del esquema:**
  - Un tutor debe tener siempre al menos 1 paciente (`minItems: 1`). No se permite dejar un expediente de tutor con `pacientes: []`.
  - Las fechas (`fecha_nacimiento`, `consultas[].fecha`, `cirugias[].fecha`) deben validarse y almacenarse como cadenas en formato ISO `AAAA-MM-DD`.
  - Los campos opcionales cuyo tipo en el JSON Schema no admite `null` (`notas` y `cirugias`) deben omitirse del documento BSON cuando no se envían, mientras que `anestesiologo` y `descuento` sí admiten `null`.

---

## 4. Reglas de Seguridad (Inquebrantables)
1. **Secretos y `.env`:**
   - La cadena de conexión se lee exclusivamente desde la variable de entorno `MONGO_URI` mediante [`app/config.py`](file:///c:/Users/a1920/Proyectos/Registro-Pacientes/app/config.py).
   - **NUNCA** escribas credenciales reales en el código fuente, tests, `README.md` ni `.env.example`.
   - **NUNCA** imprimas `MONGO_URI`, contraseñas ni detalles crudos de conexión en logs (`logging`), `print()` o respuestas HTTP de error.
2. **Principio de menor privilegio:**
   - El usuario de MongoDB Atlas configurado en `MONGO_URI` debe tener únicamente el rol `readWrite` sobre la base `optaGestionDeDatos` (nunca `atlasAdmin` ni `root`).
3. **CORS seguro:**
   - Los orígenes permitidos se leen de `CORS_ORIGINS`. Nunca configures `allow_origins=["*"]` por defecto.
4. **Prevención de NoSQL Injection:**
   - Todos los parámetros de ruta, query y cuerpo deben validarse con tipos estrictos de Pydantic/FastAPI.
   - Si se realizan búsquedas por texto con expresiones regulares (`$regex`), **siempre** escapa la entrada del usuario con `re.escape()`.

---

## 5. Estándares de Códigos HTTP y Pruebas
- **Códigos esperados:**
  - `200 OK`: Consultas (`GET`) y actualizaciones (`PUT`, `PATCH`).
  - `201 Created`: Creación de tutores, pacientes, consultas o cirugías (`POST`).
  - `204 No Content`: Eliminaciones exitosas (`DELETE`).
  - `404 Not Found`: Recurso inexistente por `id_tutor`, `id_paciente`, índice de consulta o `id_cirugia`.
  - `409 Conflict`: Intento de duplicar `id_tutor`, `id_paciente` o `id_cirugia` (apoyándose en el índice único de MongoDB y manejando `DuplicateKeyError`).
  - `422 Unprocessable Entity`: Violación del JSON Schema o intento de eliminar el último paciente de un tutor.
- **Pruebas obligatorias:** Antes de dar por concluido cualquier cambio, ejecuta `uv run pytest -v` y verifica que todas las pruebas en [`tests/test_api.py`](file:///c:/Users/a1920/Proyectos/Registro-Pacientes/tests/test_api.py) pasen al 100%.
