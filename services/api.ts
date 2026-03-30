import { API_AUTH_URL, API_DATA_URL } from '../constants';
import { AuthResponse } from '../types';

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    // We'll use the local mock login first, then fallback to the real one if needed
    // or just use the local one for the demo/prototype
    const response = await fetch('/api/usuario/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) throw new Error('Credenciales inválidas');
    const data: AuthResponse = await response.json();
    
    if (data.token) {
      localStorage.setItem('accessToken', data.token);
      if (data.role) localStorage.setItem('userRole', data.role);
      if (data.estudianteId) localStorage.setItem('estudianteId', data.estudianteId);
      return data;
    }
    throw new Error('No se recibió token');
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
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    };

    const config: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    };

    // If it's a local API call (e.g. /api/stock), use the local server
    const baseUrl = endpoint.startsWith('/api') ? '' : API_DATA_URL;
    const response = await fetch(`${baseUrl}${endpoint}`, config);
    
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

    // Return json if content exists, otherwise null
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  },

  // Stock Endpoints
  createStock: (dto: any) => dataService.request('/api/stock', 'POST', dto),
  getStock: () => dataService.request('/api/stock'),
  getDisponibles: (instrumentoId: number) => dataService.request(`/api/stock/disponibles/${instrumentoId}`),
  
  // Loan Endpoints
  asignarPrestamo: (dto: any) => dataService.request('/api/prestamos/asignar', 'POST', dto),
  devolverPrestamo: (dto: any) => dataService.request('/api/prestamos/devolver', 'POST', dto),
  getPrestamosEstudiante: (estudianteId: string) => dataService.request(`/api/prestamos/estudiante/${estudianteId}`)
};
