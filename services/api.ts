import { API_AUTH_URL, API_DATA_URL } from '../constants';
import { AuthResponse, SaveAttendanceDto } from '../types';

const CONFIGURED_DATA_BASE = import.meta.env.VITE_API_DATA_BASE_URL as string | undefined;
const API_DATA_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? '/backend'
  : (CONFIGURED_DATA_BASE || API_DATA_URL);

type LoginApiResponse = {
  success?: boolean;
  succes?: boolean;
  message?: string;
  result?: string;
  token?: string;
  role?: string;
  estudianteId?: string;
};

const decodeJwtPayload = (token: string): Record<string, any> | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_AUTH_URL}/usuario/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) throw new Error('No se pudo iniciar sesion');
    const data: LoginApiResponse = await response.json();

    if (data.success === false || data.succes === false) {
      throw new Error(data.message || 'Credenciales invalidas');
    }

    const token = data.token || data.result;
    if (token) {
      localStorage.setItem('accessToken', token);

      const payload = decodeJwtPayload(token);
      const tokenRole = payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      const parsedRole = (data.role || tokenRole || '').toString().toLowerCase();
      if (parsedRole) localStorage.setItem('userRole', parsedRole);

      const estudianteId = data.estudianteId || payload?.estudianteId || payload?.EstudianteId;
      if (estudianteId) localStorage.setItem('estudianteId', estudianteId);

      return {
        token,
        role: parsedRole === 'admin' || parsedRole === 'student' ? parsedRole : undefined,
        estudianteId
      };
    }

    throw new Error(data.message || 'No se recibio token');
  },
  
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('estudianteId');
    window.location.hash = '/login';
  },

  getUserRole: () => localStorage.getItem('userRole'),
  getEstudianteId: () => localStorage.getItem('estudianteId')
};

export const dataService = {
  // Generic Fetch Wrapper
  request: async (endpoint: string, method: string = 'GET', body?: any) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    const authHeader = getAuthHeader();
    if (authHeader.Authorization) {
      headers.Authorization = authHeader.Authorization;
    }

    const config: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    };

    // In dev use local proxy (/backend); in prod call real backend URL.
    const response = await fetch(`${API_DATA_BASE}${endpoint}`, config);
    
    // Handle Unauthorized
    if (response.status === 401) {
      authService.logout();
      throw new Error('Sesión expirada');
    }

    if (!response.ok) {
       // Try to parse error message
       const errText = await response.text();
       throw new Error(errText || `Error ${response.status}: ${response.statusText}`);
    }

    // Return JSON only when response body looks like JSON.
    const text = await response.text();
    if (!text) return null;

    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.toLowerCase().includes('application/json') || /^[\[{]/.test(text.trim());
    if (!looksLikeJson) {
      throw new Error('Respuesta no JSON del backend. Reintenta recargando la app.');
    }

    try {
      const parsed = JSON.parse(text);
      
      // Check if response contains error messages from backend
      if (parsed?.messages && Array.isArray(parsed.messages)) {
        const errorMsg = parsed.messages.find((m: any) => m.status === 'Error');
        if (errorMsg) {
          throw new Error(JSON.stringify(parsed)); // Pass full response for detailed error handling
        }
      }
      
      return parsed;
    } catch (parseError) {
      if (parseError instanceof Error && parseError.message.startsWith('{')) {
        // Re-throw backend error with full response
        throw parseError;
      }
      throw new Error('No se pudo interpretar la respuesta JSON del backend.');
    }
  },

  // Student-Course Enrollment Endpoints
  darDeAltaEnCurso: (estudianteId: string, cursoId: number) =>
    dataService.request(`/estudianteDarDeAltaEnCurso/${estudianteId}/${cursoId}`, 'POST'),

  darDeBajaDeCurso: (estudianteId: string, cursoId: number) =>
    dataService.request(`/estudianteEliminarCurso/${estudianteId}/${cursoId}`, 'DELETE'),

  // Stock Endpoints
  createStock: (dto: any) => dataService.request('/api/stock', 'POST', dto),
  getStock: () => dataService.request('/api/stock', 'GET'),
  getDisponibles: (instrumentoId: number) => dataService.request(`/api/stock/disponibles/${instrumentoId}`, 'GET'),
  
  // Loan Endpoints
  asignarPrestamo: (dto: any) => dataService.request('/api/prestamos/asignar', 'POST', dto),
  devolverPrestamo: (dto: any) => dataService.request('/api/prestamos/devolver', 'POST', dto),
  getPrestamosEstudiante: async (estudianteId: string) => {
    try {
      const data = await dataService.request(`/api/prestamos/estudiante/${estudianteId}`, 'GET');
      if (Array.isArray(data)) return data;

      const wrapped = data as any;
      if (Array.isArray(wrapped?.result)) return wrapped.result;
      if (Array.isArray(wrapped?.Result)) return wrapped.Result;
      if (Array.isArray(wrapped?.data)) return wrapped.data;
      if (Array.isArray(wrapped?.Data)) return wrapped.Data;

      return [];
    } catch (error: any) {
      const message = (error?.message || '').toLowerCase();
      if (
        message.includes('404') ||
        message.includes('not found') ||
        message.includes('no hay prestamos') ||
        message.includes('sin prestamos')
      ) {
        return [];
      }
      throw error;
    }
  },

  // Attendance Endpoints
  saveAttendance: (attendanceData: SaveAttendanceDto) => dataService.request('/api/asistencia', 'POST', attendanceData),

  getAttendance: async (cursoId: string, fecha?: string) => {
    const query = fecha ? `?cursoId=${encodeURIComponent(cursoId)}&fecha=${encodeURIComponent(fecha)}` : `?cursoId=${encodeURIComponent(cursoId)}`;
    const data = await dataService.request(`/api/asistencia${query}`, 'GET');

    if (fecha) {
      if (Array.isArray(data)) return data[0] || null;
      const wrapped = data as any;
      if (Array.isArray(wrapped?.result)) return wrapped.result[0] || null;
      if (Array.isArray(wrapped?.Result)) return wrapped.Result[0] || null;
      return wrapped?.result || wrapped?.Result || wrapped || null;
    }

    if (Array.isArray(data)) return data;
    const wrapped = data as any;
    if (Array.isArray(wrapped?.result)) return wrapped.result;
    if (Array.isArray(wrapped?.Result)) return wrapped.Result;
    if (Array.isArray(wrapped?.data)) return wrapped.data;
    if (Array.isArray(wrapped?.Data)) return wrapped.Data;
    return [];
  },

  getStudentAttendanceHistory: async (estudianteId: string) => {
    try {
      const data = await dataService.request(`/api/asistencia/estudiante/${estudianteId}`, 'GET');
      if (Array.isArray(data)) return data;

      const wrapped = data as any;
      if (Array.isArray(wrapped?.result)) return wrapped.result;
      if (Array.isArray(wrapped?.Result)) return wrapped.Result;
      if (Array.isArray(wrapped?.data)) return wrapped.data;
      if (Array.isArray(wrapped?.Data)) return wrapped.Data;
      return [];
    } catch (error: any) {
      const message = (error?.message || '').toLowerCase();
      if (message.includes('404') || message.includes('not found') || message.includes('no hay asistencia')) {
        return [];
      }
      throw error;
    }
  }
};
