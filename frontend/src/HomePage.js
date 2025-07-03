// src/HomePage.js
import React from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";

function HomePage() {
  return (
    <div className="home-container">
      <div className="home-card">
        <h1>📝 Feedback Collector</h1>
        <p className="subtitle">Please choose an option to continue</p>
        <div className="home-buttons">
          <Link to="/admin">
            <button className="btn admin-btn">🔐 Admin Login</button>
          </Link>
          <Link to="/user">
            <button className="btn user-btn">🙋 User Signup/Login</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
