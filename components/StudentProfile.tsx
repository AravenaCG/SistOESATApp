import { useEffect, useState } from 'react';
import { X as CloseIcon } from 'lucide-react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { dataService, authService } from '../services/api';
import { Student } from '../types';
import { getInstrumentName } from '../constants';
import Layout from './Layout';
import { Guitar, ArrowRightLeft, Check, AlertCircle, QrCode, X, Plus, Trash2 } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const editableFields: Array<{ key: keyof Student; label: string; type?: string; required?: boolean }> = [
  { key: 'nombre', label: 'Nombre', required: true },
  { key: 'apellido', label: 'Apellido', required: true },
  { key: 'fechaNacimiento', label: 'Fecha de nacimiento', type: 'date', required: true },
  { key: 'documento', label: 'Documento', required: true },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'direccion', label: 'Dirección' },
  { key: 'nacionalidad', label: 'Nacionalidad' },
  { key: 'nombreTutor', label: 'Nombre Tutor' },
  { key: 'telefonoTutor', label: 'Teléfono Tutor' },
  { key: 'documentoTutor', label: 'Documento Tutor' },
  { key: 'nombreTutor2', label: 'Nombre Tutor 2' },
  { key: 'telefonoTutor2', label: 'Teléfono Tutor 2' },
  { key: 'documentoTutor2', label: 'Documento Tutor 2' },
  { key: 'tmtMédico', label: 'TMT Médico' },
  { key: 'epPsicoMotriz', label: 'EP PsicoMotriz' },
  { key: 'particularidad', label: 'Particularidad' },
  { key: 'autoretiro', label: 'Autoretiro', type: 'checkbox' },
];

const StudentProfile: React.FC = () => {
    // Edit Modal State (must be inside component)
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Student>>({});
    const [editLoading, setEditLoading] = useState(false);

    // Open edit modal and prefill form
    const openEditModal = () => {
      if (!student) return;
      setEditForm({ ...student });
      setShowEditModal(true);
    };

    // Handle form field changes
    const handleEditChange = (key: keyof Student, value: any) => {
      setEditForm((prev) => ({ ...prev, [key]: value }));
    };

    // Submit edit form
    const handleEditSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!student) return;
      setEditLoading(true);
      try {
        // Only send changed fields (not all fields)
        const payload: Partial<Student> = {};
        editableFields.forEach(({ key }) => {
          if (editForm[key] !== undefined && editForm[key] !== student[key]) {
            (payload as any)[key] = editForm[key];
          }
        });
        await dataService.request(`/estudiante/update/${student.estudianteId}`, 'PUT', payload);
        setShowEditModal(false);
        await fetchStudentData();
        alert('Estudiante actualizado correctamente');
      } catch (error: any) {
        alert(error?.message || 'Error al actualizar el estudiante');
      } finally {
        setEditLoading(false);
      }
    };
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Loan State
  const [availableStock, setAvailableStock] = useState<any[]>([]);
  const [selectedStockId, setSelectedStockId] = useState<string>('');
  const [processingLoan, setProcessingLoan] = useState(false);
  const [studentLoans, setStudentLoans] = useState<any[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [processingCourseChange, setProcessingCourseChange] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState<'lend' | 'return' | null>(null);
  const [, setScannerError] = useState<string | null>(null);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [deleteActionLoading, setDeleteActionLoading] = useState(false);

  const role = authService.getUserRole();
  const isStudent = role === 'student';

  const fetchStudentData = async () => {
      try {
        setLoading(true);
        
        const [studentData, coursesData, loansData, attendanceData, allCoursesData] = await Promise.all([
            dataService.request(`/estudiante/${id}`),
            dataService.request(`/cursosByEstudiante/${id}`).catch(() => []),
          dataService.getPrestamosEstudiante(id!).catch(() => []),
          dataService.getStudentAttendanceHistory(id!).catch(() => []),
          dataService.request('/cursos').catch(() => [])
        ]);
        
        const courses = Array.isArray(coursesData) ? coursesData : (studentData.cursos || studentData.Cursos || []);
        
        setStudent({
            ...studentData,
            cursos: courses
        });
        const rawLoans = Array.isArray(loansData)
          ? loansData
          : (Array.isArray((studentData as any).prestamosInstrumentos) ? (studentData as any).prestamosInstrumentos : []);

        const normalizedLoans = rawLoans.map((loan: any) => ({
          prestamoInstrumentoId: loan.prestamoInstrumentoId ?? loan.PrestamoInstrumentoId,
          fechaPrestamo: loan.fechaPrestamo ?? loan.FechaPrestamo,
          fechaDevolucion: loan.fechaDevolucion ?? loan.FechaDevolucion ?? null,
          instrumentoId: loan.instrumentoId ?? loan.InstrumentoId,
          stockInstrumentoId: loan.stockInstrumentoId ?? loan.StockInstrumentoId,
          estudianteId: loan.estudianteId ?? loan.EstudianteId,
          codigoInventario: loan.codigoInventario ?? loan.CodigoInventario,
          nombreInstrumento: loan.nombreInstrumento ?? loan.NombreInstrumento
        }));

        setStudentLoans(normalizedLoans);
        setAttendanceHistory(Array.isArray(attendanceData) ? attendanceData : []);
        setAllCourses(Array.isArray(allCoursesData) ? allCoursesData : []);

        // Fetch available instruments for this student's instrument type
        if (studentData.instrumentoId) {
          const stock = await dataService.getDisponibles(studentData.instrumentoId).catch(() => []);
          setAvailableStock(Array.isArray(stock) ? stock : []);
        } else {
          setAvailableStock([]);
        }

      } catch (error) {
        console.error(error);
        // alert('Error al cargar perfil del estudiante');
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    if (id) fetchStudentData();
  }, [id]);

  const handleEnrollCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedCourseId) return;

    try {
      setProcessingCourseChange(true);
      await dataService.darDeAltaEnCurso(id, Number(selectedCourseId));
      await fetchStudentData();
      setSelectedCourseId('');
      alert('Estudiante dado de alta en el curso correctamente');
    } catch (error: any) {
      alert(error?.message || 'Error al dar de alta en el curso');
    } finally {
      setProcessingCourseChange(false);
    }
  };

  const handleRemoveCourse = async (cursoId: number, courseName: string) => {
    if (!id) return;
    if (!confirm(`¿Confirma la baja del curso ${courseName}?`)) return;

    try {
      setProcessingCourseChange(true);
      await dataService.darDeBajaDeCurso(id, cursoId);
      await fetchStudentData();
      alert('Estudiante dado de baja del curso correctamente');
    } catch (error: any) {
      alert(error?.message || 'Error al dar de baja del curso');
    } finally {
      setProcessingCourseChange(false);
    }
  };

  const closeDeleteModal = () => {
    if (deleteActionLoading) return;
    setShowDeleteOptions(false);
  };

  const handleLogicalDelete = async () => {
    if (!id || !student) return;
    try {
      setDeleteActionLoading(true);
      await dataService.bajaLogicaEstudiante(id);
      setStudent(prev => (prev ? { ...prev, activo: false } : prev));
      setShowDeleteOptions(false);
      alert('Baja lógica aplicada correctamente. El estudiante quedó inactivo.');
    } catch (error: any) {
      alert(error?.message || 'Error al aplicar la baja lógica del estudiante.');
    } finally {
      setDeleteActionLoading(false);
    }
  };

  const handleRealDelete = async () => {
    if (!id || !student) return;

    const confirmationText = prompt('Para confirmar la baja real, escriba ELIMINAR');
    if (confirmationText !== 'ELIMINAR') {
      alert('Baja real cancelada. Debe escribir ELIMINAR exactamente.');
      return;
    }

    try {
      setDeleteActionLoading(true);
      await dataService.eliminarEstudiante(id);
      setShowDeleteOptions(false);
      alert('Estudiante eliminado correctamente.');
      navigate('/dashboard');
    } catch (error: any) {
      alert(error?.message || 'Error al eliminar el estudiante.');
    } finally {
      setDeleteActionLoading(false);
    }
  };

  // Handle Lend Instrument
  const handleLendInstrument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockId) return;
    
    const selectedItem = availableStock.find(s => s.stockInstrumentoId.toString() === selectedStockId);
    if(!confirm(`¿Confirma el préstamo del instrumento ${selectedItem?.codigoInventario} a este estudiante?`)) return;

    setProcessingLoan(true);
    try {
      await dataService.asignarPrestamo({
        estudianteId: id,
        stockInstrumentoId: parseInt(selectedStockId)
      });
      
      await fetchStudentData();
      setSelectedStockId('');
      alert('Instrumento prestado correctamente');
    } catch (e: any) {
      alert(e.message || 'Error al procesar el préstamo');
    } finally {
      setProcessingLoan(false);
    }
  };

  // Handle Return Instrument
  const handleReturnInstrument = async (stockId: number, instrumentCode: string) => {
     if(!confirm(`¿Confirma la devolución del instrumento ${instrumentCode}?`)) return;
     
     setProcessingLoan(true);
     try {
        await dataService.devolverPrestamo({
          stockInstrumentoId: stockId
        });
        
        await fetchStudentData();
        alert('Instrumento devuelto correctamente');
     } catch (e: any) {
        const message = (e?.message || '').toLowerCase();
        if (message.includes('404') || message.includes('no encontrado') || message.includes('sin devolver')) {
          alert('Este estudiante no tiene un préstamo activo para devolver.');
        } else {
          alert(e.message || 'Error al procesar la devolución');
        }
     } finally {
         setProcessingLoan(false);
     }
  };

  // QR Scanner Logic
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (showScanner) {
      scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, [showScanner]);

  async function onScanSuccess(decodedText: string) {
    setShowScanner(false);
    setScannerError(null);

    const normalizedDecodedText = decodedText.trim();
    const normalizeCode = (value: string) => value.trim().toLowerCase();

    let qrStockId: string | undefined;
    let qrCode: string | undefined;
    try {
      const parsed = JSON.parse(normalizedDecodedText);
      if (parsed && typeof parsed === 'object') {
        if (parsed.id !== undefined && parsed.id !== null) qrStockId = String(parsed.id);
        if (parsed.stockInstrumentoId !== undefined && parsed.stockInstrumentoId !== null) qrStockId = String(parsed.stockInstrumentoId);
        if (parsed.StockInstrumentoId !== undefined && parsed.StockInstrumentoId !== null) qrStockId = String(parsed.StockInstrumentoId);
        if (parsed.code !== undefined && parsed.code !== null) qrCode = String(parsed.code);
        if (parsed.codigoInventario !== undefined && parsed.codigoInventario !== null) qrCode = String(parsed.codigoInventario);
        if (parsed.CodigoInventario !== undefined && parsed.CodigoInventario !== null) qrCode = String(parsed.CodigoInventario);
      }
    } catch {
      // QR can also be plain text
    }

    // decodedText could be stockInstrumentoId or codigoInventario
    if (scannerMode === 'lend') {
      // Find instrument in available stock
      const item = availableStock.find(s => 
        s.stockInstrumentoId.toString() === normalizedDecodedText || 
        normalizeCode(s.codigoInventario) === normalizeCode(normalizedDecodedText) ||
        (qrStockId ? s.stockInstrumentoId.toString() === qrStockId : false) ||
        (qrCode ? normalizeCode(s.codigoInventario) === normalizeCode(qrCode) : false)
      );

      if (item) {
        setSelectedStockId(item.stockInstrumentoId.toString());
        // Trigger lend automatically or just select it
        // For better UX, let's just select it and show the form, or auto-submit if confirmed
        if (confirm(`¿Desea tomar en préstamo el instrumento ${item.codigoInventario}?`)) {
            try {
                setProcessingLoan(true);
                await dataService.asignarPrestamo({
                    estudianteId: id,
                    stockInstrumentoId: item.stockInstrumentoId
                });
                await fetchStudentData();
                alert('Instrumento prestado correctamente');
            } catch (e: any) {
                alert(e.message || 'Error al procesar el préstamo');
            } finally {
                setProcessingLoan(false);
            }
        }
      } else {
        alert('Instrumento no encontrado o no disponible para préstamo.');
      }
    } else if (scannerMode === 'return') {
      if (activeLoans.length > 0) {
        const decodedCode = normalizeCode(normalizedDecodedText);
        const qrNormalizedCode = qrCode ? normalizeCode(qrCode) : '';

        const matchedLoan = activeLoans.find((loan: any) => {
          const loanStockId = loan.stockInstrumentoId?.toString();
          const loanCode = loan.codigoInventario ? normalizeCode(loan.codigoInventario) : '';
          return (
            loanStockId === normalizedDecodedText ||
            loanCode === decodedCode ||
            (qrStockId ? loanStockId === qrStockId : false) ||
            (qrNormalizedCode ? loanCode === qrNormalizedCode : false)
          );
        });

        if (matchedLoan) {
          handleReturnInstrument(matchedLoan.stockInstrumentoId, matchedLoan.codigoInventario || 'S/C');
        } else {
          alert('El código escaneado no coincide con ninguno de los instrumentos en préstamo activo.');
        }
      } else {
        alert('No tienes ningún instrumento en préstamo para devolver.');
      }
    }
  }

  function onScanFailure(_error: any) {
    // console.warn(`Code scan error = ${error}`);
  }

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
  const enrolledCourseIds = new Set(
    studentCourses
      .map((curso: any) => Number(curso.cursoId ?? curso.CursoId))
      .filter((cursoId: number) => !Number.isNaN(cursoId))
  );
  const availableCoursesToEnroll = allCourses.filter((course: any) => {
    const courseId = Number(course.cursoId ?? course.CursoId);
    return !Number.isNaN(courseId) && !enrolledCourseIds.has(courseId);
  });

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

  // Find active loans (where fechaDevolucion is null)
  const activeLoans = studentLoans.filter((l: any) => {
    const rawFechaDevolucion = l.fechaDevolucion ?? l.FechaDevolucion;
    if (rawFechaDevolucion === null || rawFechaDevolucion === undefined) return true;
    if (typeof rawFechaDevolucion === 'string') {
      const value = rawFechaDevolucion.trim();
      if (!value) return true;
      if (value.startsWith('0001-01-01')) return true;
    }
    return false;
  });
  
  // If no structured loan, but we have a legacy string identifier
  const legacyInstrument = activeLoans.length === 0 && student.instrumento ? student.instrumento : null;

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
                {isStudent ? 'Estudiante' : 'Admin'}
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
                  
                  {!isStudent && (
                    <button
                      type="button"
                      onClick={openEditModal}
                      className="absolute bottom-2 right-2 bg-primary text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600"
                      title="Editar estudiante"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  )}
                      {/* Edit Student Modal */}
                      {showEditModal && (
                        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
                          <div className="w-full max-w-lg rounded-2xl border border-border-dark bg-[#111722] p-4 sm:p-6 shadow-2xl relative flex flex-col">
                            <button
                              onClick={() => setShowEditModal(false)}
                              className="absolute top-4 right-4 text-[#92a4c9] hover:text-white transition-colors"
                              disabled={editLoading}
                              title="Cerrar"
                            >
                              <CloseIcon size={22} />
                            </button>
                            <h3 className="text-xl font-bold text-white mb-2">Editar estudiante</h3>
                            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 mt-4 w-full max-h-[70vh] overflow-y-auto">
                              {editableFields.map(({ key, label, type, required }) => (
                                <div key={key as string} className="flex flex-col gap-1 w-full">
                                  <label className="text-[#92a4c9] text-xs font-bold" htmlFor={`edit-${key}`}>{label}</label>
                                  {type === 'checkbox' ? (
                                    <input
                                      id={`edit-${key}`}
                                      type="checkbox"
                                      checked={!!editForm[key]}
                                      onChange={e => handleEditChange(key, e.target.checked)}
                                      className="size-5"
                                      disabled={editLoading}
                                    />
                                  ) : (
                                    <input
                                      id={`edit-${key}`}
                                      type={type || 'text'}
                                      value={(editForm[key] as string | number | undefined) ?? ''}
                                      onChange={e => handleEditChange(key, e.target.value)}
                                      className="rounded-lg border border-border-dark bg-[#101622] px-4 py-2.5 text-white outline-none focus:ring-1 focus:ring-blue-500 w-full"
                                      required={required}
                                      disabled={editLoading}
                                    />
                                  )}
                                </div>
                              ))}
                              <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full">
                                <button
                                  type="submit"
                                  disabled={editLoading}
                                  className="flex-1 rounded-lg bg-blue-600 px-5 py-2.5 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {editLoading ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowEditModal(false)}
                                  disabled={editLoading}
                                  className="flex-1 rounded-lg bg-gray-600 px-5 py-2.5 font-bold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}
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
                   {!isStudent && (
                     <>
                       <button
                         onClick={() => {
                           const url = `${window.location.origin}/#/autoretiro/${student.estudianteId}`;
                           window.open(url, '_blank');
                         }}
                         className="flex-1 md:flex-none h-10 px-5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-sm font-semibold rounded-lg transition-colors border border-blue-500/30 flex items-center justify-center gap-2"
                       >
                         <span className="material-symbols-outlined text-[18px]">link</span> Actualizar Autoretiro
                       </button>
                       <button
                         onClick={() => setShowDeleteOptions(true)}
                         className="flex-1 md:flex-none h-10 px-5 bg-red-600/20 hover:bg-red-600/30 text-red-300 text-sm font-semibold rounded-lg transition-colors border border-red-500/30 flex items-center justify-center gap-2"
                       >
                         <Trash2 size={16} /> Baja
                       </button>
                     </>
                   )}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-[#232f48] transition-colors cursor-pointer group">
                 <span className="text-[#92a4c9] text-sm font-medium">Asistencia</span>
                 <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white group-hover:text-primary transition-colors">
                      {attendanceHistory.length > 0 
                        ? Math.round((attendanceHistory.filter(a => a.presente).length / attendanceHistory.length) * 100)
                        : '--'}
                    </span>
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

                     {activeLoans.length > 0 ? (
                        <div className="space-y-3">
                           <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-300">
                             <AlertCircle size={14} /> {activeLoans.length} préstamo(s) activo(s)
                           </div>
                           {activeLoans.map((loan: any) => (
                             <div key={loan.prestamoInstrumentoId || loan.stockInstrumentoId} className="bg-[#232f48] rounded-xl p-5 border border-orange-500/30 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 bg-orange-500 text-[#101622] font-bold text-[10px] rounded-bl-xl uppercase tracking-wider">
                                    En Préstamo
                                </div>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                  <div>
                                     <span className="text-[#92a4c9] text-xs font-bold uppercase tracking-wider block mb-1">Código Instrumento</span>
                                     <div className="text-2xl font-mono font-bold text-white mb-1">{loan.codigoInventario || `#${loan.stockInstrumentoId}`}</div>
                                     <div className="flex items-center gap-2 text-xs text-[#92a4c9]">
                                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                                        Prestado el: {new Date(loan.fechaPrestamo).toLocaleDateString()}
                                     </div>
                                  </div>
                                  <div className="flex flex-col sm:flex-row gap-3">
                                    <button 
                                      onClick={() => { setScannerMode('return'); setShowScanner(true); }}
                                      className="w-full sm:w-auto px-5 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition flex items-center justify-center gap-2"
                                    >
                                      <QrCode size={18} /> Devolver con QR
                                    </button>
                                    {!isStudent && (
                                      <button 
                                        onClick={() => handleReturnInstrument(loan.stockInstrumentoId, loan.codigoInventario || 'S/C')}
                                        disabled={processingLoan}
                                        className="w-full sm:w-auto px-5 py-3 bg-white text-slate-900 font-bold rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
                                      >
                                        {processingLoan ? 'Procesando...' : (
                                           <>
                                             <ArrowRightLeft size={18} /> Devolver Manual
                                           </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                             </div>
                           ))}
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
                        /* Case 3: No Active Loan */
                        <div className="bg-[#232f48]/50 rounded-xl p-5 border border-white/5 border-dashed">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                          <Check size={14} /> Sin préstamo activo
                        </div>
                           <h4 className="text-white font-bold mb-3 text-sm">
                              Estado del Instrumento
                           </h4>
                        </div>
                     )}

                     {!isStudent && !legacyInstrument && (
                       <div className="mt-4 bg-[#232f48]/50 rounded-xl p-5 border border-white/5 border-dashed">
                         <h4 className="text-white font-bold mb-3 text-sm">Asignar Nuevo Préstamo</h4>
                         <div className="flex flex-col gap-4">
                           <button 
                             onClick={() => { setScannerMode('lend'); setShowScanner(true); }}
                             className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
                           >
                             <QrCode size={20} /> Escanear QR para Préstamo
                           </button>

                           <div className="pt-4 border-t border-white/5">
                             <p className="text-xs text-[#92a4c9] mb-3 uppercase font-bold tracking-wider">Asignación Manual (Admin)</p>
                             <form onSubmit={handleLendInstrument} className="flex flex-col sm:flex-row gap-3">
                               <select 
                                 className="flex-1 bg-[#101622] border border-border-dark text-white px-4 py-2.5 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none font-sans"
                                 value={selectedStockId}
                                 onChange={(e) => setSelectedStockId(e.target.value)}
                               >
                                 <option value="">Seleccione un instrumento disponible...</option>
                                 {availableStock.map(item => (
                                   <option key={item.stockInstrumentoId} value={item.stockInstrumentoId}>
                                     {item.codigoInventario} {item.numeroSerie ? `(SN: ${item.numeroSerie})` : ''}
                                   </option>
                                 ))}
                               </select>
                               <button 
                                 type="submit"
                                 disabled={!selectedStockId || processingLoan}
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
                         </div>

                         {availableStock.length === 0 && (
                           <p className="text-xs text-red-400 mt-2">No hay ejemplares disponibles para {getInstrumentName(student.instrumentoId)}.</p>
                         )}
                       </div>
                     )}
                  </div>

                  {/* Attendance History */}
                  <div className="bg-card-dark border border-border-dark rounded-xl p-6 flex flex-col">
                     <div className="flex items-center justify-between mb-6">
                        <h3 className="text-white font-bold text-xl">Historial de Asistencia</h3>
                        <div className="flex items-center gap-2 text-xs font-bold">
                           <span className="flex items-center gap-1 text-green-400">
                              <div className="size-2 rounded-full bg-green-400"></div> Presente
                           </span>
                           <span className="flex items-center gap-1 text-red-400">
                              <div className="size-2 rounded-full bg-red-400"></div> Ausente
                           </span>
                        </div>
                     </div>
                     <div className="flex flex-col gap-3">
                        {attendanceHistory.length > 0 ? (
                          [...attendanceHistory].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map((record, idx) => (
                             <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[#232f48]/30 border border-white/5">
                                <div className="flex items-center gap-3">
                                   <div className={`size-2 rounded-full ${record.presente ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]'}`}></div>
                                   <span className="text-white font-medium text-sm">
                                      {new Date(record.fecha).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                   </span>
                                </div>
                                <span className="text-[#92a4c9] text-xs font-mono">Curso ID: {record.cursoId}</span>
                             </div>
                          ))
                        ) : (
                          <div className="text-center text-[#92a4c9] py-8 text-sm italic">No hay registros de asistencia todavía</div>
                        )}
                     </div>
                  </div>

                  {/* Courses / Repertoire */}
                  <div className="bg-card-dark border border-border-dark rounded-xl p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                       <div>
                          <h3 className="text-white font-bold text-xl">Cursos Inscritos</h3>
                       </div>
                    </div>

                    {!isStudent && (
                      <form onSubmit={handleEnrollCourse} className="mb-5 rounded-xl border border-white/10 bg-[#232f48]/40 p-4">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#92a4c9]">Gestión de cursos (Admin)</p>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <select
                            className="flex-1 rounded-lg border border-border-dark bg-[#101622] px-4 py-2.5 text-white outline-none focus:ring-1 focus:ring-blue-500"
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                            disabled={processingCourseChange}
                          >
                            <option value="">Seleccione un curso para dar de alta...</option>
                            {availableCoursesToEnroll.map((course: any) => {
                              const courseId = course.cursoId ?? course.CursoId;
                              const courseName = course.nombre ?? course.Nombre;
                              return (
                                <option key={courseId} value={String(courseId)}>
                                  {courseName}
                                </option>
                              );
                            })}
                          </select>
                          <button
                            type="submit"
                            disabled={!selectedCourseId || processingCourseChange}
                            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Plus size={16} /> {processingCourseChange ? 'Procesando...' : 'Dar de Alta'}
                          </button>
                        </div>
                        {availableCoursesToEnroll.length === 0 && (
                          <p className="mt-2 text-xs text-[#92a4c9]">No hay cursos adicionales disponibles para este estudiante.</p>
                        )}
                      </form>
                    )}

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
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold bg-green-500/20 text-green-400 px-2 py-1 rounded block mb-1">INSCRITO</span>
                                          {!isStudent && (
                                            <button
                                              type="button"
                                              disabled={processingCourseChange}
                                              onClick={() => handleRemoveCourse(Number(curso.cursoId ?? curso.CursoId), curso.nombre || curso.Nombre || 'curso')}
                                              className="flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-bold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                              <Trash2 size={14} /> Baja
                                            </button>
                                          )}
                                        </div>
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
      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[#111722] border border-border-dark rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-border-dark flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2">
                <QrCode size={20} className="text-blue-500" />
                {scannerMode === 'lend' ? 'Escanear para Préstamo' : 'Escanear para Devolución'}
              </h3>
              <button 
                onClick={() => setShowScanner(false)}
                className="text-[#92a4c9] hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div id="qr-reader" className="overflow-hidden rounded-xl border border-white/10 bg-black"></div>
              <p className="text-center text-[#92a4c9] text-sm mt-4">
                Apunte la cámara al código QR del instrumento
              </p>
            </div>
          </div>
        </div>
      )}

      {showDeleteOptions && student && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-dark bg-[#111722] p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Opciones de baja</h3>
            <p className="mt-2 text-sm text-[#92a4c9]">
              Selecciona qué hacer con {student.nombre} {student.apellido}.
            </p>

            <div className="mt-6 space-y-3">
              <button
                onClick={handleLogicalDelete}
                disabled={deleteActionLoading}
                className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left text-amber-300 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="block font-bold">Baja lógica</span>
                <span className="block text-sm">Marca al estudiante como inactivo usando /estudiante/baja.</span>
              </button>

              <button
                onClick={handleRealDelete}
                disabled={deleteActionLoading}
                className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="block font-bold">Baja real</span>
                <span className="block text-sm">Elimina definitivamente al estudiante usando /estudiante/delete.</span>
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={closeDeleteModal}
                disabled={deleteActionLoading}
                className="rounded-lg px-4 py-2 text-[#92a4c9] transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default StudentProfile;