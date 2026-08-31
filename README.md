# 🎓 Campus OS — Smart Academic Operating Platform

> **Modern, high-performance, real-time academic operating platform engineered for universities and student communities everywhere.**

[![Status](https://img.shields.io/badge/Status-Active-brightgreen.svg)]()
[![Frontend](https://img.shields.io/badge/Frontend-Vanilla%20HTML5%20%7C%20CSS3%20%7C%20JS-8b5cf6.svg)]()
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.10+-38bdf8.svg)]()
[![Database](https://img.shields.io/badge/Database-Firebase%20Firestore%20%2B%20SQLite-10b981.svg)]()

---

## 🌟 Key Features

### 📊 Academic Dashboard (`dashboard.html`)
- Unified academic overview with GPA target tracking, today's schedule, quick internal test scores, and active task progress.

### 📅 Interactive Class Timetable (`timetable.html`)
- 6-day lecture period schedule matrix tailored by degree, branch, and semester.
- Period timings, classroom/lab locators, and interactive slot editing.

### 📈 75% Attendance Radar (`attendance.html`)
- Automated University 75% minimum criteria calculator.
- Real-time Safe Bunk Margin indicator and class eligibility predictor.

### 📝 Smart Notes Vault (`notes.html`)
- Organized course notes repository with color tagging, PDF attachments, and AI lecture summary extraction.

### ✅ Kanban Task & Assignment Planner (`tasks.html`)
- Visual Kanban workflow (`To Do` → `In Progress` → `Done`) for assignments, seminars, and internal exams.

### 📚 University Question Bank (`resources.html`)
- Previous years' university question papers, lab manuals, and official syllabus schemes.

### 👤 Student Passport & Real Student Directory (`profile.html`)
- Authentic student profiles with degree, branch (BCA, BSc, B.Pharm, B.Tech, BBA, B.Com, etc.), USN, verified status, and custom profile photo upload.
- Global Search overlay (`Ctrl+K`) for finding real registered classmates across branches.

### 📢 Campus Intelligence & Noticeboard (`index.html`)
- Live official Administrator broadcast and circulars stream.
- Dynamic unlimited hero banner carousel managed by campus administrators.
- Daily Concept & Placement Aptitude Challenge with step-by-step solution reveals.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Design System, Glassmorphism, Dark Mode), JavaScript (ES6+), Firebase SDK (Compat).
- **Backend API**: Python 3.10+, FastAPI, Uvicorn, SQLite.
- **Realtime Cloud Sync**: Dual synchronization with Firebase Firestore and FastAPI REST API.

---

## 🚀 Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/bagalkotlaxmi41-stack/os-campus.git
cd os-campus
```

### 2. Run the Backend API (FastAPI)
```bash
# Navigate to backend and install requirements
cd backend
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload --port 8000
```
Backend API runs at `http://localhost:8000` (Swagger docs: `http://localhost:8000/docs`).

### 3. Run the Frontend Client
```bash
# Open frontend in any local HTTP server
cd ../frontend
python -m http.server 8080
```
Visit `http://localhost:8080` in your web browser.

---

## 📁 Project Structure

```
os-campus/
├── backend/
│   ├── main.py              # FastAPI server, endpoints & SQLite database
│   └── requirements.txt     # Python backend dependencies
├── frontend/
│   ├── index.html           # Homepage & Campus Bulletin Hub
│   ├── dashboard.html       # Student Academic Workspace Dashboard
│   ├── timetable.html       # Weekly Lecture Schedule Matrix
│   ├── attendance.html      # 75% Attendance Radar & Calculator
│   ├── notes.html           # Smart Study Notes Vault
│   ├── tasks.html           # Kanban Assignment Planner
│   ├── resources.html       # University Question Papers & Syllabus
│   ├── profile.html         # Student Passport & Profile
│   ├── auth.html            # Sign In / Account Onboarding
│   ├── css/                 # Design system, components & animations
│   ├── js/                  # Storage, API sync & Firebase config
│   └── img/                 # 4K Campus Banners & Brand Assets
├── .gitignore
└── README.md
```

---

## 📜 License
Campus OS — Universal Open Academic Operating Platform.
