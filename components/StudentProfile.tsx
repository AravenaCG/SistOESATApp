import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { dataService } from '../services/api';
import { Student, InstrumentLoan } from '../types';
import { getInstrumentName } from '../constants';
import Layout from './Layout';
import { Guitar, ArrowRightLeft, Check, AlertCircle } from 'lucide-react';

const StudentProfile: React.FC = () => {
  const { id } = useParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Loan State
  const [loanCode, setLoanCode] = useState('');
  const [processingLoan, setProcessingLoan] = useState(false);

  const fetchStudentAndCourses = async () => {
      try {
        setLoading(true);
        
        // Parallel fetch for student details and their courses to ensure we have all data
        const [studentData, coursesData] = await Promise.all([
            dataService.request(`/estudiante/${id}`),
            dataService.request(`/cursosByEstudiante/${id}`).catch(() => []) // Fallback to empty if 404/error
        ]);
        
        // Merge courses into student object
        // The API might return courses in the main object, or separate. We prioritize the explicit list if available.
        // We also handle potential casing differences in the API response (Cursos vs cursos)
        const courses = Array.isArray(coursesData) ? coursesData : (studentData.cursos || studentData.Cursos || []);
        
        setStudent({
            ...studentData,
            cursos: courses
        });

      } catch (error) {
        console.error(error);
        alert('Error al cargar perfil del estudiante');
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    if (id) fetchStudentAndCourses();
  }, [id]);

  // Handle Lend Instrument (Mocking API Call)
  const handleLendInstrument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanCode.trim()) return;
    
    if(!confirm(`¿Confirma el préstamo del instrumento ${loanCode} a este estudiante?`)) return;

    setProcessingLoan(true);
    try {
      // Simulation of POST /prestamos
      await new Promise(resolve => setTimeout(resolve, 800)); // Network delay
      
      const newLoan: InstrumentLoan = {
          prestamoInstrumentoId: Math.random().toString(),
          fechaPrestamo: new Date().toISOString(),
          fechaDevolucion: null,
          instrumentoId: loanCode,
          detalleInstrumento: 'Asignado recientemente'
      };
      
      if (student) {
          const updatedLoans = [...(student.prestamosInstrumentos || []), newLoan];
          setStudent({ ...student, prestamosInstrumentos: updatedLoans });
      }
      
      setLoanCode('');
      alert('Instrumento prestado correctamente');
    } catch (e) {
      alert('Error al procesar el préstamo');
    } finally {
      setProcessingLoan(false);
    }
  };

  // Handle Return Instrument
  const handleReturnInstrument = async (loanId: string, instrumentCode: string) => {
     if(!confirm(`¿Confirma la devolución del instrumento ${instrumentCode}?`)) return;
     
     setProcessingLoan(true);
     try {
        // Simulation of PUT /prestamos/devolucion
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if (student && student.prestamosInstrumentos) {
            const updatedLoans = student.prestamosInstrumentos.map(loan => {
                if (loan.prestamoInstrumentoId === loanId) {
                    return { ...loan, fechaDevolucion: new Date().toISOString() };
                }
                return loan;
            });
            setStudent({ ...student, prestamosInstrumentos: updatedLoans });
        }
        alert('Instrumento devuelto correctamente');
     } catch (e) {
         alert('Error al procesar la devolución');
     } finally {
         setProcessingLoan(false);
     }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!student) return <Layout><div className="p-8">Estudiante no encontrado</div></Layout>;

  // Data Normalization Logic
  const getPhoneNumber = () => {
    if (student.telefono && student.telefono.length > 4) return student.telefono;
    if (student.telefonoTutor && student.telefonoTutor.length > 4) return `${student.telefonoTutor} (Tutor 1)`;
    if (student.telefonoTutor2 && student.telefonoTutor2.length > 4) return `${student.telefonoTutor2} (Tutor 2)`;
    return 'Sin contacto';
  };

  // Safe access to courses array with strict typing
  const studentCourses: any[] = student.cursos || (student as any).Cursos || [];

  const getOrquestaLabel = () => {
     // 1. Check explicit field 'orquesta'
     if (student.orquesta && student.orquesta.trim().length > 0) return student.orquesta;
     
     // 2. Check within courses for specific keywords
     if (studentCourses.length > 0) {
        // Priority 1: Course with "Orquesta"
        const orquestaCourse = studentCourses.find((c: any) => {
           const name = (c.nombre || c.Nombre || '').toLowerCase();
           return name.includes('orquesta');
        });
        if (orquestaCourse) return orquestaCourse.nombre || orquestaCourse.Nombre;

        // Priority 2: Course with "Coro"
        const coroCourse = studentCourses.find((c: any) => {
           const name = (c.nombre || c.Nombre || '').toLowerCase();
           return name.includes('coro');
        });
        if (coroCourse) return coroCourse.nombre || coroCourse.Nombre;

        // Priority 3: First available course
        const first = studentCourses[0];
        return first.nombre || first.Nombre;
     }
     
     return 'Sin Asignar';
  };

  const currentOrquestaLabel = getOrquestaLabel();

  // Find active loan (where fechaDevolucion is null)
  const loans = student.prestamosInstrumentos || [];
  const activeLoan = loans.find(l => !l.fechaDevolucion);
  
  // If no structured loan, but we have a legacy string identifier
  const legacyInstrument = !activeLoan && student.instrumento ? student.instrumento : null;

  return (
    <Layout>
      {/* Container with dark mode forced for the inner content to match design */}
      <div className="font-display text-slate-900 dark:text-white dark bg-[#101622] min-h-full rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Top Header / Breadcrumbs */}
        <header className="h-16 border-b border-border-dark bg-[#111722]/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-sm">
                <Link to="/dashboard" className="text-[#92a4c9] hover:text-white transition-colors">Estudiantes</Link>
                <span className="text-[#92a4c9] material-symbols-outlined text-[12px]">arrow_forward_ios</span>
                <span className="text-white font-medium">Perfil</span>
             </div>
          </div>
          <div className="flex items-center gap-6">
             <button className="relative text-[#92a4c9] hover:text-white transition-colors">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-0 right-0 size-2 bg-red-500 rounded-full border-2 border-[#111722]"></span>
             </button>
             <div className="size-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs border border-border-dark">
                Admin
             </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="p-4 md:p-8 lg:px-12 pb-20 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
            
            {/* Hero Profile Section */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-card-dark border border-border-dark shadow-xl">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-background-dark/0"></div>
              <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start md:items-end">
                <div className="relative group">
                  {student.rutaFoto ? (
                     <div 
                        className="size-32 md:size-40 rounded-full border-4 border-[#111722] shadow-2xl bg-cover bg-center" 
                        style={{backgroundImage: `url(${student.rutaFoto})`}}
                     />
                  ) : (
                    <div className="size-32 md:size-40 rounded-full border-4 border-[#111722] shadow-2xl bg-[#232f48] flex items-center justify-center text-5xl font-bold text-[#92a4c9] uppercase">
                        {(student.nombre || '?')[0]}{(student.apellido || '?')[0]}
                    </div>
                  )}
                  
                  <button className="absolute bottom-2 right-2 bg-primary text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600">
                     <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                </div>
                
                <div className="flex-1 flex flex-col gap-2 mb-2">
                   <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{student.nombre} {student.apellido}</h1>
                      <span className="bg-primary/20 text-blue-300 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider border border-primary/30">
                        {currentOrquestaLabel}
                      </span>
                   </div>
                   <div className="flex items-center gap-4 text-[#92a4c9]">
                      <div className="flex items-center gap-1">
                         <span className="material-symbols-outlined text-sm">music_note</span>
                         <span>{getInstrumentName(student.instrumentoId)}</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-[#92a4c9]"></div>
                      <div className="flex items-center gap-1">
                         <span className="material-symbols-outlined text-sm">school</span>
                         <span>Ciclo 2024</span>
                      </div>
                   </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                   <button className="flex-1 md:flex-none h-10 px-5 bg-[#232f48] hover:bg-[#2c3b59] text-white text-sm font-semibold rounded-lg transition-colors border border-white/5">
                      Contactar
                   </button>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-[#232f48] transition-colors cursor-pointer group">
                 <span className="text-[#92a4c9] text-sm font-medium">Asistencia</span>
                 <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white group-hover:text-primary transition-colors">--</span>
                    <span className="text-sm text-primary font-bold">%</span>
                 </div>
              </div>
              <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-[#232f48] transition-colors cursor-pointer group">
                 <span className="text-[#92a4c9] text-sm font-medium">Conciertos</span>
                 <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white group-hover:text-purple-400 transition-colors">0</span>
                 </div>
              </div>
              <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-[#232f48] transition-colors cursor-pointer group">
                 <span className="text-[#92a4c9] text-sm font-medium">Estado</span>
                 <div className="flex items-baseline gap-1">
                    <span 
                      className={`text-lg font-bold group-hover:opacity-80 transition-colors ${student.activo ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {student.activo ? 'Activo' : 'Inactivo'}
                    </span>
                 </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (Info) */}
              <div className="flex flex-col gap-6 lg:col-span-1">
                 {/* Personal Info */}
                 <div className="bg-card-dark border border-border-dark rounded-xl p-5 flex flex-col gap-4">
                    <h3 className="text-white font-bold text-lg">Información Personal</h3>
                    <div className="flex flex-col gap-3">
                       <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-[#232f48] flex items-center justify-center text-[#92a4c9]">
                             <span className="material-symbols-outlined text-sm">badge</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[10px] text-[#92a4c9] uppercase font-bold tracking-wider">Documento</span>
                             <span className="text-white text-sm">{student.documento || student.dni}</span>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-[#232f48] flex items-center justify-center text-[#92a4c9]">
                             <span className="material-symbols-outlined text-sm">mail</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[10px] text-[#92a4c9] uppercase font-bold tracking-wider">Email</span>
                             <span className="text-white text-sm break-all">{student.email}</span>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-[#232f48] flex items-center justify-center text-[#92a4c9]">
                             <span className="material-symbols-outlined text-sm">call</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[10px] text-[#92a4c9] uppercase font-bold tracking-wider">Teléfono</span>
                             <span className="text-white text-sm">{getPhoneNumber()}</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Right Column (Instrument & Courses) */}
              <div className="flex flex-col gap-6 lg:col-span-2">
                 
                 {/* INSTRUMENT LOAN SECTION */}
                 <div className="bg-card-dark border border-border-dark rounded-xl p-6">
                     <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                        <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg">
                           <Guitar size={24} />
                        </div>
                        <div>
                           <h3 className="text-white font-bold text-lg">Préstamo de Instrumento</h3>
                           <p className="text-[#92a4c9] text-xs">Gestión de inventario asignado</p>
                        </div>
                     </div>

                     {activeLoan ? (
                        /* Case 1: Has Active Loan */
                        <div className="bg-[#232f48] rounded-xl p-5 border border-orange-500/30 relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-2 bg-orange-500 text-[#101622] font-bold text-[10px] rounded-bl-xl uppercase tracking-wider">
                              En Préstamo
                           </div>
                           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div>
                                 <span className="text-[#92a4c9] text-xs font-bold uppercase tracking-wider block mb-1">Código Instrumento</span>
                                 <div className="text-2xl font-mono font-bold text-white mb-1">{activeLoan.instrumentoId}</div>
                                 <div className="flex items-center gap-2 text-xs text-[#92a4c9]">
                                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                                    Prestado el: {new Date(activeLoan.fechaPrestamo).toLocaleDateString()}
                                 </div>
                                 {activeLoan.detalleInstrumento && (
                                     <div className="mt-2 text-xs text-blue-300 bg-blue-500/10 px-2 py-1 rounded inline-block">
                                        {activeLoan.detalleInstrumento}
                                     </div>
                                 )}
                              </div>
                              <button 
                                onClick={() => handleReturnInstrument(activeLoan.prestamoInstrumentoId, activeLoan.instrumentoId)}
                                disabled={processingLoan}
                                className="w-full sm:w-auto px-5 py-3 bg-white text-slate-900 font-bold rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                {processingLoan ? 'Procesando...' : (
                                   <>
                                     <ArrowRightLeft size={18} /> Devolver Instrumento
                                   </>
                                )}
                              </button>
                           </div>
                        </div>
                     ) : legacyInstrument ? (
                        /* Case 2: Legacy String Instrument (Read Only View) */
                         <div className="bg-[#232f48] rounded-xl p-5 border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                               <AlertCircle className="text-yellow-500" size={20} />
                               <h4 className="text-white font-bold">Instrumento Asignado (Legado)</h4>
                            </div>
                            <p className="text-[#92a4c9] text-sm mb-4">
                               Identificador: <span className="font-mono text-white bg-white/10 px-2 py-0.5 rounded">{legacyInstrument}</span>
                            </p>
                            <p className="text-xs text-white/40">
                               Nota: Este estudiante tiene un instrumento asignado mediante el sistema antiguo. Para gestionar devoluciones, contacte al administrador de base de datos.
                            </p>
                         </div>
                     ) : (
                        /* Case 3: No Active Loan - Show Lend Form */
                        <div className="bg-[#232f48]/50 rounded-xl p-5 border border-white/5 border-dashed">
                           <h4 className="text-white font-bold mb-3 text-sm">Asignar Nuevo Préstamo</h4>
                           <form onSubmit={handleLendInstrument} className="flex flex-col sm:flex-row gap-3">
                              <input 
                                type="text" 
                                placeholder="Escanee o ingrese código (ej. VIO-01-001)"
                                className="flex-1 bg-[#101622] border border-border-dark text-white px-4 py-2.5 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none font-mono"
                                value={loanCode}
                                onChange={(e) => setLoanCode(e.target.value)}
                              />
                              <button 
                                type="submit"
                                disabled={!loanCode || processingLoan}
                                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {processingLoan ? 'Procesando...' : (
                                    <>
                                        <Check size={18} /> Prestar
                                    </>
                                )}
                              </button>
                           </form>
                        </div>
                     )}
                 </div>

                 {/* Courses / Repertoire */}
                 <div className="bg-card-dark border border-border-dark rounded-xl p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                       <div>
                          <h3 className="text-white font-bold text-xl">Cursos Inscritos</h3>
                       </div>
                    </div>
                    <div className="flex flex-col gap-4">
                       {studentCourses.length > 0 ? (
                         studentCourses.map((curso: any, idx: number) => (
                                <div key={idx} className="group bg-[#232f48]/50 hover:bg-[#232f48] border border-white/5 rounded-xl p-4 transition-all duration-300">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                                <span className="material-symbols-outlined">music_note</span>
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold text-sm md:text-base">{curso.nombre || curso.Nombre}</h4>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold bg-green-500/20 text-green-400 px-2 py-1 rounded block mb-1">INSCRITO</span>
                                    </div>
                                </div>
                         ))
                       ) : (
                         <div className="text-center text-[#92a4c9] py-8">No hay cursos inscritos</div>
                       )}
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default StudentProfile;