
export interface AuthResponse {
  token: string;
}

export interface InstrumentLoan {
  prestamoInstrumentoId: string;
  fechaPrestamo: string;
  fechaDevolucion?: string | null;
  instrumentoId: string; // Code e.g. VIO-01-001
  detalleInstrumento?: string; // Snapshot of instrument details
}

export interface Student {
  estudianteId: string; // GUID
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  email: string;
  
  // API Fields
  documento: string;
  telefono: string;
  direccion: string;
  instrumentoId?: number;
  rutaFoto?: string | null;
  activo?: boolean;
  nacionalidad: string;

  // Parents (API)
  nombreTutor?: string;
  telefonoTutor?: string;
  documentoTutor?: string;
  
  nombreTutor2?: string;
  telefonoTutor2?: string;
  documentoTutor2?: string;

  // Health / Extra (API)
  tmtMédico?: string;
  epPsicoMotriz?: string;
  particularidad?: string;
  autoretiro?: boolean;
  
  // Relations
  cursos?: { cursoId: number; nombre: string; profesorId: string }[];
  
  // Loans Management
  // This matches the DB table PrestamosInstrumentos via API projection
  prestamosInstrumentos?: InstrumentLoan[]; 
  // Legacy field mentioned in prompt acting as a quick identifier if needed
  instrumento?: string; 

  // Legacy / Form Fields (Optional for compatibility)
  dni?: string;
  domicilio?: string;
  celular?: string;
  esMenor?: boolean;
  orquesta?: string;
  
  nombreTutor1?: string;
  dniTutor1?: string;
  celularTutor1?: string;
  
  bajoTratamiento?: boolean;
  tratamientoDetalle?: string;
  episodiosPsicomotrices?: boolean;
  episodiosDetalle?: string;
  particularidadFisica?: boolean;
  particularidadDetalle?: string;
  cesionImagen?: boolean;
}

export interface Course {
  cursoId: string;
  nombre: string;
  descripcion?: string;
  horario?: string;
}

export interface InventoryItem {
  id: string; // Unique ID like V-001
  typeId: number;
  name: string;
  serial: string;
  condition: string;
  detail?: string; // New field for QR
}

export enum InstrumentType {
  Violin = 1,
  Flauta = 2,
  Trompeta = 3,
  Violoncello = 4,
  Contrabajo = 5,
  Viola = 6,
  Guitarra = 7,
  Percusion = 8,
  Clarinete = 9,
  Bandoneon = 10
}
