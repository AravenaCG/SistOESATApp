import React from 'react';
import { Link } from 'react-router-dom';
import { Music2 } from 'lucide-react';

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
      <header className="w-full p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2 text-white font-bold text-xl">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Music2 size={24} />
          </div>
          <span>Orquesta San Telmo</span>
        </div>
        <div className="flex gap-4">
           <Link to="/login" className="text-white/80 hover:text-white text-sm font-medium transition-colors">Admin Login</Link>
           <Link to="/registro" className="text-white/80 hover:text-white text-sm font-medium transition-colors">Inscripción</Link>
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
      
      <footer className="w-full p-6 text-center text-white/40 text-sm">
        &copy; {new Date().getFullYear()} Orquesta Escuela Juvenil de San Telmo
      </footer>
    </div>
  );
};

export default PublicLayout;