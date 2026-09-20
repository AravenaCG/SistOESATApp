export const API_AUTH_URL = "https://jwtauthapi.azurewebsites.net";
export const API_DATA_URL = "https://sistemagestionorquesta.azurewebsites.net";

export const INSTRUMENT_MAP: Record<number, string> = {
  1: "Violín",
  2: "Flauta",
  3: "Trompeta",
  4: "Violoncello",
  5: "Contrabajo",
  6: "Viola",
  7: "Guitarra",
  8: "Percusión",
  9: "Clarinete",
  10: "Bandoneón",
  11: "Saxófon"
};

export const getInstrumentName = (id?: number): string => {
  if (!id) return "-";
  return INSTRUMENT_MAP[id] || "Desconocido";
};

// Cursos de orquesta habilitados para inscripción (value del <select> -> nombre real del curso).
export const ORCHESTRA_COURSE_NAMES: Record<string, string> = {
  'inicial': 'Orquesta Inicial',
  'juvenil': 'Orquesta Juvenil',
  'pre-orquesta': 'Pre-Orquesta',
  'taller-iniciacion': 'Taller de Iniciación Musical',
};

// Cursos donde los estudiantes no tienen un instrumento individual asignado.
export const NO_INSTRUMENT_ORCHESTRAS = ['pre-orquesta', 'taller-iniciacion'];