import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { dataService } from '../services/api';
import Layout from './Layout';

const AutoretiroConsent: React.FC = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [parentNombre, setParentNombre] = useState('');
  const [parentApellido, setParentApellido] = useState('');
  const [parentDni, setParentDni] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!parentNombre.trim() || !parentApellido.trim() || !parentDni.trim()) {
      setError('Debe completar nombre, apellido y DNI del padre/madre/tutor.');
      setLoading(false);
      return;
    }
    try {
      await dataService.request(`/estudiante/${id}/autoretiro`, 'POST', {
        autoretiro: checked,
        parentNombre: parentNombre.trim(),
        parentApellido: parentApellido.trim(),
        parentDni: parentDni.trim(),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar el estado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl p-8 mt-12 border border-slate-200">
        <h1 className="text-2xl font-black text-slate-800 mb-4">Autorización de Autoretiro de Alumno/a – Declaración Jurada</h1>
        <p className="mb-6 text-slate-600 whitespace-pre-line">
          Por medio de la presente, y en carácter de <b>declaración jurada</b>, autorizo a mi hijo/a a retirarse solo/a del establecimiento educativo al finalizar las actividades escolares y/o extracurriculares.\n\n
          Declaro que he sido informado/a sobre los riesgos y responsabilidades que implica esta decisión, y asumo la responsabilidad civil y penal que pudiera derivarse de la misma, eximiendo a la institución y a su personal de toda responsabilidad por los hechos que pudieran ocurrir una vez que mi hijo/a se retire del establecimiento por sus propios medios.\n\n
          Esta autorización se otorga conforme a la normativa vigente en materia de patria potestad y responsabilidad parental (artículos 638 y siguientes del Código Civil y Comercial de la Nación), y podrá ser revocada en cualquier momento por escrito.\n\n
          Declaro que los datos consignados son verídicos y que esta decisión es tomada de manera voluntaria.
        </p>
        {success ? (
          <div className="bg-green-100 text-green-700 rounded-lg p-4 text-center font-bold">
            ¡Estado de autoretiro actualizado correctamente!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-3">
              <input
                id="autoretiro-check"
                type="checkbox"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                className="size-5 accent-blue-600"
                required
              />
              <label htmlFor="autoretiro-check" className="text-slate-700 font-medium">
                Confirmo que autorizo el autoretiro de mi hijo/a y acepto los términos de la declaración jurada.
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="parent-nombre" className="block text-xs font-bold text-slate-600 mb-1">Nombre del padre/madre/tutor</label>
                <input
                  id="parent-nombre"
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  value={parentNombre}
                  onChange={e => setParentNombre(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="parent-apellido" className="block text-xs font-bold text-slate-600 mb-1">Apellido del padre/madre/tutor</label>
                <input
                  id="parent-apellido"
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  value={parentApellido}
                  onChange={e => setParentApellido(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="parent-dni" className="block text-xs font-bold text-slate-600 mb-1">DNI del padre/madre/tutor</label>
                <input
                  id="parent-dni"
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  value={parentDni}
                  onChange={e => setParentDni(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
            </div>
            {error && <div className="text-red-500 text-sm font-bold">{error}</div>}
            <button
              type="submit"
              disabled={loading || !checked}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
            >
              {loading ? 'Guardando...' : 'Actualizar Autorización'}
            </button>
          </form>
        )}
      </div>
    </Layout>
  );
};

export default AutoretiroConsent;
