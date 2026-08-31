import urllib.request
import urllib.parse
import urllib.error
import json
import time

BASE_URL = "http://localhost:8000"

def http_req(method, endpoint, payload=None, timeout=5):
    url = f"{BASE_URL}{endpoint}"
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode('utf-8')
            return resp.status, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        return e.code, json.loads(body) if body else None

def test_full_production():
    print("==================================================")
    print("RUNNING COMPLETE PRODUCTION RELEASE VERIFICATION")
    print("==================================================")

    now = int(time.time())
    handle = f"@student_prod_{now}"
    email = f"prod_{now}@campus.edu"
    pwd = "securepassword2026"

    # 1. Register student
    status, reg_data = http_req("POST", "/api/accounts", {
        "handle": handle,
        "displayName": "Production Test Student",
        "email": email,
        "password": pwd,
        "department": "Computer Science & Engineering",
        "semester": 6,
        "role": "STUDENT"
    })
    assert status == 200, f"Registration failed: {status}"
    print(f"[PASS] 1. Registered student account {handle}")

    # 2. Promote to OWNER_ADMIN (e.g. from admin panel on device 1)
    status, role_res = http_req("PUT", f"/api/accounts/{urllib.parse.quote(handle)}/role", {
        "role": "OWNER_ADMIN"
    })
    assert status == 200, f"Role promotion failed: {status}"
    print(f"[PASS] 2. Promoted {handle} to OWNER_ADMIN")

    # 3. Simulate login on another device as promoted admin via Email
    status, auth_res = http_req("POST", "/api/admin/auth", {
        "email": email,
        "key": pwd
    })
    assert status == 200, f"Promoted admin email login failed: {status} {auth_res}"
    assert auth_res["admin"]["role"] == "OWNER_ADMIN"
    print(f"[PASS] 3. Promoted Admin login on other device via Email ({email}): PASS")

    # 4. Simulate login on another device as promoted admin via @handle
    status, auth_res = http_req("POST", "/api/admin/auth", {
        "email": handle,
        "key": pwd
    })
    assert status == 200, f"Promoted admin handle login failed: {status} {auth_res}"
    print(f"[PASS] 4. Promoted Admin login on other device via @handle ({handle}): PASS")

    # 5. Simulate login on another device as promoted admin via raw username
    status, auth_res = http_req("POST", "/api/admin/auth", {
        "email": handle.lstrip("@"),
        "key": pwd
    })
    assert status == 200, f"Promoted admin username login failed: {status} {auth_res}"
    print(f"[PASS] 5. Promoted Admin login on other device via Username ({handle.lstrip('@')}): PASS")

    # 6. Verify Banners Unlimited addition
    test_banner_id = f"banner_release_{now}"
    status, b_save = http_req("POST", "/api/admin/banners", {
        "id": test_banner_id,
        "title": "Semester Launch & AI Tech Fest 2026",
        "subtitle": "Join the annual inter-college technical hackathon and project showcase.",
        "badge": "🚀 Tech Fest 2026",
        "cta_text": "Register Now →",
        "cta_url": "dashboard.html",
        "image_url": "img/banner1.jpg",
        "sort_order": 99,
        "active": 1
    })
    assert status == 200
    print(f"[PASS] 6. Added custom hero banner {test_banner_id}")

    # 7. Verify public banners contains the added banner
    status, banners = http_req("GET", "/api/banners")
    assert any(b["id"] == test_banner_id for b in banners)
    print(f"[PASS] 7. Verified public slider retrieves custom banner ({len(banners)} active banners in rotation)")

    # 8. Delete banner and verify permanence
    status, _ = http_req("DELETE", f"/api/admin/banners/{test_banner_id}")
    assert status == 200
    status, banners_after = http_req("GET", "/api/banners")
    assert not any(b["id"] == test_banner_id for b in banners_after)
    print(f"[PASS] 8. Deleted banner {test_banner_id} permanently verified.")

    # 9. Clean up test student
    http_req("DELETE", f"/api/accounts/{urllib.parse.quote(handle)}")
    print(f"[PASS] 9. Cleaned up test student account {handle}")

    print("==================================================")
    print("ALL PRODUCTION VERIFICATION SUITE TESTS PASSED 100%!")
    print("==================================================")

if __name__ == "__main__":
    test_full_production()
