import React, { useEffect, useState } from "react";
import { RUTAS_API } from "../data/mockData";
import {
  listarTutores,
  obtenerResumenGeneral,
  verificarSalud,
} from "../services/api";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  TimeSeriesChart,
} from "../components/StatusViews";

export default function HomeView({ rolActivo, onNavigate }) {
  const [salud, setSalud] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [serieConsultas, setSerieConsultas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Filtros para la tabla del catálogo de rutas del API
  const [filtroGrupo, setFiltroGrupo] = useState("");
  const [filtroVerbo, setFiltroVerbo] = useState("");
  const [filtroTextoRuta, setFiltroTextoRuta] = useState("");

  const cargarInicio = async () => {
    setCargando(true);
    setError(null);
    try {
      const [saludRes, resumenRes, tutoresRes] = await Promise.all([
        verificarSalud(),
        obtenerResumenGeneral(),
        listarTutores({ skip: 0, limit: 100 }),
      ]);
      setSalud(saludRes);
      setResumen(resumenRes);

      // Construir serie de tiempo de ingresos por fecha (consultas + cirugías)
      const acumuladoPorFecha = new Map();
      (tutoresRes.items || []).forEach((exp) => {
        (exp.pacientes || []).forEach((pac) => {
          (pac.consultas || []).forEach((con) => {
            if (con.fecha && con.pago?.cantidad) {
              acumuladoPorFecha.set(
                con.fecha,
                (acumuladoPorFecha.get(con.fecha) || 0) +
                  Number(con.pago.cantidad)
              );
            }
          });
          (pac.cirugias || []).forEach((cir) => {
            if (cir.fecha && cir.pago?.cantidad) {
              acumuladoPorFecha.set(
                cir.fecha,
                (acumuladoPorFecha.get(cir.fecha) || 0) +
                  Number(cir.pago.cantidad)
              );
            }
          });
        });
      });

      const puntos = Array.from(acumuladoPorFecha.entries())
        .map(([fecha, valor]) => ({ fecha, valor: Math.round(valor) }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      setSerieConsultas(puntos);
    } catch (err) {
      setError(err.message || "No se pudo cargar el estado inicial del sistema.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarInicio();
  }, []);

  const opcionesProyecto = [
    {
      id: "tutores",
      titulo: "1. Expedientes de Tutores",
      rolSugerido: "Secretaria / Doctora",
      descripcion:
        "Dar de alta nuevos tutores con sus pacientes, buscar por nombre o padecimiento, consultar el expediente completo, editar o eliminar registros.",
      rutas: "GET, POST, PUT, PATCH, DELETE /api/v1/tutores",
      accion: "Ir a Expedientes de Tutores",
    },
    {
      id: "pacientes",
      titulo: "2. Pacientes Pediátricos",
      rolSugerido: "Secretaria / Doctora",
      descripcion:
        "Consultar el padrón de niñas y niños por edad o género, ver su ficha individual, agregar un hermano a un tutor existente o actualizar su edad.",
      rutas: "GET, POST, PATCH, DELETE /api/v1/pacientes",
      accion: "Ir a Pacientes",
    },
    {
      id: "consultas",
      titulo: "3. Historial de Consultas y Recetas",
      rolSugerido: "Doctora / Secretaria",
      descripcion:
        "Registrar motivos de visita (padecimientos), diagnóstico clínico, medicamentos recetados, notas médicas y control de pagos/facturas.",
      rutas: "GET, POST, PATCH, DELETE /api/v1/pacientes/{id_paciente}/consultas",
      accion: "Ir a Consultas Médicas",
    },
    {
      id: "cirugias",
      titulo: "4. Registro de Cirugías",
      rolSugerido: "Doctora / Secretaria",
      descripcion:
        "Llevar el control de intervenciones quirúrgicas por paciente, uso de anestesia, nombre del anestesiólogo responsable y cobro.",
      rutas: "GET, POST, PATCH, DELETE /api/v1/pacientes/{id_paciente}/cirugias",
      accion: "Ir a Cirugías",
    },
    {
      id: "analisis",
      titulo: "5. Análisis Clínico e Ingresos",
      rolSugerido: "Doctora / Administración",
      descripcion:
        "Visualizar estadísticas demográficas, padecimientos más frecuentes, ingresos brutos/netos por forma de pago y cirugías por tipo.",
      rutas: "GET /api/v1/analisis/*",
      accion: "Ir a Panel de Análisis",
    },
  ];

  const rutasFiltradas = RUTAS_API.filter((r) => {
    if (filtroGrupo && r.grupo !== filtroGrupo) return false;
    if (filtroVerbo && r.verbo !== filtroVerbo) return false;
    if (filtroTextoRuta) {
      const q = filtroTextoRuta.toLowerCase();
      if (
        !r.ruta.toLowerCase().includes(q) &&
        !r.descripcion.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="view-container">
      {/* Banner de bienvenida adaptado al rol */}
      <section className="hero-banner">
        <div>
          <span className="badge badge-role">
            Sesión activa: {rolActivo === "doctora" ? "Doctora (Consulta y Clínica)" : "Secretaria (Recepción y Cobros)"}
          </span>
          <h2>Sistema de Expedientes Clínicos Pediátricos</h2>
          <p>
            Desde esta plataforma puedes agregar, consultar, editar o eliminar
            expedientes de tutores, pacientes, consultas médicas, cirugías y
            pagos sobre la colección <code>REGISTRO-PACIENTES</code>.
          </p>
        </div>
        <div className="hero-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate("tutores")}
          >
            + Nuevo Expediente
          </button>
          <button
            type="button"
            className="btn btn-outline-light"
            onClick={() => onNavigate("consultas")}
          >
            + Registrar Consulta
          </button>
        </div>
      </section>

      {/* Estado de carga / error del resumen inicial y GET /health */}
      {cargando ? (
        <LoadingState mensaje="Verificando estado del servidor (GET /health) y resumen general..." />
      ) : error ? (
        <ErrorState mensaje={error} onRetry={cargarInicio} />
      ) : (
        <>
          <section className="kpi-grid" aria-label="Indicadores generales">
            <div className="kpi-card">
              <span className="kpi-label">Estado API (GET /health)</span>
              <strong className="kpi-value text-success">
                {salud?.status === "ok" ? "Operativo (OK)" : "Sin conexión"}
              </strong>
              <small>
                Base: {salud?.database} · Colección: {salud?.collection}
              </small>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Tutores Registrados</span>
              <strong className="kpi-value">{resumen?.total_tutores ?? 0}</strong>
              <small>Expedientes familiares activos</small>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Pacientes Pediátricos</span>
              <strong className="kpi-value">{resumen?.total_pacientes ?? 0}</strong>
              <small>
                Edad prom: {resumen?.edad_promedio ?? 0} años ({resumen?.pacientes_femeninos ?? 0} F /{" "}
                {resumen?.pacientes_masculinos ?? 0} M)
              </small>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Actividad Clínica</span>
              <strong className="kpi-value">
                {(resumen?.total_consultas ?? 0) + (resumen?.total_cirugias ?? 0)}
              </strong>
              <small>
                {resumen?.total_consultas ?? 0} consultas y {resumen?.total_cirugias ?? 0} cirugías
              </small>
            </div>
          </section>

          {/* Gráfica de serie de tiempo (Regla 7) */}
          <TimeSeriesChart
            titulo="Evolución de Ingresos Clínicos por Fecha"
            subtitulo="Serie de tiempo calculada a partir de las fechas (AAAA-MM-DD) de consultas y cirugías registradas"
            puntos={serieConsultas}
            prefijoValor="$"
            color="#0284c7"
          />
        </>
      )}

      {/* Opciones de lo que se puede hacer en el proyecto */}
      <section className="section-block">
        <div className="section-header">
          <div>
            <h3>¿Qué deseas hacer hoy en el consultorio?</h3>
            <p className="text-muted">
              Selecciona un módulo para ver su lista con filtros, consultar el
              detalle o abrir los formularios de creación y edición.
            </p>
          </div>
        </div>

        <div className="module-cards-grid">
          {opcionesProyecto.map((op) => (
            <article key={op.id} className="card module-card">
              <div className="module-card-top">
                <span className="badge badge-neutral">{op.rolSugerido}</span>
                <h4>{op.titulo}</h4>
                <p>{op.descripcion}</p>
              </div>
              <div className="module-card-footer">
                <code className="route-hint">{op.rutas}</code>
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => onNavigate(op.id)}
                >
                  {op.accion}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Tabla con filtros de todas las rutas del API (Regla 7: tablas con filtros) */}
      <section className="card">
        <div className="card-header">
          <div>
            <h3>Mapa de Rutas del API REST Consumidas</h3>
            <p className="text-muted">
              Lista oficial de endpoints del backend (verbo, ruta y propósito)
              disponibles en esta aplicación web.
            </p>
          </div>
        </div>

        <div className="filters-bar">
          <div className="filter-group">
            <label htmlFor="filtro-grupo-ruta">Grupo</label>
            <select
              id="filtro-grupo-ruta"
              value={filtroGrupo}
              onChange={(e) => setFiltroGrupo(e.target.value)}
            >
              <option value="">Todos los grupos</option>
              <option value="Salud">Salud</option>
              <option value="Tutores">Tutores</option>
              <option value="Pacientes">Pacientes</option>
              <option value="Consultas">Consultas</option>
              <option value="Cirugías">Cirugías</option>
              <option value="Análisis">Análisis</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filtro-verbo-ruta">Verbo HTTP</label>
            <select
              id="filtro-verbo-ruta"
              value={filtroVerbo}
              onChange={(e) => setFiltroVerbo(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div className="filter-group filter-grow">
            <label htmlFor="filtro-texto-ruta">Buscar en ruta o descripción</label>
            <input
              id="filtro-texto-ruta"
              type="text"
              placeholder="Ej. /pacientes, cirugias, ingresos..."
              value={filtroTextoRuta}
              onChange={(e) => setFiltroTextoRuta(e.target.value)}
            />
          </div>
        </div>

        {rutasFiltradas.length === 0 ? (
          <EmptyState
            titulo="No hay rutas que coincidan"
            mensaje="Prueba cambiando el filtro de verbo HTTP o el texto de búsqueda."
            accionTexto="Limpiar filtros"
            onAccion={() => {
              setFiltroGrupo("");
              setFiltroVerbo("");
              setFiltroTextoRuta("");
            }}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Verbo</th>
                  <th>Ruta</th>
                  <th>¿Qué hace?</th>
                </tr>
              </thead>
              <tbody>
                {rutasFiltradas.map((item, idx) => (
                  <tr key={`${item.verbo}-${item.ruta}-${idx}`}>
                    <td>
                      <span className="badge badge-neutral">{item.grupo}</span>
                    </td>
                    <td>
                      <span className={`method-badge method-${item.verbo.toLowerCase()}`}>
                        {item.verbo}
                      </span>
                    </td>
                    <td>
                      <code>{item.ruta}</code>
                    </td>
                    <td>{item.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
