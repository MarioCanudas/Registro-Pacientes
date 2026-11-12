# Frontend Web — Sistema de Expedientes Clínicos Pediátricos (`front/`)

Aplicación web desarrollada en **React + Vite** para uso de la **Doctora** y la **Secretaria**, totalmente independiente del backend y diseñada para consumir el API REST de **Registro de Pacientes** (`optaGestionDeDatos` / `REGISTRO-PACIENTES`).

---

## Cumplimiento de Reglas Técnicas

1. **`VITE_API_URL` dinámica:** La URL base del API se lee exclusivamente de `import.meta.env.VITE_API_URL` en [`src/services/api.js`](file:///c:/Users/a1920/Proyectos/Registro-Pacientes/front/src/services/api.js). Nunca se escribe fija en el código.
2. **Fidelidad estricta a rutas y campos:** Consume únicamente las 21 rutas oficiales del backend (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) y respeta todos los campos del JSON Schema sin inventar propiedades.
3. **Pantallas por grupo de rutas:**
   - **Inicio:** Qué se puede hacer en el proyecto (orientado a Doctora y Secretaria), estado de salud (`GET /health`), gráfica de serie de tiempo y catálogo filtrable de endpoints.
   - **Tutores (`/api/v1/tutores`):** Tabla con filtros, vista de detalle, formulario `POST` para crear expediente, edición `PATCH`, reemplazo `PUT` y eliminación `DELETE`.
   - **Pacientes (`/api/v1/pacientes` y `/api/v1/tutores/{id_tutor}/pacientes`):** Tabla con filtros, ficha de detalle, formulario `POST` para agregar paciente a tutor, edición `PATCH` y eliminación `DELETE`.
   - **Consultas (`/api/v1/pacientes/{id_paciente}/consultas`):** Gráfica de serie de tiempo, tabla con filtros, vista de detalle/edición `PATCH`, formulario `POST` y eliminación `DELETE`.
   - **Cirugías (`/api/v1/pacientes/{id_paciente}/cirugias`):** Gráfica de serie de tiempo, tabla con filtros, vista de detalle/edición `PATCH`, formulario `POST` y eliminación `DELETE`.
   - **Análisis (`/api/v1/analisis/*`):** Consume los 5 endpoints de agregación con gráfica de serie de tiempo de eventos por fecha y tablas con filtros.
4. **Estados de UI en cada llamada:** Todas las llamadas muestran estado de **carga** (`LoadingState`), **error** (`ErrorState` con botón de reintento) y **lista vacía** (`EmptyState`).
5. **Cero secretos en el frontend:** No contiene llaves, contraseñas ni cadenas de conexión.
6. **Modo Datos de Ejemplo automático:** Si `VITE_API_URL` no está definida o está vacía, la app utiliza automáticamente los datos de ejemplo en memoria ([`src/data/mockData.js`](file:///c:/Users/a1920/Proyectos/Registro-Pacientes/front/src/data/mockData.js)) permitiendo probar lecturas, filtros, altas, ediciones y bajas sin necesidad de levantar el API.
7. **Gráficas y Tablas:** Las series de tiempo por fecha (`AAAA-MM-DD`) se presentan en gráficas SVG responsivas (`TimeSeriesChart`); el resto de la información se muestra en tablas con filtros.
8. **Diseño limpio y responsivo:** Totalmente en español y adaptable a pantallas de celular y escritorio.

---

## Cómo Ejecutar el Frontend

### 1. Instalar dependencias
```powershell
cd front
npm install
```

### 2. Configurar `VITE_API_URL` (Opcional)
- **Para verlo sin el API (Modo Datos de Ejemplo):** No necesitas configurar nada, o deja `VITE_API_URL=` vacío en `front/.env`.
- **Para conectarlo al API REST local (FastAPI en puerto 8000):**
  ```powershell
  Copy-Item .env.example .env
  ```
  Y edita `front/.env` con:
  ```ini
  VITE_API_URL=http://127.0.0.1:8000
  ```

### 3. Levantar el servidor de desarrollo
```powershell
npm run dev
```
Abre `http://127.0.0.1:3000` en tu navegador.
