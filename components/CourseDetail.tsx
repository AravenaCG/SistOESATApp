import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataService } from '../services/api';
import { Student, Course } from '../types';
import Layout from './Layout';
import { ArrowLeft, Users, Mail, Phone, ChevronRight, Hash } from 'lucide-react';

const CourseDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      // Intentamos obtener la información del curso y sus alumnos en paralelo
      const [allCourses, courseStudents] = await Promise.all([
        dataService.request('/cursos'),
        dataService.request(`/estudiantesByCurso/${id}`).catch(() => [])
      ]);

      const currentCourse = allCourses.find((c: Course) => c.cursoId.toString() === id?.toString());
      setCourse(currentCourse || null);
      setStudents(Array.isArray(courseStudents) ? courseStudents : []);
    } catch (error) {
      console.error('Error cargando detalle del curso:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCourseData();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
          <div className="bg-slate-50 px-6 py-3 rounded-xl border border-slate-100 text-center">
            <span className="block text-2xl font-black text-indigo-600">{students.length}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alumnos Inscritos</span>
          </div>
        </div>

        {/* Student List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Users size={18} /> Alumnos del Curso
            </h3>
          </div>

          <div className="divide-y divide-slate-100">
            {students.length === 0 ? (
              <div className="p-20 text-center">
                <div className="bg-slate-50 size-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Users size={32} />
                </div>
                <p className="text-slate-500 font-medium">No hay alumnos inscritos en este curso todavía.</p>
              </div>
            ) : (
              students.map((student) => (
                <div 
                  key={student.estudianteId} 
                  className="group p-4 flex flex-col md:flex-row justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/estudiantes/${student.estudianteId}`)}
                >
                  <div className="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
                    <div className="size-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-lg shadow-sm">
                      {(student.nombre || '?')[0]}{(student.apellido || '?')[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {student.nombre} {student.apellido}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono">{student.documento || student.dni}</p>
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
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1 hidden md:block" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CourseDetail;