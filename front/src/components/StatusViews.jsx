import React from "react";

export function LoadingState({ mensaje = "Cargando información del servidor..." }) {
  return (
    <div className="status-box status-loading" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <div>
        <strong>Cargando datos...</strong>
        <p>{mensaje}</p>
      </div>
    </div>
  );
}

export function ErrorState({
  mensaje = "Ocurrió un error al consultar la información.",
  onRetry,
}) {
  return (
    <div className="status-box status-error" role="alert">
      <div className="status-icon" aria-hidden="true">
        !
      </div>
      <div className="status-body">
        <strong>Error en la solicitud</strong>
        <p>{mensaje}</p>
        {onRetry && (
          <button type="button" className="btn btn-outline" onClick={onRetry}>
            Reintentar llamada
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  titulo = "Sin registros para mostrar",
  mensaje = "No se encontraron resultados con los filtros seleccionados.",
  accionTexto,
  onAccion,
}) {
  return (
    <div className="status-box status-empty">
      <div className="status-icon empty-icon" aria-hidden="true">
        ∅
      </div>
      <div className="status-body">
        <strong>{titulo}</strong>
        <p>{mensaje}</p>
        {accionTexto && onAccion && (
          <button type="button" className="btn btn-primary" onClick={onAccion}>
            {accionTexto}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Gráfica SVG responsiva exclusivamente para series de tiempo (Regla 7).
 * Recibe puntos ordenados por fecha: [{ fecha: 'AAAA-MM-DD', valor: number, etiqueta: string }]
 */
export function TimeSeriesChart({
  titulo,
  subtitulo,
  puntos = [],
  prefijoValor = "",
  sufijoValor = "",
  color = "#0284c7",
}) {
  if (!puntos || puntos.length === 0) {
    return (
      <div className="card chart-card">
        <div className="card-header">
          <h3>{titulo}</h3>
          {subtitulo && <p className="text-muted">{subtitulo}</p>}
        </div>
        <EmptyState
          titulo="Serie de tiempo sin datos"
          mensaje="Aún no hay eventos fechados para graficar en este periodo."
        />
      </div>
    );
  }

  const ordenados = [...puntos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const width = 680;
  const height = 220;
  const padLeft = 56;
  const padRight = 28;
  const padTop = 26;
  const padBottom = 44;

  const valores = ordenados.map((p) => Number(p.valor || 0));
  const maxVal = Math.max(...valores, 1);
  const minVal = 0;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const coords = ordenados.map((p, idx) => {
    const x =
      ordenados.length === 1
        ? padLeft + plotWidth / 2
        : padLeft + (idx / (ordenados.length - 1)) * plotWidth;
    const ratio = (Number(p.valor || 0) - minVal) / (maxVal - minVal || 1);
    const y = padTop + plotHeight - ratio * plotHeight;
    return { ...p, x, y };
  });

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPoints =
    coords.length > 1
      ? `${coords[0].x},${padTop + plotHeight} ${polylinePoints} ${
          coords[coords.length - 1].x
        },${padTop + plotHeight}`
      : "";

  return (
    <div className="card chart-card">
      <div className="card-header">
        <div>
          <h3>{titulo}</h3>
          {subtitulo && <p className="text-muted">{subtitulo}</p>}
        </div>
        <span className="badge badge-info">Serie de Tiempo</span>
      </div>
      <div className="chart-wrapper">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="timeseries-svg"
          role="img"
          aria-label={titulo}
        >
          {/* Líneas guía horizontales */}
          {[0, 0.5, 1].map((step) => {
            const y = padTop + plotHeight - step * plotHeight;
            const valGuia = Math.round(minVal + step * (maxVal - minVal));
            return (
              <g key={step}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#64748b"
                >
                  {prefijoValor}
                  {valGuia}
                  {sufijoValor}
                </text>
              </g>
            );
          })}

          {/* Área bajo la curva */}
          {areaPoints && (
            <polygon points={areaPoints} fill={color} fillOpacity="0.12" />
          )}

          {/* Línea de serie de tiempo */}
          {coords.length > 1 && (
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              points={polylinePoints}
            />
          )}

          {/* Puntos y etiquetas de fecha */}
          {coords.map((c, idx) => (
            <g key={`${c.fecha}-${idx}`}>
              <circle
                cx={c.x}
                cy={c.y}
                r="5"
                fill="#ffffff"
                stroke={color}
                strokeWidth="2.5"
              />
              <text
                x={c.x}
                y={c.y - 10}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#0f172a"
              >
                {prefijoValor}
                {c.valor}
                {sufijoValor}
              </text>
              <text
                x={c.x}
                y={padTop + plotHeight + 22}
                textAnchor="middle"
                fontSize="10.5"
                fill="#475569"
              >
                {c.fecha}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
