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

def run_tests():
    print("=" * 70)
    print("CAMPUS OS COMPREHENSIVE END-TO-END SYSTEM TEST")
    print("=" * 70)
    
    passed = 0
    failed = 0

    def test(name, fn):
        nonlocal passed, failed
        try:
            fn()
            print(f"  ✅ [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  ❌ [FAIL] {name}: {e}")
            failed += 1

    # 1. Test GET /health
    def t_health():
        req = urllib.request.urlopen(f"{BASE}/health")
        data = json.loads(req.read().decode())
        assert req.status == 200
        assert data.get("status") == "online"
    test("Health Check API", t_health)

    # 2. Test Official Owner Admin Auth
    def t_admin():
        req = urllib.request.Request(
            f"{BASE}/api/admin/auth",
            data=json.dumps({"email": "campus0012@gmail.com", "key": "campus@#1974"}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            assert data["status"] == "success"
            assert data["admin"]["role"] == "OWNER_ADMIN"
    test("Official Admin Auth (campus0012@gmail.com / campus@#1974)", t_admin)

    # 3. Test Invalid Admin Auth Rejection
    def t_admin_bad():
        try:
            req = urllib.request.Request(
                f"{BASE}/api/admin/auth",
                data=json.dumps({"email": "campus0012@gmail.com", "key": "wrong_password_123"}).encode(),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            urllib.request.urlopen(req)
            assert False, "Should have failed"
        except urllib.error.HTTPError as e:
            assert e.code == 401
    test("Admin Auth Rejects Invalid Password with 401", t_admin_bad)

    # 4. Test Student Registration & Login Flow
    test_user_handle = f"@student_{int(time.time())}"
    test_user_email = f"student_{int(time.time())}@campus.edu"
    test_user_pass = "SecurePass123!"

    def t_reg():
        req = urllib.request.Request(
            f"{BASE}/api/auth/register",
            data=json.dumps({
                "handle": test_user_handle,
                "displayName": "Test Student QA",
                "email": test_user_email,
                "password": test_user_pass,
                "department": "Computer Science & Engineering",
                "semester": 6,
                "usn": "2BL22CS999"
            }).encode(),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            assert data["status"] == "success"
            assert data["user"]["handle"] == test_user_handle
    test("Student Registration Flow", t_reg)

    def t_login():
        req = urllib.request.Request(
            f"{BASE}/api/auth/login",
            data=json.dumps({
                "identifier": test_user_email,
                "password": test_user_pass
            }).encode(),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            assert data["status"] == "success"
            assert data["user"]["handle"] == test_user_handle
    test("Student Login Flow with Email & Password", t_login)

    # 5. Test Duplicate Email Prevention
    def t_dup():
        try:
            req = urllib.request.Request(
                f"{BASE}/api/auth/register",
                data=json.dumps({
                    "handle": f"@other_{int(time.time())}",
                    "displayName": "Duplicate Email Attempt",
                    "email": test_user_email,
                    "password": "some_password"
                }).encode(),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            urllib.request.urlopen(req)
            assert False, "Should have rejected duplicate email"
        except urllib.error.HTTPError as e:
            assert e.code == 400
    test("Duplicate Email Registration Prevention", t_dup)

    # 6. Test Multi-Token Account Search
    def t_search():
        encoded = urllib.parse.quote("Test Student")
        with urllib.request.urlopen(f"{BASE}/api/accounts/search?q={encoded}") as resp:
            data = json.loads(resp.read().decode())
            found = any(a["handle"] == test_user_handle for a in data)
            assert found, "Created student should be found in search"
    test("Global Account Search by Multi-Token Name", t_search)

    # 7. Test Student Post Publishing & Stream Retrieval
    post_id = f"post_qa_{int(time.time())}"
    def t_post():
        req = urllib.request.Request(
            f"{BASE}/api/posts",
            data=json.dumps({
                "id": post_id,
                "author": "Test Student QA",
                "handle": test_user_handle,
                "title": "Machine Learning Model Deployment QA Notes",
                "type": "text",
                "content": "Step 1: Dockerize the FastAPI backend. Step 2: Set up CORS and SSL.",
                "subject": "Machine Learning",
                "likes": 5,
                "saves": 3,
                "department": "Computer Science & Engineering"
            }).encode(),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            assert data["status"] == "success"
    test("Create & Publish Student Post", t_post)

    def t_post_get():
        with urllib.request.urlopen(f"{BASE}/api/posts") as resp:
            data = json.loads(resp.read().decode())
            assert any(p["id"] == post_id for p in data)
    test("Verify Post Appears in Global Feed", t_post_get)

    # 8. Test Clean URL Routes on Backend
    clean_routes = ["/admin", "/dashboard", "/feed", "/profile", "/notes", "/tasks", "/attendance", "/timetable", "/resources", "/auth"]
    for cr in clean_routes:
        def make_route_test(route):
            def t_route():
                with urllib.request.urlopen(f"{BASE}{route}") as resp:
                    assert resp.status == 200
            return t_route
        test(f"Clean URL Route {cr} responds 200 OK", make_route_test(cr))

    # 9. Cleanup created test user and post
    def t_cleanup():
        req1 = urllib.request.Request(f"{BASE}/api/posts/{post_id}", method="DELETE")
        with urllib.request.urlopen(req1) as r1:
            assert r1.status == 200
        
        req2 = urllib.request.Request(f"{BASE}/api/accounts/{test_user_handle}", method="DELETE")
        with urllib.request.urlopen(req2) as r2:
            assert r2.status == 200
    test("Data Cleanup & Cascading Account Deletion", t_cleanup)

    print("\n" + "=" * 70)
    print(f"E2E AUDIT COMPLETE: {passed} Passed, {failed} Failed (Total: {passed + failed})")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
