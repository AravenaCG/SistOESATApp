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
  10: "Bandoneón"
};

export const getInstrumentName = (id?: number): string => {
  if (!id) return "-";
  return INSTRUMENT_MAP[id] || "Desconocido";
};