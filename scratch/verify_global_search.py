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
    print("=" * 60)
    print("TESTING GLOBAL REAL-TIME ACCOUNT SEARCH & DIRECTORY SYNC")
    print("=" * 60)

    # 1. Register test student friend account
    friend_account = {
        "handle": "@anand_biradar",
        "displayName": "Anand Biradar",
        "email": "anand.b@blde.edu",
        "password": "Password#123",
        "department": "Computer Science & Engineering",
        "semester": 5,
        "usn": "2BL22CS014",
        "bio": "Web Development & AI enthusiast at BLDE Jamakhandi.",
        "skills": ["Python", "FastAPI", "React", "Data Structures"],
        "role": "STUDENT",
        "xp": 320
    }

    req = urllib.request.Request(
        f"{BASE}/api/accounts",
        data=json.dumps(friend_account).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
    print("✅ Created student friend account:", res["account"]["displayName"], f"({res['account']['handle']})")

    # 2. Search empty query (should return all created accounts)
    with urllib.request.urlopen(f"{BASE}/api/accounts/search?q=") as resp:
        all_accs = json.loads(resp.read().decode())
    print(f"✅ Empty query returned {len(all_accs)} registered account(s).")
    assert any(a["handle"] == "@anand_biradar" for a in all_accs)

    # 3. Search by partial name: "anand"
    with urllib.request.urlopen(f"{BASE}/api/accounts/search?q=anand") as resp:
        name_search = json.loads(resp.read().decode())
    assert len(name_search) > 0
    assert name_search[0]["handle"] == "@anand_biradar"
    print("✅ Search by first name 'anand' matched:", name_search[0]["displayName"])

    # 4. Search by USN: "2BL22CS014"
    with urllib.request.urlopen(f"{BASE}/api/accounts/search?q=2BL22CS014") as resp:
        usn_search = json.loads(resp.read().decode())
    assert len(usn_search) > 0
    assert usn_search[0]["usn"] == "2BL22CS014"
    print("✅ Search by USN '2BL22CS014' matched:", usn_search[0]["displayName"])

    # 5. Search by handle: "@anand"
    with urllib.request.urlopen(f"{BASE}/api/accounts/search?q=@anand") as resp:
        handle_search = json.loads(resp.read().decode())
    assert len(handle_search) > 0
    assert handle_search[0]["handle"] == "@anand_biradar"
    print("✅ Search by handle '@anand' matched:", handle_search[0]["handle"])

    # 6. Search by Skill: "FastAPI"
    with urllib.request.urlopen(f"{BASE}/api/accounts/search?q=FastAPI") as resp:
        skill_search = json.loads(resp.read().decode())
    assert len(skill_search) > 0
    print("✅ Search by skill 'FastAPI' matched:", skill_search[0]["displayName"])

    # 7. Clean up test account
    del_req = urllib.request.Request(f"{BASE}/api/accounts/%40anand_biradar", method="DELETE")
    with urllib.request.urlopen(del_req) as resp:
        del_res = json.loads(resp.read().decode())
    print("✅ Cleaned up test account:", del_res)

    print("\n" + "=" * 60)
    print("🏆 ALL GLOBAL SEARCH & DIRECTORY SYNC TESTS PASSED 100%!")
    print("=" * 60)

if __name__ == "__main__":
    run()
