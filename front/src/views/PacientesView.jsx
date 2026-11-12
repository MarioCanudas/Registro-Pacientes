import React, { useEffect, useState } from "react";
import {
  actualizarPaciente,
  agregarPacienteATutor,
  eliminarPaciente,
  listarPacientes,
  obtenerPaciente,
} from "../services/api";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../components/StatusViews";

export default function PacientesView({
  pacienteInicialId,
  onSelectPacienteModulo,
}) {
  // Estados de la lista GET /api/v1/pacientes
  const [lista, setLista] = useState([]);
  const [total, setTotal] = useState(0);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [errorLista, setErrorLista] = useState(null);

  const [filtros, setFiltros] = useState({
    nombre: "",
    genero: "",
    edad_min: "",
    edad_max: "",
    skip: 0,
    limit: 20,
  });

  // Estado del detalle GET /api/v1/pacientes/{id_paciente}
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState(null);
  const [idBusqueda, setIdBusqueda] = useState(pacienteInicialId || "");

  // Estado del formulario de edición PATCH /api/v1/pacientes/{id_paciente}
  const [formEditar, setFormEditar] = useState({
    nombre: "",
    fecha_nacimiento: "",
    edad: "",
    genero: "M",
  });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  // Estado del formulario POST /api/v1/tutores/{id_tutor}/pacientes
  const [mostrarFormAgregar, setMostrarFormAgregar] = useState(false);
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState(null);
  const [formNuevo, setFormNuevo] = useState({
    id_tutor: "101",
    id_paciente: "",
    nombre: "",
    fecha_nacimiento: "2022-04-10",
    edad: "4",
    genero: "F",
  });

  const cargarPacientes = async (filtrosActuales = filtros) => {
    setCargandoLista(true);
    setErrorLista(null);
    try {
      const res = await listarPacientes(filtrosActuales);
      setLista(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      setErrorLista(err.message || "Error al listar pacientes.");
    } finally {
      setCargandoLista(false);
    }
  };

  const verDetalle = async (idPaciente) => {
    if (!idPaciente) return;
    setCargandoDetalle(true);
    setErrorDetalle(null);
    setMensaje(null);
    setErrorAccion(null);
    try {
      const info = await obtenerPaciente(Number(idPaciente));
      setDetalle(info);
      setFormEditar({
        nombre: info.paciente.nombre,
        fecha_nacimiento: info.paciente.fecha_nacimiento,
        edad: String(info.paciente.edad),
        genero: info.paciente.genero,
      });
    } catch (err) {
      setDetalle(null);
      setErrorDetalle(err.message || "No se encontró el paciente.");
    } finally {
      setCargandoDetalle(false);
    }
  };

  useEffect(() => {
    cargarPacientes(filtros);
    if (pacienteInicialId) {
      verDetalle(pacienteInicialId);
    }
  }, [pacienteInicialId]);

  const handleActualizarPaciente = async (e) => {
    e.preventDefault();
    if (!detalle) return;
    setGuardando(true);
    setMensaje(null);
    setErrorAccion(null);
    try {
      const actualizado = await actualizarPaciente(
        detalle.paciente.id_paciente,
        {
          nombre: formEditar.nombre.trim(),
          fecha_nacimiento: formEditar.fecha_nacimiento,
          edad: Number(formEditar.edad),
          genero: formEditar.genero,
        }
      );
      setDetalle(actualizado);
      setMensaje(
        `Paciente #${actualizado.paciente.id_paciente} actualizado (PATCH).`
      );
      await cargarPacientes();
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarPaciente = async (idPaciente) => {
    setGuardando(true);
    setMensaje(null);
    setErrorAccion(null);
    try {
      await eliminarPaciente(idPaciente);
      if (detalle?.paciente?.id_paciente === idPaciente) {
        setDetalle(null);
      }
      setMensaje(`Paciente #${idPaciente} eliminado correctamente (DELETE).`);
      await cargarPacientes();
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleAgregarPaciente = async (e) => {
    e.preventDefault();
    setCreando(true);
    setErrorCrear(null);
    setMensaje(null);
    try {
      const payload = {
        id_paciente: Number(formNuevo.id_paciente),
        nombre: formNuevo.nombre.trim(),
        fecha_nacimiento: formNuevo.fecha_nacimiento,
        edad: Number(formNuevo.edad),
        genero: formNuevo.genero,
        consultas: [],
      };
      const creado = await agregarPacienteATutor(
        Number(formNuevo.id_tutor),
        payload
      );
      setMostrarFormAgregar(false);
      setDetalle(creado);
      setFormEditar({
        nombre: creado.paciente.nombre,
        fecha_nacimiento: creado.paciente.fecha_nacimiento,
        edad: String(creado.paciente.edad),
        genero: creado.paciente.genero,
      });
      setMensaje(
        `Paciente #${creado.paciente.id_paciente} agregado al tutor #${creado.id_tutor} (POST 201).`
      );
      setFormNuevo((prev) => ({ ...prev, id_paciente: "", nombre: "" }));
      await cargarPacientes();
    } catch (err) {
      setErrorCrear(err.message);
    } finally {
      setCreando(false);
    }
  };

  const limpiarFiltros = () => {
    const limpios = {
      nombre: "",
      genero: "",
      edad_min: "",
      edad_max: "",
      skip: 0,
      limit: 20,
    };
    setFiltros(limpios);
    cargarPacientes(limpios);
  };

  return (
    <div className="view-container">
      <div className="section-header">
        <div>
          <h2>Padrón de Pacientes Pediátricos</h2>
          <p className="text-muted">
            Consulta individual y gestión de pacientes por su llave natural{" "}
            <code>id_paciente</code> (<code>/api/v1/pacientes</code>).
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setMostrarFormAgregar((v) => !v)}
        >
          {mostrarFormAgregar
            ? "Cerrar formulario"
            : "+ Agregar Paciente a Tutor (POST)"}
        </button>
      </div>

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

      {/* FORMULARIO POST /api/v1/tutores/{id_tutor}/pacientes */}
      {mostrarFormAgregar && (
        <section className="card form-card">
          <div className="card-header">
            <div>
              <h3>Agregar Paciente a un Tutor Existente</h3>
              <p className="text-muted">
                <code>POST /api/v1/tutores/&#123;id_tutor&#125;/pacientes</code>
              </p>
            </div>
          </div>

          {errorCrear && <ErrorState mensaje={errorCrear} />}

          <form onSubmit={handleAgregarPaciente} className="form-grid">
            <div className="form-field">
              <label htmlFor="add-pac-tutor">ID del Tutor Existente *</label>
              <input
                id="add-pac-tutor"
                type="number"
                min="1"
                required
                value={formNuevo.id_tutor}
                onChange={(e) =>
                  setFormNuevo({ ...formNuevo, id_tutor: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="add-pac-id">Nuevo ID Paciente (único ≥ 1) *</label>
              <input
                id="add-pac-id"
                type="number"
                min="1"
                required
                placeholder="Ej. 5006"
                value={formNuevo.id_paciente}
                onChange={(e) =>
                  setFormNuevo({ ...formNuevo, id_paciente: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="add-pac-nombre">Nombre Completo *</label>
              <input
                id="add-pac-nombre"
                type="text"
                required
                placeholder="Ej. Sofía Gómez"
                value={formNuevo.nombre}
                onChange={(e) =>
                  setFormNuevo({ ...formNuevo, nombre: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="add-pac-fnac">Fecha Nacimiento (AAAA-MM-DD) *</label>
              <input
                id="add-pac-fnac"
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
              <label htmlFor="add-pac-edad">Edad (0 - 120) *</label>
              <input
                id="add-pac-edad"
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
              <label htmlFor="add-pac-genero">Género *</label>
              <select
                id="add-pac-genero"
                value={formNuevo.genero}
                onChange={(e) =>
                  setFormNuevo({ ...formNuevo, genero: e.target.value })
                }
              >
                <option value="F">Femenino (F)</option>
                <option value="M">Masculino (M)</option>
              </select>
            </div>
            <div className="form-actions form-span-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creando}
              >
                {creando ? "Registrando..." : "Registrar Paciente (POST)"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* TABLA Y FILTROS GET /api/v1/pacientes */}
      <section className="card">
        <div className="card-header">
          <div>
            <h3>Lista de Pacientes</h3>
            <p className="text-muted">
              <code>GET /api/v1/pacientes</code> — Total encontrados:{" "}
              <strong>{total}</strong>
            </p>
          </div>
          <div className="direct-lookup">
            <input
              type="number"
              min="1"
              placeholder="Buscar id_paciente..."
              value={idBusqueda}
              onChange={(e) => setIdBusqueda(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => verDetalle(idBusqueda)}
            >
              Consultar ID
            </button>
          </div>
        </div>

        <form
          className="filters-bar"
          onSubmit={(e) => {
            e.preventDefault();
            cargarPacientes(filtros);
          }}
        >
          <div className="filter-group filter-grow">
            <label htmlFor="fp-nombre">Nombre del Paciente</label>
            <input
              id="fp-nombre"
              type="text"
              placeholder="Ej. Santiago, Valeria..."
              value={filtros.nombre}
              onChange={(e) =>
                setFiltros({ ...filtros, nombre: e.target.value })
              }
            />
          </div>
          <div className="filter-group">
            <label htmlFor="fp-genero">Género</label>
            <select
              id="fp-genero"
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
            <label htmlFor="fp-emin">Edad Mín</label>
            <input
              id="fp-emin"
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
            <label htmlFor="fp-emax">Edad Máx</label>
            <input
              id="fp-emax"
              type="number"
              min="0"
              max="120"
              value={filtros.edad_max}
              onChange={(e) =>
                setFiltros({ ...filtros, edad_max: e.target.value })
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
          <LoadingState mensaje="Cargando lista de pacientes (GET /api/v1/pacientes)..." />
        ) : errorLista ? (
          <ErrorState
            mensaje={errorLista}
            onRetry={() => cargarPacientes(filtros)}
          />
        ) : lista.length === 0 ? (
          <EmptyState
            titulo="Sin pacientes para mostrar"
            mensaje="No se encontraron pacientes con los criterios actuales."
            accionTexto="Limpiar filtros"
            onAccion={limpiarFiltros}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID Paciente</th>
                  <th>Nombre</th>
                  <th>Nacimiento</th>
                  <th>Edad</th>
                  <th>Género</th>
                  <th>Tutor Responsable</th>
                  <th>Consultas / Cirugías</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((item) => {
                  const p = item.paciente;
                  return (
                    <tr key={p.id_paciente}>
                      <td>
                        <strong>#{p.id_paciente}</strong>
                      </td>
                      <td>{p.nombre}</td>
                      <td>{p.fecha_nacimiento}</td>
                      <td>{p.edad} años</td>
                      <td>
                        <span className="badge badge-neutral">{p.genero}</span>
                      </td>
                      <td>
                        #{item.id_tutor} — {item.tutor}
                      </td>
                      <td>
                        {(p.consultas || []).length} cons. /{" "}
                        {(p.cirugias || []).length} cir.
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => verDetalle(p.id_paciente)}
                          >
                            Detalle / Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() =>
                              onSelectPacienteModulo("consultas", p.id_paciente)
                            }
                          >
                            Consultas
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleEliminarPaciente(p.id_paciente)}
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

      {/* DETALLE Y EDICIÓN GET / PATCH / DELETE /api/v1/pacientes/{id_paciente} */}
      {(cargandoDetalle || errorDetalle || detalle) && (
        <section className="card detail-card">
          <div className="card-header">
            <div>
              <h3>
                Ficha del Paciente{" "}
                {detalle ? `#${detalle.paciente.id_paciente}` : ""}
              </h3>
              <p className="text-muted">
                <code>GET / PATCH / DELETE /api/v1/pacientes/&#123;id_paciente&#125;</code>
              </p>
            </div>
            {detalle && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setDetalle(null)}
              >
                Cerrar ficha
              </button>
            )}
          </div>

          {cargandoDetalle ? (
            <LoadingState mensaje="Obteniendo datos del paciente..." />
          ) : errorDetalle ? (
            <ErrorState
              mensaje={errorDetalle}
              onRetry={() => verDetalle(idBusqueda)}
            />
          ) : (
            detalle && (
              <div>
                <p className="text-muted" style={{ marginBottom: "1rem" }}>
                  Tutor responsable: <strong>#{detalle.id_tutor} — {detalle.tutor}</strong>
                </p>

                <form onSubmit={handleActualizarPaciente} className="form-grid">
                  <div className="form-field">
                    <label htmlFor="ed-pac-nom">Nombre del Paciente *</label>
                    <input
                      id="ed-pac-nom"
                      type="text"
                      required
                      value={formEditar.nombre}
                      onChange={(e) =>
                        setFormEditar({ ...formEditar, nombre: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="ed-pac-fnac">Fecha Nacimiento *</label>
                    <input
                      id="ed-pac-fnac"
                      type="date"
                      required
                      value={formEditar.fecha_nacimiento}
                      onChange={(e) =>
                        setFormEditar({
                          ...formEditar,
                          fecha_nacimiento: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="ed-pac-edad">Edad *</label>
                    <input
                      id="ed-pac-edad"
                      type="number"
                      min="0"
                      max="120"
                      required
                      value={formEditar.edad}
                      onChange={(e) =>
                        setFormEditar({ ...formEditar, edad: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="ed-pac-gen">Género *</label>
                    <select
                      id="ed-pac-gen"
                      value={formEditar.genero}
                      onChange={(e) =>
                        setFormEditar({ ...formEditar, genero: e.target.value })
                      }
                    >
                      <option value="F">F</option>
                      <option value="M">M</option>
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
                      className="btn btn-outline"
                      onClick={() =>
                        onSelectPacienteModulo(
                          "consultas",
                          detalle.paciente.id_paciente
                        )
                      }
                    >
                      Gestionar Consultas (
                      {(detalle.paciente.consultas || []).length})
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() =>
                        onSelectPacienteModulo(
                          "cirugias",
                          detalle.paciente.id_paciente
                        )
                      }
                    >
                      Gestionar Cirugías (
                      {(detalle.paciente.cirugias || []).length})
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={guardando}
                      onClick={() =>
                        handleEliminarPaciente(detalle.paciente.id_paciente)
                      }
                    >
                      Eliminar Paciente (DELETE)
                    </button>
                  </div>
                </form>
              </div>
            )
          )}
        </section>
      )}
    </div>
  );
}
