import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import RegistrationForm from './components/RegistrationForm';
import StudentList from './components/StudentList';
import StudentProfile from './components/StudentProfile';
import CourseManager from './components/CourseManager';
import CourseDetail from './components/CourseDetail'; // Import new component
import InstrumentManager from './components/InstrumentManager';
import PrivateRoute from './components/PrivateRoute';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<RegistrationForm />} />

        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <StudentList />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/estudiantes/:id" 
          element={
            <PrivateRoute>
              <StudentProfile />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/cursos" 
          element={
            <PrivateRoute>
              <CourseManager />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/cursos/:id" 
          element={
            <PrivateRoute>
              <CourseDetail />
            </PrivateRoute>
          } 
        />
         <Route 
          path="/instrumentos" 
          element={
            <PrivateRoute>
              <InstrumentManager />
            </PrivateRoute>
          } 
        />

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;