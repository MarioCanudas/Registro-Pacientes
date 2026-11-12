/**
 * Cliente HTTP del Frontend para consumir el API REST de Registro de Pacientes.
 * - Regla 1: La URL base proviene exclusivamente de import.meta.env.VITE_API_URL.
 * - Regla 2: Solo utiliza las rutas y verbos oficiales del backend.
 * - Regla 6: Si VITE_API_URL no está definida, opera sobre datos de ejemplo en memoria.
 */

import { EXPEDIENTES_EJEMPLO } from "../data/mockData";

const rawEnvUrl = import.meta.env.VITE_API_URL;
export const API_BASE_URL =
  typeof rawEnvUrl === "string" ? rawEnvUrl.trim().replace(/\/+$/, "") : "";

export const IS_DEMO_MODE = API_BASE_URL.length === 0;

// Almacén en memoria para el Modo Datos de Ejemplo cuando VITE_API_URL no existe
let memoriaExpedientes = structuredClone(EXPEDIENTES_EJEMPLO);

export function restaurarDatosEjemplo() {
  memoriaExpedientes = structuredClone(EXPEDIENTES_EJEMPLO);
}

const pausaDemo = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

function construirQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      search.append(key, String(value).trim());
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function peticionHttp(metodo, ruta, cuerpo = undefined) {
  const opciones = {
    method: metodo,
    headers: {
      Accept: "application/json",
    },
  };
  if (cuerpo !== undefined) {
    opciones.headers["Content-Type"] = "application/json";
    opciones.body = JSON.stringify(cuerpo);
  }

  const respuesta = await fetch(`${API_BASE_URL}${ruta}`, opciones);

  if (respuesta.status === 204) {
    return null;
  }

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    datos = null;
  }

  if (!respuesta.ok) {
    const detalle =
      (datos &&
        (typeof datos.detail === "string"
          ? datos.detail
          : Array.isArray(datos.detail)
          ? datos.detail.map((e) => e.msg || JSON.stringify(e)).join("; ")
          : null)) ||
      `Error HTTP ${respuesta.status}`;
    throw new Error(detalle);
  }

  return datos;
}

// ============================================================================
// 0. SALUD DEL SISTEMA (GET /health)
// ============================================================================

export async function verificarSalud() {
  if (!IS_DEMO_MODE) {
    return peticionHttp("GET", "/health");
  }
  await pausaDemo(120);
  return {
    status: "ok",
    database: "optaGestionDeDatos",
    collection: "REGISTRO-PACIENTES",
    modo: "datos_de_ejemplo",
  };
}

// ============================================================================
// 1. EXPEDIENTES DE TUTORES (/api/v1/tutores)
// ============================================================================

export async function listarTutores(filtros = {}) {
  if (!IS_DEMO_MODE) {
    return peticionHttp("GET", `/api/v1/tutores${construirQuery(filtros)}`);
  }
  await pausaDemo();
  const skip = Number(filtros.skip || 0);
  const limit = Number(filtros.limit || 20);
  const tutorQ = (filtros.tutor || "").toLowerCase().trim();
  const generoQ = (filtros.genero || "").trim();
  const edadMin =
    filtros.edad_min !== undefined && filtros.edad_min !== ""
      ? Number(filtros.edad_min)
      : null;
  const edadMax =
    filtros.edad_max !== undefined && filtros.edad_max !== ""
      ? Number(filtros.edad_max)
      : null;
  const padQ = (filtros.padecimiento || "").toLowerCase().trim();

  const filtrados = memoriaExpedientes
    .filter((exp) => {
      if (tutorQ && !exp.tutor.toLowerCase().includes(tutorQ)) return false;
      if (!generoQ && edadMin === null && edadMax === null && !padQ) return true;
      return (exp.pacientes || []).some((pac) => {
        if (generoQ && pac.genero !== generoQ) return false;
        if (edadMin !== null && pac.edad < edadMin) return false;
        if (edadMax !== null && pac.edad > edadMax) return false;
        if (padQ) {
          const coincidePad = (pac.consultas || []).some((c) =>
            (c.padecimientos || []).some((p) => p.toLowerCase().includes(padQ))
          );
          if (!coincidePad) return false;
        }
        return true;
      });
    })
    .sort((a, b) => a.id_tutor - b.id_tutor);

  return {
    total: filtrados.length,
    skip,
    limit,
    items: structuredClone(filtrados.slice(skip, skip + limit)),
  };
}

export async function obtenerTutor(idTutor) {
  const id = Number(idTutor);
  if (!IS_DEMO_MODE) {
    return peticionHttp("GET", `/api/v1/tutores/${id}`);
  }
  await pausaDemo();
  const encontrado = memoriaExpedientes.find((e) => e.id_tutor === id);
  if (!encontrado) {
    throw new Error(`No se encontró ningún expediente con id_tutor=${id}.`);
  }
  return structuredClone(encontrado);
}

export async function crearTutor(expediente) {
  if (!IS_DEMO_MODE) {
    return peticionHttp("POST", "/api/v1/tutores", expediente);
  }
  await pausaDemo();
  if (memoriaExpedientes.some((e) => e.id_tutor === Number(expediente.id_tutor))) {
    throw new Error("Ya existe un expediente registrado con ese id_tutor.");
  }
  const nuevosIdsPac = (expediente.pacientes || []).map((p) => Number(p.id_paciente));
  const conflictoPac = memoriaExpedientes.some((e) =>
    (e.pacientes || []).some((p) => nuevosIdsPac.includes(Number(p.id_paciente)))
  );
  if (conflictoPac) {
    throw new Error(
      "Uno o más id_paciente ya existen en otro expediente de la colección."
    );
  }
  const copia = structuredClone(expediente);
  memoriaExpedientes.push(copia);
  return structuredClone(copia);
}

export async function reemplazarTutor(idTutor, expediente) {
  const id = Number(idTutor);
  if (!IS_DEMO_MODE) {
    return peticionHttp("PUT", `/api/v1/tutores/${id}`, expediente);
  }
  await pausaDemo();
  const idx = memoriaExpedientes.findIndex((e) => e.id_tutor === id);
  if (idx === -1) {
    throw new Error(`No se encontró ningún expediente con id_tutor=${id}.`);
  }
  if (Number(expediente.id_tutor) !== id) {
    throw new Error("El id_tutor del cuerpo debe coincidir con el id_tutor de la ruta.");
  }
  memoriaExpedientes[idx] = structuredClone(expediente);
  return structuredClone(memoriaExpedientes[idx]);
}

export async function actualizarTutorParcial(idTutor, datos) {
  const id = Number(idTutor);
  if (!IS_DEMO_MODE) {
    return peticionHttp("PATCH", `/api/v1/tutores/${id}`, datos);
  }
  await pausaDemo();
  const encontrado = memoriaExpedientes.find((e) => e.id_tutor === id);
  if (!encontrado) {
    throw new Error(`No se encontró ningún expediente con id_tutor=${id}.`);
  }
  if (datos.tutor !== undefined) encontrado.tutor = datos.tutor;
  if (datos.pacientes !== undefined) {
    encontrado.pacientes = structuredClone(datos.pacientes);
  }
  return structuredClone(encontrado);
}

export async function eliminarTutor(idTutor) {
  const id = Number(idTutor);
  if (!IS_DEMO_MODE) {
    return peticionHttp("DELETE", `/api/v1/tutores/${id}`);
  }
  await pausaDemo();
  const idx = memoriaExpedientes.findIndex((e) => e.id_tutor === id);
  if (idx === -1) {
    throw new Error(`No se encontró ningún expediente con id_tutor=${id}.`);
  }
  memoriaExpedientes.splice(idx, 1);
  return null;
}

// ============================================================================
// 2. PACIENTES (/api/v1/pacientes y /api/v1/tutores/{id_tutor}/pacientes)
// ============================================================================

export async function listarPacientes(filtros = {}) {
  if (!IS_DEMO_MODE) {
    return peticionHttp("GET", `/api/v1/pacientes${construirQuery(filtros)}`);
  }
  await pausaDemo();
  const skip = Number(filtros.skip || 0);
  const limit = Number(filtros.limit || 20);
  const generoQ = (filtros.genero || "").trim();
  const nombreQ = (filtros.nombre || "").toLowerCase().trim();
  const edadMin =
    filtros.edad_min !== undefined && filtros.edad_min !== ""
      ? Number(filtros.edad_min)
      : null;
  const edadMax =
    filtros.edad_max !== undefined && filtros.edad_max !== ""
      ? Number(filtros.edad_max)
      : null;

  const desglosados = [];
  memoriaExpedientes.forEach((exp) => {
    (exp.pacientes || []).forEach((pac) => {
      if (generoQ && pac.genero !== generoQ) return;
      if (nombreQ && !pac.nombre.toLowerCase().includes(nombreQ)) return;
      if (edadMin !== null && pac.edad < edadMin) return;
      if (edadMax !== null && pac.edad > edadMax) return;
      desglosados.push({
        id_tutor: exp.id_tutor,
        tutor: exp.tutor,
        paciente: structuredClone(pac),
      });
    });
  });

  desglosados.sort((a, b) => a.paciente.id_paciente - b.paciente.id_paciente);
  return {
    total: desglosados.length,
    skip,
    limit,
    items: desglosados.slice(skip, skip + limit),
  };
}

export async function obtenerPaciente(idPaciente) {
  const id = Number(idPaciente);
  if (!IS_DEMO_MODE) {
    return peticionHttp("GET", `/api/v1/pacientes/${id}`);
  }
  await pausaDemo();
  for (const exp of memoriaExpedientes) {
    const pac = (exp.pacientes || []).find((p) => p.id_paciente === id);
    if (pac) {
      return {
        id_tutor: exp.id_tutor,
        tutor: exp.tutor,
        paciente: structuredClone(pac),
      };
    }
  }
  throw new Error(`No se encontró ningún paciente con id_paciente=${id}.`);
}

export async function agregarPacienteATutor(idTutor, paciente) {
  const idT = Number(idTutor);
  if (!IS_DEMO_MODE) {
    return peticionHttp("POST", `/api/v1/tutores/${idT}/pacientes`, paciente);
  }
  await pausaDemo();
  const tutorDoc = memoriaExpedientes.find((e) => e.id_tutor === idT);
  if (!tutorDoc) {
    throw new Error(`No se encontró ningún expediente con id_tutor=${idT}.`);
  }
  const yaExiste = memoriaExpedientes.some((e) =>
    (e.pacientes || []).some((p) => p.id_paciente === Number(paciente.id_paciente))
  );
  if (yaExiste) {
    throw new Error(
      `Ya existe un paciente registrado con id_paciente=${paciente.id_paciente}.`
    );
  }
  const nuevoPac = structuredClone(paciente);
  tutorDoc.pacientes.push(nuevoPac);
  return {
    id_tutor: tutorDoc.id_tutor,
    tutor: tutorDoc.tutor,
    paciente: structuredClone(nuevoPac),
  };
}

export async function actualizarPaciente(idPaciente, datos) {
  const id = Number(idPaciente);
  if (!IS_DEMO_MODE) {
    return peticionHttp("PATCH", `/api/v1/pacientes/${id}`, datos);
  }
  await pausaDemo();
  for (const exp of memoriaExpedientes) {
    const idx = (exp.pacientes || []).findIndex((p) => p.id_paciente === id);
    if (idx !== -1) {
      exp.pacientes[idx] = {
        ...exp.pacientes[idx],
        ...structuredClone(datos),
      };
      return {
        id_tutor: exp.id_tutor,
        tutor: exp.tutor,
        paciente: structuredClone(exp.pacientes[idx]),
      };
    }
  }
  throw new Error(`No se encontró ningún paciente con id_paciente=${id}.`);
}

export async function eliminarPaciente(idPaciente) {
  const id = Number(idPaciente);
  if (!IS_DEMO_MODE) {
    return peticionHttp("DELETE", `/api/v1/pacientes/${id}`);
  }
  await pausaDemo();
  for (const exp of memoriaExpedientes) {
    const idx = (exp.pacientes || []).findIndex((p) => p.id_paciente === id);
    if (idx !== -1) {
      if (exp.pacientes.length <= 1) {
        throw new Error(
          "No se puede eliminar el único paciente del tutor porque el esquema exige al menos un paciente por expediente (minItems: 1)."
        );
      }
      exp.pacientes.splice(idx, 1);
      return null;
    }
  }
  throw new Error(`No se encontró ningún paciente con id_paciente=${id}.`);
}

// ============================================================================
// 3. CONSULTAS (/api/v1/pacientes/{id_paciente}/consultas)
// ============================================================================

export async function listarConsultas(idPaciente) {
  const id = Number(idPaciente);
  if (!IS_DEMO_MODE) {
    return peticionHttp("GET", `/api/v1/pacientes/${id}/consultas`);
  }
  const info = await obtenerPaciente(id);
  return structuredClone(info.paciente.consultas || []);
}

export async function agregarConsulta(idPaciente, consulta) {
  const id = Number(idPaciente);
  if (!IS_DEMO_MODE) {
    return peticionHttp("POST", `/api/v1/pacientes/${id}/consultas`, consulta);
  }
  await pausaDemo();
  for (const exp of memoriaExpedientes) {
    const pac = (exp.pacientes || []).find((p) => p.id_paciente === id);
    if (pac) {
      if (!pac.consultas) pac.consultas = [];
      const copia = structuredClone(consulta);
      pac.consultas.push(copia);
      return structuredClone(copia);
    }
  }
  throw new Error(`No se encontró ningún paciente con id_paciente=${id}.`);
}

export async function actualizarConsulta(idPaciente, indice, datos) {
  const id = Number(idPaciente);
  const idx = Number(indice);
  if (!IS_DEMO_MODE) {
    return peticionHttp("PATCH", `/api/v1/pacientes/${id}/consultas/${idx}`, datos);
  }
  await pausaDemo();
  for (const exp of memoriaExpedientes) {
    const pac = (exp.pacientes || []).find((p) => p.id_paciente === id);
    if (pac) {
      const lista = pac.consultas || [];
      if (idx < 0 || idx >= lista.length) {
        throw new Error(
          `No existe una consulta en el índice ${idx} para el paciente ${id}.`
        );
      }
      lista[idx] = {
        ...lista[idx],
        ...structuredClone(datos),
      };
      return structuredClone(lista[idx]);
    }
  }
  throw new Error(`No se encontró ningún paciente con id_paciente=${id}.`);
}

export async function eliminarConsulta(idPaciente, indice) {
  const id = Number(idPaciente);
  const idx = Number(indice);
  if (!IS_DEMO_MODE) {
    return peticionHttp("DELETE", `/api/v1/pacientes/${id}/consultas/${idx}`);
  }
  await pausaDemo();
  for (const exp of memoriaExpedientes) {
    const pac = (exp.pacientes || []).find((p) => p.id_paciente === id);
    if (pac) {
      const lista = pac.consultas || [];
      if (idx < 0 || idx >= lista.length) {
        throw new Error(
          `No existe una consulta en el índice ${idx} para el paciente ${id}.`
        );
      }
      lista.splice(idx, 1);
      return null;
    }
  }
  throw new Error(`No se encontró ningún paciente con id_paciente=${id}.`);
}

// ============================================================================
// 4. CIRUGÍAS (/api/v1/pacientes/{id_paciente}/cirugias)
// ============================================================================

export async function listarCirugias(idPaciente) {
  const id = Number(idPaciente);
  if (!IS_DEMO_MODE) {
    return peticionHttp("GET", `/api/v1/pacientes/${id}/cirugias`);
  }
  const info = await obtenerPaciente(id);
  return structuredClone(info.paciente.cirugias || []);
}

export async function agregarCirugia(idPaciente, cirugia) {
  const id = Number(idPaciente);
  if (!IS_DEMO_MODE) {
    return peticionHttp("POST", `/api/v1/pacientes/${id}/cirugias`, cirugia);
  }
  await pausaDemo();
  for (const exp of memoriaExpedientes) {
    const pac = (exp.pacientes || []).find((p) => p.id_paciente === id);
    if (pac) {
      if (!pac.cirugias) pac.cirugias = [];
      if (
        pac.cirugias.some((c) => c.id_cirugia === Number(cirugia.id_cirugia))
      ) {
        throw new Error(
          `El paciente ${id} ya tiene una cirugía con id_cirugia=${cirugia.id_cirugia}.`
        );
      }
      const copia = structuredClone(cirugia);
      pac.cirugias.push(copia);
      return structuredClone(copia);
    }
  }
  throw new Error(`No se encontró ningún paciente con id_paciente=${id}.`);
}

export async function actualizarCirugia(idPaciente, idCirugia, datos) {
  const id = Number(idPaciente);
  const idCir = Number(idCirugia);
  if (!IS_DEMO_MODE) {
    return peticionHttp(
      "PATCH",
      `/api/v1/pacientes/${id}/cirugias/${idCir}`,
      datos
    );
  }
  await pausaDemo();
  for (const exp of memoriaExpedientes) {
    const pac = (exp.pacientes || []).find((p) => p.id_paciente === id);
    if (pac) {
      const lista = pac.cirugias || [];
      const idx = lista.findIndex((c) => c.id_cirugia === idCir);
      if (idx === -1) {
        throw new Error(
          `No se encontró la cirugía con id_cirugia=${idCir} en el paciente ${id}.`
        );
      }
      lista[idx] = {
        ...lista[idx],
        ...structuredClone(datos),
      };
      return structuredClone(lista[idx]);
    }
  }
  throw new Error(`No se encontró ningún paciente con id_paciente=${id}.`);
}

export async function eliminarCirugia(idPaciente, idCirugia) {
  const id = Number(idPaciente);
  const idCir = Number(idCirugia);
  if (!IS_DEMO_MODE) {
    return peticionHttp("DELETE", `/api/v1/pacientes/${id}/cirugias/${idCir}`);
  }
  await pausaDemo();
  for (const exp of memoriaExpedientes) {
    const pac = (exp.pacientes || []).find((p) => p.id_paciente === id);
    if (pac) {
      const lista = pac.cirugias || [];
      const idx = lista.findIndex((c) => c.id_cirugia === idCir);
      if (idx === -1) {
        throw new Error(
          `No se encontró la cirugía con id_cirugia=${idCir} en el paciente ${id}.`
        );
      }
      lista.splice(idx, 1);
      return null;
    }
  }
  throw new Error(`No se encontró ningún paciente con id_paciente=${id}.`);
}

// ============================================================================
// 5. ANÁLISIS Y ESTADÍSTICAS (/api/v1/analisis/...)
// ============================================================================

export async function obtenerResumenGeneral() {
  if (!IS_DEMO_MODE) {
    return peticionHttp("GET", "/api/v1/analisis/resumen-general");
  }
  await pausaDemo();
  const totalTutores = memoriaExpedientes.length;
  let totalPacientes = 0;
  let sumaEdades = 0;
  let masculinos = 0;
  let femeninos = 0;
  let totalConsultas = 0;
  let totalCirugias = 0;

  memoriaExpedientes.forEach((exp) => {
    (exp.pacientes || []).forEach((p) => {
      totalPacientes += 1;
      sumaEdades += Number(p.edad || 0);
      if (p.genero === "M") masculinos += 1;
      if (p.genero === "F") femeninos += 1;
      totalConsultas += (p.consultas || []).length;
      totalCirugias += (p.cirugias || []).length;
    });
  });

  return {
    total_tutores: totalTutores,
    total_pacientes: totalPacientes,
    edad_promedio:
      totalPacientes > 0
        ? Number((sumaEdades / totalPacientes).toFixed(2))
        : 0,
    pacientes_masculinos: masculinos,
    pacientes_femeninos: femeninos,
    total_consultas: totalConsultas,
    total_cirugias: totalCirugias,
  };
}

export async function obtenerPadecimientosFrecuentes(limit = 10) {
  if (!IS_DEMO_MODE) {
    return peticionHttp(
      "GET",
      `/api/v1/analisis/padecimientos-frecuentes${construirQuery({ limit })}`
    );
  }
  await pausaDemo();
  const mapa = new Map();
  memoriaExpedientes.forEach((exp) => {
    (exp.pacientes || []).forEach((pac) => {
      (pac.consultas || []).forEach((con) => {
        (con.padecimientos || []).forEach((pad) => {
          const item = mapa.get(pad) || {
            padecimiento: pad,
            frecuencia: 0,
            pacientesSet: new Set(),
          };
          item.frecuencia += 1;
          item.pacientesSet.add(pac.id_paciente);
          mapa.set(pad, item);
        });
      });
    });
  });

  return Array.from(mapa.values())
    .map((x) => ({
      padecimiento: x.padecimiento,
      frecuencia: x.frecuencia,
      total_pacientes_afectados: x.pacientesSet.size,
    }))
    .sort(
      (a, b) =>
        b.frecuencia - a.frecuencia ||
        a.padecimiento.localeCompare(b.padecimiento)
    )
    .slice(0, Number(limit || 10));
}

export async function obtenerIngresos() {
  if (!IS_DEMO_MODE) {
    return peticionHttp("GET", "/api/v1/analisis/ingresos");
  }
  await pausaDemo();
  const acumulador = {};
  const registrarPago = (pago) => {
    if (!pago) return;
    const fp = pago.forma_pago;
    if (!acumulador[fp]) {
      acumulador[fp] = {
        forma_pago: fp,
        total_operaciones: 0,
        monto_bruto: 0,
        monto_neto: 0,
        total_facturas: 0,
      };
    }
    const cant = Number(pago.cantidad || 0);
    const desc = Number(pago.descuento || 0);
    const neto = cant * (1 - desc / 100);
    acumulador[fp].total_operaciones += 1;
    acumulador[fp].monto_bruto += cant;
    acumulador[fp].monto_neto += neto;
    if (pago.factura) acumulador[fp].total_facturas += 1;
  };

  memoriaExpedientes.forEach((exp) => {
    (exp.pacientes || []).forEach((pac) => {
      (pac.consultas || []).forEach((c) => registrarPago(c.pago));
      (pac.cirugias || []).forEach((q) => registrarPago(q.pago));
    });
  });

  const porFormaPago = Object.values(acumulador)
    .sort((a, b) => a.forma_pago.localeCompare(b.forma_pago))
    .map((item) => ({
      ...item,
      monto_bruto: Number(item.monto_bruto.toFixed(2)),
      monto_neto: Number(item.monto_neto.toFixed(2)),
    }));

  return {
    total_operaciones: porFormaPago.reduce((s, x) => s + x.total_operaciones, 0),
    monto_bruto_total: Number(
      porFormaPago.reduce((s, x) => s + x.monto_bruto, 0).toFixed(2)
    ),
    monto_neto_total: Number(
      porFormaPago.reduce((s, x) => s + x.monto_neto, 0).toFixed(2)
    ),
    total_facturas: porFormaPago.reduce((s, x) => s + x.total_facturas, 0),
    por_forma_pago: porFormaPago,
  };
}

export async function obtenerResumenCirugias() {
  if (!IS_DEMO_MODE) {
    return peticionHttp("GET", "/api/v1/analisis/cirugias-resumen");
  }
  await pausaDemo();
  const mapa = new Map();
  memoriaExpedientes.forEach((exp) => {
    (exp.pacientes || []).forEach((pac) => {
      (pac.cirugias || []).forEach((cir) => {
        const actual = mapa.get(cir.tipo) || {
          tipo: cir.tipo,
          total_cirugias: 0,
          con_anestesia: 0,
          ingreso_bruto: 0,
        };
        actual.total_cirugias += 1;
        if (cir.anestesia) actual.con_anestesia += 1;
        actual.ingreso_bruto += Number(cir.pago?.cantidad || 0);
        mapa.set(cir.tipo, actual);
      });
    });
  });

  return Array.from(mapa.values())
    .map((x) => ({
      ...x,
      ingreso_bruto: Number(x.ingreso_bruto.toFixed(2)),
    }))
    .sort(
      (a, b) =>
        b.total_cirugias - a.total_cirugias || a.tipo.localeCompare(b.tipo)
    );
}

export async function obtenerExpedientesPorTutor() {
  if (!IS_DEMO_MODE) {
    return peticionHttp("GET", "/api/v1/analisis/expedientes-por-tutor");
  }
  await pausaDemo();
  return memoriaExpedientes
    .map((exp) => {
      const pacientes = exp.pacientes || [];
      return {
        id_tutor: exp.id_tutor,
        tutor: exp.tutor,
        total_pacientes: pacientes.length,
        total_consultas: pacientes.reduce(
          (acc, p) => acc + (p.consultas || []).length,
          0
        ),
        total_cirugias: pacientes.reduce(
          (acc, p) => acc + (p.cirugias || []).length,
          0
        ),
      };
    })
    .sort((a, b) => a.id_tutor - b.id_tutor);
}
