"""
SeatWise – Exam Seating Arrangement System
Main Flask Application Factory
"""
import os
import mimetypes
from flask import Flask, send_from_directory, jsonify

# Fix Windows registry MIME type issue where .css / .js may be served as text/plain
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/javascript', '.js')

from config import Config
from routes.auth_routes import auth_bp
from routes.student_routes import student_bp
from routes.exam_routes import exam_bp
from routes.hall_routes import hall_bp
from routes.seating_routes import seating_bp
from routes.report_routes import report_bp

def create_app():
    app = Flask(__name__, static_folder="../frontend", static_url_path="")
    app.config.from_object(Config)

    # Ensure uploads directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Register API Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(exam_bp)
    app.register_blueprint(hall_bp)
    app.register_blueprint(seating_bp)
    app.register_blueprint(report_bp)

    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({
            "status": "healthy",
            "system": "SeatWise – Exam Seating Arrangement System",
            "version": "1.0.0"
        })

    # Frontend Page Serving
    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, "login.html")

    @app.route('/<path:path>')
    def serve_frontend(path):
        if os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, "login.html")

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    print(f"==================================================")
    print(f"SeatWise Backend running on http://127.0.0.1:{port}")
    print(f"Admin login: admin / admin123")
    print(f"Student login: 21CS001 / student123")
    print(f"==================================================")
    app.run(host="0.0.0.0", port=port, debug=True)
