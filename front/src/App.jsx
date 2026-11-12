import React, { useState } from "react";
import {
  API_BASE_URL,
  IS_DEMO_MODE,
  restaurarDatosEjemplo,
} from "./services/api";
import HomeView from "./views/HomeView";
import TutoresView from "./views/TutoresView";
import PacientesView from "./views/PacientesView";
import ConsultasView from "./views/ConsultasView";
import CirugiasView from "./views/CirugiasView";
import AnalisisView from "./views/AnalisisView";

const SECCIONES = [
  { id: "inicio", etiqueta: "Inicio" },
  { id: "tutores", etiqueta: "Tutores" },
  { id: "pacientes", etiqueta: "Pacientes" },
  { id: "consultas", etiqueta: "Consultas" },
  { id: "cirugias", etiqueta: "Cirugías" },
  { id: "analisis", etiqueta: "Análisis" },
];

export default function App() {
  const [seccionActiva, setSeccionActiva] = useState("inicio");
  const [rolActivo, setRolActivo] = useState("doctora");
  const [pacienteSeleccionadoId, setPacienteSeleccionadoId] = useState(null);
  const [versionDatos, setVersionDatos] = useState(0);

  const navegarAPacienteModulo = (moduloDestino, idPaciente) => {
    setPacienteSeleccionadoId(idPaciente);
    setSeccionActiva(moduloDestino);
  };

  const handleRestaurarDemo = () => {
    restaurarDatosEjemplo();
    setVersionDatos((v) => v + 1);
  };

  return (
    <div className="app-shell">
      {/* Encabezado Principal */}
      <header className="top-header">
        <div className="header-brand" onClick={() => setSeccionActiva("inicio")}>
          <div className="brand-logo" aria-hidden="true">
            +
          </div>
          <div>
            <h1>Pediatría Digital</h1>
            <span className="brand-subtitle">
              Expedientes Clínicos · REGISTRO-PACIENTES
            </span>
          </div>
        </div>

        <div className="header-controls">
          {/* Selector de Rol: Doctora / Secretaria */}
          <div className="role-switcher" role="group" aria-label="Perfil de usuario">
            <button
              type="button"
              className={`role-btn ${rolActivo === "doctora" ? "active" : ""}`}
              onClick={() => setRolActivo("doctora")}
            >
              Doctora
            </button>
            <button
              type="button"
              className={`role-btn ${rolActivo === "secretaria" ? "active" : ""}`}
              onClick={() => setRolActivo("secretaria")}
            >
              Secretaria
            </button>
          </div>

          {/* Indicador de Origen de Datos (VITE_API_URL vs Modo Demo) */}
          {IS_DEMO_MODE ? (
            <div className="connection-pill demo-pill">
              <span>Modo Demo (sin VITE_API_URL)</span>
              <button
                type="button"
                className="btn-link"
                onClick={handleRestaurarDemo}
                title="Restaurar los expedientes de ejemplo originales"
              >
                Restaurar
              </button>
            </div>
          ) : (
            <div className="connection-pill api-pill" title={API_BASE_URL}>
              <span>API: {API_BASE_URL}</span>
            </div>
          )}
        </div>
      </header>

      {/* Barra de Navegación por Grupos de Rutas */}
      <nav className="main-nav" aria-label="Secciones principales">
        <div className="nav-inner">
          {SECCIONES.map((sec) => (
            <button
              key={sec.id}
              type="button"
              className={`nav-tab ${seccionActiva === sec.id ? "active" : ""}`}
              onClick={() => setSeccionActiva(sec.id)}
            >
              {sec.etiqueta}
            </button>
          ))}
        </div>
      </nav>

      {/* Contenido Principal por Grupo de Rutas */}
      <main className="main-content" key={versionDatos}>
        {seccionActiva === "inicio" && (
          <HomeView
            rolActivo={rolActivo}
            onNavigate={(destino) => setSeccionActiva(destino)}
          />
        )}
        {seccionActiva === "tutores" && (
          <TutoresView onSelectPaciente={navegarAPacienteModulo} />
        )}
        {seccionActiva === "pacientes" && (
          <PacientesView
            pacienteInicialId={pacienteSeleccionadoId}
            onSelectPacienteModulo={navegarAPacienteModulo}
          />
        )}
        {seccionActiva === "consultas" && (
          <ConsultasView pacienteInicialId={pacienteSeleccionadoId} />
        )}
        {seccionActiva === "cirugias" && (
          <CirugiasView pacienteInicialId={pacienteSeleccionadoId} />
        )}
        {seccionActiva === "analisis" && <AnalisisView />}
      </main>

      <footer className="app-footer">
        <span>
          Sistema de Registro de Pacientes Pediátricos · Perfil activo:{" "}
          <strong>{rolActivo === "doctora" ? "Doctora" : "Secretaria"}</strong>
        </span>
        <span>
          {IS_DEMO_MODE
            ? "Operando con datos de ejemplo locales (define VITE_API_URL para conectar al backend)"
            : `Conectado a ${API_BASE_URL}`}
        </span>
      </footer>
    </div>
  );
}
