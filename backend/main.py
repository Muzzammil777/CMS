from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Allow `uvicorn main:app --reload` from the backend directory by making
# the project root importable so `backend.*` absolute imports resolve.
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.db import lifespan
from backend.routes.academics.attendance import router as attendance_router
from backend.routes.academics.exams import router as exams_router
from backend.routes.academics.facility import router as facility_router
from backend.routes.academics.placement import router as placement_router
from backend.routes.academics.timetable import router as timetable_router
from backend.routes.analytics import router as analytics_router
from backend.routes.dashboard_summary import router as dashboard_router
from backend.routes.notifications import router as notifications_router
from backend.routes.payroll import router as payroll_router
from backend.routes.payroll_and_development import router as payroll_dev_router
from backend.routes.staff import router as staff_router
from backend.routes.faculty import router as faculty_router
from backend.routes.faculty_management import router as faculty_mgmt_router
from backend.routes.faculty_360_feedback import router as faculty_feedback_router
from backend.routes.faculty_skills import router as faculty_skills_router
from backend.routes.faculty_mentorship import router as faculty_mentorship_router
from backend.routes.faculty_research import router as faculty_research_router
from backend.routes.faculty_compliance import router as faculty_compliance_router
from backend.routes.faculty_okr import router as faculty_okr_router
from backend.routes.faculty_publications import router as faculty_publications_router
from backend.routes.students import router as students_router
from backend.routes.administration.admissions import router as admissions_router
from backend.routes.administration.fees import router as fees_router
from backend.routes.administration.invoices import router as invoices_router
from backend.routes.user_settings import router as user_settings_router
from backend.routes.auth import router as auth_router
from backend.routes.newsletters import router as newsletters_router
PORT = int(os.getenv("PORT", 5000))

app = FastAPI(title="CMS API", lifespan=lifespan)


def _parse_origins(value: Optional[str]):
    if not value:
        return []
    return [origin.strip() for origin in value.split(",") if origin.strip()]


configured_origins = _parse_origins(os.getenv("CORS_ORIGINS"))
default_origins = [
    "https://cms-main-nv6w.onrender.com",
    "https://cms-main-88k8.onrender.com",
    "https://cms1-weof.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
allowed_origins = configured_origins or default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# Serve Vite Frontend
# -------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "frontend" / "dist"
DIST_ASSETS_DIR = DIST_DIR / "assets"
DIST_INDEX_FILE = DIST_DIR / "index.html"

# Only mount static assets if dist folder exists (production build)
if DIST_ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_ASSETS_DIR)), name="assets")

# Mount static uploads directory
class SafeStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            response = await super().get_response(path, scope)
            if response.status_code == 404:
                default_logo = Path(self.directory) / "logo.jpeg"
                if default_logo.exists():
                    return FileResponse(str(default_logo))
            return response
        except Exception as ex:
            if getattr(ex, "status_code", None) == 404:
                default_logo = Path(self.directory) / "logo.jpeg"
                if default_logo.exists():
                    return FileResponse(str(default_logo))
            raise ex



uploads_dir = BASE_DIR / "backend" / "static" / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", SafeStaticFiles(directory=str(uploads_dir)), name="uploads")

# Helper function to create dev mode guidance HTML
def get_dev_mode_html():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MIT Connect - Development Mode</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                max-width: 500px;
                text-align: center;
            }
            h1 {
                color: #333;
                margin-top: 0;
            }
            p {
                color: #666;
                line-height: 1.6;
                margin: 15px 0;
            }
            .mode-badge {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                margin-bottom: 20px;
                font-size: 14px;
                font-weight: 600;
            }
            .instructions {
                background: #f5f5f5;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
                text-align: left;
            }
            .instructions h3 {
                margin-top: 0;
                color: #333;
            }
            .instructions ol {
                margin: 0;
                padding-left: 20px;
                color: #666;
            }
            .instructions li {
                margin: 8px 0;
            }
            .code {
                background: #333;
                color: #4ade80;
                padding: 2px 6px;
                border-radius: 3px;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 12px;
            }
            .info {
                background: #e3f2fd;
                border-left: 4px solid #667eea;
                padding: 15px;
                margin: 20px 0;
                text-align: left;
                color: #1565c0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="mode-badge">Development Mode</div>
            <h1>👋 Welcome to MIT Connect</h1>
            <p>Backend API is running, but frontend build was not found.</p>
            
            <div class="instructions">
                <h3>🚀 To run the frontend:</h3>
                <ol>
                    <li>Open a new terminal in your project root</li>
                    <li>Run: <span class="code">cd frontend && npm run dev</span></li>
                    <li>Navigate to: <span class="code">http://localhost:5173</span></li>
                </ol>
            </div>
            
            <div class="info">
                <strong>ℹ️ Info:</strong> The frontend dev server (port 5173) runs separately from the backend (port 5000) during development.
            </div>
            
            <div class="instructions">
                <h3>📦 For production deployment:</h3>
                <ol>
                    <li>Run: <span class="code">cd frontend && npm run build</span></li>
                    <li>Then start backend normally</li>
                    <li>Frontend will be served from port 5000</li>
                </ol>
            </div>
            
            <p style="margin-top: 30px; color: #999; font-size: 12px;">
                Backend API available at: <span class="code">http://localhost:5000/api</span>
            </p>
        </div>
    </body>
    </html>
    """


@app.get("/")
async def serve_frontend():
    """Serve frontend: production build if available, otherwise show dev mode guide."""
    if DIST_INDEX_FILE.exists():
        return FileResponse(str(DIST_INDEX_FILE))
    # Return helpful HTML guide for development mode
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=get_dev_mode_html(), status_code=200)

app.include_router(staff_router)
app.include_router(faculty_router)
app.include_router(faculty_mgmt_router)
app.include_router(faculty_feedback_router)
app.include_router(faculty_skills_router)
app.include_router(faculty_mentorship_router)
app.include_router(faculty_research_router)
app.include_router(faculty_compliance_router)
app.include_router(faculty_okr_router)
app.include_router(faculty_publications_router)
app.include_router(payroll_router)
app.include_router(payroll_dev_router)
app.include_router(dashboard_router)
app.include_router(analytics_router)
app.include_router(exams_router)
app.include_router(timetable_router)
app.include_router(attendance_router)
app.include_router(placement_router)
app.include_router(facility_router)
app.include_router(notifications_router)
app.include_router(students_router)
app.include_router(admissions_router)
app.include_router(fees_router)
app.include_router(invoices_router)
app.include_router(user_settings_router)
app.include_router(auth_router)
app.include_router(newsletters_router)

@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    """Catch-all route: serve frontend for valid paths or 404 for API paths."""
    # Don't interfere with API routes or Swagger docs
    if full_path.startswith("api") or full_path.startswith("docs"):
        raise HTTPException(status_code=404)
    
    # If production build exists, serve it
    if DIST_INDEX_FILE.exists():
        return FileResponse(str(DIST_INDEX_FILE))
    
    # In development mode, guide user to run frontend dev server
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=get_dev_mode_html(), status_code=200)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=5000)
