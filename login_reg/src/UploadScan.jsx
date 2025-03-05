import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./UploadScan.css";

const UploadScan = () => {
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [patientIdError, setPatientIdError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
  };

  const handlePatientIdChange = (event) => {
    setPatientId(event.target.value);
    if (event.target.value.trim() !== "") {
      setPatientIdError("");
    }
  };

  const handleLogout = () => {
    axios.get("http://localhost:3000/auth/logout")
      .then((res) => {
        if (res.data.status) {
          navigate("/");
        }
      })
      .catch((err) => console.log(err));
  };

  const handleUpload = async () => {
    setError("");
    setPredictions([]);
  
    if (patientId.trim() === "") {
      setPatientIdError("Patient ID is required");
      return;
    }
  
    if (selectedFiles.length === 0) {
      setError("Please select at least one image.");
      return;
    }
  
    setIsLoading(true);
  
    try {
      const formData = new FormData();
      formData.append("patient_id", patientId);
      selectedFiles.forEach((file) => formData.append("files", file));
  
      const response = await axios.post("http://localhost:5000/predict", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("API Response:", response.data); // 🔍 Debugging

      if (Array.isArray(response.data)) {
        setPredictions(response.data);
      } else {
        setError("Unexpected response format from the server.");
      }
    } catch (error) {
      setError(error.response?.data?.error || "Failed to process images.");
    } finally {
      setIsLoading(false);
    }
};


  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="home-container">
      <div className="header">
        <div className="logo">
          <img src="logo.png" alt="Easy Optha Logo" />
        </div>
        <div className="nav-links">
          <Link to="/home">Home</Link>
          <Link to="/history">Patient History</Link>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="body-container">
        <div className="background-photo"></div>

        <div className="about-us-box">
          <h2>Upload Eye Scans</h2>
          <p>Upload multiple eye scans for AI analysis.</p>

          <div className="patient-id-container">
            <label htmlFor="patientId">Patient ID*:</label>
            <input 
              type="text" 
              id="patientId" 
              value={patientId} 
              onChange={handlePatientIdChange} 
              placeholder="Enter patient ID" 
            />
            {patientIdError && <p className="error-text">{patientIdError}</p>}
          </div>

          <label className="file-input-label">
            Select Files
            <input 
              type="file" 
              multiple 
              accept="image/jpeg,image/png,image/jpg" 
              onChange={handleFileChange} 
            />
          </label>

          {selectedFiles.length > 0 && (
            <div className="image-grid">
              {selectedFiles.map((file, index) => (
                <div key={index} className="image-container">
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt={`Upload ${index + 1}`} 
                  />
                  <button onClick={() => removeFile(index)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {error && <div className="error-box">{error}</div>}

          <button 
            onClick={handleUpload} 
            disabled={isLoading} 
            className="upload-btn"
          >
            {isLoading ? "Processing..." : "Analyze Scans"}
          </button>

          {isLoading && <p>Analyzing your scans, please wait...</p>}

          {predictions.length > 0 && predictions.map((pred, index) => (
            <div key={index}>
              <p><strong>File:</strong> {pred.filename}</p>
              <p><strong>Disease:</strong> {pred.disease}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UploadScan;