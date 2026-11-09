"""Script auxiliar de arranque para ejecutar el servidor con Uvicorn."""

import uvicorn


def main() -> None:
    """Inicia el servidor FastAPI en el puerto 8000."""
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)


if __name__ == "__main__":
    main()
