import React, { useEffect, useState } from "react";
import {
  actualizarConsulta,
  agregarConsulta,
  eliminarConsulta,
  listarConsultas,
  listarPacientes,
} from "../services/api";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  TimeSeriesChart,
} from "../components/StatusViews";

export default function ConsultasView({ pacienteInicialId }) {
  const [pacientesOpciones, setPacientesOpciones] = useState([]);
  const [idPacienteActivo, setIdPacienteActivo] = useState(
    pacienteInicialId ? String(pacienteInicialId) : "5001"
  );

  // Estados de GET /api/v1/pacientes/{id_paciente}/consultas
  const [consultas, setConsultas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Filtros de la tabla de consultas
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroFormaPago, setFiltroFormaPago] = useState("");

  // Detalle y edición PATCH /api/v1/pacientes/{id_paciente}/consultas/{indice}
  const [indiceSeleccionado, setIndiceSeleccionado] = useState(null);
  const [formEditar, setFormEditar] = useState({
    fecha: "",
    padecimientos: "",
    diagnostico: "",
    medicamentos_recetados: "",
    notas: "",
    cantidad: "",
    forma_pago: "efectivo",
    factura: false,
    descuento: "",
  });

  // Formulario POST /api/v1/pacientes/{id_paciente}/consultas
  const [mostrarFormCrear, setMostrarFormCrear] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const [formNueva, setFormNueva] = useState({
    fecha: "2026-05-12",
    padecimientos: "fiebre, tos",
    diagnostico: "",
    medicamentos_recetados: "",
    notas: "",
    cantidad: "800",
    forma_pago: "efectivo",
    factura: false,
    descuento: "",
  });

  const cargarCatalogoPacientes = async () => {
    try {
      const res = await listarPacientes({ skip: 0, limit: 100 });
      setPacientesOpciones(res.items || []);
    } catch {
      // Silencioso si falla el selector auxiliar
    }
  };

  const cargarConsultasPaciente = async (idPac = idPacienteActivo) => {
    if (!idPac) return;
    setCargando(true);
    setError(null);
    setIndiceSeleccionado(null);
    try {
      const data = await listarConsultas(Number(idPac));
      setConsultas(data || []);
    } catch (err) {
      setConsultas([]);
      setError(
        err.message || "Error al consultar el historial clínico del paciente."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCatalogoPacientes();
  }, []);

  useEffect(() => {
    if (pacienteInicialId) {
      setIdPacienteActivo(String(pacienteInicialId));
      cargarConsultasPaciente(String(pacienteInicialId));
    } else {
      cargarConsultasPaciente(idPacienteActivo);
    }
  }, [pacienteInicialId]);

  const seleccionarParaDetalle = (con, indiceReal) => {
    setIndiceSeleccionado(indiceReal);
    setMensaje(null);
    setErrorAccion(null);
    setFormEditar({
      fecha: con.fecha || "",
      padecimientos: (con.padecimientos || []).join(", "),
      diagnostico: con.diagnostico || "",
      medicamentos_recetados: (con.medicamentos_recetados || []).join(", "),
      notas: con.notas || "",
      cantidad: String(con.pago?.cantidad ?? ""),
      forma_pago: con.pago?.forma_pago || "efectivo",
      factura: Boolean(con.pago?.factura),
      descuento:
        con.pago?.descuento !== null && con.pago?.descuento !== undefined
          ? String(con.pago.descuento)
          : "",
    });
  };

  const handleCrearConsulta = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    setErrorAccion(null);
    try {
      const payload = {
        fecha: formNueva.fecha,
        padecimientos: formNueva.padecimientos
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        diagnostico: formNueva.diagnostico.trim(),
        medicamentos_recetados: formNueva.medicamentos_recetados
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        ...(formNueva.notas.trim() ? { notas: formNueva.notas.trim() } : {}),
        pago: {
          cantidad: Number(formNueva.cantidad),
          forma_pago: formNueva.forma_pago,
          factura: Boolean(formNueva.factura),
          descuento:
            formNueva.descuento !== "" ? Number(formNueva.descuento) : null,
        },
      };
      await agregarConsulta(Number(idPacienteActivo), payload);
      setMostrarFormCrear(false);
      setMensaje(
        `Nueva consulta registrada para el paciente #${idPacienteActivo} (POST 201).`
      );
      setFormNueva((prev) => ({
        ...prev,
        diagnostico: "",
        medicamentos_recetados: "",
        notas: "",
      }));
      await cargarConsultasPaciente(idPacienteActivo);
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleActualizarConsulta = async (e) => {
    e.preventDefault();
    if (indiceSeleccionado === null) return;
    setGuardando(true);
    setMensaje(null);
    setErrorAccion(null);
    try {
      const payload = {
        fecha: formEditar.fecha,
        padecimientos: formEditar.padecimientos
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        diagnostico: formEditar.diagnostico.trim(),
        medicamentos_recetados: formEditar.medicamentos_recetados
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        ...(formEditar.notas.trim() ? { notas: formEditar.notas.trim() } : {}),
        pago: {
          cantidad: Number(formEditar.cantidad),
          forma_pago: formEditar.forma_pago,
          factura: Boolean(formEditar.factura),
          descuento:
            formEditar.descuento !== "" ? Number(formEditar.descuento) : null,
        },
      };
      await actualizarConsulta(
        Number(idPacienteActivo),
        indiceSeleccionado,
        payload
      );
      setMensaje(`Consulta en índice #${indiceSeleccionado} actualizada (PATCH).`);
      await cargarConsultasPaciente(idPacienteActivo);
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarConsulta = async (indice) => {
    setGuardando(true);
    setMensaje(null);
    setErrorAccion(null);
    try {
      await eliminarConsulta(Number(idPacienteActivo), indice);
      if (indiceSeleccionado === indice) {
        setIndiceSeleccionado(null);
      }
      setMensaje(`Consulta en índice #${indice} eliminada (DELETE 204).`);
      await cargarConsultasPaciente(idPacienteActivo);
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const consultasConIndice = consultas.map((c, idx) => ({ ...c, _indice: idx }));
  const consultasFiltradas = consultasConIndice.filter((c) => {
    if (filtroFormaPago && c.pago?.forma_pago !== filtroFormaPago) return false;
    if (filtroTexto) {
      const q = filtroTexto.toLowerCase();
      const enDiag = (c.diagnostico || "").toLowerCase().includes(q);
      const enPad = (c.padecimientos || []).some((p) =>
        p.toLowerCase().includes(q)
      );
      const enMed = (c.medicamentos_recetados || []).some((m) =>
        m.toLowerCase().includes(q)
      );
      if (!enDiag && !enPad && !enMed) return false;
    }
    return true;
  });

  // Serie de tiempo de montos de consulta por fecha (Regla 7)
  const serieTiempoConsultas = consultas.map((c) => ({
    fecha: c.fecha,
    valor: Number(c.pago?.cantidad || 0),
  }));

  return (
    <div className="view-container">
      <div className="section-header">
        <div>
          <h2>Historial de Consultas Médicas</h2>
          <p className="text-muted">
            Padecimientos, diagnósticos, recetas y pagos por paciente (
            <code>/api/v1/pacientes/&#123;id_paciente&#125;/consultas</code>).
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setMostrarFormCrear((v) => !v)}
        >
          {mostrarFormCrear ? "Cerrar formulario" : "+ Nueva Consulta (POST)"}
        </button>
      </div>

      {/* Selector de Paciente */}
      <section className="card">
        <div className="filters-bar" style={{ marginBottom: 0 }}>
          <div className="filter-group filter-grow">
            <label htmlFor="sel-pac-consultas">
              Seleccionar Paciente de la Lista
            </label>
            <select
              id="sel-pac-consultas"
              value={idPacienteActivo}
              onChange={(e) => {
                setIdPacienteActivo(e.target.value);
                cargarConsultasPaciente(e.target.value);
              }}
            >
              {pacientesOpciones.map((item) => (
                <option
                  key={item.paciente.id_paciente}
                  value={item.paciente.id_paciente}
                >
                  #{item.paciente.id_paciente} — {item.paciente.nombre} (Tutor:{" "}
                  {item.tutor})
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="input-pac-consultas">O ingresar id_paciente</label>
            <input
              id="input-pac-consultas"
              type="number"
              min="1"
              value={idPacienteActivo}
              onChange={(e) => setIdPacienteActivo(e.target.value)}
            />
          </div>
          <div className="filter-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => cargarConsultasPaciente(idPacienteActivo)}
            >
              Cargar Consultas
            </button>
          </div>
        </div>
      </section>

      {mensaje && (
        <div className="alert alert-success" role="status">
          <span>{mensaje}</span>
          <button
            type="button"
            className="btn-close"
            onClick={() => setMensaje(null)}
          >
            ×
          </button>
        </div>
      )}
      {errorAccion && (
        <ErrorState
          mensaje={errorAccion}
          onRetry={() => setErrorAccion(null)}
        />
      )}

      {/* FORMULARIO POST /api/v1/pacientes/{id_paciente}/consultas */}
      {mostrarFormCrear && (
        <section className="card form-card">
          <div className="card-header">
            <div>
              <h3>
                Registrar Nueva Consulta para Paciente #{idPacienteActivo}
              </h3>
              <p className="text-muted">
                <code>POST /api/v1/pacientes/{idPacienteActivo}/consultas</code>
              </p>
            </div>
          </div>

          <form onSubmit={handleCrearConsulta} className="form-grid">
            <div className="form-field">
              <label htmlFor="nc-fecha">Fecha (AAAA-MM-DD) *</label>
              <input
                id="nc-fecha"
                type="date"
                required
                value={formNueva.fecha}
                onChange={(e) =>
                  setFormNueva({ ...formNueva, fecha: e.target.value })
                }
              />
            </div>
            <div className="form-field form-span-2">
              <label htmlFor="nc-pad">
                Padecimientos / Motivos de Visita (separados por coma) *
              </label>
              <input
                id="nc-pad"
                type="text"
                required
                placeholder="Ej. fiebre, dolor de oído"
                value={formNueva.padecimientos}
                onChange={(e) =>
                  setFormNueva({ ...formNueva, padecimientos: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="nc-diag">Diagnóstico Clínico *</label>
              <input
                id="nc-diag"
                type="text"
                required
                placeholder="Ej. Otitis media aguda"
                value={formNueva.diagnostico}
                onChange={(e) =>
                  setFormNueva({ ...formNueva, diagnostico: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="nc-meds">
                Medicamentos Recetados (separados por coma) *
              </label>
              <input
                id="nc-meds"
                type="text"
                required
                placeholder="Ej. Amoxicilina, Ibuprofeno"
                value={formNueva.medicamentos_recetados}
                onChange={(e) =>
                  setFormNueva({
                    ...formNueva,
                    medicamentos_recetados: e.target.value,
                  })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="nc-notas">Notas Adicionales (opcional)</label>
              <input
                id="nc-notas"
                type="text"
                value={formNueva.notas}
                onChange={(e) =>
                  setFormNueva({ ...formNueva, notas: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="nc-cant">Pago: Cantidad (&gt; 0) *</label>
              <input
                id="nc-cant"
                type="number"
                min="1"
                step="0.01"
                required
                value={formNueva.cantidad}
                onChange={(e) =>
                  setFormNueva({ ...formNueva, cantidad: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="nc-fpago">Forma de Pago *</label>
              <select
                id="nc-fpago"
                value={formNueva.forma_pago}
                onChange={(e) =>
                  setFormNueva({ ...formNueva, forma_pago: e.target.value })
                }
              >
                <option value="efectivo">efectivo</option>
                <option value="tarjeta">tarjeta</option>
                <option value="transferencia">transferencia</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="nc-desc">Descuento % (0 - 100)</label>
              <input
                id="nc-desc"
                type="number"
                min="0"
                max="100"
                placeholder="Opcional"
                value={formNueva.descuento}
                onChange={(e) =>
                  setFormNueva({ ...formNueva, descuento: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label className="checkbox-inline" style={{ marginTop: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={formNueva.factura}
                  onChange={(e) =>
                    setFormNueva({ ...formNueva, factura: e.target.checked })
                  }
                />
                <span>Requiere factura</span>
              </label>
            </div>
            <div className="form-actions form-span-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={guardando}
              >
                Guardar Consulta (POST)
              </button>
            </div>
          </form>
        </section>
      )}

      {cargando ? (
        <LoadingState
          mensaje={`Cargando consultas del paciente #${idPacienteActivo}...`}
        />
      ) : error ? (
        <ErrorState
          mensaje={error}
          onRetry={() => cargarConsultasPaciente(idPacienteActivo)}
        />
      ) : (
        <>
          {/* Serie de tiempo de las consultas del paciente (Regla 7) */}
          <TimeSeriesChart
            titulo={`Serie de Tiempo de Consultas — Paciente #${idPacienteActivo}`}
            subtitulo="Monto de pago por fecha de consulta (AAAA-MM-DD)"
            puntos={serieTiempoConsultas}
            prefijoValor="$"
            color="#0d9488"
          />

          {/* Tabla con filtros de consultas */}
          <section className="card">
            <div className="card-header">
              <div>
                <h3>Consultas del Paciente #{idPacienteActivo}</h3>
                <p className="text-muted">
                  <code>GET /api/v1/pacientes/{idPacienteActivo}/consultas</code>{" "}
                  — Total: <strong>{consultasFiltradas.length}</strong>
                </p>
              </div>
            </div>

            <div className="filters-bar">
              <div className="filter-group filter-grow">
                <label htmlFor="fc-texto">
                  Filtrar por padecimiento, diagnóstico o medicamento
                </label>
                <input
                  id="fc-texto"
                  type="text"
                  placeholder="Ej. fiebre, faringoamigdalitis, amoxicilina..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label htmlFor="fc-fpago">Forma de Pago</label>
                <select
                  id="fc-fpago"
                  value={filtroFormaPago}
                  onChange={(e) => setFiltroFormaPago(e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="efectivo">efectivo</option>
                  <option value="tarjeta">tarjeta</option>
                  <option value="transferencia">transferencia</option>
                </select>
              </div>
            </div>

            {consultasFiltradas.length === 0 ? (
              <EmptyState
                titulo="Sin consultas registradas"
                mensaje="Este paciente no tiene consultas que coincidan con el filtro actual."
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Índice</th>
                      <th>Fecha</th>
                      <th>Padecimientos</th>
                      <th>Diagnóstico</th>
                      <th>Medicamentos Recetados</th>
                      <th>Pago</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultasFiltradas.map((con) => (
                      <tr key={con._indice}>
                        <td>
                          <strong>#{con._indice}</strong>
                        </td>
                        <td>{con.fecha}</td>
                        <td>{(con.padecimientos || []).join(", ")}</td>
                        <td>{con.diagnostico}</td>
                        <td>{(con.medicamentos_recetados || []).join(", ")}</td>
                        <td>
                          <strong>${con.pago?.cantidad}</strong> (
                          {con.pago?.forma_pago})
                          {con.pago?.descuento
                            ? ` · -${con.pago.descuento}%`
                            : ""}
                          {con.pago?.factura ? " · Factura" : ""}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() =>
                                seleccionarParaDetalle(con, con._indice)
                              }
                            >
                              Detalle / Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => handleEliminarConsulta(con._indice)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* DETALLE Y EDICIÓN PATCH /api/v1/pacientes/{id_paciente}/consultas/{indice} */}
      {indiceSeleccionado !== null && (
        <section className="card detail-card">
          <div className="card-header">
            <div>
              <h3>
                Detalle y Edición de Consulta (Índice #{indiceSeleccionado})
              </h3>
              <p className="text-muted">
                <code>
                  PATCH /api/v1/pacientes/{idPacienteActivo}/consultas/
                  {indiceSeleccionado}
                </code>
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setIndiceSeleccionado(null)}
            >
              Cerrar detalle
            </button>
          </div>

          <form onSubmit={handleActualizarConsulta} className="form-grid">
            <div className="form-field">
              <label htmlFor="ec-fecha">Fecha (AAAA-MM-DD) *</label>
              <input
                id="ec-fecha"
                type="date"
                required
                value={formEditar.fecha}
                onChange={(e) =>
                  setFormEditar({ ...formEditar, fecha: e.target.value })
                }
              />
            </div>
            <div className="form-field form-span-2">
              <label htmlFor="ec-pad">Padecimientos (separados por coma) *</label>
              <input
                id="ec-pad"
                type="text"
                required
                value={formEditar.padecimientos}
                onChange={(e) =>
                  setFormEditar({
                    ...formEditar,
                    padecimientos: e.target.value,
                  })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="ec-diag">Diagnóstico *</label>
              <input
                id="ec-diag"
                type="text"
                required
                value={formEditar.diagnostico}
                onChange={(e) =>
                  setFormEditar({ ...formEditar, diagnostico: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="ec-meds">
                Medicamentos Recetados (separados por coma) *
              </label>
              <input
                id="ec-meds"
                type="text"
                required
                value={formEditar.medicamentos_recetados}
                onChange={(e) =>
                  setFormEditar({
                    ...formEditar,
                    medicamentos_recetados: e.target.value,
                  })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="ec-notas">Notas</label>
              <input
                id="ec-notas"
                type="text"
                value={formEditar.notas}
                onChange={(e) =>
                  setFormEditar({ ...formEditar, notas: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="ec-cant">Pago: Cantidad *</label>
              <input
                id="ec-cant"
                type="number"
                min="1"
                step="0.01"
                required
                value={formEditar.cantidad}
                onChange={(e) =>
                  setFormEditar({ ...formEditar, cantidad: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="ec-fpago">Forma de Pago *</label>
              <select
                id="ec-fpago"
                value={formEditar.forma_pago}
                onChange={(e) =>
                  setFormEditar({ ...formEditar, forma_pago: e.target.value })
                }
              >
                <option value="efectivo">efectivo</option>
                <option value="tarjeta">tarjeta</option>
                <option value="transferencia">transferencia</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="ec-desc">Descuento %</label>
              <input
                id="ec-desc"
                type="number"
                min="0"
                max="100"
                value={formEditar.descuento}
                onChange={(e) =>
                  setFormEditar({ ...formEditar, descuento: e.target.value })
                }
              />
            </div>
            <div className="form-actions form-span-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={guardando}
              >
                Guardar Cambios (PATCH)
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={guardando}
                onClick={() => handleEliminarConsulta(indiceSeleccionado)}
              >
                Eliminar Consulta (DELETE)
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
