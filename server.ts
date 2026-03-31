import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { API_DATA_URL } from './constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Same-origin proxy to the real backend to avoid browser CORS issues in local dev.
  app.use('/backend', async (req, res) => {
    try {
      const targetPath = req.originalUrl.replace(/^\/backend/, '');
      const targetUrl = `${API_DATA_URL}${targetPath}`;

      const proxyHeaders: Record<string, string> = {};
      const authorization = req.headers.authorization;
      const contentType = req.headers['content-type'];
      const accept = req.headers.accept;

      if (typeof authorization === 'string') proxyHeaders['Authorization'] = authorization;
      if (typeof contentType === 'string') proxyHeaders['Content-Type'] = contentType;
      if (typeof accept === 'string') proxyHeaders['Accept'] = accept;

      const method = req.method.toUpperCase();
      const init: RequestInit = {
        method,
        headers: proxyHeaders,
      };

      if (method !== 'GET' && method !== 'HEAD' && req.body && Object.keys(req.body).length > 0) {
        init.body = JSON.stringify(req.body);
      }

      const backendResponse = await fetch(targetUrl, init);
      const responseText = await backendResponse.text();
      const responseContentType = backendResponse.headers.get('content-type');

      if (responseContentType) {
        res.setHeader('Content-Type', responseContentType);
      }

      res.status(backendResponse.status).send(responseText);
    } catch (error) {
      console.error('Backend proxy error:', error);
      res.status(502).send('Error conectando con el backend remoto');
    }
  });

  // In-memory data for the new features
  let stock: any[] = [];
  let prestamos: any[] = [];
  let nextStockId = 1;
  let nextPrestamoId = 1;

  // 0) POST /api/usuario/login (Mock Login)
  app.post('/api/usuario/login', (req, res) => {
    const { email, password } = req.body;
    
    // Mock Admin
    if (email === 'admin@orquesta.com' && password === 'admin123') {
      return res.json({
        token: 'mock-admin-token',
        role: 'admin'
      });
    }
    
    // Mock Student (using a known ID from the real API if possible, or just a dummy one)
    if (email === 'estudiante@orquesta.com' && password === 'estudiante123') {
      return res.json({
        token: 'mock-student-token',
        role: 'student',
        estudianteId: '542976f6-8c4d-458b-9e4a-08dd091726a2' // Example ID
      });
    }

    res.status(401).send('Credenciales inválidas');
  });

  // 1) POST /api/stock
  app.post('/api/stock', (req, res) => {
    const { instrumentoId, codigoInventario, numeroSerie } = req.body;
    
    if (!instrumentoId || !codigoInventario) {
      return res.status(400).send('InstrumentoId y CodigoInventario son requeridos');
    }

    if (stock.some(s => s.codigoInventario === codigoInventario)) {
      return res.status(409).send(`CodigoInventario '${codigoInventario}' ya existe.`);
    }

    const newStock = {
      stockInstrumentoId: nextStockId++,
      instrumentoId,
      codigoInventario,
      numeroSerie: numeroSerie || null,
      estado: 'Disponible'
    };

    stock.push(newStock);
    res.status(201).json(newStock);
  });

  // 2) GET /api/stock/disponibles/:instrumentoId
  app.get('/api/stock/disponibles/:instrumentoId', (req, res) => {
    const instrumentoId = parseInt(req.params.instrumentoId);
    const disponibles = stock.filter(s => s.instrumentoId === instrumentoId && s.estado === 'Disponible');
    res.json(disponibles);
  });

  // 3) POST /api/prestamos/asignar
  app.post('/api/prestamos/asignar', (req, res) => {
    const { estudianteId, stockInstrumentoId } = req.body;

    const item = stock.find(s => s.stockInstrumentoId === stockInstrumentoId);
    if (!item) {
      return res.status(404).send(`StockInstrumento ${stockInstrumentoId} no existe.`);
    }

    if (item.estado !== 'Disponible') {
      return res.status(409).send('El ejemplar no está disponible para préstamo.');
    }

    // Update stock state
    item.estado = 'Prestado';

    const newPrestamo = {
      prestamoInstrumentoId: nextPrestamoId++,
      fechaPrestamo: new Date().toISOString(),
      fechaDevolucion: null,
      instrumentoId: item.instrumentoId,
      stockInstrumentoId,
      estudianteId
    };

    prestamos.push(newPrestamo);
    res.status(200).json(newPrestamo);
  });

  // 4) POST /api/prestamos/devolver
  app.post('/api/prestamos/devolver', (req, res) => {
    const { stockInstrumentoId } = req.body;

    const item = stock.find(s => s.stockInstrumentoId === stockInstrumentoId);
    if (!item) {
      return res.status(404).send(`StockInstrumento ${stockInstrumentoId} no existe.`);
    }

    const prestamo = prestamos.find(p => p.stockInstrumentoId === stockInstrumentoId && p.fechaDevolucion === null);
    if (!prestamo) {
      return res.status(400).send('No existe un préstamo abierto para ese ejemplar.');
    }

    // Update prestamo
    prestamo.fechaDevolucion = new Date().toISOString();
    
    // Update stock
    item.estado = 'Disponible';

    res.status(200).json(prestamo);
  });

  // Helper to get all stock (for the manager)
  app.get('/api/stock', (req, res) => {
    res.json(stock);
  });

  // Helper to get loans for a student
  app.get('/api/prestamos/estudiante/:estudianteId', (req, res) => {
    const { estudianteId } = req.params;
    const studentLoans = prestamos.filter(p => p.estudianteId === estudianteId);
    // Enrich with stock info
    const enriched = studentLoans.map(p => {
      const s = stock.find(item => item.stockInstrumentoId === p.stockInstrumentoId);
      return { ...p, codigoInventario: s?.codigoInventario };
    });
    res.json(enriched);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
