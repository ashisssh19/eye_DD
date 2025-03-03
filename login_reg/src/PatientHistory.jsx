import React, { useState } from "react";
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
    // Reset states
    setError("");
    setPatientHistory([]);
    
    // Validate patient ID
    if (patientId.trim() === "") {
      setError("Patient ID is required");
      return;
    }

    setIsLoading(true);
    setSearchPerformed(true);

    try {
      const response = await axios.get(`http://localhost:5000/patient-history/${patientId}`);
      
      if (response.data && response.data.history) {
        setPatientHistory(response.data.history);
      } else {
        setError("No history found for this patient ID");
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
      {/* Header/Navbar */}
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

      {/* Body Section */}
      <div className="body-container">
        <div className="background-photo">
          {/* Background image here */}
        </div>

        {/* Patient History Section */}
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

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="loading-indicator">
              <p>Fetching patient history...</p>
            </div>
          )}

          {patientHistory.length > 0 ? (
            <div className="history-results">
              <h3>History for Patient ID: {patientId}</h3>
              
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Scan Type</th>
                    <th>Diagnosis</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patientHistory.map((record, index) => (
                    <tr key={index}>
                      <td>{record.date}</td>
                      <td>{record.scanType}</td>
                      <td>{record.diagnosis}</td>
                      <td>
                        <button className="view-button">View Details</button>
                      </td>
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