import React, { useEffect, useState } from "react";
import {
  actualizarCirugia,
  agregarCirugia,
  eliminarCirugia,
  listarCirugias,
  listarPacientes,
} from "../services/api";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  TimeSeriesChart,
} from "../components/StatusViews";

export default function CirugiasView({ pacienteInicialId }) {
  const [pacientesOpciones, setPacientesOpciones] = useState([]);
  const [idPacienteActivo, setIdPacienteActivo] = useState(
    pacienteInicialId ? String(pacienteInicialId) : "5001"
  );

  // Estados de GET /api/v1/pacientes/{id_paciente}/cirugias
  const [cirugias, setCirugias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Filtros de tabla
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroAnestesia, setFiltroAnestesia] = useState("");

  // Detalle y edición PATCH /api/v1/pacientes/{id_paciente}/cirugias/{id_cirugia}
  const [cirugiaSeleccionada, setCirugiaSeleccionada] = useState(null);
  const [formEditar, setFormEditar] = useState({
    fecha: "",
    tipo: "",
    anestesia: true,
    anestesiologo: "",
    notas: "",
    cantidad: "",
    forma_pago: "transferencia",
    factura: true,
    descuento: "",
  });

  // Formulario POST /api/v1/pacientes/{id_paciente}/cirugias
  const [mostrarFormCrear, setMostrarFormCrear] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const [formNueva, setFormNueva] = useState({
    id_cirugia: "",
    fecha: "2026-06-15",
    tipo: "",
    anestesia: true,
    anestesiologo: "",
    notas: "",
    cantidad: "15000",
    forma_pago: "transferencia",
    factura: true,
    descuento: "",
  });

  const cargarCatalogoPacientes = async () => {
    try {
      const res = await listarPacientes({ skip: 0, limit: 100 });
      setPacientesOpciones(res.items || []);
    } catch {
      // Silencioso
    }
  };

  const cargarCirugiasPaciente = async (idPac = idPacienteActivo) => {
    if (!idPac) return;
    setCargando(true);
    setError(null);
    setCirugiaSeleccionada(null);
    try {
      const data = await listarCirugias(Number(idPac));
      setCirugias(data || []);
    } catch (err) {
      setCirugias([]);
      setError(
        err.message || "Error al consultar el historial quirúrgico del paciente."
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
      cargarCirugiasPaciente(String(pacienteInicialId));
    } else {
      cargarCirugiasPaciente(idPacienteActivo);
    }
  }, [pacienteInicialId]);

  const seleccionarCirugia = (cir) => {
    setCirugiaSeleccionada(cir);
    setMensaje(null);
    setErrorAccion(null);
    setFormEditar({
      fecha: cir.fecha || "",
      tipo: cir.tipo || "",
      anestesia: Boolean(cir.anestesia),
      anestesiologo: cir.anestesiologo || "",
      notas: cir.notas || "",
      cantidad: String(cir.pago?.cantidad ?? ""),
      forma_pago: cir.pago?.forma_pago || "transferencia",
      factura: Boolean(cir.pago?.factura),
      descuento:
        cir.pago?.descuento !== null && cir.pago?.descuento !== undefined
          ? String(cir.pago.descuento)
          : "",
    });
  };

  const handleCrearCirugia = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    setErrorAccion(null);
    try {
      const payload = {
        id_cirugia: Number(formNueva.id_cirugia),
        fecha: formNueva.fecha,
        tipo: formNueva.tipo.trim(),
        anestesia: Boolean(formNueva.anestesia),
        anestesiologo: formNueva.anestesiologo.trim() || null,
        ...(formNueva.notas.trim() ? { notas: formNueva.notas.trim() } : {}),
        pago: {
          cantidad: Number(formNueva.cantidad),
          forma_pago: formNueva.forma_pago,
          factura: Boolean(formNueva.factura),
          descuento:
            formNueva.descuento !== "" ? Number(formNueva.descuento) : null,
        },
      };
      await agregarCirugia(Number(idPacienteActivo), payload);
      setMostrarFormCrear(false);
      setMensaje(
        `Cirugía #${payload.id_cirugia} registrada para el paciente #${idPacienteActivo} (POST 201).`
      );
      setFormNueva((prev) => ({
        ...prev,
        id_cirugia: "",
        tipo: "",
        anestesiologo: "",
        notas: "",
      }));
      await cargarCirugiasPaciente(idPacienteActivo);
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleActualizarCirugia = async (e) => {
    e.preventDefault();
    if (!cirugiaSeleccionada) return;
    setGuardando(true);
    setMensaje(null);
    setErrorAccion(null);
    try {
      const payload = {
        fecha: formEditar.fecha,
        tipo: formEditar.tipo.trim(),
        anestesia: Boolean(formEditar.anestesia),
        anestesiologo: formEditar.anestesiologo.trim() || null,
        ...(formEditar.notas.trim() ? { notas: formEditar.notas.trim() } : {}),
        pago: {
          cantidad: Number(formEditar.cantidad),
          forma_pago: formEditar.forma_pago,
          factura: Boolean(formEditar.factura),
          descuento:
            formEditar.descuento !== "" ? Number(formEditar.descuento) : null,
        },
      };
      await actualizarCirugia(
        Number(idPacienteActivo),
        cirugiaSeleccionada.id_cirugia,
        payload
      );
      setMensaje(
        `Cirugía #${cirugiaSeleccionada.id_cirugia} actualizada correctamente (PATCH).`
      );
      await cargarCirugiasPaciente(idPacienteActivo);
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarCirugia = async (idCirugia) => {
    setGuardando(true);
    setMensaje(null);
    setErrorAccion(null);
    try {
      await eliminarCirugia(Number(idPacienteActivo), idCirugia);
      if (cirugiaSeleccionada?.id_cirugia === idCirugia) {
        setCirugiaSeleccionada(null);
      }
      setMensaje(`Cirugía #${idCirugia} eliminada (DELETE 204).`);
      await cargarCirugiasPaciente(idPacienteActivo);
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cirugiasFiltradas = cirugias.filter((c) => {
    if (
      filtroTipo &&
      !(c.tipo || "").toLowerCase().includes(filtroTipo.toLowerCase())
    ) {
      return false;
    }
    if (filtroAnestesia === "si" && !c.anestesia) return false;
    if (filtroAnestesia === "no" && c.anestesia) return false;
    return true;
  });

  const serieTiempoCirugias = cirugias.map((c) => ({
    fecha: c.fecha,
    valor: Number(c.pago?.cantidad || 0),
  }));

  return (
    <div className="view-container">
      <div className="section-header">
        <div>
          <h2>Registro de Cirugías</h2>
          <p className="text-muted">
            Control de intervenciones quirúrgicas, anestesia y pagos por
            paciente (
            <code>/api/v1/pacientes/&#123;id_paciente&#125;/cirugias</code>).
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setMostrarFormCrear((v) => !v)}
        >
          {mostrarFormCrear ? "Cerrar formulario" : "+ Registrar Cirugía (POST)"}
        </button>
      </div>

      {/* Selector de Paciente */}
      <section className="card">
        <div className="filters-bar" style={{ marginBottom: 0 }}>
          <div className="filter-group filter-grow">
            <label htmlFor="sel-pac-cirugias">Seleccionar Paciente</label>
            <select
              id="sel-pac-cirugias"
              value={idPacienteActivo}
              onChange={(e) => {
                setIdPacienteActivo(e.target.value);
                cargarCirugiasPaciente(e.target.value);
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
            <label htmlFor="inp-pac-cirugias">ID Paciente</label>
            <input
              id="inp-pac-cirugias"
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
              onClick={() => cargarCirugiasPaciente(idPacienteActivo)}
            >
              Cargar Cirugías
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

      {/* FORMULARIO POST /api/v1/pacientes/{id_paciente}/cirugias */}
      {mostrarFormCrear && (
        <section className="card form-card">
          <div className="card-header">
            <div>
              <h3>Registrar Nueva Cirugía — Paciente #{idPacienteActivo}</h3>
              <p className="text-muted">
                <code>POST /api/v1/pacientes/{idPacienteActivo}/cirugias</code>
              </p>
            </div>
          </div>

          <form onSubmit={handleCrearCirugia} className="form-grid">
            <div className="form-field">
              <label htmlFor="nq-id">ID Cirugía (id_cirugia ≥ 1) *</label>
              <input
                id="nq-id"
                type="number"
                min="1"
                required
                placeholder="Ej. 10"
                value={formNueva.id_cirugia}
                onChange={(e) =>
                  setFormNueva({ ...formNueva, id_cirugia: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="nq-fecha">Fecha (AAAA-MM-DD) *</label>
              <input
                id="nq-fecha"
                type="date"
                required
                value={formNueva.fecha}
                onChange={(e) =>
                  setFormNueva({ ...formNueva, fecha: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="nq-tipo">Tipo de Cirugía *</label>
              <input
                id="nq-tipo"
                type="text"
                required
                placeholder="Ej. Apendicectomía laparoscópica"
                value={formNueva.tipo}
                onChange={(e) =>
                  setFormNueva({ ...formNueva, tipo: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="nq-anes-doc">
                Anestesiólogo (opcional / null)
              </label>
              <input
                id="nq-anes-doc"
                type="text"
                placeholder="Ej. Dra. Elena Ruiz"
                value={formNueva.anestesiologo}
                onChange={(e) =>
                  setFormNueva({ ...formNueva, anestesiologo: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="nq-notas">Notas Quirúrgicas (opcional)</label>
              <input
                id="nq-notas"
                type="text"
                value={formNueva.notas}
                onChange={(e) =>
                  setFormNueva({ ...formNueva, notas: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label className="checkbox-inline" style={{ marginTop: "1.6rem" }}>
                <input
                  type="checkbox"
                  checked={formNueva.anestesia}
                  onChange={(e) =>
                    setFormNueva({ ...formNueva, anestesia: e.target.checked })
                  }
                />
                <span>Requirió anestesia</span>
              </label>
            </div>
            <div className="form-field">
              <label htmlFor="nq-cant">Pago: Cantidad (&gt; 0) *</label>
              <input
                id="nq-cant"
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
              <label htmlFor="nq-fpago">Forma de Pago *</label>
              <select
                id="nq-fpago"
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
              <label htmlFor="nq-desc">Descuento % (0 - 100)</label>
              <input
                id="nq-desc"
                type="number"
                min="0"
                max="100"
                value={formNueva.descuento}
                onChange={(e) =>
                  setFormNueva({ ...formNueva, descuento: e.target.value })
                }
              />
            </div>
            <div className="form-actions form-span-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={guardando}
              >
                Guardar Cirugía (POST)
              </button>
            </div>
          </form>
        </section>
      )}

      {cargando ? (
        <LoadingState
          mensaje={`Consultando cirugías del paciente #${idPacienteActivo}...`}
        />
      ) : error ? (
        <ErrorState
          mensaje={error}
          onRetry={() => cargarCirugiasPaciente(idPacienteActivo)}
        />
      ) : (
        <>
          <TimeSeriesChart
            titulo={`Serie de Tiempo de Cirugías — Paciente #${idPacienteActivo}`}
            subtitulo="Monto de cirugías practicadas por fecha (AAAA-MM-DD)"
            puntos={serieTiempoCirugias}
            prefijoValor="$"
            color="#7c3aed"
          />

          <section className="card">
            <div className="card-header">
              <div>
                <h3>Cirugías del Paciente #{idPacienteActivo}</h3>
                <p className="text-muted">
                  <code>GET /api/v1/pacientes/{idPacienteActivo}/cirugias</code>{" "}
                  — Total: <strong>{cirugiasFiltradas.length}</strong>
                </p>
              </div>
            </div>

            <div className="filters-bar">
              <div className="filter-group filter-grow">
                <label htmlFor="fq-tipo">Filtrar por tipo de cirugía</label>
                <input
                  id="fq-tipo"
                  type="text"
                  placeholder="Ej. Amigdalectomía, Hernioplastía..."
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label htmlFor="fq-anes">Uso de Anestesia</label>
                <select
                  id="fq-anes"
                  value={filtroAnestesia}
                  onChange={(e) => setFiltroAnestesia(e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="si">Con anestesia</option>
                  <option value="no">Sin anestesia</option>
                </select>
              </div>
            </div>

            {cirugiasFiltradas.length === 0 ? (
              <EmptyState
                titulo="Lista de cirugías vacía"
                mensaje="Este paciente no tiene cirugías registradas con el filtro actual."
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID Cirugía</th>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Anestesia</th>
                      <th>Anestesiólogo</th>
                      <th>Pago</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cirugiasFiltradas.map((cir) => (
                      <tr key={cir.id_cirugia}>
                        <td>
                          <strong>#{cir.id_cirugia}</strong>
                        </td>
                        <td>{cir.fecha}</td>
                        <td>{cir.tipo}</td>
                        <td>
                          <span
                            className={`badge ${
                              cir.anestesia ? "badge-info" : "badge-neutral"
                            }`}
                          >
                            {cir.anestesia ? "Sí" : "No"}
                          </span>
                        </td>
                        <td>{cir.anestesiologo || "No aplica"}</td>
                        <td>
                          <strong>${cir.pago?.cantidad}</strong> (
                          {cir.pago?.forma_pago})
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => seleccionarCirugia(cir)}
                            >
                              Detalle / Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() =>
                                handleEliminarCirugia(cir.id_cirugia)
                              }
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

      {/* DETALLE Y EDICIÓN PATCH /api/v1/pacientes/{id_paciente}/cirugias/{id_cirugia} */}
      {cirugiaSeleccionada && (
        <section className="card detail-card">
          <div className="card-header">
            <div>
              <h3>
                Detalle y Edición de Cirugía #{cirugiaSeleccionada.id_cirugia}
              </h3>
              <p className="text-muted">
                <code>
                  PATCH /api/v1/pacientes/{idPacienteActivo}/cirugias/
                  {cirugiaSeleccionada.id_cirugia}
                </code>
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setCirugiaSeleccionada(null)}
            >
              Cerrar detalle
            </button>
          </div>

          <form onSubmit={handleActualizarCirugia} className="form-grid">
            <div className="form-field">
              <label htmlFor="eq-fecha">Fecha (AAAA-MM-DD) *</label>
              <input
                id="eq-fecha"
                type="date"
                required
                value={formEditar.fecha}
                onChange={(e) =>
                  setFormEditar({ ...formEditar, fecha: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="eq-tipo">Tipo de Cirugía *</label>
              <input
                id="eq-tipo"
                type="text"
                required
                value={formEditar.tipo}
                onChange={(e) =>
                  setFormEditar({ ...formEditar, tipo: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="eq-anes-doc">Anestesiólogo</label>
              <input
                id="eq-anes-doc"
                type="text"
                value={formEditar.anestesiologo}
                onChange={(e) =>
                  setFormEditar({
                    ...formEditar,
                    anestesiologo: e.target.value,
                  })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="eq-notas">Notas</label>
              <input
                id="eq-notas"
                type="text"
                value={formEditar.notas}
                onChange={(e) =>
                  setFormEditar({ ...formEditar, notas: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="eq-cant">Pago: Cantidad *</label>
              <input
                id="eq-cant"
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
              <label htmlFor="eq-fpago">Forma de Pago *</label>
              <select
                id="eq-fpago"
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
                onClick={() =>
                  handleEliminarCirugia(cirugiaSeleccionada.id_cirugia)
                }
              >
                Eliminar Cirugía (DELETE)
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
