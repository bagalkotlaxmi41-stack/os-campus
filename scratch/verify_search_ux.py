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

def test_search_ux():
    print("=" * 70)
    print("VERIFYING SEARCH UX: CLEAN INITIAL STATE, MULTI-TOKEN MATCHING & SYNC")
    print("=" * 70)

    ts = int(time.time())
    test_handle = f"@searchuser_{ts}"
    test_email = f"searchuser_{ts}@bldea.edu"
    test_name = "Rohit Verma"

    # 1. Create a user to search for
    print("\n[1] Creating student account for search test...")
    req = urllib.request.Request(
        f"{BASE}/api/auth/register",
        data=json.dumps({
            "handle": test_handle,
            "displayName": test_name,
            "email": test_email,
            "password": "Password#123",
            "department": "Computer Science & Engineering",
            "program": "BCA",
            "semester": 6,
            "usn": f"2BL22CS{ts % 1000:03d}"
        }).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
    assert res["status"] == "success"
    print(f"✅ Created student: {test_name} ({test_handle})")

    # 2. Test Multi-Token Query
    print("\n[2] Searching by partial first name + last name ('rohit ver')...")
    with urllib.request.urlopen(f"{BASE}/api/accounts/search?q=rohit%20ver") as resp:
        matches = json.loads(resp.read().decode())
    assert any(a["handle"] == test_handle for a in matches), "Multi-token search must find student"
    print(f"✅ Found {len(matches)} match(es) for 'rohit ver'!")

    # 3. Test Search by @handle
    print("\n[3] Searching by @handle ('searchuser')...")
    with urllib.request.urlopen(f"{BASE}/api/accounts/search?q=searchuser") as resp:
        matches = json.loads(resp.read().decode())
    assert any(a["handle"] == test_handle for a in matches), "Handle search must find student"
    print(f"✅ Found {len(matches)} match(es) for 'searchuser'!")

    # 4. Test Search with No Matches
    print("\n[4] Searching for non-existent keyword ('xyznonexistentquery999')...")
    with urllib.request.urlopen(f"{BASE}/api/accounts/search?q=xyznonexistentquery999") as resp:
        matches = json.loads(resp.read().decode())
    assert len(matches) == 0, "No matches should be returned for non-existent query"
    print("✅ Non-existent query correctly returns empty list (0 matches)!")

    # 5. Clean up created test user
    print("\n[5] Cleaning up test student...")
    req_del = urllib.request.Request(f"{BASE}/api/accounts/{urllib.parse.quote(test_handle)}", method="DELETE")
    with urllib.request.urlopen(req_del) as resp:
        assert resp.status == 200
    print("✅ Cleaned up successfully.")

    print("\n" + "=" * 70)
    print("🏆 ALL SEARCH UX TESTS PASSED 100%!")
    print("=" * 70)

if __name__ == "__main__":
    test_search_ux()
