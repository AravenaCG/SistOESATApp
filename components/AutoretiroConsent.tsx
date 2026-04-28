import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_DATA_URL } from '../constants';

const CONFIGURED_DATA_BASE = (import.meta as any).env?.VITE_API_DATA_BASE_URL as string | undefined;
const API_BASE =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? '/backend'
    : CONFIGURED_DATA_BASE || API_DATA_URL;

const fetchJson = async (path: string) => {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const putJson = async (path: string, body: unknown) => {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(text || `Error ${res.status}`);
  }
  if (text) {
    try {
      const parsed = JSON.parse(text);
      if (parsed?.messages && Array.isArray(parsed.messages)) {
        const err = parsed.messages.find((m: any) => m.status === 'Error' || m.Status === 'Error');
        if (err) throw new Error(err.description || err.Description || 'Error al actualizar');
      }
      if (parsed?.success === false || parsed?.succes === false) {
        throw new Error(parsed?.message || parsed?.Message || 'Error al actualizar');
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        // plain-text response is fine
      } else {
        throw e;
      }
    }
  }
};

const InlineInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: string;
  type?: string;
}> = ({ value, onChange, placeholder, width = 'w-40', type = 'text' }) => (
  <input
    type={type}
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    required
    className={`${width} border-b-2 border-slate-400 focus:border-blue-500 outline-none bg-transparent px-1 text-slate-800 placeholder-slate-300 text-[15px] transition-colors`}
  />
);

const normalizeStudents = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  const d = data as any;
  if (Array.isArray(d.result)) return d.result;
  if (Array.isArray(d.Result)) return d.Result;
  if (Array.isArray(d.data)) return d.data;
  if (Array.isArray(d.Data)) return d.Data;
  // Single student object
  if (d.estudianteId !== undefined || d.EstudianteId !== undefined || d.id !== undefined || d.Id !== undefined) {
    return [d];
  }
  return [];
};

const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-slate-100 flex items-start justify-center py-10 px-4">
    <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl p-10 border border-slate-200">
      <div className="text-center mb-8 border-b border-slate-200 pb-6">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">
          Orquesta Escuela Juvenil de San Telmo
        </p>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          AUTORIZACIÓN DE RETIRO
        </h1>
      </div>
      {children}
    </div>
  </div>
);

const AutoretiroConsent: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Search phase
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [resolvedId, setResolvedId] = useState<string | undefined>(id);

  // Form state
  const [parentNombre, setParentNombre] = useState('');
  const [parentDni, setParentDni] = useState('');
  const [studentNombre, setStudentNombre] = useState('');
  const [studentDniInput, setStudentDniInput] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);

    const isNumeric = /^\d+$/.test(q);

    try {
      let data: any;
      if (isNumeric) {
        // Search by DNI: pass space as nombre placeholder
        data = await fetchJson(
          `/estudianteNombreYDni/${encodeURIComponent(' ')}/${encodeURIComponent(q)}`
        );
      } else {
        // Search by name: pass space as documento placeholder
        data = await fetchJson(
          `/estudianteNombreYDni/${encodeURIComponent(q)}/${encodeURIComponent(' ')}`
        );
      }

      const results = normalizeStudents(data);

      if (results.length === 0) {
        setSearchError('No se encontró ningún alumno/a con esos datos. Verificá el DNI o nombre ingresado.');
      } else if (results.length === 1) {
        selectStudent(results[0]);
      } else {
        setSearchResults(results);
      }
    } catch (err: any) {
      setSearchError(err?.message || 'No se pudo realizar la búsqueda. Intentá nuevamente.');
    } finally {
      setSearchLoading(false);
    }
  };

  const selectStudent = (s: any) => {
    const sid = String(s.estudianteId ?? s.EstudianteId ?? s.id ?? s.Id ?? '');
    const nombre = s.nombre ?? s.Nombre ?? '';
    const apellido = s.apellido ?? s.Apellido ?? '';
    setResolvedId(sid);
    setStudentNombre(`${nombre} ${apellido}`.trim());
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!parentNombre.trim() || !parentDni.trim()) {
      setError('Completá tu nombre completo y DNI.');
      return;
    }
    if (!studentNombre.trim() || !studentDniInput.trim()) {
      setError('Completá el nombre y DNI del alumno/a.');
      return;
    }

    setLoading(true);
    try {
      const data = await fetchJson(`/estudiante/${resolvedId}`);
      const student = data?.Estudiante ?? data?.estudiante ?? data?.result ?? data?.Result ?? data;
      const expectedDni = (student?.Documento ?? student?.documento ?? student?.dni ?? '').trim();

      if (!expectedDni || studentDniInput.trim() !== expectedDni) {
        setError('El DNI del alumno/a no coincide con el registrado en el sistema. Verificá los datos ingresados.');
        setLoading(false);
        return;
      }

      await putJson(`/estudiante/update/${resolvedId}`, { autoretiro: true });

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'No se pudo registrar la autorización. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Search phase: shown when no student is resolved yet
  if (!resolvedId) {
    return (
      <PageShell>
        <p className="text-slate-600 text-sm mb-6 text-center">
          Buscá al alumno/a por su <strong>DNI</strong> o <strong>nombre</strong> para continuar con la autorización.
        </p>

        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="DNI o nombre del alumno/a"
            className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
          />
          <button
            type="submit"
            disabled={searchLoading || !searchQuery.trim()}
            className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed text-sm whitespace-nowrap"
          >
            {searchLoading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {searchError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl font-medium">
            {searchError}
          </div>
        )}

        {searchResults.length > 1 && (
          <div className="mt-6 space-y-2">
            <p className="text-sm text-slate-500 font-medium mb-3">Se encontraron varios resultados. Seleccioná al alumno/a:</p>
            {searchResults.map((s, i) => {
              const nombre = s.nombre ?? s.Nombre ?? '';
              const apellido = s.apellido ?? s.Apellido ?? '';
              const doc = s.documento ?? s.Documento ?? s.dni ?? s.DNI ?? '';
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectStudent(s)}
                  className="w-full text-left px-4 py-3 border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition text-sm"
                >
                  <span className="font-semibold text-slate-800">{`${nombre} ${apellido}`.trim()}</span>
                  {doc && <span className="text-slate-400 ml-3 text-xs">DNI {doc}</span>}
                </button>
              );
            })}
          </div>
        )}
      </PageShell>
    );
  }

  // Consent form
  return (
    <PageShell>
      {!id && (
        <button
          type="button"
          onClick={() => { setResolvedId(undefined); setStudentNombre(''); setStudentDniInput(''); setError(null); }}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition mb-6"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a la búsqueda
        </button>
      )}

      {success ? (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-8 text-center">
          <div className="text-5xl mb-3">✓</div>
          <p className="font-black text-xl">¡Autorización registrada!</p>
          <p className="mt-2 text-sm text-green-600">
            El autoretiro de <strong>{studentNombre}</strong> fue habilitado correctamente.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="text-slate-700 leading-[2.2] text-[15px] space-y-5">
            <p>
              Por medio de la presente, yo,{' '}
              <InlineInput
                placeholder="Nombre y Apellido del padre/madre/tutor"
                value={parentNombre}
                onChange={setParentNombre}
                width="w-72"
              />
              ,{' '}DNI{' '}
              <InlineInput
                placeholder="DNI"
                value={parentDni}
                onChange={setParentDni}
                width="w-32"
              />
              ,{' '}en carácter de madre/padre/tutor/a de{' '}
              <InlineInput
                placeholder="Nombre y Apellido del alumno/a"
                value={studentNombre}
                onChange={setStudentNombre}
                width="w-56"
              />
              ,{' '}DNI{' '}
              <InlineInput
                placeholder="DNI del alumno/a"
                value={studentDniInput}
                onChange={setStudentDniInput}
                width="w-32"
              />
              ,{' '}autorizo a mi hijo/a a retirarse por sus propios medios del establecimiento
              donde funciona la <strong>Orquesta Escuela Juvenil de San Telmo</strong>, sito en{' '}
              <strong>Venezuela 340/330, Ciudad Autónoma de Buenos Aires</strong>.
            </p>

            <p>
              Declaro asumir plena responsabilidad por el traslado y seguridad de mi hijo/a
              una vez finalizadas las actividades, desligando a la institución y a su personal
              de toda responsabilidad a partir de su egreso del establecimiento.
            </p>

            <p>
              La presente autorización tiene validez desde el día{' '}
              <InlineInput
                type="date"
                value={date}
                onChange={setDate}
                width="w-44"
              />
              .
            </p>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-8 w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Validando y guardando...' : 'Confirmar Autorización'}
          </button>
        </form>
      )}
    </PageShell>
  );
};

export default AutoretiroConsent;
