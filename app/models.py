"""Modelos Pydantic que implementan estrictamente el JSON Schema de REGISTRO-PACIENTES."""

from datetime import date
import re
from typing import Annotated, Literal, Optional
from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StrictFloat,
    StrictInt,
    field_validator,
    model_validator,
)

DATE_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def validate_iso_date_str(value: str) -> str:
    """Valida que la cadena tenga formato exacto AAAA-MM-DD y sea una fecha real."""
    if not isinstance(value, str) or not DATE_REGEX.match(value):
        raise ValueError("La fecha debe estar en formato AAAA-MM-DD.")
    try:
        date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError("La fecha proporcionada no es una fecha calendario válida.") from exc
    return value


DateStr = Annotated[str, AfterValidator(validate_iso_date_str)]
NumberType = StrictInt | StrictFloat


class Pago(BaseModel):
    """Subdocumento de pago según $defs/pago del esquema JSON."""

    model_config = ConfigDict(extra="forbid")

    cantidad: NumberType = Field(..., gt=0, description="Monto del pago (mayor a 0).")
    forma_pago: Literal["efectivo", "tarjeta", "transferencia"] = Field(
        ..., description="Método de pago permitido."
    )
    factura: StrictBool = Field(
        default=False, description="Indica si el pago requiere factura."
    )
    descuento: Optional[NumberType] = Field(
        default=None,
        ge=0,
        le=100,
        description="Porcentaje de descuento; null si no aplica.",
    )


class Consulta(BaseModel):
    """Subdocumento de consulta médica de un paciente."""

    model_config = ConfigDict(extra="forbid")

    fecha: DateStr = Field(..., description="Fecha en formato AAAA-MM-DD.")
    padecimientos: list[str] = Field(
        ..., description="Lista de padecimientos o motivos de visita."
    )
    diagnostico: str = Field(..., min_length=1, description="Diagnóstico clínico.")
    medicamentos_recetados: list[str] = Field(
        ..., description="Lista de medicamentos recetados."
    )
    notas: Optional[str] = Field(default=None, description="Notas adicionales de la consulta.")
    pago: Pago


class Cirugia(BaseModel):
    """Subdocumento de cirugía practicada a un paciente."""

    model_config = ConfigDict(extra="forbid")

    id_cirugia: StrictInt = Field(..., ge=1, description="Identificador de la cirugía.")
    fecha: DateStr = Field(..., description="Fecha en formato AAAA-MM-DD.")
    tipo: str = Field(..., min_length=1, description="Tipo de intervención quirúrgica.")
    anestesia: StrictBool = Field(..., description="Indica si requirió anestesia.")
    anestesiologo: Optional[str] = Field(
        default=None, description="Nombre del anestesiólogo o null si no aplica."
    )
    pago: Pago
    notas: Optional[str] = Field(default=None, description="Notas adicionales de la cirugía.")


class Paciente(BaseModel):
    """Subdocumento de paciente dentro del expediente de un tutor."""

    model_config = ConfigDict(extra="forbid")

    id_paciente: StrictInt = Field(..., ge=1, description="Llave natural única del paciente.")
    nombre: str = Field(..., min_length=1, description="Nombre completo del paciente.")
    fecha_nacimiento: DateStr = Field(..., description="Fecha en formato AAAA-MM-DD.")
    edad: StrictInt = Field(..., ge=0, le=120, description="Edad del paciente en años.")
    genero: Literal["M", "F"] = Field(..., description="Género del paciente ('M' o 'F').")
    consultas: list[Consulta] = Field(
        ..., description="Historial de consultas médicas del paciente."
    )
    cirugias: Optional[list[Cirugia]] = Field(
        default=None, description="Historial opcional de cirugías del paciente."
    )

    @field_validator("cirugias")
    @classmethod
    def validate_unique_cirugias(cls, cirugias: Optional[list[Cirugia]]) -> Optional[list[Cirugia]]:
        """Verifica que no se repita id_cirugia dentro del mismo paciente."""
        if cirugias:
            seen_ids: set[int] = set()
            for cirugia in cirugias:
                if cirugia.id_cirugia in seen_ids:
                    raise ValueError(
                        f"El id_cirugia {cirugia.id_cirugia} está duplicado en el mismo paciente."
                    )
                seen_ids.add(cirugia.id_cirugia)
        return cirugias


class ExpedienteTutor(BaseModel):
    """Documento raíz de la colección REGISTRO-PACIENTES."""

    model_config = ConfigDict(extra="forbid")

    id_tutor: StrictInt = Field(..., ge=1, description="Llave natural única del tutor.")
    tutor: str = Field(..., min_length=1, description="Nombre completo del tutor responsable.")
    pacientes: list[Paciente] = Field(
        ..., min_length=1, description="Lista de pacientes a cargo del tutor (mínimo 1)."
    )

    @field_validator("pacientes")
    @classmethod
    def validate_unique_pacientes(cls, pacientes: list[Paciente]) -> list[Paciente]:
        """Verifica que no existan id_paciente duplicados en el mismo expediente."""
        seen_ids: set[int] = set()
        for paciente in pacientes:
            if paciente.id_paciente in seen_ids:
                raise ValueError(
                    f"El id_paciente {paciente.id_paciente} está duplicado dentro del expediente."
                )
            seen_ids.add(paciente.id_paciente)
        return pacientes


class TutorUpdate(BaseModel):
    """Modelo para actualización parcial (PATCH) o reemplazo de datos de un tutor."""

    model_config = ConfigDict(extra="forbid")

    tutor: Optional[str] = Field(default=None, min_length=1)
    pacientes: Optional[list[Paciente]] = Field(default=None, min_length=1)

    @field_validator("pacientes")
    @classmethod
    def validate_unique_pacientes(
        cls, pacientes: Optional[list[Paciente]]
    ) -> Optional[list[Paciente]]:
        if pacientes is not None:
            seen_ids: set[int] = set()
            for paciente in pacientes:
                if paciente.id_paciente in seen_ids:
                    raise ValueError(
                        f"El id_paciente {paciente.id_paciente} está duplicado en la actualización."
                    )
                seen_ids.add(paciente.id_paciente)
        return pacientes

    @model_validator(mode="after")
    def check_at_least_one_field(self) -> "TutorUpdate":
        if not self.model_fields_set:
            raise ValueError("Debe proporcionar al menos un campo para actualizar.")
        return self


class PacienteUpdate(BaseModel):
    """Modelo para actualizar campos de un paciente existente sin alterar su id_paciente."""

    model_config = ConfigDict(extra="forbid")

    nombre: Optional[str] = Field(default=None, min_length=1)
    fecha_nacimiento: Optional[DateStr] = Field(default=None)
    edad: Optional[StrictInt] = Field(default=None, ge=0, le=120)
    genero: Optional[Literal["M", "F"]] = Field(default=None)
    consultas: Optional[list[Consulta]] = Field(default=None)
    cirugias: Optional[list[Cirugia]] = Field(default=None)

    @model_validator(mode="after")
    def check_at_least_one_field(self) -> "PacienteUpdate":
        if not self.model_fields_set:
            raise ValueError("Debe proporcionar al menos un campo del paciente para actualizar.")
        return self


class ConsultaUpdate(BaseModel):
    """Modelo para actualizar parcialmente una consulta específica de un paciente."""

    model_config = ConfigDict(extra="forbid")

    fecha: Optional[DateStr] = Field(default=None)
    padecimientos: Optional[list[str]] = Field(default=None)
    diagnostico: Optional[str] = Field(default=None, min_length=1)
    medicamentos_recetados: Optional[list[str]] = Field(default=None)
    notas: Optional[str] = Field(default=None)
    pago: Optional[Pago] = Field(default=None)

    @model_validator(mode="after")
    def check_at_least_one_field(self) -> "ConsultaUpdate":
        if not self.model_fields_set:
            raise ValueError("Debe proporcionar al menos un campo de la consulta para actualizar.")
        return self


class CirugiaUpdate(BaseModel):
    """Modelo para actualizar parcialmente una cirugía específica de un paciente."""

    model_config = ConfigDict(extra="forbid")

    fecha: Optional[DateStr] = Field(default=None)
    tipo: Optional[str] = Field(default=None, min_length=1)
    anestesia: Optional[StrictBool] = Field(default=None)
    anestesiologo: Optional[str] = Field(default=None)
    pago: Optional[Pago] = Field(default=None)
    notas: Optional[str] = Field(default=None)

    @model_validator(mode="after")
    def check_at_least_one_field(self) -> "CirugiaUpdate":
        if not self.model_fields_set:
            raise ValueError("Debe proporcionar al menos un campo de la cirugía para actualizar.")
        return self
