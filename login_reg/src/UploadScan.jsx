import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const UploadScan = () => {
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [patientIdError, setPatientIdError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle file selection
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]); // Keep previous uploads
  };

  // Handle patient ID change
  const handlePatientIdChange = (event) => {
    setPatientId(event.target.value);
    if (event.target.value.trim() !== "") {
      setPatientIdError("");
    }
  };

  // Handle logout
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

  // Handle upload and prediction
  const handleUpload = async () => {
    // Reset states
    setError("");
    setPredictions([]);
    
    // Validate patient ID
    if (patientId.trim() === "") {
      setPatientIdError("Patient ID is required");
      return;
    }

    if (selectedFiles.length === 0) {
      setError("Please select at least one image.");
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append("patientId", patientId);
    selectedFiles.forEach((file) => {
      formData.append("images", file);
    });

    try {
      const response = await axios.post("http://localhost:5000/predict", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Response data:", response.data);
      
      // Handle different response formats
      if (response.data && Array.isArray(response.data.predictions)) {
        // Process the predictions array to ensure we're using strings, not objects
        const formattedPredictions = response.data.predictions.map(pred => {
          // Check if prediction is an object or string
          if (typeof pred === 'object') {
            // Extract the right field from the prediction object
            return pred.pattern_based_mapping || 
                   pred.corrected_mapping || 
                   pred.original_mapping || 
                   JSON.stringify(pred);
          }
          // If it's already a string, just return it
          return pred;
        });
        setPredictions(formattedPredictions);
      } else if (response.data && typeof response.data.predictions === 'object') {
        // If predictions is an object with detailed info, extract the necessary data
        const formattedPredictions = Object.values(response.data.predictions).map(pred => {
          if (typeof pred === 'object') {
            return pred.pattern_based_mapping || 
                   pred.corrected_mapping || 
                   pred.original_mapping || 
                   JSON.stringify(pred);
          }
          return String(pred);
        });
        setPredictions(formattedPredictions);
      } else {
        setError("Received an unexpected response format from the server.");
        console.error("Unexpected response format:", response.data);
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      setError(error.response?.data?.error || "Failed to process images. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Remove a selected file
  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
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
          <Link to="/history">Patient History</Link>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      {/* Body Section */}
      <div className="body-container">
        <div className="background-photo">
          {/* Background image */}
        </div>

        {/* Upload Section */}
        <div className="about-us-box">
          <h2>Upload Eye Scans</h2>
          <p>Upload multiple eye scans for AI analysis.</p>
          
          {/* Patient ID Input */}
          <div className="patient-id-container" style={{ marginBottom: '20px' }}>
            <label htmlFor="patientId" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Patient ID*:
            </label>
            <input
              type="text"
              id="patientId"
              value={patientId}
              onChange={handlePatientIdChange}
              style={{
                padding: '8px',
                width: '100%',
                maxWidth: '300px',
                border: patientIdError ? '1px solid red' : '1px solid #ccc',
                borderRadius: '4px'
              }}
              placeholder="Enter patient ID"
            />
            {patientIdError && (
              <p style={{ color: 'red', fontSize: '14px', margin: '5px 0 0' }}>
                {patientIdError}
              </p>
            )}
          </div>

          {/* File Input */}
          <div style={{ margin: '20px 0' }}>
            <label 
              className="file-input-label"
              style={{
                cursor: 'pointer',
                backgroundColor: '#007bff',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '4px',
                display: 'inline-block',
                marginBottom: '10px'
              }}
            >
              Select Files
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {/* Display Selected Images in a Grid */}
          {selectedFiles.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ marginBottom: '10px' }}>Selected Images:</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: '10px',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                {selectedFiles.map((file, index) => (
                  <div key={index} style={{ position: 'relative' }}>
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Upload ${index + 1}`}
                      style={{
                        width: '100px',
                        height: '100px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}
                    />
                    <button
                      onClick={() => removeFile(index)}
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-10px',
                        background: 'red',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Display any errors */}
          {error && (
            <div style={{ 
              marginTop: '15px', 
              padding: '10px', 
              backgroundColor: '#ffeeee', 
              color: '#d32f2f',
              borderRadius: '4px',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              {error}
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={isLoading}
            style={{
              marginTop: '20px',
              backgroundColor: isLoading ? '#cccccc' : '#007bff',
              color: 'white',
              padding: '10px 25px',
              borderRadius: '4px',
              border: 'none',
              fontSize: '16px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isLoading ? "Processing..." : "Analyze Scans"}
          </button>

          {/* Loading indicator */}
          {isLoading && (
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
              <p>Analyzing your scans, please wait...</p>
            </div>
          )}

          {/* Prediction Results */}
          {predictions.length > 0 && (
            <div style={{ marginTop: '30px', textAlign: 'left' }}>
              <h3 style={{ borderBottom: '2px solid #007bff', paddingBottom: '5px' }}>
                Analysis Results for Patient ID: {patientId}
              </h3>
              <ul style={{ listStyleType: 'none', padding: '10px 0' }}>
                {predictions.map((prediction, index) => (
                  <li key={index} style={{ 
                    margin: '10px 0', 
                    padding: '10px', 
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    borderLeft: '4px solid #007bff'
                  }}>
                    <strong>Image {index + 1}:</strong> {prediction}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadScan;