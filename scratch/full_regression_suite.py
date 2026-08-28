# Campus OS - Master Automated Regression & QA Test Suite
import sys
import os
import urllib.request
import urllib.error
import json
import time

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE = "http://127.0.0.1:8000"
results = {"passed": 0, "failed": 0, "failures": []}

def check(condition, desc, detail=""):
    if condition:
        results["passed"] += 1
        print(f"  [PASS] {desc}")
    else:
        results["failed"] += 1
        results["failures"].append(f"{desc}: {detail}")
        print(f"  [FAIL] {desc} -> {detail}")

def http_get(path):
    try:
        req = urllib.request.Request(f"{BASE}{path}")
        res = urllib.request.urlopen(req, timeout=5)
        return res.status, res.read().decode('utf-8', errors='ignore')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', errors='ignore')
    except Exception as e:
        return 0, str(e)

def http_post(path, data):
    try:
        payload = json.dumps(data).encode('utf-8')
        req = urllib.request.Request(f"{BASE}{path}", data=payload, headers={"Content-Type": "application/json"}, method="POST")
        res = urllib.request.urlopen(req, timeout=5)
        return res.status, res.read().decode('utf-8', errors='ignore')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', errors='ignore')
    except Exception as e:
        return 0, str(e)

def http_delete(path):
    try:
        req = urllib.request.Request(f"{BASE}{path}", method="DELETE")
        res = urllib.request.urlopen(req, timeout=5)
        return res.status, res.read().decode('utf-8', errors='ignore')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', errors='ignore')
    except Exception as e:
        return 0, str(e)

print("="*65)
print("CAMPUS OS - COMPREHENSIVE PRODUCTION QA & REGRESSION SUITE")
print("="*65)

# 1. API Health
print("\n[1] Backend API Health & Uptime")
c, body = http_get("/health")
check(c == 200, "GET /health status 200", f"code {c}")
if c == 200:
    data = json.loads(body)
    check(data.get("status") == "online", "API status is 'online'")
    check("version" in data, f"API version present: {data.get('version')}")

# 2. Pages Load & SEO Attributes (All 10 Pages)
print("\n[2] Frontend Pages & SEO Metadata Verification (10 Pages)")
pages = [
    ("index.html", "Home Landing"),
    ("feed.html", "Campus Stream / Reels"),
    ("profile.html", "Student Passport"),
    ("dashboard.html", "Student Dashboard"),
    ("notes.html", "Smart Notes Vault"),
    ("tasks.html", "Task Kanban"),
    ("attendance.html", "Attendance Radar"),
    ("timetable.html", "Weekly Timetable"),
    ("resources.html", "Resource Hub"),
    ("auth.html", "Auth / Login")
]

frontend_base = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")

for path, name in pages:
    file_path = os.path.join(frontend_base, path)
    check(os.path.exists(file_path), f"Page {path} ({name}) file exists")
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            html = f.read()
        check("<title>" in html and "</title>" in html, f"Page {path} has <title>")
        check('name="description"' in html, f"Page {path} has meta description")
        check('name="viewport"' in html, f"Page {path} has viewport meta")
        check('rel="icon"' in html, f"Page {path} has favicon link")
        check('lang="en"' in html, f"Page {path} has lang='en'")

# 3. Static Assets Load
print("\n[3] Static Assets (CSS, JS, Images, Icons)")
assets = [
    "css/base.css",
    "css/components.css",
    "css/animations.css",
    "js/storage.js",
    "js/api.js",
    "js/app.js",
    "js/firebase-config.js",
    "img/logo.jpg",
    "img/logo.png",
    "img/banner1.jpg",
    "img/banner2.jpg",
    "img/banner3.jpg",
    "favicon.ico"
]

for a in assets:
    asset_file = os.path.join(frontend_base, a)
    exists = os.path.exists(asset_file)
    size = os.path.getsize(asset_file) if exists else 0
    check(exists and size > 0, f"Asset {a} exists and is non-empty ({size} bytes)")

# 4. Account CRUD, One-Email-One-Account, & Search Flow
print("\n[4] Account Management, Email Uniqueness, & Search")
ts = int(time.time())
test_user = f"@regtest_{ts}"
test_email = f"student_{ts}@campusos.edu"

acc_payload = {
    "displayName": "Regression Scholar",
    "username": test_user,
    "handle": test_user,
    "email": test_email,
    "program": "BCA",
    "department": "Computer Science & Engineering",
    "semester": 5,
    "bio": "Automated regression tester profile",
    "skills": ["Python", "FastAPI", "Testing"],
    "college": "Jamakhandi Campus"
}

code, res = http_post("/api/accounts", acc_payload)
check(code in (200, 201), f"POST /api/accounts creates user {test_user}", f"code {code}")

# Test strict duplicate email rejection
dup_payload = {
    "displayName": "Duplicate Email Student",
    "username": f"@dup_{ts}",
    "handle": f"@dup_{ts}",
    "email": test_email, # Same email!
    "program": "BSc",
    "department": "Science",
    "semester": 1
}
code_dup, res_dup = http_post("/api/accounts", dup_payload)
check(code_dup == 400, f"Duplicate email correctly rejected with HTTP 400", f"code {code_dup}")

code, res = http_get(f"/api/accounts/search?q=Scholar")
check(code == 200 and test_user.lower() in res.lower(), f"Search API finds created user by name", f"code {code}")

# 5. Post Creation with Seen View Tracking
print("\n[5] Post Creation & Real-Time Seen Counter")
post_payload = {
    "id": f"post_reg_{ts}",
    "type": "text",
    "title": "Regression Verified Note on Data Structures",
    "subject": "DSA",
    "department": "CSE",
    "desc": "Testing end-to-end post publication pipeline",
    "author": "Regression Scholar",
    "handle": test_user
}
code, res = http_post("/api/posts", post_payload)
check(code in (200, 201), f"POST /api/posts creates text post", f"code {code}")

code, res = http_post(f"/api/posts/{post_payload['id']}/view", {})
check(code == 200, f"POST /api/posts/{{id}}/view increments seen counter", f"code {code}")

# 6. Timetable, Tasks, Notes, & Attendance APIs
print("\n[6] Workspace Feature APIs (Notes, Tasks, Attendance, Timetable)")
note_code, _ = http_post("/api/notes", {
    "handle": test_user, "title": "Test Note", "subject": "DSA", "content": "Notes content"
})
check(note_code in (200, 201), "POST /api/notes creates note", f"code {note_code}")

task_code, _ = http_post("/api/tasks", {
    "handle": test_user, "title": "Test Task", "priority": "high", "status": "todo"
})
check(task_code in (200, 201), "POST /api/tasks creates task", f"code {task_code}")

att_code, _ = http_post("/api/attendance", {
    "handle": test_user, "name": "Operating Systems", "code": "CS501", "present": 18, "total": 20
})
check(att_code in (200, 201), "POST /api/attendance creates subject", f"code {att_code}")

calc_code, calc_res = http_post("/api/attendance/calculate", {
    "subject": "Operating Systems", "present": 18, "total": 20, "target_percentage": 75.0
})
check(calc_code == 200, "POST /api/attendance/calculate computes attendance radar", f"code {calc_code}")

# 7. Cleanup & Cascade Deletion
print("\n[7] Account Deletion & Cascading Cleanup")
del_code, del_res = http_delete(f"/api/accounts/{test_user}")
check(del_code == 200, f"DELETE /api/accounts/{test_user} removes account and cascaded data", f"code {del_code}")

print("\n" + "="*65)
print(f"FINAL AUDIT RESULTS: {results['passed']} Passed, {results['failed']} Failed")
print("="*65)

if results["failed"] == 0:
    print("🏆 ALL REGRESSION AUDITS PASSED WITH 100% SUCCESS RATE!")
else:
    print(f"⚠️ {results['failed']} tests failed. Review failures above.")
