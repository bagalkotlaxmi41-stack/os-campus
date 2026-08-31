import os
import sys
import json
import time
import urllib.request
import urllib.parse
import urllib.error

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

def test_promoted_admin_auth():
    print("==================================================")
    print("TESTING ADMIN AUTH & PROMOTED USER LOGIN")
    print("==================================================")

    # 1. Test Official Admin Login (Email)
    status, data = http_req("POST", "/api/admin/auth", {
        "email": "campus0012@gmail.com",
        "key": "campus@#1974"
    })
    assert status == 200, f"Failed official email login: {status} {data}"
    assert data["admin"]["role"] == "OWNER_ADMIN"
    print("[PASS] 1. Official Admin Email login successful:", data["admin"])

    # 2. Test Official Admin Login (Handle)
    status, data = http_req("POST", "/api/admin/auth", {
        "email": "@campus_admin",
        "key": "campus@#1974"
    })
    assert status == 200, f"Failed official handle login: {status} {data}"
    print("[PASS] 2. Official Admin Handle login successful:", data["admin"]["handle"])

    # 3. Create a test student account
    test_handle = f"@student_promoted_{int(time.time())}"
    test_email = f"promoted_{int(time.time())}@campus.edu"
    test_pass = "mypassword123"

    status, reg_data = http_req("POST", "/api/accounts", {
        "handle": test_handle,
        "displayName": "Alex Scholar",
        "email": test_email,
        "password": test_pass,
        "department": "Computer Science & Engineering",
        "semester": 5,
        "role": "STUDENT"
    })
    assert status == 200, f"Failed student registration: {status} {reg_data}"
    print(f"[PASS] 3. Registered test student {test_handle}")

    # 4. Verify student CANNOT login to admin yet
    status, data = http_req("POST", "/api/admin/auth", {
        "email": test_email,
        "key": test_pass
    })
    assert status == 401, f"Expected 401 for unpromoted student, got: {status}"
    print(f"[PASS] 4. Unpromoted student {test_handle} correctly blocked with 401.")

    # 5. Promote student to OWNER_ADMIN
    status, role_data = http_req("PUT", f"/api/accounts/{urllib.parse.quote(test_handle)}/role", {
        "role": "OWNER_ADMIN"
    })
    assert status == 200, f"Failed to promote student: {status} {role_data}"
    print(f"[PASS] 5. Promoted {test_handle} to OWNER_ADMIN:", role_data)

    # 6. Test Promoted User Login via Email + Password
    status, data = http_req("POST", "/api/admin/auth", {
        "email": test_email,
        "key": test_pass
    })
    assert status == 200, f"Failed promoted email login: {status} {data}"
    assert data["admin"]["role"] == "OWNER_ADMIN"
    assert data["admin"]["displayName"] == "Alex Scholar"
    print(f"[PASS] 6. Promoted User Email Login successful ({test_email}):", data["admin"])

    # 7. Test Promoted User Login via Handle (@handle) + Password
    status, data = http_req("POST", "/api/admin/auth", {
        "email": test_handle,
        "key": test_pass
    })
    assert status == 200, f"Failed promoted handle login: {status} {data}"
    print(f"[PASS] 7. Promoted User Handle Login successful ({test_handle}):", data["admin"])

    # 8. Test Promoted User Login via Username (without @) + Password
    status, data = http_req("POST", "/api/admin/auth", {
        "email": test_handle.lstrip("@"),
        "key": test_pass
    })
    assert status == 200, f"Failed promoted raw username login: {status} {data}"
    print(f"[PASS] 8. Promoted User Raw Username Login successful ({test_handle.lstrip('@')}):", data["admin"])

    # 9. Clean up test account
    status, _ = http_req("DELETE", f"/api/accounts/{urllib.parse.quote(test_handle)}")
    assert status == 200
    print(f"[PASS] 9. Cleaned up test account {test_handle}.")

    print("==================================================")
    print("ALL PROMOTED ADMIN TESTS COMPLETED & PASSED!")
    print("==================================================")

if __name__ == "__main__":
    test_promoted_admin_auth()
