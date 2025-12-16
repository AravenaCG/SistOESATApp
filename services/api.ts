import { API_AUTH_URL, API_DATA_URL } from '../constants';

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const authService = {
  login: async (email: string, password: string): Promise<string> => {
    const response = await fetch(`${API_AUTH_URL}/usuario/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) throw new Error('Credenciales inválidas');
    const data = await response.json();
    if (data.token) {
      localStorage.setItem('accessToken', data.token);
      return data.token;
    }
    throw new Error('No se recibió token');
  },
  
  logout: () => {
    localStorage.removeItem('accessToken');
    window.location.hash = '/login';
  }
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

    const response = await fetch(`${API_DATA_URL}${endpoint}`, config);
    
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
  }
};