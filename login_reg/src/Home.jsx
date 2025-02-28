import React from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Home.css"; // Ensure you create a Home.css for styling

const Home = () => {
  const navigate = useNavigate();
  axios.defaults.withCredentials = true;

  const handleLogout = () => {
    axios.get("http://localhost:3000/auth/logout") // Adjust the API endpoint if needed
      .then((res) => {
        if (res.data.status) {
          navigate("/"); // Redirect to home/login page
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <div className="home-container">
      {/* Header/Navbar */}
      <div className="header">
        <div className="logo">
          <img src="logo.png" alt="Easy Optha Logo" /> {/* Adjust image path */}
        </div>
        <div className="nav-links">
          <Link to="/upload">Upload Scan</Link>
          <Link to="/history">Patient History</Link>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      {/* Body Section */}
      <div className="body-container">
        <div className="background-photo">
          {/* You can add an image here for a background effect */}
        </div>

        {/* About Section */}
        <div className="about-us-box">
          <h2>Welcome to Easy Optha</h2>
          <p>
            Easy Optha is an AI-powered platform designed for **eye specialists**
            to diagnose complex eye diseases like **cataract, glaucoma, and diabetic retinopathy**.
          </p>
          <ul>
            <li><strong>Accuracy:</strong> Machine learning-powered precise diagnosis.</li>
            <li><strong>Speed:</strong> Real-time results for faster treatment.</li>
            <li><strong>Reliability:</strong> Trusted by specialists for consistency.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;
