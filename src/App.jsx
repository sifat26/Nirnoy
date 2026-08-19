import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ExamStart from './pages/ExamStart';
import ExamTake from './pages/ExamTake';
import Results from './pages/Results';

import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Exams from './pages/admin/Exams';
import ExamDetail from './pages/admin/ExamDetail';
import Students from './pages/admin/Students';
import StudentDetail from './pages/admin/StudentDetail';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-slate-50 font-bengali">
          <Routes>
            {/* Public / student */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/me"
              element={
                <RequireAuth role="student">
                  <Profile />
                </RequireAuth>
              }
            />
            <Route path="/exam/:examId/start" element={<ExamStart />} />
            <Route
              path="/exam/:examId/take"
              element={
                <RequireAuth role="student">
                  <ExamTake />
                </RequireAuth>
              }
            />
            <Route
              path="/results/:attemptId"
              element={
                <RequireAuth>
                  <Results />
                </RequireAuth>
              }
            />

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <RequireAuth role="admin">
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="exams" element={<Exams />} />
              <Route path="exams/:id" element={<ExamDetail />} />
              <Route path="students" element={<Students />} />
              <Route path="students/:id" element={<StudentDetail />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
