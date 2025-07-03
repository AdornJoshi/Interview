// src/UserAuth.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./UserAuth.css";

function UserAuth() {
  const navigate = useNavigate();

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    const res = await fetch("http://localhost:5000/user/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
      }),
    });
    const data = await res.json();
    alert(data.message || data.error);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch("http://localhost:5000/user/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: loginEmail,
        password: loginPassword,
      }),
      credentials: "include",
    });

    if (res.ok) {
      alert("User logged in");
      navigate("/feedback");
    } else {
      alert("Invalid login");
    }
  };

  return (
    <div className="auth-container">
      <h2>User Signup / Login</h2>
      <div className="auth-forms">
        <form onSubmit={handleSignup} className="auth-form">
          <h3>🙋 Sign Up</h3>
          <input
            type="text"
            placeholder="Your Name"
            value={signupName}
            onChange={(e) => setSignupName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={signupEmail}
            onChange={(e) => setSignupEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={signupPassword}
            onChange={(e) => setSignupPassword(e.target.value)}
            required
          />
          <button type="submit">Sign Up</button>
        </form>

        <form onSubmit={handleLogin} className="auth-form">
          <h3>🔑 Login</h3>
          <input
            type="email"
            placeholder="Email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}

export default UserAuth;
