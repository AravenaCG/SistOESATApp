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
  const headers: Record<string, string> = {};
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
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `Error ${res.status}`);
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

const AutoretiroConsent: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [parentNombre, setParentNombre] = useState('');
  const [parentDni, setParentDni] = useState('');
  const [studentNombre, setStudentNombre] = useState('');
  const [studentDniInput, setStudentDniInput] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const data = await fetchJson(`/estudiante/${id}`);
      const student = data?.result ?? data?.Result ?? data;
      const expectedDni = (student?.documento || student?.dni || '').trim();

      if (!expectedDni || studentDniInput.trim() !== expectedDni) {
        setError('El DNI del alumno/a no coincide con el registrado en el sistema. Verificá los datos ingresados.');
        setLoading(false);
        return;
      }

      await putJson(`/estudiante/update/${id}`, { autoretiro: 1 });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'No se pudo registrar la autorización. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
      </div>
    </div>
  );
};

export default AutoretiroConsent;
