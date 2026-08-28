import sys
import json
import urllib.request
import urllib.error

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE = "http://127.0.0.1:8000"

def run():
    print("Testing Full Authentication & Password Verification System...")

    # 1. Register new student with strong password
    student_payload = {
        "displayName": "Channu Patil",
        "handle": "@channu_cs",
        "email": "channu@bldea.edu",
        "password": "SecurePassword123!",
        "program": "BCA",
        "department": "Computer Science & Engineering",
        "semester": 5,
        "usn": "2BL22CS099",
        "bio": "Lead Full-Stack Platform Engineer"
    }

    req = urllib.request.Request(
        f"{BASE}/api/auth/register",
        data=json.dumps(student_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
    print("✅ Registered student:", res.get("account", {}).get("handle"))

    # 2. Reject duplicate email registration
    dup_payload = {
        "displayName": "Imposter Patil",
        "handle": "@imposter_cs",
        "email": "channu@bldea.edu",
        "password": "OtherPassword999!",
        "program": "BCA"
    }
    req = urllib.request.Request(
        f"{BASE}/api/auth/register",
        data=json.dumps(dup_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print("❌ Duplicate email was not rejected!")
            sys.exit(1)
    except urllib.error.HTTPError as e:
        print(f"✅ Duplicate email correctly rejected with HTTP {e.code}: {e.reason}")
        assert e.code == 400

    # 3. Reject login with wrong password
    bad_login_payload = {
        "identifier": "channu@bldea.edu",
        "password": "WrongPassword123"
    }
    req = urllib.request.Request(
        f"{BASE}/api/auth/login",
        data=json.dumps(bad_login_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print("❌ Bad password was accepted!")
            sys.exit(1)
    except urllib.error.HTTPError as e:
        print(f"✅ Bad password correctly rejected with HTTP {e.code}")
        assert e.code == 401

    # 4. Successful login with correct email + password
    good_login_payload = {
        "identifier": "channu@bldea.edu",
        "password": "SecurePassword123!"
    }
    req = urllib.request.Request(
        f"{BASE}/api/auth/login",
        data=json.dumps(good_login_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        login_res = json.loads(resp.read().decode())
    print("✅ Email Login successful for:", login_res.get("account", {}).get("displayName"))
    assert login_res.get("account", {}).get("handle") == "@channu_cs"

    # 5. Successful login with handle + password
    handle_login_payload = {
        "identifier": "@channu_cs",
        "password": "SecurePassword123!"
    }
    req = urllib.request.Request(
        f"{BASE}/api/auth/login",
        data=json.dumps(handle_login_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        handle_login_res = json.loads(resp.read().decode())
    print("✅ Handle Login successful for:", handle_login_res.get("account", {}).get("handle"))
    assert handle_login_res.get("account", {}).get("email") == "channu@bldea.edu"

    # 6. Clean up test account
    req = urllib.request.Request(f"{BASE}/api/accounts/@channu_cs", method="DELETE")
    with urllib.request.urlopen(req) as resp:
        del_res = json.loads(resp.read().decode())
    print("✅ Test account cleaned up:", del_res)

    print("\n🎉 ALL AUTHENTICATION & PASSWORD TESTS PASSED 100%!")

if __name__ == "__main__":
    run()
