import { useEffect, useState } from 'react';
import { dataService } from '../services/api';
import { Student } from '../types';
import { getInstrumentName } from '../constants';
import * as XLSX from 'xlsx';
import { Search, Download, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';

const StudentList: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await dataService.request('/estudiantes');
      // Ensure data is array
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert('Error cargando estudiantes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const closeDeleteModal = () => {
    if (actionLoading) return;
    setSelectedStudent(null);
  };

  const handleLogicalDelete = async () => {
    if (!selectedStudent) return;
    try {
      setActionLoading(true);
      await dataService.bajaLogicaEstudiante(selectedStudent.estudianteId);
      setStudents(prev => prev.map((student) => (
        student.estudianteId === selectedStudent.estudianteId
          ? { ...student, activo: false }
          : student
      )));
      closeDeleteModal();
    } catch (error) {
      console.error(error);
      alert('Error realizando la baja lógica del estudiante.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRealDelete = async () => {
    if (!selectedStudent) return;
    try {
      setActionLoading(true);
      await dataService.eliminarEstudiante(selectedStudent.estudianteId);
      setStudents(prev => prev.filter(s => s.estudianteId !== selectedStudent.estudianteId));
      closeDeleteModal();
    } catch (error) {
      console.error(error);
      alert('Error eliminando el estudiante.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = () => {
    const dataToExport = students.map(s => ({
      ID: s.estudianteId,
      Nombre: s.nombre,
      Apellido: s.apellido,
      DNI: s.documento || s.dni,
      Instrumento: getInstrumentName(s.instrumentoId),
      Orquesta: s.orquesta || s.cursos?.map(c => c.nombre).join(', ') || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estudiantes");
    XLSX.writeFile(wb, "Orquesta_Estudiantes.xlsx");
  };

  const filteredStudents = students.filter(s => {
    const term = filter.toLowerCase();
    const nombre = (s.nombre || '').toString().toLowerCase();
    const apellido = (s.apellido || '').toString().toLowerCase();
    const dni = (s.documento || s.dni || '').toString();
    
    return nombre.includes(term) || apellido.includes(term) || dni.includes(term);
  });

  // Helper to determine orquesta name from courses if not explicitly set
  const getOrquestaName = (s: Student) => {
    if (s.orquesta) return s.orquesta;
    if (s.cursos && s.cursos.length > 0) {
      // Try to find the main orchestra course
      const mainCourse = s.cursos.find(c => 
        c.nombre.toLowerCase().includes('orquesta') || 
        c.nombre.toLowerCase().includes('coro')
      );
      return mainCourse ? mainCourse.nombre : s.cursos[0].nombre;
    }
    return '-';
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-slate-800">Estudiantes</h1>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Download size={20} />
            Exportar Excel
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, apellido o DNI..." 
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-600">Estudiante</th>
                    <th className="px-6 py-4 font-semibold text-slate-600">DNI</th>
                    <th className="px-6 py-4 font-semibold text-slate-600">Instrumento</th>
                    <th className="px-6 py-4 font-semibold text-slate-600">Orquesta/Curso</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map(student => (
                    <tr 
                      key={student.estudianteId} 
                      className="hover:bg-blue-50/30 transition group cursor-pointer"
                      onClick={() => navigate(`/estudiantes/${student.estudianteId}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="size-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold uppercase group-hover:bg-blue-600 group-hover:text-white transition-colors">
                             {(student.nombre || '?')[0]}{(student.apellido || '?')[0]}
                           </div>
                           <div>
                             <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{student.nombre} {student.apellido}</p>
                             <p className="text-xs text-slate-500">{student.email}</p>
                             <p className={`text-xs font-semibold ${student.activo === false ? 'text-red-600' : 'text-green-600'}`}>
                               {student.activo === false ? 'Inactivo' : 'Activo'}
                             </p>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{student.documento || student.dni || '-'}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase">
                          {getInstrumentName(student.instrumentoId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 capitalize text-slate-600">
                        {getOrquestaName(student)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/estudiantes/${student.estudianteId}`);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center gap-1" 
                            title="Ver Detalle"
                          >
                            <Eye size={18} />
                            <span className="text-xs font-bold hidden sm:inline">Ver Perfil</span>
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudent(student);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" 
                            title="Opciones de baja"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                     <tr><td colSpan={5} className="text-center p-8 text-gray-500">No se encontraron estudiantes</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-slate-800">Opciones de baja</h3>
              <p className="mt-2 text-sm text-slate-600">
                Selecciona qué hacer con {selectedStudent.nombre} {selectedStudent.apellido}.
              </p>
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleLogicalDelete}
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="block font-bold">Baja lógica</span>
                  <span className="block text-sm">Marca al estudiante como inactivo usando /estudiante/baja.</span>
                </button>
                <button
                  onClick={handleRealDelete}
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="block font-bold">Baja real</span>
                  <span className="block text-sm">Elimina definitivamente al estudiante usando /estudiante/delete.</span>
                </button>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeDeleteModal}
                  disabled={actionLoading}
                  className="rounded-lg px-4 py-2 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StudentList;