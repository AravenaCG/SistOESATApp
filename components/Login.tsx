import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-row font-sans bg-background-light dark:bg-background-dark">
      {/* Left Section: Login Form */}
      <div className="flex w-full flex-col justify-between bg-background-dark p-8 md:w-1/2 lg:p-16 xl:px-24 relative z-10">
        
        {/* Logo Header */}
        <header className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg className="size-6" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_6_535)">
                <path clipRule="evenodd" d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z" fill="currentColor" fillRule="evenodd"></path>
              </g>
              <defs>
                <clipPath id="clip0_6_535"><rect fill="white" height="48" width="48"></rect></clipPath>
              </defs>
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Orquesta Manager</h2>
        </header>

        {/* Main Content */}
        <main className="flex w-full max-w-md flex-col gap-8 self-center py-10">
          
          {/* Headings */}
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
              Hola de nuevo <span className="inline-block hover:animate-pulse">👋</span>
            </h1>
            <p className="text-lg text-text-secondary">
              Ingresa tus credenciales para acceder al sistema de la orquesta.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {/* Username Input */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-white" htmlFor="email">Correo electrónico o usuario</label>
              <div className="relative flex items-center">
                <input 
                  id="email" 
                  type="text" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. musico@orquesta.com" 
                  className="w-full rounded-xl border border-border-dark bg-surface-dark px-4 py-3.5 text-base text-white placeholder-text-secondary outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:ring-offset-0"
                  required
                />
                <span className="material-symbols-outlined absolute right-4 text-text-secondary pointer-events-none text-[20px]">mail</span>
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white" htmlFor="password">Contraseña</label>
                <a className="text-sm font-medium text-primary hover:text-white transition-colors" href="#">¿Olvidaste tu contraseña?</a>
              </div>
              <div className="relative flex items-center">
                <input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full rounded-xl border border-border-dark bg-surface-dark px-4 py-3.5 text-base text-white placeholder-text-secondary outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:ring-offset-0 pr-12"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 flex h-full items-center px-4 text-text-secondary hover:text-white transition-colors" 
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-3">
              <label className="relative flex cursor-pointer items-center gap-3">
                <input 
                  type="checkbox" 
                  className="peer size-5 appearance-none rounded border-2 border-border-dark bg-transparent transition-all checked:border-primary checked:bg-primary focus:ring-0 focus:ring-offset-0"
                />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path clipRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fillRule="evenodd"></path>
                  </svg>
                </span>
                <span className="text-sm font-medium text-white select-none">Recordarme</span>
              </label>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-4 py-3.5 text-base font-bold text-white transition-all hover:bg-blue-600 hover:shadow-[0_0_20px_rgba(43,108,238,0.4)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span className="relative z-10">{loading ? 'Ingresando...' : 'Iniciar Sesión'}</span>
              {!loading && (
                <span className="material-symbols-outlined relative z-10 text-[20px] transition-transform group-hover:translate-x-1">arrow_forward</span>
              )}
            </button>
          </form>

          {/* Footer Sign Up */}
          <div className="text-center text-sm text-text-secondary">
            ¿No tienes una cuenta en la orquesta? 
            <Link to="/registro" className="font-bold text-white underline decoration-primary decoration-2 underline-offset-4 hover:text-primary transition-colors ml-1">Regístrate aquí</Link>
          </div>
        </main>

        {/* Footer Links */}
        <footer className="flex gap-6 text-sm font-medium text-text-secondary">
          <a className="hover:text-white transition-colors" href="#">Ayuda</a>
          <a className="hover:text-white transition-colors" href="#">Privacidad</a>
          <span className="ml-auto text-xs opacity-50">v2.0.4</span>
        </footer>
      </div>

      {/* Right Section: Visual Image */}
      <div className="relative hidden w-1/2 overflow-hidden md:block bg-background-dark">
        {/* Background Image */}
        <div 
          className="absolute inset-0 h-full w-full bg-cover bg-center" 
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB68vKIgh0GBu0tq6te22kD8dA_dBLJ59Xmaesxeo-2kvU8ZdhMPAKP_9TrJ-j7wqTSQ4at59v_oAnZnFurg9cnIGO6UZo3lHGzEIriEtV4fKpHHRQkUbJMKYR8npyoyjYKXaoYI0kmZQC_-BJ3JTGgiEwsQ2jhKTXiF2VvVos1bXy--23Cj_JcmMrrQswHzqKKEc81XyM-C8OZjEgzVJuVvOzAp3s1nG8_oZXf8Z5s2Z_tOWyvO0xLu01sliuyvmL85N9YosSgrJpT')" }}
        ></div>
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-background-dark/90 via-primary/20 to-transparent mix-blend-multiply"></div>
        
        {/* Decorative Elements */}
        <div className="absolute bottom-12 left-12 right-12 z-10 backdrop-blur-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary ring-1 ring-white/20">
              <span className="material-symbols-outlined">music_note</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Próximo Ensayo</h3>
              <p className="text-sm text-gray-300 mt-1">Sinfonía No. 5 - Beethoven</p>
              <div className="mt-3 flex items-center gap-3 text-xs font-medium text-gray-400">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_today</span> Mañana, 16:00</span>
                <span className="h-1 w-1 rounded-full bg-gray-500"></span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">location_on</span> Auditorio Principal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;