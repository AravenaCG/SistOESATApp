import React, { useState, useEffect, useRef } from 'react';
import { authService, dataService } from '../services/api';
import PublicLayout from './PublicLayout';
import { getInstrumentName } from '../constants';

const RegistrationForm: React.FC = () => {
  const submitLockRef = useRef(false);
  // Step Control: 'auth' | 'form'
  const [step, setStep] = useState<'auth' | 'form'>('auth');
  
  // Auth State
  const [authCreds, setAuthCreds] = useState({ email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);
  
  // Form State
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uiMessage, setUiMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);
  
  // State matches the required Payload structure strictly
  const [formData, setFormData] = useState({
    estudianteId: '',
    nombre: '',
    apellido: '',
    dni: '',
    fechaNacimiento: '',
    domicilio: '',
    nacionalidad: 'AR',
    celular: '',
    email: '',
    esMenor: false,
    
    // Parents
    nombreTutor1: '',
    dniTutor1: '',
    celularTutor1: '',
    nombreTutor2: '',
    dniTutor2: '',
    celularTutor2: '',
    
    // Academic
    orquesta: '', // inicial, juvenil, pre-orquesta
    instrumentoId: 0,
    profesorId: '',
    
    // Health
    bajoTratamiento: false,
    tratamientoDetalle: '',
    episodiosPsicomotrices: false,
    episodiosDetalle: '',
    particularidadFisica: false,
    particularidadDetalle: '',
    
    // Legal
    autorizaRetiro: false,
    cesionImagen: false
  });

  // Dependencies Logic
  useEffect(() => {
    // If not minor, clear parent data
    if (!formData.esMenor) {
      setFormData(prev => ({
        ...prev,
        nombreTutor1: '', dniTutor1: '', celularTutor1: '',
        nombreTutor2: '', dniTutor2: '', celularTutor2: ''
      }));
    }
  }, [formData.esMenor]);

  useEffect(() => {
    // If instrument is not Violin (1), clear teacher (only Violin has teacher assignment in form logic)
    if (Number(formData.instrumentoId) !== 1) {
      setFormData(prev => ({ ...prev, profesorId: '' }));
    }
  }, [formData.instrumentoId]);

  // Auth Handlers
  const handleAuthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAuthCreds(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setUiMessage(null);
    setAuthLoading(true);
    try {
      await authService.login(authCreds.email, authCreds.password);
      setStep('form');
    } catch (error: any) {
      setUiMessage({ type: 'error', text: error.message || 'Credenciales inválidas. Intente nuevamente.' });
    } finally {
      setAuthLoading(false);
    }
  };

  // Form Handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'radio') {
       // Handle boolean radios for health
       if (value === 'si' || value === 'no') {
         setFormData(prev => ({ ...prev, [name]: value === 'si' }));
       } else {
         setFormData(prev => ({ ...prev, [name]: value }));
       }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;

    if (Number(formData.instrumentoId) === 1 && !formData.profesorId) {
      setUiMessage({ type: 'error', text: 'Para Violín debe seleccionar un curso de profesor (Violin Pablo, Violin Tamara o Violin Carolina).' });
      return;
    }

    submitLockRef.current = true;
    setLoading(true);
    setUiMessage(null);

    const instrumentoId = Number(formData.instrumentoId);
    const tmtMedico = formData.bajoTratamiento ? (formData.tratamientoDetalle || '') : '';
    const epPsicoMotriz = formData.episodiosPsicomotrices ? (formData.episodiosDetalle || '') : '';
    const particularidad = formData.particularidadFisica ? (formData.particularidadDetalle || '') : '';

    // Payload - EXACTO según documentación del backend
    const payload = {
      nombre: formData.nombre,
      apellido: formData.apellido,
      documento: formData.dni,
      fechaNacimiento: formData.fechaNacimiento,
      direccion: formData.domicilio,
      nacionalidad: formData.nacionalidad,
      telefono: formData.celular,
      email: formData.email,
      nombreTutor: formData.nombreTutor1,
      documentoTutor: formData.dniTutor1,
      nombreTutor2: formData.nombreTutor2,
      documentoTutor2: formData.dniTutor2,
      telefonoTutor: formData.celularTutor1,
      telefonoTutor2: formData.celularTutor2,
      instrumentoId: instrumentoId > 0 ? instrumentoId : null,
      activo: true,
      asegurado: false,
      'tmtMédico': tmtMedico || null,
      epPsicoMotriz: epPsicoMotriz || null,
      particularidad: particularidad || null,
      autoretiro: formData.autorizaRetiro,
      rutaFoto: null
    };

    try {
      const saveResponse = await dataService.request('/estudiante/save', 'POST', payload);
      // Backend sometimes returns EstudianteId (PascalCase) and sometimes estudianteId (camelCase).
      const studentId =
        saveResponse?.Estudiante?.estudianteId ||
        saveResponse?.Estudiante?.EstudianteId ||
        saveResponse?.estudiante?.estudianteId ||
        saveResponse?.estudiante?.EstudianteId;

      if (!studentId) {
        throw new Error('No se pudo obtener el ID del estudiante creado.');
      }

      // Optional course enrollment inferred from orchestra and selected instrument.
      if (formData.orquesta || instrumentoId > 0) {
        try {
          const normalize = (value: string) =>
            value
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\s+/g, ' ')
              .trim();

          const getCourseId = (course: any): number => {
            const id = Number(course?.cursoId ?? course?.CursoId ?? course?.id ?? 0);
            return Number.isFinite(id) ? id : 0;
          };

          const findCourseByExactName = (courses: any[], name: string): number => {
            const target = normalize(name);
            const exact = courses.find((c: any) => normalize((c?.nombre || '').toString()) === target);
            return exact ? getCourseId(exact) : 0;
          };

          const findCourseByKeyword = (courses: any[], keyword: string): number => {
            const target = normalize(keyword);
            const found = courses.find((c: any) => normalize((c?.nombre || '').toString()).includes(target));
            return found ? getCourseId(found) : 0;
          };

          const courses = await dataService.request('/cursos', 'GET');
          const wrapped = courses as any;
          const list = Array.isArray(courses)
            ? courses
            : (Array.isArray(wrapped?.value)
                ? wrapped.value
                : (Array.isArray(wrapped?.result)
                    ? wrapped.result
                    : []));

          const targetCourseIds = new Set<number>();

          // 1) Enrollment by orchestra selection (inicial, juvenil, pre-orquesta)
          if (formData.orquesta) {
            const orchestraToCourseName: Record<string, string> = {
              'inicial': 'Orquesta Inicial',
              'juvenil': 'Orquesta Juvenil',
              'pre-orquesta': 'Pre-Orquesta'
            };
            const orchestraName = orchestraToCourseName[formData.orquesta];
            if (orchestraName) {
              const byExact = findCourseByExactName(list, orchestraName);
              const byKeyword = findCourseByKeyword(list, formData.orquesta);
              const cursoId = byExact || byKeyword;
              if (cursoId > 0) targetCourseIds.add(cursoId);
            }
          }

          // 2) Enrollment by instrument selection (with professor if applicable)
          if (instrumentoId > 0) {
            const instrumentName = getInstrumentName(instrumentoId);
            
            // If a professor course is selected (only for Violin), search for it directly by name
            if (formData.profesorId && instrumentoId === 1) {
              const professorCourseId = findCourseByExactName(list, formData.profesorId) || findCourseByKeyword(list, formData.profesorId);
              if (professorCourseId > 0) targetCourseIds.add(professorCourseId);
            } else {
              // If no professor selected, search for instrument course only
              const instrumentCourseId = findCourseByExactName(list, instrumentName) || findCourseByKeyword(list, instrumentName);
              if (instrumentCourseId > 0) targetCourseIds.add(instrumentCourseId);
            }
          }

          // Enroll in all target courses using the studentId from backend response.
          // Do not abort all enrollments if one course fails.
          for (const cursoId of targetCourseIds) {
            try {
              await dataService.darDeAltaEnCurso(studentId, cursoId);
            } catch (singleEnrollError) {
              console.warn(`No se pudo dar de alta al curso ${cursoId}:`, singleEnrollError);
            }
          }
        } catch (enrollError) {
          console.warn('Estudiante guardado, pero no se pudo asignar curso automaticamente:', enrollError);
        }
      }
      
      setSuccess(true);
      setUiMessage({ type: 'success', text: 'Estudiante registrado correctamente.' });
    } catch (error: any) {
      console.error(error);

      const extractBackendMessage = (raw: string): string | null => {
        if (!raw) return null;

        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed?.messages) && parsed.messages.length > 0) {
            const first = parsed.messages[0];
            return first?.help || first?.text || null;
          }
          return parsed?.message || null;
        } catch {
          // Fallback for non-JSON strings coming from backend logs/text.
          const helpMatch = raw.match(/"help"\s*:\s*"([^"]+)"/i) || raw.match(/'help'\s*:\s*'([^']+)'/i);
          if (helpMatch?.[1]) return helpMatch[1];

          // Avoid dumping a full payload JSON in the UI.
          if (raw.includes('Estudiante') && raw.includes('messages')) {
            return 'Ocurrió un error al registrar. Revise los datos e intente nuevamente.';
          }
          return null;
        }
      };

      const rawError = error?.message || String(error) || '';
      const backendMsg = extractBackendMessage(rawError);
      const fallbackMsg = 'Hubo un error al registrar. Intente nuevamente.';
      setUiMessage({ type: 'error', text: backendMsg || fallbackMsg });
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  };

  // --- RENDER: SUCCESS SCREEN ---
  if (success) {
    return (
      <PublicLayout>
        <div className="w-full max-w-2xl bg-white rounded-2xl p-12 text-center shadow-2xl">
          <div className="size-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl">check</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">¡Registro Exitoso!</h2>
          <p className="text-slate-500 mb-8">La inscripción se ha procesado correctamente.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition"
          >
            Nueva Inscripción
          </button>
        </div>
      </PublicLayout>
    );
  }

  // --- RENDER: AUTH SCREEN ---
  if (step === 'auth') {
    return (
      <PublicLayout>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8">
           <div className="text-center mb-6">
              <div className="size-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <span className="material-symbols-outlined text-3xl">lock</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Acceso Requerido</h2>
              <p className="text-slate-500 text-sm mt-2">Debe autenticarse para registrar nuevos estudiantes.</p>
           </div>

           {uiMessage && (
            <div className={`p-4 mb-6 rounded-lg text-sm border flex items-start gap-2 ${uiMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
               <span className="material-symbols-outlined text-base mt-0.5">
                  {uiMessage.type === 'error' ? 'error' : 'check_circle'}
               </span>
               <span>{uiMessage.text}</span>
            </div>
          )}

           <form onSubmit={handleLogin} className="space-y-4">
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Usuario / Email</label>
                 <input 
                    name="email"
                    type="text"
                    required
                    value={authCreds.email}
                    onChange={handleAuthChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="admin@orquesta.com"
                 />
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                 <input 
                    name="password"
                    type="password"
                    required
                    value={authCreds.password}
                    onChange={handleAuthChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="••••••••"
                 />
              </div>
              <button 
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {authLoading ? 'Verificando...' : 'Ingresar'}
              </button>
           </form>
        </div>
      </PublicLayout>
    );
  }

  // --- RENDER: REGISTRATION FORM ---
  
  // UPDATED: Pre-Orquesta does not allow instrument selection
  const showInstrument = formData.orquesta === 'inicial' || formData.orquesta === 'juvenil';
  const showProfessor = Number(formData.instrumentoId) === 1; // Only Violin

  return (
    <PublicLayout>
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-500">
        <div className="bg-blue-600 p-8 text-white">
          <h1 className="text-3xl font-bold">Ficha de Inscripción 2024</h1>
          <p className="opacity-80 mt-2">Complete todos los datos requeridos.</p>
        </div>
        
        {uiMessage && (
            <div className={`mx-8 mt-8 p-4 rounded-xl border flex items-center gap-3 ${uiMessage.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
               <div className={`p-2 rounded-full ${uiMessage.type === 'error' ? 'bg-red-100' : 'bg-green-100'}`}>
                 <span className="material-symbols-outlined text-xl">
                    {uiMessage.type === 'error' ? 'error' : 'check'}
                 </span>
               </div>
               <div>
                  <h4 className="font-bold">{uiMessage.type === 'error' ? 'Ocurrió un error' : 'Éxito'}</h4>
                  <p className="text-sm">{uiMessage.text}</p>
               </div>
            </div>
        )}

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Section 1: Personal Data */}
          <section className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined">person</span> Datos Personales
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">¿Es menor de edad?</label>
                <input 
                  type="checkbox" 
                  name="esMenor" 
                  checked={formData.esMenor} 
                  onChange={handleChange} 
                  className="size-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="nombre" placeholder="Nombres" required className="input-std" onChange={handleChange} />
              <input name="apellido" placeholder="Apellidos" required className="input-std" onChange={handleChange} />
              <input name="dni" placeholder="DNI / Pasaporte" required className="input-std" onChange={handleChange} />
              <input name="fechaNacimiento" type="date" required className="input-std" onChange={handleChange} />
              <input name="domicilio" placeholder="Domicilio Completo" required className="input-std md:col-span-2" onChange={handleChange} />
              <select name="nacionalidad" className="input-std" onChange={handleChange} value={formData.nacionalidad}>
                <option value="AR">Argentina</option>
                <option value="UY">Uruguaya</option>
                <option value="BR">Brasileña</option>
                <option value="CL">Chilena</option>
                <option value="OTRO">Otra</option>
              </select>
              <input name="celular" placeholder="Celular" required className="input-std" onChange={handleChange} />
              <input name="email" type="email" placeholder="Email" required className="input-std md:col-span-2" onChange={handleChange} />
            </div>
          </section>

          {/* Section 2: Parents (Conditional) */}
          {formData.esMenor && (
            <section className="space-y-4 bg-purple-50 p-6 rounded-xl border border-purple-100">
              <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2">
                <span className="material-symbols-outlined">family_restroom</span> Datos de Tutores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-purple-800">Tutor 1</h4>
                  <input name="nombreTutor1" placeholder="Nombre Completo" required className="input-std" onChange={handleChange} />
                  <input name="dniTutor1" placeholder="DNI" required className="input-std" onChange={handleChange} />
                  <input name="celularTutor1" placeholder="Celular" required className="input-std" onChange={handleChange} />
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-purple-800">Tutor 2 (Opcional)</h4>
                  <input name="nombreTutor2" placeholder="Nombre Completo" className="input-std" onChange={handleChange} />
                  <input name="dniTutor2" placeholder="DNI" className="input-std" onChange={handleChange} />
                  <input name="celularTutor2" placeholder="Celular" className="input-std" onChange={handleChange} />
                </div>
              </div>
            </section>
          )}

          {/* Section 3: Academic */}
          <section className="space-y-4">
             <div className="border-b pb-2">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined">school</span> Académica
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select name="orquesta" className="input-std" required onChange={handleChange} value={formData.orquesta}>
                <option value="">Seleccionar Orquesta</option>
                <option value="inicial">Orquesta Inicial</option>
                <option value="juvenil">Orquesta Juvenil</option>
                <option value="pre-orquesta">Pre-Orquesta</option>
              </select>

              <select 
                name="instrumentoId" 
                className="input-std" 
                disabled={!showInstrument}
                required={showInstrument}
                onChange={handleChange}
                value={formData.instrumentoId}
              >
                <option value="0">Seleccionar Instrumento</option>
                <option value="1">Violín</option>
                <option value="2">Flauta</option>
                <option value="3">Trompeta</option>
                <option value="4">Violoncello</option>
                <option value="5">Contrabajo</option>
                <option value="6">Viola</option>
                <option value="7">Guitarra</option>
                <option value="8">Percusión</option>
                <option value="9">Clarinete</option>
                <option value="10">Bandoneón</option>
              </select>

              <select 
                name="profesorId" 
                className="input-std"
                disabled={!showProfessor}
                required={showProfessor}
                onChange={handleChange}
                value={formData.profesorId}
              >
                <option value="">Profesor (Solo Violín)</option>
                <option value="Violin Pablo">Violin Pablo</option>
                <option value="Violin Tamara">Violin Tamara</option>
                <option value="Violin Carolina">Violin Carolina</option>
              </select>
            </div>
          </section>

          {/* Section 4: Health */}
          <section className="space-y-6">
             <div className="border-b pb-2">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined">medical_services</span> Salud
              </h3>
            </div>
            
            {/* Tratamiento */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">¿Está bajo tratamiento médico?</span>
                <div className="flex gap-4">
                  <label className="flex gap-2"><input type="radio" name="bajoTratamiento" value="si" onChange={handleChange} /> SI</label>
                  <label className="flex gap-2"><input type="radio" name="bajoTratamiento" value="no" defaultChecked onChange={handleChange} /> NO</label>
                </div>
              </div>
              {formData.bajoTratamiento && (
                <input name="tratamientoDetalle" placeholder="Especifique cuál..." required className="input-std w-full" onChange={handleChange} />
              )}
            </div>

             {/* Psicomotriz */}
             <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">¿Episodios psicomotrices?</span>
                <div className="flex gap-4">
                  <label className="flex gap-2"><input type="radio" name="episodiosPsicomotrices" value="si" onChange={handleChange} /> SI</label>
                  <label className="flex gap-2"><input type="radio" name="episodiosPsicomotrices" value="no" defaultChecked onChange={handleChange} /> NO</label>
                </div>
              </div>
              {formData.episodiosPsicomotrices && (
                <input name="episodiosDetalle" placeholder="Detalle..." required className="input-std w-full" onChange={handleChange} />
              )}
            </div>

            {/* Particularidad */}
             <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">¿Particularidad Física/Alimentaria?</span>
                <div className="flex gap-4">
                  <label className="flex gap-2"><input type="radio" name="particularidadFisica" value="si" onChange={handleChange} /> SI</label>
                  <label className="flex gap-2"><input type="radio" name="particularidadFisica" value="no" defaultChecked onChange={handleChange} /> NO</label>
                </div>
              </div>
              {formData.particularidadFisica && (
                <input name="particularidadDetalle" placeholder="Detalle..." required className="input-std w-full" onChange={handleChange} />
              )}
            </div>
          </section>

          {/* Section 5: Legal */}
          <section className="bg-blue-50 p-6 rounded-xl border border-blue-100 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="autorizaRetiro" onChange={handleChange} className="mt-1 size-5 rounded text-blue-600 focus:ring-blue-500" />
              <span className="text-sm">Autorizo al estudiante a retirarse solo de la institución (Si es menor).</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="cesionImagen" required onChange={handleChange} className="mt-1 size-5 rounded text-blue-600 focus:ring-blue-500" />
              <span className="text-sm font-bold text-slate-800">CESIÓN DE DERECHOS: Declaro que la información es verídica y autorizo el uso de la imagen del estudiante para fines institucionales.</span>
            </label>
          </section>

          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              disabled={loading || !formData.cesionImagen}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
            >
              {loading && <span className="material-symbols-outlined animate-spin">progress_activity</span>}
              Registrar Estudiante
            </button>
          </div>

        </form>
      </div>
      <style>{`
        .input-std {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          outline: none;
          transition: all 0.2s;
        }
        .input-std:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .input-std:disabled {
          background-color: #f1f5f9;
          cursor: not-allowed;
        }
      `}</style>
    </PublicLayout>
  );
};

export default RegistrationForm;