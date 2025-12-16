import React, { useEffect, useState } from 'react';
import { dataService } from '../services/api';
import { Course } from '../types';
import Layout from './Layout';
import { Plus, Trash, Search, Music } from 'lucide-react';

const CourseManager: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // Simple Create Form State
  const [newCourseName, setNewCourseName] = useState('');

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await dataService.request('/cursos');
      setCourses(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Assuming typical POST structure based on prompt requirement to implement real fetch
      await dataService.request('/cursos', 'POST', { nombre: newCourseName });
      setNewCourseName('');
      fetchCourses(); // Reload
    } catch (e) {
      alert('Error al crear curso');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar curso?')) return;
    try {
      await dataService.request(`/cursos/${id}`, 'DELETE');
      setCourses(prev => prev.filter(c => c.cursoId !== id));
    } catch (e) {
      alert('Error al eliminar curso');
    }
  };

  // Filter Logic
  const filteredCourses = courses.filter(course => 
    course.nombre.toLowerCase().includes(filter.toLowerCase()) ||
    (course.descripcion && course.descripcion.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
          <h1 className="text-3xl font-bold text-slate-800">Gestión de Cursos</h1>
          
          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Filtrar cursos..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Create Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
           <h3 className="font-bold text-lg mb-4 text-slate-700">Nuevo Curso</h3>
           <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4">
             <input 
               className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
               placeholder="Nombre del curso (ej. Teoría Musical I)"
               value={newCourseName}
               onChange={e => setNewCourseName(e.target.value)}
               required
             />
             <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition">
               <Plus size={20} /> Crear Curso
             </button>
           </form>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
             <div className="col-span-full text-center text-gray-500 py-8">Cargando cursos...</div>
          ) : filteredCourses.length === 0 ? (
             <div className="col-span-full text-center text-gray-400 py-8 border-2 border-dashed border-gray-200 rounded-xl">
                No se encontraron cursos
             </div>
          ) : (
            filteredCourses.map(course => (
              <div key={course.cursoId} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-start group hover:shadow-md transition">
                <div>
                  <div className="bg-indigo-50 text-indigo-600 p-3 rounded-lg w-fit mb-3">
                     <Music size={24} />
                  </div>
                  <h4 className="font-bold text-lg text-slate-800">{course.nombre}</h4>
                  <p className="text-sm text-slate-500 mt-1">{course.descripcion || "Sin descripción"}</p>
                </div>
                <button 
                  onClick={() => handleDelete(course.cursoId)}
                  className="text-gray-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                  title="Eliminar curso"
                >
                  <Trash size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CourseManager;