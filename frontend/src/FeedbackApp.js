// src/FeedbackApp.js
import React, { useState, useEffect } from "react";
import "./FeedbackApp.css";

function FeedbackApp() {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("General");
  const [screenshot, setScreenshot] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [stats, setStats] = useState({ total: 0, by_category: {}, by_sentiment: {} });
  const [summaries, setSummaries] = useState({});
  const [admin, setAdmin] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("text", text);
    formData.append("category", category);
    if (screenshot) {
      formData.append("screenshot", screenshot);
    }

    const response = await fetch("http://localhost:5000/feedback", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (response.ok) {
      setText("");
      setCategory("General");
      setScreenshot(null);
      loadFeedback();
      loadStats();
    }
  };

  const loadFeedback = async () => {
    const res = await fetch("http://localhost:5000/feedback");
    const data = await res.json();
    setFeedbackList(data);
  };

  const loadStats = async () => {
    const res = await fetch("http://localhost:5000/stats");
    const data = await res.json();
    setStats(data);
  };

  const deleteFeedback = async (id) => {
    const res = await fetch(`http://localhost:5000/feedback/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      loadFeedback();
      loadStats();
    } else {
      alert("Delete failed — maybe you're not admin?");
    }
  };

  const summarizeFeedback = async (id) => {
    setSummaries((prev) => ({ ...prev, [id]: "Loading summary..." }));
    const res = await fetch(`http://localhost:5000/summarize/${id}`, {
      credentials: "include",
    });
    const data = await res.json();
    if (data.summary) {
      setSummaries((prev) => ({ ...prev, [id]: data.summary }));
    } else {
      setSummaries((prev) => ({ ...prev, [id]: "Unable to generate summary." }));
    }
  };

  const handleAdminLogout = async () => {
    const res = await fetch("http://localhost:5000/admin/logout", {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      setAdmin(false);
      setUserLoggedIn(false);
      alert("Admin logged out");
      window.location.href = "/";
    }
  };

  const handleUserLogout = async () => {
    const res = await fetch("http://localhost:5000/user/logout", {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      setUserLoggedIn(false);
      setAdmin(false);
      alert("User logged out");
      window.location.href = "/";
    }
  };

  useEffect(() => {
    loadFeedback();
    loadStats();

    fetch("http://localhost:5000/check-admin", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setAdmin(data.admin));

    fetch("http://localhost:5000/check-user", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setUserLoggedIn(data.user));
  }, []);

  const getFeedbackBySentiment = (type) =>
    feedbackList.filter((item) => item.sentiment === type);

  return (
    <div className="feedback-app">
      <h1>📝 Feedback Collector</h1>

      {admin && (
        <div className="logout-section">
          <p>✅ Logged in as Admin</p>
          <button onClick={handleAdminLogout} className="logout-btn">🚪 Logout</button>
        </div>
      )}

      {userLoggedIn && !admin && (
        <div className="logout-section">
          <p>✅ Logged in as User</p>
          <button onClick={handleUserLogout} className="logout-btn">🚪 Logout</button>
        </div>
      )}

      {admin && (
        <div className="export-buttons">
          <a href="http://localhost:5000/export/csv" target="_blank" rel="noreferrer">
            <button>📥 Export CSV</button>
          </a>
          <a href="http://localhost:5000/export/json" target="_blank" rel="noreferrer">
            <button>📥 Export JSON</button>
          </a>
        </div>
      )}

      {!admin && (
        <form onSubmit={handleSubmit} encType="multipart/form-data" className="feedback-form">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your feedback..."
            required
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="General">General</option>
            <option value="Bug">Bug</option>
            <option value="Feature Request">Feature Request</option>
          </select>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setScreenshot(e.target.files[0])}
          />
          <button type="submit">Submit Feedback</button>
        </form>
      )}

      {admin && ["Positive", "Neutral", "Negative"].map((sentiment) => (
        <div key={sentiment} className="sentiment-section">
          <h2>
            {sentiment === "Positive" ? "😊" : sentiment === "Neutral" ? "😐" : "😠"} {sentiment} Feedback
          </h2>
          <ul>
            {getFeedbackBySentiment(sentiment).map((item) => (
              <li key={item.id} className="feedback-card">
                <strong>{item.category}:</strong> {item.text}<br />
                <em>By: {item.user_name}</em><br />
                <small>🕒 {new Date(item.timestamp).toLocaleString()}</small><br />
                {item.screenshot && (
                  <img
                    src={`http://localhost:5000${item.screenshot}`}
                    alt="Screenshot"
                    className="screenshot-img"
                  />
                )}
                <div className="admin-actions">
                  <button onClick={() => deleteFeedback(item.id)}>🗑️ Delete</button>
                  <button onClick={() => summarizeFeedback(item.id)}>🧠 Summarize</button>
                </div>
                {summaries[item.id] && (
                  <div className="summary-box">
                    <strong>Summary:</strong> {summaries[item.id]}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {!admin && (
        <>
          <h2>📋 Submitted Feedback</h2>
          <ul>
            {feedbackList.map((item) => (
              <li key={item.id} className="feedback-card">
                <strong>{item.category}:</strong> {item.text}<br />
                <em>By: {item.user_name || "Anonymous"}</em><br />
                <small>🕒 {new Date(item.timestamp).toLocaleString()}</small><br />
                {item.screenshot && (
                  <img
                    src={`http://localhost:5000${item.screenshot}`}
                    alt="Screenshot"
                    className="screenshot-img"
                  />
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="stats-section">
        <h2>📊 Stats</h2>
        <p><strong>Total:</strong> {stats.total}</p>
        <ul>
          {Object.entries(stats.by_category).map(([cat, count]) => (
            <li key={cat}><strong>{cat}:</strong> {count}</li>
          ))}
        </ul>
        <ul>
          {Object.entries(stats.by_sentiment || {}).map(([sentiment, count]) => (
            <li key={sentiment}><strong>{sentiment}:</strong> {count}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default FeedbackApp;
