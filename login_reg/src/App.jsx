import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './signup';
import Login from './login';
import Home from './Home';
import UploadScan from './UploadScan.jsx';  // Import Upload Scan page
import PatientHistory from './PatientHistory';  // Import Patient History page

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/register" />} />  {/* Redirect to /register */}
        <Route path="/register" element={<Signup />} />
        <Route path="/log" element={<Login />} />
        <Route path="/home" element={<Home />} />  
        <Route path="/upload" element={<UploadScan />} />  {/* Upload Scan Route */}
        <Route path="/history" element={<PatientHistory />} />  {/* Patient History Route */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
