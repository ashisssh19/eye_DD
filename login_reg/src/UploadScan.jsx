import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./UploadScan.css";

const UploadScan = () => {
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [octFiles, setOctFiles] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [patientIdError, setPatientIdError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOctUpload, setShowOctUpload] = useState(false);
  const [fpResult, setFpResult] = useState(null);

  const handleFileChange = (event, isOct) => {
    const files = Array.from(event.target.files);
    if (isOct) {
      setOctFiles(files);
    } else {
      setSelectedFiles(files);
    }
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
      setError("Please select at least one FP scan.");
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

      if (Array.isArray(response.data)) {
        setPredictions(response.data);
        const fpDiagnosis = response.data[0].disease;
        setFpResult(fpDiagnosis);

        if (fpDiagnosis === "Diabetic Retinopathy" || fpDiagnosis === "Normal") {
          setShowOctUpload(true);
        }
      } else {
        setError("Unexpected response format from the server.");
      }
    } catch (error) {
      setError(error.response?.data?.error || "Failed to process FP scan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOctUpload = async () => {
    setError("");
    if (octFiles.length === 0) {
      setError("Please select at least one OCT scan.");
      return;
    }
  
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("patient_id", patientId);  // ✅ Add patient ID
      octFiles.forEach((file) => formData.append("files", file));
  
      const response = await axios.post("http://192.168.0.165:5001/predict-oct", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
  
      console.log("OCT API Response:", response.data);
      setPredictions(response.data);
    } catch (error) {
      setError(error.response?.data?.error || "Failed to process OCT scan.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const removeFile = (index, isOct) => {
    if (isOct) {
      setOctFiles(octFiles.filter((_, i) => i !== index));
    } else {
      setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
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
          <Link to="/history">Patient History</Link>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="body-container">
        <div className="background-photo"></div>
        <div className="about-us-box">
          <h2>Upload Eye Scans</h2>
          <p>Upload eye scans for AI analysis.</p>

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
            Select FP Scan
            <input type="file" accept="image/jpeg,image/png,image/jpg" multiple onChange={(e) => handleFileChange(e, false)} />
          </label>
          <div className="image-grid">
            {selectedFiles.map((file, index) => (
              <div key={index} className="image-container">
                <img src={URL.createObjectURL(file)} alt="Preview" className="small-preview" />
                <button onClick={() => removeFile(index, false)}>✕</button>
              </div>
            ))}
          </div>

          <button onClick={handleUpload} disabled={isLoading} className="upload-btn">
            {isLoading ? "Processing..." : "Analyze FP Scan"}
          </button>

          {showOctUpload && (
            <>
              <label className="file-input-label">
                Select OCT Scan
                <input type="file" accept="image/jpeg,image/png,image/jpg" multiple onChange={(e) => handleFileChange(e, true)} />
              </label>
              <div className="image-grid">
                {octFiles.map((file, index) => (
                  <div key={index} className="image-container">
                    <img src={URL.createObjectURL(file)} alt="Preview" className="small-preview" />
                    <button onClick={() => removeFile(index, true)}>✕</button>
                  </div>
                ))}
              </div>
              <button onClick={handleOctUpload} disabled={isLoading} className="upload-btn">
                {isLoading ? "Processing..." : "Analyze OCT Scan"}
              </button>
            </>
          )}

          {predictions.length > 0 && predictions.map((pred, index) => (
            <div key={index}>
              <p><strong>File:</strong> {pred.filename}</p>
              <p><strong>Disease:</strong> {pred.disease}</p>
              {pred.message && <p><strong>Diagnosis:</strong> {pred.message}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UploadScan;