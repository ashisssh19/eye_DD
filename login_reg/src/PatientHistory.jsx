import  { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./PatientHistory.css";

const PatientHistory = () => {
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState("");
  const [patientHistory, setPatientHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchPerformed, setSearchPerformed] = useState(false);
  
  axios.defaults.withCredentials = true;

  const handleLogout = () => {
    axios.get("http://localhost:3000/auth/logout")
      .then((res) => {
        if (res.data.status) {
          navigate("/");
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const handlePatientIdChange = (e) => {
    setPatientId(e.target.value);
  };

  const fetchPatientHistory = async () => {
    setError("");
    setPatientHistory([]);

    if (patientId.trim() === "") {
        setError("Patient ID is required");
        return;
    }

    setIsLoading(true);
    setSearchPerformed(true);

    try {
        const response = await axios.get(`http://localhost:5000/patient-history/${patientId}`, {
            withCredentials: true,
        });

        if (response.data && response.data.history) {
            if (response.data.history.length > 0) {
                console.log("Fetched Patient History:", response.data.history); // Debugging
                setPatientHistory(response.data.history); // Direct assignment to avoid unnecessary re-renders
            } else {
                setError("No history found for this patient ID");
            }
        } else {
            setError("Unexpected response format from server");
            console.error("Unexpected Response:", response.data);
        }
    } catch (error) {
        console.error("Error fetching patient history:", error);
        setError(error.response?.data?.error || "Failed to fetch patient history. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="home-container">
      <div className="header">
        <div className="logo">
          <img src="logo.png" alt="Easy Optha Logo" />
        </div>
        <div className="nav-links">
          <Link to="/home">Home</Link>
          <Link to="/upload">Upload Scan</Link>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="body-container">
        <div className="background-photo"></div>

        <div className="about-us-box history-box">
          <h2>Patient History</h2>
          <p>Enter a patient ID to view their scan history and analysis results.</p>
          
          <div className="search-container">
            <input
              type="text"
              value={patientId}
              onChange={handlePatientIdChange}
              placeholder="Enter Patient ID"
              className="patient-id-input"
            />
            <button 
              onClick={fetchPatientHistory} 
              className="search-button"
              disabled={isLoading}
            >
              {isLoading ? "Searching..." : "Search"}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
          {isLoading && <div className="loading-indicator"><p>Fetching patient history...</p></div>}

          {patientHistory.length > 0 ? (
            <div className="history-results">
              <h3>History for Patient ID: {patientId}</h3>
              
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Scan Type</th>
                    <th>Diagnosis</th>
                  </tr>
                </thead>
                <tbody>
                  {patientHistory.map((record, index) => (
                    <tr key={index}>
                      <td>{record.date}</td>
                      <td>{record.scan_type}</td> 
                      <td>{record.diagnosis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : searchPerformed && !isLoading && !error ? (
            <div className="no-records">
              <p>No records found for this patient.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PatientHistory;