// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import AdminLogin from "./AdminLogin";
import UserAuth from "./UserAuth";
import FeedbackApp from "./FeedbackApp";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/user" element={<UserAuth />} />
        <Route path="/feedback" element={<FeedbackApp />} />
      </Routes>
    </Router>
  );
}

export default App;
