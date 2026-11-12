import React, { useEffect, useState } from "react";
import {
  actualizarTutorParcial,
  crearTutor,
  eliminarTutor,
  listarTutores,
  obtenerTutor,
  reemplazarTutor,
} from "../services/api";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../components/StatusViews";

export default function TutoresView({ onSelectPaciente }) {
  // Estados de la lista GET /api/v1/tutores
  const [lista, setLista] = useState([]);
  const [total, setTotal] = useState(0);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [errorLista, setErrorLista] = useState(null);

  // Filtros de GET /api/v1/tutores
  const [filtros, setFiltros] = useState({
    tutor: "",
    genero: "",
    edad_min: "",
    edad_max: "",
    padecimiento: "",
    skip: 0,
    limit: 20,
  });

  // Estado del detalle GET /api/v1/tutores/{id_tutor}
  const [detalleTutor, setDetalleTutor] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState(null);
  const [idBusquedaDirecta, setIdBusquedaDirecta] = useState("");

  // Estado de edición PATCH / PUT sobre el tutor seleccionado
  const [nuevoNombreTutor, setNuevoNombreTutor] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [mensajeAccion, setMensajeAccion] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  // Estado del formulario POST /api/v1/tutores
  const [mostrarFormCrear, setMostrarFormCrear] = useState(false);
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState(null);
  const [formNuevo, setFormNuevo] = useState({
    id_tutor: "",
    tutor: "",
    id_paciente: "",
    nombre_paciente: "",
    fecha_nacimiento: "2020-05-10",
    edad: "6",
    genero: "F",
    incluir_consulta_inicial: true,
    fecha_consulta: "2026-05-01",
    padecimientos: "fiebre, dolor de garganta",
    diagnostico: "Infección respiratoria aguda",
    medicamentos_recetados: "Paracetamol, Amoxicilina",
    notas: "Hidratación constante",
    cantidad_pago: "800",
    forma_pago: "efectivo",
    factura: false,
    descuento: "",
  });

  const cargarExpedientes = async (filtrosActuales = filtros) => {
    setCargandoLista(true);
    setErrorLista(null);
    try {
      const res = await listarTutores(filtrosActuales);
      setLista(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      setErrorLista(err.message || "Error al listar expedientes de tutores.");
    } finally {
      setCargandoLista(false);
    }
  };

  useEffect(() => {
    cargarExpedientes(filtros);
  }, []);

  const verDetalleTutor = async (idTutor) => {
    if (!idTutor) return;
    setCargandoDetalle(true);
    setErrorDetalle(null);
    setMensajeAccion(null);
    setErrorAccion(null);
    try {
      const doc = await obtenerTutor(Number(idTutor));
      setDetalleTutor(doc);
      setNuevoNombreTutor(doc.tutor);
    } catch (err) {
      setDetalleTutor(null);
      setErrorDetalle(err.message || "No se pudo obtener el expediente.");
    } finally {
      setCargandoDetalle(false);
    }
  };

  const handleActualizarNombre = async (e) => {
    e.preventDefault();
    if (!detalleTutor) return;
    setGuardandoEdicion(true);
    setMensajeAccion(null);
    setErrorAccion(null);
    try {
      const actualizado = await actualizarTutorParcial(detalleTutor.id_tutor, {
        tutor: nuevoNombreTutor.trim(),
      });
      setDetalleTutor(actualizado);
      setMensajeAccion(
        `Tutor #${actualizado.id_tutor} actualizado correctamente (PATCH).`
      );
      await cargarExpedientes();
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleReemplazarExpediente = async () => {
    if (!detalleTutor) return;
    setGuardandoEdicion(true);
    setMensajeAccion(null);
    setErrorAccion(null);
    try {
      const payload = {
        id_tutor: detalleTutor.id_tutor,
        tutor: nuevoNombreTutor.trim() || detalleTutor.tutor,
        pacientes: detalleTutor.pacientes,
      };
      const reemplazado = await reemplazarTutor(detalleTutor.id_tutor, payload);
      setDetalleTutor(reemplazado);
      setMensajeAccion(
        `Expediente #${reemplazado.id_tutor} reemplazado íntegramente (PUT).`
      );
      await cargarExpedientes();
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleEliminarTutor = async (idTutor) => {
    setGuardandoEdicion(true);
    setMensajeAccion(null);
    setErrorAccion(null);
    try {
      await eliminarTutor(idTutor);
      if (detalleTutor?.id_tutor === idTutor) {
        setDetalleTutor(null);
      }
      setMensajeAccion(`Expediente con id_tutor=${idTutor} eliminado (DELETE).`);
      await cargarExpedientes();
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleCrearTutor = async (e) => {
    e.preventDefault();
    setCreando(true);
    setErrorCrear(null);
    setMensajeAccion(null);

    try {
      const consultasIniciales = formNuevo.incluir_consulta_inicial
        ? [
            {
              fecha: formNuevo.fecha_consulta,
              padecimientos: formNuevo.padecimientos
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              diagnostico: formNuevo.diagnostico.trim(),
              medicamentos_recetados: formNuevo.medicamentos_recetados
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              ...(formNuevo.notas.trim()
                ? { notas: formNuevo.notas.trim() }
                : {}),
              pago: {
                cantidad: Number(formNuevo.cantidad_pago),
                forma_pago: formNuevo.forma_pago,
                factura: Boolean(formNuevo.factura),
                descuento:
                  formNuevo.descuento !== ""
                    ? Number(formNuevo.descuento)
                    : null,
              },
            },
          ]
        : [];

      const payload = {
        id_tutor: Number(formNuevo.id_tutor),
        tutor: formNuevo.tutor.trim(),
        pacientes: [
          {
            id_paciente: Number(formNuevo.id_paciente),
            nombre: formNuevo.nombre_paciente.trim(),
            fecha_nacimiento: formNuevo.fecha_nacimiento,
            edad: Number(formNuevo.edad),
            genero: formNuevo.genero,
            consultas: consultasIniciales,
          },
        ],
      };

      const creado = await crearTutor(payload);
      setMostrarFormCrear(false);
      setDetalleTutor(creado);
      setNuevoNombreTutor(creado.tutor);
      setMensajeAccion(
        `Expediente #${creado.id_tutor} creado exitosamente (POST 201).`
      );
      setFormNuevo((prev) => ({
        ...prev,
        id_tutor: "",
        tutor: "",
        id_paciente: "",
        nombre_paciente: "",
      }));
      await cargarExpedientes();
    } catch (err) {
      setErrorCrear(err.message || "Error al crear el expediente.");
    } finally {
      setCreando(false);
    }
  };

  const limpiarFiltros = () => {
    const limpios = {
      tutor: "",
      genero: "",
      edad_min: "",
      edad_max: "",
      padecimiento: "",
      skip: 0,
      limit: 20,
    };
    setFiltros(limpios);
    cargarExpedientes(limpios);
  };

  return (
    <div className="view-container">
      <div className="section-header">
        <div>
          <h2>Expedientes de Tutores</h2>
          <p className="text-muted">
            Administración de documentos raíz en <code>REGISTRO-PACIENTES</code>{" "}
            (<code>/api/v1/tutores</code>).
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setMostrarFormCrear((v) => !v)}
        >
          {mostrarFormCrear ? "Cerrar formulario" : "+ Nuevo Expediente (POST)"}
        </button>
      </div>

      {mensajeAccion && (
        <div className="alert alert-success" role="status">
          <span>{mensajeAccion}</span>
          <button
            type="button"
            className="btn-close"
            onClick={() => setMensajeAccion(null)}
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

      {/* FORMULARIO POST /api/v1/tutores */}
      {mostrarFormCrear && (
        <section className="card form-card">
          <div className="card-header">
            <div>
              <h3>Crear Nuevo Expediente de Tutor</h3>
              <p className="text-muted">
                <code>POST /api/v1/tutores</code> — Registra un tutor y al menos
                su primer paciente (<code>minItems: 1</code>).
              </p>
            </div>
          </div>

          {errorCrear && <ErrorState mensaje={errorCrear} />}

          <form onSubmit={handleCrearTutor} className="form-grid">
            <div className="form-section-title">1. Datos del Tutor</div>
            <div className="form-field">
              <label htmlFor="nuevo-id-tutor">ID del Tutor (id_tutor ≥ 1) *</label>
              <input
                id="nuevo-id-tutor"
                type="number"
                min="1"
                required
                placeholder="Ej. 104"
                value={formNuevo.id_tutor}
                onChange={(e) =>
                  setFormNuevo({ ...formNuevo, id_tutor: e.target.value })
                }
              />
            </div>
            <div className="form-field form-span-2">
              <label htmlFor="nuevo-nombre-tutor">Nombre Completo del Tutor *</label>
              <input
                id="nuevo-nombre-tutor"
                type="text"
                required
                placeholder="Ej. Laura Patricia Morales Díaz"
                value={formNuevo.tutor}
                onChange={(e) =>
                  setFormNuevo({ ...formNuevo, tutor: e.target.value })
                }
              />
            </div>

            <div className="form-section-title">
              2. Datos del Primer Paciente (Obligatorio por esquema)
            </div>
            <div className="form-field">
              <label htmlFor="nuevo-id-pac">ID Paciente (id_paciente ≥ 1) *</label>
              <input
                id="nuevo-id-pac"
                type="number"
                min="1"
                required
                placeholder="Ej. 5005"
                value={formNuevo.id_paciente}
                onChange={(e) =>
                  setFormNuevo({ ...formNuevo, id_paciente: e.target.value })
                }
              />
            </div>
            <div className="form-field form-span-2">
              <label htmlFor="nuevo-nom-pac">Nombre del Paciente *</label>
              <input
                id="nuevo-nom-pac"
                type="text"
                required
                placeholder="Ej. Emiliano Morales"
                value={formNuevo.nombre_paciente}
                onChange={(e) =>
                  setFormNuevo({
                    ...formNuevo,
                    nombre_paciente: e.target.value,
                  })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="nuevo-fnac">Fecha Nacimiento (AAAA-MM-DD) *</label>
              <input
                id="nuevo-fnac"
                type="date"
                required
                value={formNuevo.fecha_nacimiento}
                onChange={(e) =>
                  setFormNuevo({
                    ...formNuevo,
                    fecha_nacimiento: e.target.value,
                  })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="nuevo-edad">Edad (0 a 120) *</label>
              <input
                id="nuevo-edad"
                type="number"
                min="0"
                max="120"
                required
                value={formNuevo.edad}
                onChange={(e) =>
                  setFormNuevo({ ...formNuevo, edad: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="nuevo-genero">Género *</label>
              <select
                id="nuevo-genero"
                value={formNuevo.genero}
                onChange={(e) =>
                  setFormNuevo({ ...formNuevo, genero: e.target.value })
                }
              >
                <option value="F">Femenino (F)</option>
                <option value="M">Masculino (M)</option>
              </select>
            </div>

            <div className="form-section-title">
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={formNuevo.incluir_consulta_inicial}
                  onChange={(e) =>
                    setFormNuevo({
                      ...formNuevo,
                      incluir_consulta_inicial: e.target.checked,
                    })
                  }
                />
                <span>3. Incluir primera consulta médica en este registro</span>
              </label>
            </div>

            {formNuevo.incluir_consulta_inicial && (
              <>
                <div className="form-field">
                  <label htmlFor="nuevo-fcon">Fecha Consulta (AAAA-MM-DD) *</label>
                  <input
                    id="nuevo-fcon"
                    type="date"
                    required
                    value={formNuevo.fecha_consulta}
                    onChange={(e) =>
                      setFormNuevo({
                        ...formNuevo,
                        fecha_consulta: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-field form-span-2">
                  <label htmlFor="nuevo-pad">
                    Padecimientos (separados por coma) *
                  </label>
                  <input
                    id="nuevo-pad"
                    type="text"
                    required
                    value={formNuevo.padecimientos}
                    onChange={(e) =>
                      setFormNuevo({
                        ...formNuevo,
                        padecimientos: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="nuevo-diag">Diagnóstico *</label>
                  <input
                    id="nuevo-diag"
                    type="text"
                    required
                    value={formNuevo.diagnostico}
                    onChange={(e) =>
                      setFormNuevo({
                        ...formNuevo,
                        diagnostico: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="nuevo-meds">
                    Medicamentos Recetados (separados por coma) *
                  </label>
                  <input
                    id="nuevo-meds"
                    type="text"
                    required
                    value={formNuevo.medicamentos_recetados}
                    onChange={(e) =>
                      setFormNuevo({
                        ...formNuevo,
                        medicamentos_recetados: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="nuevo-notas">Notas (opcional)</label>
                  <input
                    id="nuevo-notas"
                    type="text"
                    value={formNuevo.notas}
                    onChange={(e) =>
                      setFormNuevo({ ...formNuevo, notas: e.target.value })
                    }
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="nuevo-cant">Pago: Cantidad (&gt; 0) *</label>
                  <input
                    id="nuevo-cant"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={formNuevo.cantidad_pago}
                    onChange={(e) =>
                      setFormNuevo({
                        ...formNuevo,
                        cantidad_pago: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="nuevo-fpago">Forma de Pago *</label>
                  <select
                    id="nuevo-fpago"
                    value={formNuevo.forma_pago}
                    onChange={(e) =>
                      setFormNuevo({ ...formNuevo, forma_pago: e.target.value })
                    }
                  >
                    <option value="efectivo">efectivo</option>
                    <option value="tarjeta">tarjeta</option>
                    <option value="transferencia">transferencia</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="nuevo-desc">Descuento % (0 - 100)</label>
                  <input
                    id="nuevo-desc"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Opcional"
                    value={formNuevo.descuento}
                    onChange={(e) =>
                      setFormNuevo({ ...formNuevo, descuento: e.target.value })
                    }
                  />
                </div>
                <div className="form-field">
                  <label className="checkbox-inline" style={{ marginTop: "1.6rem" }}>
                    <input
                      type="checkbox"
                      checked={formNuevo.factura}
                      onChange={(e) =>
                        setFormNuevo({
                          ...formNuevo,
                          factura: e.target.checked,
                        })
                      }
                    />
                    <span>Requiere factura</span>
                  </label>
                </div>
              </>
            )}

            <div className="form-actions form-span-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creando}
              >
                {creando ? "Guardando expediente..." : "Guardar Expediente (POST)"}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setMostrarFormCrear(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {/* LISTA Y FILTROS GET /api/v1/tutores */}
      <section className="card">
        <div className="card-header">
          <div>
            <h3>Lista de Expedientes de Tutores</h3>
            <p className="text-muted">
              <code>GET /api/v1/tutores</code> — Total encontrados:{" "}
              <strong>{total}</strong>
            </p>
          </div>
          <div className="direct-lookup">
            <input
              type="number"
              min="1"
              placeholder="Buscar id_tutor..."
              value={idBusquedaDirecta}
              onChange={(e) => setIdBusquedaDirecta(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => verDetalleTutor(idBusquedaDirecta)}
            >
              Consultar ID
            </button>
          </div>
        </div>

        <form
          className="filters-bar"
          onSubmit={(e) => {
            e.preventDefault();
            cargarExpedientes(filtros);
          }}
        >
          <div className="filter-group filter-grow">
            <label htmlFor="f-tutor">Nombre del Tutor</label>
            <input
              id="f-tutor"
              type="text"
              placeholder="Ej. María, Carlos..."
              value={filtros.tutor}
              onChange={(e) =>
                setFiltros({ ...filtros, tutor: e.target.value })
              }
            />
          </div>
          <div className="filter-group">
            <label htmlFor="f-genero">Género Paciente</label>
            <select
              id="f-genero"
              value={filtros.genero}
              onChange={(e) =>
                setFiltros({ ...filtros, genero: e.target.value })
              }
            >
              <option value="">Todos</option>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="f-emin">Edad Mín</label>
            <input
              id="f-emin"
              type="number"
              min="0"
              max="120"
              value={filtros.edad_min}
              onChange={(e) =>
                setFiltros({ ...filtros, edad_min: e.target.value })
              }
            />
          </div>
          <div className="filter-group">
            <label htmlFor="f-emax">Edad Máx</label>
            <input
              id="f-emax"
              type="number"
              min="0"
              max="120"
              value={filtros.edad_max}
              onChange={(e) =>
                setFiltros({ ...filtros, edad_max: e.target.value })
              }
            />
          </div>
          <div className="filter-group">
            <label htmlFor="f-pad">Padecimiento</label>
            <input
              id="f-pad"
              type="text"
              placeholder="Ej. fiebre, tos..."
              value={filtros.padecimiento}
              onChange={(e) =>
                setFiltros({ ...filtros, padecimiento: e.target.value })
              }
            />
          </div>
          <div className="filter-actions">
            <button type="submit" className="btn btn-primary">
              Filtrar
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={limpiarFiltros}
            >
              Limpiar
            </button>
          </div>
        </form>

        {cargandoLista ? (
          <LoadingState mensaje="Consultando expedientes en GET /api/v1/tutores..." />
        ) : errorLista ? (
          <ErrorState
            mensaje={errorLista}
            onRetry={() => cargarExpedientes(filtros)}
          />
        ) : lista.length === 0 ? (
          <EmptyState
            titulo="Lista de tutores vacía"
            mensaje="No hay expedientes que coincidan con los filtros aplicados."
            accionTexto="Restablecer filtros"
            onAccion={limpiarFiltros}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID Tutor</th>
                  <th>Nombre del Tutor</th>
                  <th>Pacientes a Cargo</th>
                  <th>Total Consultas</th>
                  <th>Total Cirugías</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((exp) => {
                  const numConsultas = (exp.pacientes || []).reduce(
                    (s, p) => s + (p.consultas || []).length,
                    0
                  );
                  const numCirugias = (exp.pacientes || []).reduce(
                    (s, p) => s + (p.cirugias || []).length,
                    0
                  );
                  return (
                    <tr key={exp.id_tutor}>
                      <td>
                        <strong>#{exp.id_tutor}</strong>
                      </td>
                      <td>{exp.tutor}</td>
                      <td>
                        {(exp.pacientes || []).map((p) => (
                          <span
                            key={p.id_paciente}
                            className="badge badge-neutral"
                            style={{ marginRight: "0.35rem" }}
                          >
                            #{p.id_paciente} {p.nombre} ({p.edad}a, {p.genero})
                          </span>
                        ))}
                      </td>
                      <td>{numConsultas}</td>
                      <td>{numCirugias}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => verDetalleTutor(exp.id_tutor)}
                          >
                            Ver Detalle
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleEliminarTutor(exp.id_tutor)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* DETALLE Y EDICIÓN GET / PATCH / PUT / DELETE /api/v1/tutores/{id_tutor} */}
      {(cargandoDetalle || errorDetalle || detalleTutor) && (
        <section className="card detail-card">
          <div className="card-header">
            <div>
              <h3>
                Detalle del Expediente{" "}
                {detalleTutor ? `#${detalleTutor.id_tutor}` : ""}
              </h3>
              <p className="text-muted">
                <code>GET / PATCH / PUT / DELETE /api/v1/tutores/&#123;id_tutor&#125;</code>
              </p>
            </div>
            {detalleTutor && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setDetalleTutor(null)}
              >
                Cerrar detalle
              </button>
            )}
          </div>

          {cargandoDetalle ? (
            <LoadingState mensaje="Cargando expediente individual del tutor..." />
          ) : errorDetalle ? (
            <ErrorState
              mensaje={errorDetalle}
              onRetry={() => verDetalleTutor(idBusquedaDirecta)}
            />
          ) : (
            detalleTutor && (
              <div>
                <form
                  onSubmit={handleActualizarNombre}
                  className="inline-edit-bar"
                >
                  <div className="filter-group filter-grow">
                    <label htmlFor="edit-nombre-tutor">
                      Nombre del Tutor (<code>id_tutor: {detalleTutor.id_tutor}</code>)
                    </label>
                    <input
                      id="edit-nombre-tutor"
                      type="text"
                      required
                      value={nuevoNombreTutor}
                      onChange={(e) => setNuevoNombreTutor(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={guardandoEdicion}
                  >
                    Guardar Nombre (PATCH)
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={guardandoEdicion}
                    onClick={handleReemplazarExpediente}
                  >
                    Reemplazar Expediente (PUT)
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={guardandoEdicion}
                    onClick={() => handleEliminarTutor(detalleTutor.id_tutor)}
                  >
                    Eliminar Expediente (DELETE)
                  </button>
                </form>

                <h4 style={{ marginTop: "1.25rem", marginBottom: "0.75rem" }}>
                  Pacientes registrados en este expediente (
                  {(detalleTutor.pacientes || []).length})
                </h4>

                <div className="nested-grid">
                  {(detalleTutor.pacientes || []).map((pac) => (
                    <div key={pac.id_paciente} className="nested-card">
                      <div className="nested-card-header">
                        <strong>
                          #{pac.id_paciente} — {pac.nombre}
                        </strong>
                        <span className="badge badge-info">
                          {pac.edad} años · Género {pac.genero}
                        </span>
                      </div>
                      <p className="text-muted">
                        Fecha de nacimiento: <strong>{pac.fecha_nacimiento}</strong>
                      </p>
                      <p className="text-muted">
                        Consultas: <strong>{(pac.consultas || []).length}</strong> ·
                        Cirugías: <strong>{(pac.cirugias || []).length}</strong>
                      </p>
                      <div className="row-actions" style={{ marginTop: "0.75rem" }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() =>
                            onSelectPaciente("pacientes", pac.id_paciente)
                          }
                        >
                          Ficha Paciente
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() =>
                            onSelectPaciente("consultas", pac.id_paciente)
                          }
                        >
                          Ver Consultas
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() =>
                            onSelectPaciente("cirugias", pac.id_paciente)
                          }
                        >
                          Ver Cirugías
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </section>
      )}
    </div>
  );
}
