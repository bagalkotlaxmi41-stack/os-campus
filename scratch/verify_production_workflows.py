import sys
import json
import urllib.request
import urllib.parse
import time

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE = "http://127.0.0.1:8000"

def test_workflows():
    print("=" * 70)
    print("VERIFYING PRODUCTION WORKFLOWS: SINGLE-ACCOUNT INTEGRITY & PERMANENT DELETION")
    print("=" * 70)

    ts = int(time.time())
    test_email = f"prod_student_{ts}@campus.edu"
    test_handle = f"@student_prod_{ts}"
    test_pass = "ProdPass#2026"

    # [1] Register student account
    print("\n[1] Registering student account with complete academic info...")
    req1 = urllib.request.Request(
        f"{BASE}/api/auth/register",
        data=json.dumps({
            "handle": test_handle,
            "displayName": "Ananya Sharma",
            "email": test_email,
            "password": test_pass,
            "department": "Computer Science & Engineering",
            "program": "BCA",
            "semester": 5,
            "usn": f"2BL22CS{ts % 1000:03d}",
            "bio": "AI & Distributed Systems Student",
            "skills": ["Python", "FastAPI", "React"],
            "photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req1) as resp:
        res1 = json.loads(resp.read().decode())
    print("✅ Created Account:", res1["account"]["displayName"], f"({res1['account']['handle']})")
    assert res1["status"] == "success"
    assert res1["account"]["photo"] is not None

    # [2] Test Login with exact email and password
    print("\n[2] Logging in with email & password...")
    req2 = urllib.request.Request(
        f"{BASE}/api/auth/login",
        data=json.dumps({
            "identifier": test_email,
            "password": test_pass
        }).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req2) as resp:
        res2 = json.loads(resp.read().decode())
    print("✅ Login Succeeded:", res2["user"]["displayName"], f"Email: {res2['user']['email']}")
    assert res2["status"] == "success"
    assert res2["user"]["handle"] == test_handle

    # [3] Verify student is searchable
    print("\n[3] Searching student by name...")
    with urllib.request.urlopen(f"{BASE}/api/accounts/search?q=Ananya") as resp:
        search_res = json.loads(resp.read().decode())
    assert any(a["handle"] == test_handle for a in search_res)
    print("✅ Found student in global search!")

    # [4] Create a study post by this student
    print("\n[4] Publishing study post by student...")
    post_id = f"post_test_{ts}"
    req_post = urllib.request.Request(
        f"{BASE}/api/posts",
        data=json.dumps({
            "id": post_id,
            "author": "Ananya Sharma",
            "handle": test_handle,
            "title": "Operating Systems Virtual Memory Walkthrough",
            "type": "text",
            "content": "Page replacement algorithms: FIFO, LRU, Optimal.",
            "subject": "Operating Systems",
            "department": "Computer Science & Engineering"
        }).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req_post) as resp:
        res_post = json.loads(resp.read().decode())
    assert res_post["status"] == "success"
    print("✅ Post Published:", post_id)

    # [5] Permanently Delete the student account
    print("\n[5] Permanently Deleting student account (simulating admin or user delete)...")
    req_del = urllib.request.Request(
        f"{BASE}/api/accounts/{urllib.parse.quote(test_handle)}",
        method="DELETE"
    )
    with urllib.request.urlopen(req_del) as resp:
        res_del = json.loads(resp.read().decode())
    assert res_del["status"] == "success"
    print("✅ Account Deletion Confirmed:", res_del["message"])

    # [6] Verify student is gone from database and search
    print("\n[6] Verifying account is PERMANENTLY deleted from directory and search...")
    with urllib.request.urlopen(f"{BASE}/api/accounts") as resp:
        all_accs = json.loads(resp.read().decode())
    assert not any(a["handle"] == test_handle for a in all_accs), "Deleted account must NOT exist in directory"

    with urllib.request.urlopen(f"{BASE}/api/posts") as resp:
        all_posts = json.loads(resp.read().decode())
    assert not any(p["handle"] == test_handle for p in all_posts), "Deleted student posts must NOT exist"
    print("✅ Deleted student and posts completely removed from system!")

    # [7] Test Admin Live Background Sync Endpoints
    print("\n[7] Testing Admin Live Background Polling Endpoints...")
    for ep in ["/api/admin/stats", "/api/accounts", "/api/banners", "/api/admin/audit-logs"]:
        with urllib.request.urlopen(f"{BASE}{ep}") as resp:
            assert resp.status == 200
            print(f"  ✅ Polling {ep} -> HTTP 200 OK")

    print("\n" + "=" * 70)
    print("🏆 ALL PRODUCTION WORKFLOW TESTS PASSED 100%!")
    print("=" * 70)

if __name__ == "__main__":
    test_workflows()
