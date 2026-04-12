import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from './Layout';
import { dataService } from '../services/api';
import { Course, Student, SaveAttendanceDto } from '../types';
import { 
  Users, 
  ArrowLeft, 
  CheckCircle2, 
  X, 
  Save, 
  Check, 
  Calendar, 
  Mail, 
  Phone, 
  ChevronRight,
  Hash
} from 'lucide-react';

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAttendanceMode, setIsAttendanceMode] = useState(false);
  // attendance: { [estudianteId]: { estado: 'presente'|'ausente'|'ausente_con_aviso', observacion: string } }
  const [attendance, setAttendance] = useState<Record<string, { estado: 'presente' | 'ausente' | 'ausente_con_aviso'; observacion: string }>>({});
  const [saving, setSaving] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const [allCourses, courseStudentsRaw] = await Promise.all([
        dataService.request('/cursos'),
        dataService.request(`/estudiantesByCurso/${id}`).catch(() => []),
      ]);

      const courseList = Array.isArray(allCourses) ? allCourses : [];
      const currentCourse = courseList.find((c: Course) => c.cursoId.toString() === id?.toString());
      const validStudents: Student[] = Array.isArray(courseStudentsRaw) ? courseStudentsRaw : [];

      setCourse(currentCourse || null);
      setStudents(validStudents);

      // Don't block page load — history is fetched lazily on first Historial click
      setHistoryLoaded(false);
    } catch (error) {
      console.error('Error cargando detalle del curso:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCourseData();
    }
  }, [id]);

  const fetchAttendanceHistory = async (studentsSource: Student[]) => {
    const studentsWithId = studentsSource.filter(s => s.estudianteId);
    if (studentsWithId.length === 0) {
      setAttendanceHistory([]);
      setHistoryLoaded(true);
      return;
    }
    setLoadingHistory(true);
    try {
      const allHistories = await Promise.all(
        studentsWithId.map(s =>
          dataService.getStudentAttendanceHistory(s.estudianteId!).catch(() => [])
        )
      );

      // Detect if backend includes cursoId in records
      const allRecords = allHistories.flat();
      const hasCursoIdField = allRecords.some(
        (r: any) => r.cursoId !== undefined || r.CursoId !== undefined
      );

      const sessionMap = new Map<string, { estudianteId: string; presente: boolean }[]>();
      allHistories.forEach((records, sIdx) => {
        const student = studentsWithId[sIdx];
        if (!student?.estudianteId) return;
        (Array.isArray(records) ? records : []).forEach((record: any) => {
          // Filter by cursoId only if the field exists in the response
          if (hasCursoIdField) {
            const recordCursoId = (record.cursoId ?? record.CursoId ?? '').toString();
            if (recordCursoId && recordCursoId !== id?.toString()) return;
          }
          const fecha = (record.fecha ?? record.Fecha ?? '').toString().split('T')[0];
          if (!fecha) return;
          if (!sessionMap.has(fecha)) sessionMap.set(fecha, []);
          sessionMap.get(fecha)!.push({
            estudianteId: student.estudianteId!,
            presente: !!(record.presente ?? record.Presente ?? false)
          });
        });
      });

      const history = Array.from(sessionMap.entries()).map(([fecha, asistencias]) => ({
        fecha,
        asistencias
      }));
      console.log('[CourseDetail] History:', history.length, 'sessions | hasCursoIdField:', hasCursoIdField, '| raw sample:', allRecords[0]);
      setAttendanceHistory(history);
    } catch (err) {
      console.error('[CourseDetail] Error cargando historial:', err);
      setAttendanceHistory([]);
    } finally {
      setLoadingHistory(false);
      setHistoryLoaded(true);
    }
  };

  // Ya no se usa directamente, pero se puede dejar para compatibilidad
  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        estado: prev[studentId]?.estado === 'presente' ? 'ausente' : 'presente'
      }
    }));
  } 

  const handleSaveAttendance = async () => {
    if (!id) return;
    
    try {
      setSaving(true);
      const attendanceData: SaveAttendanceDto = {
        cursoId: id,
        fecha: new Date().toISOString(),
        asistencias: Object.entries(attendance).map(([estudianteId, value]) => ({
          estudianteId,
          presente: value.estado === 'presente',
          estadoAsistencia: value.estado,
          observacion: value.observacion
        }))
      };

      await dataService.saveAttendance(attendanceData);
      alert('Asistencia guardada correctamente');
      setIsAttendanceMode(false);
      setHistoryLoaded(false);
      fetchCourseData();
    } catch (error) {
      console.error('Error al guardar asistencia:', error);
      alert('Error al guardar la asistencia. Por favor, intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="size-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!course && !loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto text-center py-20">
          <div className="bg-slate-50 size-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="text-slate-300" size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Curso no encontrado</h2>
          <p className="text-slate-500 mb-8">El curso que buscas no existe o no tienes permisos para verlo.</p>
          <button 
            onClick={() => navigate('/cursos')}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
          >
            Volver a la lista
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Navigation */}
        <button 
          onClick={() => navigate('/cursos')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium"
        >
          <ArrowLeft size={20} /> Volver a Cursos
        </button>

        {/* Course Info Card */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-200">
              <Users size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <span className="flex items-center gap-1 text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                    <Hash size={12} /> ID: {id}
                 </span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                {course?.nombre || 'Curso'}
              </h1>
              <p className="text-slate-500">{course?.descripcion || 'Listado de alumnos inscritos en este curso.'}</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="bg-slate-50 px-6 py-3 rounded-xl border border-slate-100 text-center min-w-[120px]">
              <span className="block text-2xl font-black text-indigo-600">{students.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alumnos Inscritos</span>
            </div>
            {!isAttendanceMode && (
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!showHistory && !historyLoaded) {
                      await fetchAttendanceHistory(students);
                    }
                    setShowHistory(prev => !prev);
                  }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all border ${showHistory ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  {loadingHistory
                    ? <div className="size-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    : <Calendar size={20} />}
                  {showHistory ? 'Ver Alumnos' : 'Historial'}
                </button>
                <button
                  onClick={async () => {
                    const initialAttendance: Record<string, { estado: 'presente' | 'ausente' | 'ausente_con_aviso'; observacion: string }> = {};
                    students.forEach(s => {
                      if (s.estudianteId) initialAttendance[s.estudianteId] = { estado: 'ausente', observacion: '' };
                    });

                    // Try to load existing attendance for today
                    try {
                      const todayIso = new Date().toISOString().split('T')[0];
                      const existing = await dataService.getAttendance(id!, todayIso);
                      if (existing && existing.asistencias) {
                        existing.asistencias.forEach((a: any) => {
                          initialAttendance[a.estudianteId] = {
                            estado: a.estadoAsistencia || (a.presente ? 'presente' : 'ausente'),
                            observacion: a.observacion || ''
                          };
                        });
                      }
                    } catch (e) {
                      // 404 is expected if no attendance taken yet
                      console.log('No hay asistencia previa para hoy');
                    }

                    setAttendance(initialAttendance);
                    setIsAttendanceMode(true);
                  }}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100 active:scale-95"
                >
                  <CheckCircle2 size={20} /> Tomar Asistencia
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Header (Only in attendance mode) */}
        {isAttendanceMode && (
          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3 text-indigo-700">
              <Calendar size={24} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">Fecha de Asistencia</p>
                <p className="text-lg font-black capitalize">{today}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAttendanceMode(false)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-bold px-4 py-2"
              >
                <X size={20} /> Cancelar
              </button>
              <button
                onClick={handleSaveAttendance}
                disabled={saving}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-100 active:scale-95"
              >
                {saving ? (
                  <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={20} />
                )}
                Guardar Asistencia
              </button>
            </div>
          </div>
        )}

        {/* Attendance History Summary (Conditional) */}
        {!isAttendanceMode && showHistory && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Calendar size={18} /> Historial de Sesiones
              </h3>
            </div>
            <div className="p-6">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-10">
                  <div className="size-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : attendanceHistory.length === 0 ? (
                <div className="text-center py-10 text-slate-400 italic">
                  No hay registros de asistencia para este curso todavía.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...attendanceHistory].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map((session, idx) => {
                    const presentCount = session.asistencias.filter((a: any) => a.presente).length;
                    const totalCount = session.asistencias.length;
                    const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
                    // Mostrar todos los estudiantes con su estado y observación
                    return (
                      <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-indigo-200 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-slate-800">
                            {new Date(session.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${percentage >= 80 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {percentage}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                          <Users size={14} />
                          <span>{presentCount} presentes de {totalCount}</span>
                        </div>
                        <div className="mt-2 border-t border-slate-100 pt-2">
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Detalle de asistencia</p>
                          <ul className="space-y-0.5">
                            {session.asistencias.map((a: any, i: number) => {
                              const s = students.find(st => st.estudianteId === a.estudianteId);
                              let estado = a.estadoAsistencia || (a.presente ? 'presente' : 'ausente');
                              let color = estado === 'presente' ? 'text-green-500' : (estado === 'ausente_con_aviso' ? 'text-yellow-500' : 'text-red-400');
                              let label = estado === 'presente' ? 'Presente' : (estado === 'ausente_con_aviso' ? 'Ausente con aviso' : 'Ausente');
                              return (
                                <li key={i} className={`text-xs flex items-center gap-2 ${color}`}>
                                  {estado === 'presente' ? <Check size={12} /> : <X size={12} />}
                                  <span className="text-slate-700 font-bold">{s ? `${s.nombre} ${s.apellido}` : a.estudianteId}</span>
                                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200">{label}</span>
                                  {a.observacion && <span className="text-slate-500 italic">{a.observacion}</span>}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Student List */}
        {(!showHistory || isAttendanceMode) && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Users size={18} /> {isAttendanceMode ? 'Marcar Presentes' : 'Alumnos del Curso'}
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="bg-slate-50 size-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="text-slate-300" size={32} />
                  </div>
                  <h4 className="text-slate-800 font-bold text-lg mb-1">No hay alumnos</h4>
                  <p className="text-slate-500">Este curso no tiene alumnos inscritos todavía.</p>
                </div>
              ) : (
                students.map((student) => (
                  <div 
                    key={student.estudianteId} 
                    className={`p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors group ${isAttendanceMode ? 'hover:bg-indigo-50/30' : 'hover:bg-slate-50'}`}
                    onClick={() => {
                      if (!isAttendanceMode) {
                        navigate(`/estudiantes/${student.estudianteId}`);
                      }
                    }}
                    style={{ cursor: isAttendanceMode ? 'default' : 'pointer' }}
                  >
                    <div className="flex items-center gap-4">
                      {isAttendanceMode ? (
                        <div className="flex flex-col gap-2 items-center">
                          <select
                            value={attendance[student.estudianteId!]?.estado || 'ausente'}
                            onChange={e => {
                              const estado = e.target.value as 'presente' | 'ausente' | 'ausente_con_aviso';
                              setAttendance(prev => ({
                                ...prev,
                                [student.estudianteId!]: {
                                  ...prev[student.estudianteId!],
                                  estado
                                }
                              }));
                            }}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-sm font-bold focus:border-indigo-500 bg-white text-slate-700"
                          >
                            <option value="presente">Presente</option>
                            <option value="ausente">Ausente</option>
                            <option value="ausente_con_aviso">Ausente con aviso</option>
                          </select>
                          <input
                            type="text"
                            value={attendance[student.estudianteId!]?.observacion || ''}
                            onChange={e => {
                              const observacion = e.target.value;
                              setAttendance(prev => ({
                                ...prev,
                                [student.estudianteId!]: {
                                  ...prev[student.estudianteId!],
                                  observacion
                                }
                              }));
                            }}
                            placeholder="Observación (opcional)"
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs w-40 focus:border-indigo-400 bg-white text-slate-700"
                          />
                        </div>
                      ) : (
                        <div className="size-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                          {student.nombre?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                          {student.nombre} {student.apellido}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                           <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">DNI: {student.dni}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 w-full md:w-auto justify-start md:justify-end">
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Mail size={16} />
                        <span className="max-w-[150px] truncate">{student.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Phone size={16} />
                        <span>{student.telefono || student.celular || '-'}</span>
                      </div>
                      {!isAttendanceMode && (
                        <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1 hidden md:block" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {isAttendanceMode && students.length > 0 && (
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-center">
                <button
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-12 py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-emerald-100 active:scale-95"
                >
                  {saving ? (
                    <div className="size-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save size={24} />
                  )}
                  Guardar Asistencia
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CourseDetail;
