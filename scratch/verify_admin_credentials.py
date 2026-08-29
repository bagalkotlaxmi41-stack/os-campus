import sys
import json
import urllib.request

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE = "http://127.0.0.1:8000"

def test_credentials():
    print("=" * 60)
    print("VERIFYING OFFICIAL OWNER ADMIN CREDENTIALS")
    print("Email: campus0012@gmail.com | Password: campus@#1974")
    print("=" * 60)

    # 1. Test Admin Auth Endpoint with Email + Password
    print("\n[1] Testing POST /api/admin/auth with Email + Password...")
    req1 = urllib.request.Request(
        f"{BASE}/api/admin/auth",
        data=json.dumps({
            "email": "campus0012@gmail.com",
            "key": "campus@#1974"
        }).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req1) as resp:
        res1 = json.loads(resp.read().decode())
    print("✅ Admin Auth Response:", res1)
    assert res1.get("status") == "success"
    assert "token" in res1
    assert res1["admin"]["email"] == "campus0012@gmail.com"
    assert res1["admin"]["role"] == "OWNER_ADMIN"

    # 2. Test Admin Auth Endpoint with Master Key alone
    print("\n[2] Testing POST /api/admin/auth with Master Key 'campus@#1974' alone...")
    req2 = urllib.request.Request(
        f"{BASE}/api/admin/auth",
        data=json.dumps({
            "key": "campus@#1974"
        }).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req2) as resp:
        res2 = json.loads(resp.read().decode())
    print("✅ Master Key Response:", res2["status"], "- Token:", res2["token"][:16] + "...")
    assert res2.get("status") == "success"

    # 3. Test Student & General Login Endpoint with Admin Account
    print("\n[3] Testing POST /api/auth/login with Admin Credentials...")
    req3 = urllib.request.Request(
        f"{BASE}/api/auth/login",
        data=json.dumps({
            "identifier": "campus0012@gmail.com",
            "password": "campus@#1974"
        }).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req3) as resp:
        res3 = json.loads(resp.read().decode())
    print("✅ Login Endpoint Response:", res3["status"], f"- User: {res3['user']['displayName']} ({res3['user']['handle']})")
    assert res3.get("status") == "success"
    assert res3["user"]["role"] == "OWNER_ADMIN"

    print("\n" + "=" * 60)
    print("🏆 ALL OWNER ADMIN CREDENTIAL TESTS PASSED 100%!")
    print("=" * 60)

if __name__ == "__main__":
    test_credentials()
