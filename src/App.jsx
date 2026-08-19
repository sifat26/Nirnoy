import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ExamStart from './pages/ExamStart';
import ExamTake from './pages/ExamTake';
import Results from './pages/Results';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 font-bengali">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/exam/:examId/start" element={<ExamStart />} />
          <Route path="/exam/:examId/take" element={<ExamTake />} />
          <Route path="/exam/:examId/results" element={<Results />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
