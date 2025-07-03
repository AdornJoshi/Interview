import os
import csv
from datetime import datetime
from io import StringIO
from flask import Flask, request, jsonify, session, send_from_directory, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask import abort
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.text_rank import TextRankSummarizer
import json

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = "supersecretkey123"
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///feedback.db'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # Max 5 MB

db = SQLAlchemy(app)

# Ensure uploads folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# ---------------- Models ---------------- #

class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(500))
    category = db.Column(db.String(50))
    sentiment = db.Column(db.String(50))
    user_name = db.Column(db.String(120))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    screenshot = db.Column(db.String(120))

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

# ---------------- Helpers ---------------- #

def analyze_sentiment(text):
    positive_words = ["good", "great", "excellent", "happy", "amazing", "love"]
    negative_words = ["bad", "poor", "terrible", "sad", "hate", "issue", "problem"]

    text_lower = text.lower()
    score = 0

    for word in positive_words:
        if word in text_lower:
            score += 1
    for word in negative_words:
        if word in text_lower:
            score -= 1

    if score > 0:
        return "Positive"
    elif score < 0:
        return "Negative"
    else:
        return "Neutral"

# ---------------- Admin Routes ---------------- #

@app.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.json
    if data["username"] == "admin" and data["password"] == "admin123":
        session.clear()
        session["admin"] = True
        return jsonify({"message": "Login successful"}), 200
    return jsonify({"error": "Invalid credentials"}), 401

@app.route("/admin/logout", methods=["POST"])
def admin_logout():
    session.clear()
    return jsonify({"message": "Admin logged out"})

@app.route("/check-admin", methods=["GET"])
def check_admin():
    return jsonify({"admin": session.get("admin", False)})

# ---------------- User Routes ---------------- #

@app.route("/user/signup", methods=["POST"])
def user_signup():
    data = request.json
    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "User already exists"}), 400
    hashed_pw = generate_password_hash(data["password"])
    user = User(name=data["name"], email=data["email"], password=hashed_pw)
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User registered"})

@app.route("/user/login", methods=["POST"])
def user_login():
    data = request.json
    user = User.query.filter_by(email=data["email"]).first()
    if user and check_password_hash(user.password, data["password"]):
        session.clear()
        session["user"] = user.email
        session["user_name"] = user.name
        return jsonify({"message": "Login successful"})
    return jsonify({"error": "Invalid email or password"}), 401

@app.route("/user/logout", methods=["POST"])
def user_logout():
    session.clear()
    return jsonify({"message": "User logged out"})

@app.route("/check-user", methods=["GET"])
def check_user():
    return jsonify({"user": session.get("user") is not None})

# ---------------- Feedback Routes ---------------- #

@app.route("/feedback", methods=["POST"])
def add_feedback():
    user_name = session.get("user_name", "Anonymous")
    text = request.form.get("text")
    category = request.form.get("category")
    screenshot_file = request.files.get("screenshot")

    filename = None
    if screenshot_file:
        filename = secure_filename(screenshot_file.filename)
        screenshot_file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

    sentiment = analyze_sentiment(text)

    new = Feedback(
        text=text,
        category=category,
        sentiment=sentiment,
        user_name=user_name,
        screenshot=filename
    )
    db.session.add(new)
    db.session.commit()
    return jsonify({"message": "Feedback added!"})

@app.route("/feedback", methods=["GET"])
def get_feedback():
    feedback = Feedback.query.all()
    return jsonify([{
        "id": f.id,
        "text": f.text,
        "category": f.category,
        "sentiment": f.sentiment,
        "user_name": f.user_name,
        "timestamp": f.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        "screenshot": f"/uploads/{f.screenshot}" if f.screenshot else None
    } for f in feedback])

@app.route("/feedback/<int:id>", methods=["DELETE"])
def delete_feedback(id):
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    feedback = Feedback.query.get(id)
    if feedback:
        if feedback.screenshot:
            try:
                os.remove(os.path.join(app.config['UPLOAD_FOLDER'], feedback.screenshot))
            except FileNotFoundError:
                pass
        db.session.delete(feedback)
        db.session.commit()
        return jsonify({"message": "Deleted"})
    return jsonify({"error": "Feedback not found"}), 404

@app.route("/uploads/<filename>")
def get_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route("/stats", methods=["GET"])
def get_stats():
    total = Feedback.query.count()
    by_category = db.session.query(Feedback.category, db.func.count()).group_by(Feedback.category).all()
    by_sentiment = db.session.query(Feedback.sentiment, db.func.count()).group_by(Feedback.sentiment).all()
    return jsonify({
        "total": total,
        "by_category": dict(by_category),
        "by_sentiment": dict(by_sentiment)
    })

# ---------------- Export Routes ---------------- #

@app.route("/export/csv", methods=["GET"])
def export_csv():
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Text", "Category", "Sentiment", "User", "Timestamp", "Screenshot"])

    feedbacks = Feedback.query.all()
    for fb in feedbacks:
        writer.writerow([fb.id, fb.text, fb.category, fb.sentiment, fb.user_name, fb.timestamp, fb.screenshot])

    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=feedback.csv"
    response.headers["Content-type"] = "text/csv"
    return response

@app.route("/export/json", methods=["GET"])
def export_json():
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401

    feedback = Feedback.query.all()
    feedback_data = [{
        "id": f.id,
        "text": f.text,
        "category": f.category,
        "sentiment": f.sentiment,
        "user_name": f.user_name,
        "timestamp": f.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        "screenshot": f.screenshot
    } for f in feedback]

    response = make_response(json.dumps(feedback_data, indent=2))
    response.headers["Content-Disposition"] = "attachment; filename=feedback.json"
    response.headers["Content-Type"] = "application/json"
    return response



@app.route("/summarize/<int:feedback_id>", methods=["GET"])
def summarize_single_feedback(feedback_id):
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401

    try:
        feedback = db.session.get(Feedback, feedback_id)  # safer than query.get()
        if not feedback or not feedback.text.strip():
            return jsonify({"error": "Feedback not found or empty"}), 404

        parser = PlaintextParser.from_string(feedback.text, Tokenizer("english"))
        summarizer = TextRankSummarizer()
        summary_sentences = summarizer(parser.document, 1)  # top 1 sentence
        summary = " ".join(str(s) for s in summary_sentences)

        return jsonify({"summary": summary or "Summary not generated."})
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": "Unable to generate summary."}), 500







# ---------------- Run Server ---------------- #

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
