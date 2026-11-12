/**
 * Datos de ejemplo estrictamente apegados al JSON Schema de REGISTRO-PACIENTES.
 * Se utilizan automáticamente cuando la variable de entorno VITE_API_URL no está definida.
 */

export const EXPEDIENTES_EJEMPLO = [
  {
    id_tutor: 101,
    tutor: "María Fernanda Gómez López",
    pacientes: [
      {
        id_paciente: 5001,
        nombre: "Santiago Gómez",
        fecha_nacimiento: "2019-05-14",
        edad: 7,
        genero: "M",
        consultas: [
          {
            fecha: "2026-01-15",
            padecimientos: ["fiebre", "dolor de garganta"],
            diagnostico: "Faringoamigdalitis aguda bacteriana",
            medicamentos_recetados: ["Amoxicilina 500mg", "Paracetamol infantil"],
            notas: "Reposo por 3 días e hidratación abundante.",
            pago: {
              cantidad: 850,
              forma_pago: "tarjeta",
              factura: true,
              descuento: 10,
            },
          },
          {
            fecha: "2026-03-10",
            padecimientos: ["control pediátrico", "revisión de peso"],
            diagnostico: "Crecimiento y desarrollo adecuados para la edad",
            medicamentos_recetados: ["Multivitamínico pediátrico"],
            notas: "Esquema de vacunación completo.",
            pago: {
              cantidad: 750,
              forma_pago: "efectivo",
              factura: false,
              descuento: null,
            },
          },
        ],
        cirugias: [
          {
            id_cirugia: 1,
            fecha: "2026-02-02",
            tipo: "Amigdalectomía",
            anestesia: true,
            anestesiologo: "Dr. Roberto Sánchez",
            pago: {
              cantidad: 15000,
              forma_pago: "transferencia",
              factura: true,
              descuento: 5,
            },
            notas: "Recuperación favorable sin sangrado postoperatorio.",
          },
        ],
      },
      {
        id_paciente: 5002,
        nombre: "Valeria Gómez",
        fecha_nacimiento: "2021-11-03",
        edad: 4,
        genero: "F",
        consultas: [
          {
            fecha: "2026-02-20",
            padecimientos: ["tos seca", "congestión nasal", "fiebre"],
            diagnostico: "Bronquiolitis viral leve",
            medicamentos_recetados: ["Salbutamol inhalador", "Solución salina nasal"],
            notas: "Nebulizaciones cada 8 horas por 5 días.",
            pago: {
              cantidad: 900,
              forma_pago: "efectivo",
              factura: false,
              descuento: null,
            },
          },
        ],
      },
    ],
  },
  {
    id_tutor: 102,
    tutor: "Carlos Eduardo Hernández Rivera",
    pacientes: [
      {
        id_paciente: 5003,
        nombre: "Mateo Hernández",
        fecha_nacimiento: "2016-08-22",
        edad: 9,
        genero: "M",
        consultas: [
          {
            fecha: "2026-01-28",
            padecimientos: ["dolor abdominal", "náuseas"],
            diagnostico: "Gastroenteritis infecciosa",
            medicamentos_recetados: ["Suero oral", "Probióticos pediátricos", "Butilhioscina"],
            notas: "Dieta astringente por 48 horas.",
            pago: {
              cantidad: 800,
              forma_pago: "transferencia",
              factura: true,
              descuento: 0,
            },
          },
          {
            fecha: "2026-04-05",
            padecimientos: ["estornudos", "ojos llorosos"],
            diagnostico: "Rinitis alérgica estacional",
            medicamentos_recetados: ["Loratadina pediátrica", "Mometasona spray nasal"],
            notas: "Evitar exposición a polvo y polen.",
            pago: {
              cantidad: 800,
              forma_pago: "tarjeta",
              factura: true,
              descuento: null,
            },
          },
        ],
        cirugias: [
          {
            id_cirugia: 2,
            fecha: "2026-03-18",
            tipo: "Hernioplastía umbilical",
            anestesia: true,
            anestesiologo: "Dra. Elena Ruiz",
            pago: {
              cantidad: 18500,
              forma_pago: "transferencia",
              factura: true,
              descuento: 10,
            },
            notas: "Alta médica a las 24 horas sin complicaciones.",
          },
        ],
      },
    ],
  },
  {
    id_tutor: 103,
    tutor: "Ana Sofía Martínez Vega",
    pacientes: [
      {
        id_paciente: 5004,
        nombre: "Lucía Martínez",
        fecha_nacimiento: "2023-02-11",
        edad: 3,
        genero: "F",
        consultas: [
          {
            fecha: "2026-04-18",
            padecimientos: ["dolor de oído", "irritabilidad", "fiebre"],
            diagnostico: "Otitis media aguda derecha",
            medicamentos_recetados: ["Amoxicilina con ácido clavulánico", "Ibuprofeno pediátrico"],
            notas: "Cita de revisión en 7 días.",
            pago: {
              cantidad: 950,
              forma_pago: "tarjeta",
              factura: false,
              descuento: 5,
            },
          },
        ],
      },
    ],
  },
];

/**
 * Catálogo oficial de las rutas del backend (verbo, ruta y qué hace).
 */
export const RUTAS_API = [
  {
    grupo: "Salud",
    verbo: "GET",
    ruta: "/health",
    descripcion: "Verifica la conexión activa con la base de datos MongoDB (optaGestionDeDatos).",
  },
  {
    grupo: "Tutores",
    verbo: "POST",
    ruta: "/api/v1/tutores",
    descripcion: "Crea un nuevo expediente de tutor con su lista de pacientes (mínimo 1).",
  },
  {
    grupo: "Tutores",
    verbo: "GET",
    ruta: "/api/v1/tutores",
    descripcion: "Lista expedientes de tutores con paginación y filtros (tutor, género, edad, padecimiento).",
  },
  {
    grupo: "Tutores",
    verbo: "GET",
    ruta: "/api/v1/tutores/{id_tutor}",
    descripcion: "Obtiene un expediente completo por su llave natural id_tutor.",
  },
  {
    grupo: "Tutores",
    verbo: "PUT",
    ruta: "/api/v1/tutores/{id_tutor}",
    descripcion: "Reemplaza por completo un expediente de tutor existente.",
  },
  {
    grupo: "Tutores",
    verbo: "PATCH",
    ruta: "/api/v1/tutores/{id_tutor}",
    descripcion: "Actualiza parcialmente el nombre del tutor o su lista de pacientes.",
  },
  {
    grupo: "Tutores",
    verbo: "DELETE",
    ruta: "/api/v1/tutores/{id_tutor}",
    descripcion: "Elimina un expediente de tutor por su llave natural id_tutor.",
  },
  {
    grupo: "Pacientes",
    verbo: "GET",
    ruta: "/api/v1/pacientes",
    descripcion: "Lista todos los pacientes de la colección con paginación y filtros (nombre, género, edad).",
  },
  {
    grupo: "Pacientes",
    verbo: "GET",
    ruta: "/api/v1/pacientes/{id_paciente}",
    descripcion: "Obtiene un paciente específico por su llave natural id_paciente junto con su tutor.",
  },
  {
    grupo: "Pacientes",
    verbo: "POST",
    ruta: "/api/v1/tutores/{id_tutor}/pacientes",
    descripcion: "Agrega un nuevo paciente al expediente de un tutor existente.",
  },
  {
    grupo: "Pacientes",
    verbo: "PATCH",
    ruta: "/api/v1/pacientes/{id_paciente}",
    descripcion: "Actualiza los datos de un paciente existente por su id_paciente.",
  },
  {
    grupo: "Pacientes",
    verbo: "DELETE",
    ruta: "/api/v1/pacientes/{id_paciente}",
    descripcion: "Elimina un paciente del expediente de su tutor (conservando mínimo 1 paciente).",
  },
  {
    grupo: "Consultas",
    verbo: "GET",
    ruta: "/api/v1/pacientes/{id_paciente}/consultas",
    descripcion: "Lista el historial de consultas médicas de un paciente.",
  },
  {
    grupo: "Consultas",
    verbo: "POST",
    ruta: "/api/v1/pacientes/{id_paciente}/consultas",
    descripcion: "Registra una nueva consulta médica y su pago para un paciente.",
  },
  {
    grupo: "Consultas",
    verbo: "PATCH",
    ruta: "/api/v1/pacientes/{id_paciente}/consultas/{indice}",
    descripcion: "Edita una consulta específica de un paciente según su posición (0-based).",
  },
  {
    grupo: "Consultas",
    verbo: "DELETE",
    ruta: "/api/v1/pacientes/{id_paciente}/consultas/{indice}",
    descripcion: "Elimina una consulta específica de un paciente según su posición (0-based).",
  },
  {
    grupo: "Cirugías",
    verbo: "GET",
    ruta: "/api/v1/pacientes/{id_paciente}/cirugias",
    descripcion: "Lista el historial de cirugías practicadas a un paciente.",
  },
  {
    grupo: "Cirugías",
    verbo: "POST",
    ruta: "/api/v1/pacientes/{id_paciente}/cirugias",
    descripcion: "Registra una nueva cirugía y su pago para un paciente.",
  },
  {
    grupo: "Cirugías",
    verbo: "PATCH",
    ruta: "/api/v1/pacientes/{id_paciente}/cirugias/{id_cirugia}",
    descripcion: "Actualiza los datos de una cirugía de un paciente por su id_cirugia.",
  },
  {
    grupo: "Cirugías",
    verbo: "DELETE",
    ruta: "/api/v1/pacientes/{id_paciente}/cirugias/{id_cirugia}",
    descripcion: "Elimina una cirugía específica de un paciente por su id_cirugia.",
  },
  {
    grupo: "Análisis",
    verbo: "GET",
    ruta: "/api/v1/analisis/resumen-general",
    descripcion: "Obtiene indicadores globales: total de tutores, pacientes, edad promedio, género, consultas y cirugías.",
  },
  {
    grupo: "Análisis",
    verbo: "GET",
    ruta: "/api/v1/analisis/padecimientos-frecuentes",
    descripcion: "Obtiene el top de padecimientos o motivos de visita más frecuentes.",
  },
  {
    grupo: "Análisis",
    verbo: "GET",
    ruta: "/api/v1/analisis/ingresos",
    descripcion: "Calcula ingresos brutos, netos (con descuento) y facturas desglosados por forma_pago.",
  },
  {
    grupo: "Análisis",
    verbo: "GET",
    ruta: "/api/v1/analisis/cirugias-resumen",
    descripcion: "Agrupa las cirugías por tipo, uso de anestesia e ingreso bruto.",
  },
  {
    grupo: "Análisis",
    verbo: "GET",
    ruta: "/api/v1/analisis/expedientes-por-tutor",
    descripcion: "Resume la cantidad de pacientes, consultas y cirugías por cada tutor.",
  },
];
