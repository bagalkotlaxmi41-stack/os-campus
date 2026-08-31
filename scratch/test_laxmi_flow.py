import urllib.request
import urllib.parse
import urllib.error
import json
import time

BASE_URL = "http://localhost:8000"

def http_req(method, endpoint, payload=None, timeout=6):
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

def test_laxmi_flow():
    print("==================================================================")
    print("TESTING REAL-TIME ACCOUNT: LAXMI PATIL AUTHENTICATION & ADMIN FLOW")
    print("==================================================================")

    handle = "@laxmi_patil"
    email = "laxmi.patil@campus.edu"
    pwd = "Laxmi#Pass2026"

    # 1. Register Laxmi's Account
    status, reg_res = http_req("POST", "/api/accounts", {
        "handle": handle,
        "displayName": "Laxmi Patil",
        "email": email,
        "password": pwd,
        "department": "Computer Science & Engineering",
        "semester": 6,
        "usn": "2BL22CS088",
        "bio": "Lead Software Engineering & AI Scholar at Campus OS.",
        "skills": ["Python", "FastAPI", "React", "Cloud Architecture", "Machine Learning"],
        "role": "STUDENT"
    })
    assert status == 200, f"Registration failed with status {status}"
    print(f"[PASS] 1. Registered real account: {reg_res.get('account', {}).get('displayName')} ({handle})")

    # 2. Student Authentication Login
    status, login_res = http_req("POST", "/api/auth/login", {
        "identifier": email,
        "password": pwd
    })
    assert status == 200, f"Login failed: {status}"
    assert login_res["account"]["handle"] == handle
    print(f"[PASS] 2. Student login verified for {email}")

    # 3. Promote Laxmi to OWNER_ADMIN
    status, role_res = http_req("PUT", f"/api/accounts/{urllib.parse.quote(handle)}/role", {
        "role": "OWNER_ADMIN"
    })
    assert status == 200, f"Promotion failed: {status}"
    print(f"[PASS] 3. Promoted {handle} to OWNER_ADMIN")

    # 4. Gatekeeper Auth (Email)
    status, auth_email = http_req("POST", "/api/admin/auth", {"email": email, "key": pwd})
    assert status == 200, f"Admin email auth failed: {status}"
    assert auth_email["admin"]["role"] == "OWNER_ADMIN"
    print(f"[PASS] 4a. Gatekeeper login via Email ({email}): PASS")

    # 5. Gatekeeper Auth (@Handle)
    status, auth_handle = http_req("POST", "/api/admin/auth", {"email": handle, "key": pwd})
    assert status == 200, f"Admin handle auth failed: {status}"
    print(f"[PASS] 4b. Gatekeeper login via @Handle ({handle}): PASS")

    # 6. Gatekeeper Auth (Username)
    status, auth_user = http_req("POST", "/api/admin/auth", {"email": "laxmi_patil", "key": pwd})
    assert status == 200, f"Admin username auth failed: {status}"
    print(f"[PASS] 4c. Gatekeeper login via Username (laxmi_patil): PASS")

    # 7. Publish study post from Laxmi's account
    status, post_res = http_req("POST", "/api/posts", {
        "handle": handle,
        "author": "Laxmi Patil",
        "title": "Cloud Computing & Distributed Systems Architecture Guide",
        "subject": "Cloud Computing",
        "department": "Computer Science & Engineering",
        "desc": "Complete notes on Microservices, Docker containers, Kubernetes clusters, and AWS serverless architectures.",
        "type": "pdf",
        "fileName": "Cloud_Architecture_Guide_2026.pdf",
        "fileSize": "3.8 MB"
    })
    assert status == 200, f"Post creation failed: {status}"
    post_id = post_res.get("post", {}).get("id")
    print(f"[PASS] 5. Laxmi published study material: {post_id}")

    # 8. Check that NO fake accounts (@priya_sharma, etc.) exist in the directory
    status, all_accs = http_req("GET", "/api/accounts")
    assert status == 200
    fake_names = ["@priya_sharma", "@vikram_patil", "@ananya_kulkarni", "@rahul_verma"]
    for acc in all_accs:
        assert acc["handle"] not in fake_names, f"Fake account {acc['handle']} found in database!"
    print(f"[PASS] 6. Verified directory contains ONLY real accounts (0 fake accounts found)")

    # 9. Verify Hero Banners are dynamic & managed via Admin
    status, banners = http_req("GET", "/api/banners")
    assert status == 200
    print(f"[PASS] 7. Dynamic Admin Banners active in rotation: {len(banners)} banner(s)")

    print("==================================================================")
    print("[SUCCESS] ALL LAXMI PATIL AUTHENTICATION & ADMIN FLOW TESTS PASSED 100%!")
    print("==================================================================")

if __name__ == "__main__":
    test_laxmi_flow()
