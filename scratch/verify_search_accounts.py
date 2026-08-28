import sys
import json
import urllib.request

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE = "http://127.0.0.1:8000"

def run():
    print("Verifying that created accounts appear in search...")

    # 1. Create a test student account
    test_user = {
        "displayName": "Rohan Deshmukh",
        "handle": "@rohan_bca",
        "email": "rohan.deshmukh@bldea.edu",
        "password": "TestPassword123!",
        "program": "BCA",
        "department": "Computer Applications",
        "semester": 5,
        "usn": "2BL22CS777",
        "skills": ["Python", "Machine Learning", "Cloud"]
    }

    req = urllib.request.Request(
        f"{BASE}/api/auth/register",
        data=json.dumps(test_user).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
    print("✅ Created account for:", res.get("account", {}).get("displayName"))

    # 2. Search with empty query -> should return all accounts including Rohan
    with urllib.request.urlopen(f"{BASE}/api/accounts/search?q=") as resp:
        all_res = json.loads(resp.read().decode())
    found_in_all = any(a.get("handle") == "@rohan_bca" for a in all_res)
    print(f"✅ Search with empty query ('') returned {len(all_res)} accounts (Rohan found: {found_in_all})")
    assert found_in_all

    # 3. Search with single letter 'r' -> should return Rohan
    with urllib.request.urlopen(f"{BASE}/api/accounts/search?q=r") as resp:
        r_res = json.loads(resp.read().decode())
    found_in_r = any(a.get("handle") == "@rohan_bca" for a in r_res)
    print(f"✅ Search with single letter 'r' returned {len(r_res)} accounts (Rohan found: {found_in_r})")
    assert found_in_r

    # 4. Search by USN '2BL22CS777' -> should return Rohan
    with urllib.request.urlopen(f"{BASE}/api/accounts/search?q=2BL22CS777") as resp:
        usn_res = json.loads(resp.read().decode())
    found_by_usn = any(a.get("handle") == "@rohan_bca" for a in usn_res)
    print(f"✅ Search by USN '2BL22CS777' found: {found_by_usn}")
    assert found_by_usn

    # 5. Search by handle with and without @
    with urllib.request.urlopen(f"{BASE}/api/accounts/search?q=rohan_bca") as resp:
        handle_res = json.loads(resp.read().decode())
    found_by_handle = any(a.get("handle") == "@rohan_bca" for a in handle_res)
    print(f"✅ Search by handle 'rohan_bca' found: {found_by_handle}")
    assert found_by_handle

    # Clean up test user
    req = urllib.request.Request(f"{BASE}/api/accounts/@rohan_bca", method="DELETE")
    with urllib.request.urlopen(req) as resp:
        del_res = json.loads(resp.read().decode())
    print("✅ Cleaned up test user:", del_res)

    print("\n🎉 ALL SEARCH INTEGRATION TESTS PASSED 100%!")

if __name__ == "__main__":
    run()
