import React, { useEffect, useState } from "react";
import {
  listarTutores,
  obtenerExpedientesPorTutor,
  obtenerIngresos,
  obtenerPadecimientosFrecuentes,
  obtenerResumenCirugias,
  obtenerResumenGeneral,
} from "../services/api";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  TimeSeriesChart,
} from "../components/StatusViews";

export default function AnalisisView() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [resumenGeneral, setResumenGeneral] = useState(null);
  const [padecimientos, setPadecimientos] = useState([]);
  const [ingresos, setIngresos] = useState(null);
  const [cirugiasResumen, setCirugiasResumen] = useState([]);
  const [expedientesPorTutor, setExpedientesPorTutor] = useState([]);
  const [serieEventosPorFecha, setSerieEventosPorFecha] = useState([]);

  // Controles y filtros para las tablas analíticas (Regla 7)
  const [limitPadecimientos, setLimitPadecimientos] = useState(10);
  const [filtroPadecimiento, setFiltroPadecimiento] = useState("");
  const [filtroFormaPago, setFiltroFormaPago] = useState("");
  const [filtroTipoCirugia, setFiltroTipoCirugia] = useState("");
  const [filtroTutorResumen, setFiltroTutorResumen] = useState("");

  const cargarTodoAnalisis = async (lim = limitPadecimientos) => {
    setCargando(true);
    setError(null);
    try {
      const [resGen, resPad, resIng, resCir, resTut, resExp] =
        await Promise.all([
          obtenerResumenGeneral(),
          obtenerPadecimientosFrecuentes(lim),
          obtenerIngresos(),
          obtenerResumenCirugias(),
          obtenerExpedientesPorTutor(),
          listarTutores({ skip: 0, limit: 100 }),
        ]);

      setResumenGeneral(resGen);
      setPadecimientos(resPad || []);
      setIngresos(resIng);
      setCirugiasResumen(resCir || []);
      setExpedientesPorTutor(resTut || []);

      // Construir serie de tiempo de eventos clínicos por fecha (consultas + cirugías)
      const conteoFechas = new Map();
      (resExp.items || []).forEach((exp) => {
        (exp.pacientes || []).forEach((pac) => {
          (pac.consultas || []).forEach((c) => {
            if (c.fecha) {
              conteoFechas.set(c.fecha, (conteoFechas.get(c.fecha) || 0) + 1);
            }
          });
          (pac.cirugias || []).forEach((q) => {
            if (q.fecha) {
              conteoFechas.set(q.fecha, (conteoFechas.get(q.fecha) || 0) + 1);
            }
          });
        });
      });

      const puntos = Array.from(conteoFechas.entries())
        .map(([fecha, valor]) => ({ fecha, valor }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      setSerieEventosPorFecha(puntos);
    } catch (err) {
      setError(
        err.message || "No fue posible cargar los reportes de análisis."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTodoAnalisis(limitPadecimientos);
  }, []);

  if (cargando) {
    return (
      <div className="view-container">
        <LoadingState mensaje="Ejecutando Aggregation Pipelines en /api/v1/analisis/* ..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-container">
        <ErrorState
          mensaje={error}
          onRetry={() => cargarTodoAnalisis(limitPadecimientos)}
        />
      </div>
    );
  }

  const padecimientosFiltrados = padecimientos.filter((p) =>
    !filtroPadecimiento
      ? true
      : p.padecimiento.toLowerCase().includes(filtroPadecimiento.toLowerCase())
  );

  const formasPagoFiltradas = (ingresos?.por_forma_pago || []).filter((fp) =>
    !filtroFormaPago ? true : fp.forma_pago === filtroFormaPago
  );

  const cirugiasFiltradas = cirugiasResumen.filter((c) =>
    !filtroTipoCirugia
      ? true
      : c.tipo.toLowerCase().includes(filtroTipoCirugia.toLowerCase())
  );

  const tutoresFiltrados = expedientesPorTutor.filter((t) =>
    !filtroTutorResumen
      ? true
      : t.tutor.toLowerCase().includes(filtroTutorResumen.toLowerCase())
  );

  return (
    <div className="view-container">
      <div className="section-header">
        <div>
          <h2>Panel de Análisis Clínico y Financiero</h2>
          <p className="text-muted">
            Resultados en vivo de los 5 endpoints con Aggregation Pipelines de
            MongoDB (<code>/api/v1/analisis/*</code>).
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => cargarTodoAnalisis(limitPadecimientos)}
        >
          Actualizar Reportes
        </button>
      </div>

      {/* 1. GET /api/v1/analisis/resumen-general */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Tutores / Pacientes</span>
          <strong className="kpi-value">
            {resumenGeneral?.total_tutores ?? 0} /{" "}
            {resumenGeneral?.total_pacientes ?? 0}
          </strong>
          <small>
            <code>GET /api/v1/analisis/resumen-general</code>
          </small>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Edad Promedio Pediátrica</span>
          <strong className="kpi-value">
            {resumenGeneral?.edad_promedio ?? 0} años
          </strong>
          <small>
            Niñas (F): {resumenGeneral?.pacientes_femeninos ?? 0} · Niños (M):{" "}
            {resumenGeneral?.pacientes_masculinos ?? 0}
          </small>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Ingresos Brutos / Netos</span>
          <strong className="kpi-value">
            ${ingresos?.monto_neto_total ?? 0}
          </strong>
          <small>
            Bruto: ${ingresos?.monto_bruto_total ?? 0} · Facturas:{" "}
            {ingresos?.total_facturas ?? 0}
          </small>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Consultas y Cirugías</span>
          <strong className="kpi-value">
            {resumenGeneral?.total_consultas ?? 0} /{" "}
            {resumenGeneral?.total_cirugias ?? 0}
          </strong>
          <small>Total operaciones: {ingresos?.total_operaciones ?? 0}</small>
        </div>
      </section>

      {/* Serie de tiempo en gráfica (Regla 7) */}
      <TimeSeriesChart
        titulo="Serie de Tiempo de Eventos Clínicos por Fecha"
        subtitulo="Número de atenciones (consultas y cirugías) agrupadas por fecha AAAA-MM-DD"
        puntos={serieEventosPorFecha}
        sufijoValor=" ev."
        color="#0284c7"
      />

      {/* 2. GET /api/v1/analisis/padecimientos-frecuentes (Tabla con filtros) */}
      <section className="card">
        <div className="card-header">
          <div>
            <h3>Padecimientos y Motivos de Visita Más Frecuentes</h3>
            <p className="text-muted">
              <code>GET /api/v1/analisis/padecimientos-frecuentes</code>
            </p>
          </div>
        </div>

        <div className="filters-bar">
          <div className="filter-group filter-grow">
            <label htmlFor="fa-pad">Filtrar padecimiento</label>
            <input
              id="fa-pad"
              type="text"
              placeholder="Ej. fiebre, tos..."
              value={filtroPadecimiento}
              onChange={(e) => setFiltroPadecimiento(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="fa-lim">Límite (query param limit)</label>
            <select
              id="fa-lim"
              value={limitPadecimientos}
              onChange={(e) => {
                const nuevoLim = Number(e.target.value);
                setLimitPadecimientos(nuevoLim);
                cargarTodoAnalisis(nuevoLim);
              }}
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={25}>Top 25</option>
            </select>
          </div>
        </div>

        {padecimientosFiltrados.length === 0 ? (
          <EmptyState
            titulo="Sin padecimientos para mostrar"
            mensaje="No hay motivos de visita que coincidan con el filtro."
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Padecimiento / Motivo</th>
                  <th>Frecuencia (Consultas)</th>
                  <th>Total Pacientes Afectados</th>
                </tr>
              </thead>
              <tbody>
                {padecimientosFiltrados.map((p) => (
                  <tr key={p.padecimiento}>
                    <td>
                      <strong>{p.padecimiento}</strong>
                    </td>
                    <td>{p.frecuencia}</td>
                    <td>{p.total_pacientes_afectados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 3. GET /api/v1/analisis/ingresos (Tabla con filtros) */}
      <section className="card">
        <div className="card-header">
          <div>
            <h3>Ingresos Desglosados por Forma de Pago</h3>
            <p className="text-muted">
              <code>GET /api/v1/analisis/ingresos</code>
            </p>
          </div>
        </div>

        <div className="filters-bar">
          <div className="filter-group">
            <label htmlFor="fa-fpago">Filtrar por Forma de Pago</label>
            <select
              id="fa-fpago"
              value={filtroFormaPago}
              onChange={(e) => setFiltroFormaPago(e.target.value)}
            >
              <option value="">Todas las formas de pago</option>
              <option value="efectivo">efectivo</option>
              <option value="tarjeta">tarjeta</option>
              <option value="transferencia">transferencia</option>
            </select>
          </div>
        </div>

        {formasPagoFiltradas.length === 0 ? (
          <EmptyState
            titulo="Sin ingresos para esa forma de pago"
            mensaje="No hay operaciones registradas con el método de pago seleccionado."
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Forma de Pago</th>
                  <th>Total Operaciones</th>
                  <th>Monto Bruto</th>
                  <th>Monto Neto (con descuento)</th>
                  <th>Total Facturas</th>
                </tr>
              </thead>
              <tbody>
                {formasPagoFiltradas.map((fp) => (
                  <tr key={fp.forma_pago}>
                    <td>
                      <span className="badge badge-info">{fp.forma_pago}</span>
                    </td>
                    <td>{fp.total_operaciones}</td>
                    <td>${fp.monto_bruto}</td>
                    <td>
                      <strong>${fp.monto_neto}</strong>
                    </td>
                    <td>{fp.total_facturas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 4. GET /api/v1/analisis/cirugias-resumen (Tabla con filtros) */}
      <section className="card">
        <div className="card-header">
          <div>
            <h3>Resumen de Cirugías por Tipo</h3>
            <p className="text-muted">
              <code>GET /api/v1/analisis/cirugias-resumen</code>
            </p>
          </div>
        </div>

        <div className="filters-bar">
          <div className="filter-group filter-grow">
            <label htmlFor="fa-cir">Filtrar por tipo de cirugía</label>
            <input
              id="fa-cir"
              type="text"
              placeholder="Ej. Amigdalectomía, Hernioplastía..."
              value={filtroTipoCirugia}
              onChange={(e) => setFiltroTipoCirugia(e.target.value)}
            />
          </div>
        </div>

        {cirugiasFiltradas.length === 0 ? (
          <EmptyState
            titulo="Sin cirugías que coincidan"
            mensaje="No se encontraron estadísticas de cirugías con ese filtro."
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo de Cirugía</th>
                  <th>Total Cirugías</th>
                  <th>Con Anestesia</th>
                  <th>Ingreso Bruto</th>
                </tr>
              </thead>
              <tbody>
                {cirugiasFiltradas.map((c) => (
                  <tr key={c.tipo}>
                    <td>
                      <strong>{c.tipo}</strong>
                    </td>
                    <td>{c.total_cirugias}</td>
                    <td>{c.con_anestesia}</td>
                    <td>${c.ingreso_bruto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. GET /api/v1/analisis/expedientes-por-tutor (Tabla con filtros) */}
      <section className="card">
        <div className="card-header">
          <div>
            <h3>Resumen de Expedientes por Tutor</h3>
            <p className="text-muted">
              <code>GET /api/v1/analisis/expedientes-por-tutor</code>
            </p>
          </div>
        </div>

        <div className="filters-bar">
          <div className="filter-group filter-grow">
            <label htmlFor="fa-tut">Filtrar por nombre del tutor</label>
            <input
              id="fa-tut"
              type="text"
              placeholder="Ej. María, Carlos, Ana..."
              value={filtroTutorResumen}
              onChange={(e) => setFiltroTutorResumen(e.target.value)}
            />
          </div>
        </div>

        {tutoresFiltrados.length === 0 ? (
          <EmptyState
            titulo="Sin tutores que coincidan"
            mensaje="No hay resúmenes de tutores con ese filtro."
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID Tutor</th>
                  <th>Nombre del Tutor</th>
                  <th>Total Pacientes</th>
                  <th>Total Consultas</th>
                  <th>Total Cirugías</th>
                </tr>
              </thead>
              <tbody>
                {tutoresFiltrados.map((t) => (
                  <tr key={t.id_tutor}>
                    <td>
                      <strong>#{t.id_tutor}</strong>
                    </td>
                    <td>{t.tutor}</td>
                    <td>{t.total_pacientes}</td>
                    <td>{t.total_consultas}</td>
                    <td>{t.total_cirugias}</td>
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
