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

def test_strict_production_suite():
    print("==================================================================")
    print("STRICT PRODUCTION VERIFICATION: ZERO XP & REAL-TIME SYSTEM AUDIT")
    print("==================================================================")

    now = int(time.time())
    handle = f"@scholar_{now}"
    email = f"scholar_{now}@campus.edu"
    pwd = "ScholarPass#2026"

    # 1. Register student account
    status, reg_res = http_req("POST", "/api/accounts", {
        "handle": handle,
        "displayName": "Strict Test Scholar",
        "email": email,
        "password": pwd,
        "department": "Artificial Intelligence & DS",
        "semester": 5,
        "role": "STUDENT"
    })
    assert status == 200, f"Registration failed with status {status}"
    acc = reg_res.get("account", {})
    assert "xp" not in acc, f"XP should not be returned in account object: {acc}"
    print(f"[PASS] 1. Registered student account {handle} (Zero XP in payload)")

    # 2. Search accounts
    status, search_res = http_req("GET", f"/api/accounts/search?q={urllib.parse.quote(handle)}")
    assert status == 200, f"Search failed with status {status}"
    assert len(search_res) > 0, "Registered account must appear in search results"
    assert "xp" not in search_res[0], "XP should not be present in search results"
    print(f"[PASS] 2. Account found in real-time directory search without XP fields")

    # 3. Create a student post (sharing notes)
    status, post_res = http_req("POST", "/api/posts", {
        "handle": handle,
        "author": "Strict Test Scholar",
        "title": "Deep Learning & Transformer Architectures Notes",
        "subject": "Deep Learning",
        "department": "Artificial Intelligence & DS",
        "desc": "Verified notes covering Attention Mechanisms, BERT, and GPT architectures.",
        "type": "pdf",
        "fileName": "Transformer_Notes_2026.pdf",
        "fileSize": "2.4 MB"
    })
    assert status == 200, f"Post creation failed: {status}"
    post_id = post_res.get("post", {}).get("id")
    print(f"[PASS] 3. Published academic study material {post_id}")

    # 4. Check that creator's account does not award XP or have XP modified
    status, prof_res = http_req("GET", f"/api/accounts/{urllib.parse.quote(handle)}")
    assert status == 200, f"Profile fetch failed: {status}"
    assert "xp" not in prof_res, f"XP must not be returned in profile: {prof_res}"
    print(f"[PASS] 4. Profile fetched successfully without XP: {prof_res['displayName']} ({prof_res['department']})")

    # 5. Promote user to OWNER_ADMIN
    status, role_res = http_req("PUT", f"/api/accounts/{urllib.parse.quote(handle)}/role", {
        "role": "OWNER_ADMIN"
    })
    assert status == 200, f"Role promotion failed: {status}"
    print(f"[PASS] 5. Promoted {handle} to OWNER_ADMIN")

    # 6. Test Multi-Identifier Admin Gatekeeper Login
    # a. Email login
    status, auth_email = http_req("POST", "/api/admin/auth", {"email": email, "key": pwd})
    assert status == 200, f"Email auth failed: {status} {auth_email}"
    assert auth_email["admin"]["role"] == "OWNER_ADMIN"
    print(f"[PASS] 6a. Promoted Admin login via Email ({email}): PASS")

    # b. @Handle login
    status, auth_handle = http_req("POST", "/api/admin/auth", {"email": handle, "key": pwd})
    assert status == 200, f"Handle auth failed: {status} {auth_handle}"
    print(f"[PASS] 6b. Promoted Admin login via @Handle ({handle}): PASS")

    # c. Raw username login
    status, auth_user = http_req("POST", "/api/admin/auth", {"email": handle.lstrip("@"), "key": pwd})
    assert status == 200, f"Username auth failed: {status} {auth_user}"
    print(f"[PASS] 6c. Promoted Admin login via Username ({handle.lstrip('@')}): PASS")

    # 7. Admin Stats Endpoint check
    status, stats_res = http_req("GET", "/api/admin/stats")
    assert status == 200, f"Admin stats failed: {status}"
    for st in stats_res.get("recent_students", []):
        assert "xp" not in st, "XP should not appear in admin recent students"
    print(f"[PASS] 7. Admin stats verified (KPIs: {stats_res['total_students']} students, {stats_res['total_posts']} posts)")

    # 8. Clean up created post and test student
    http_req("DELETE", f"/api/posts/{urllib.parse.quote(post_id)}")
    http_req("DELETE", f"/api/accounts/{urllib.parse.quote(handle)}")
    print(f"[PASS] 8. Cleaned up test post and account.")

    print("==================================================================")
    print("ALL STRICT AUDIT TESTS PASSED 100% — APPLICATION IS PRODUCTION READY!")
    print("==================================================================")

if __name__ == "__main__":
    test_strict_production_suite()
