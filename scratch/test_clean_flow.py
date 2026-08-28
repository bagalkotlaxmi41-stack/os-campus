import sys
import os
import json
import urllib.request

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE = "http://127.0.0.1:8000"

def run_test():
    print("Testing clean fresh account registration and discovery flow...")

    # 1. Verify 0 accounts initially in database
    req = urllib.request.Request(f"{BASE}/api/accounts")
    with urllib.request.urlopen(req) as resp:
        accounts = json.loads(resp.read().decode())
    print(f"Current database account count: {len(accounts)}")
    assert len(accounts) == 0, f"Expected 0 initial accounts, got {len(accounts)}"

    # 2. Create new student account: @laxmi_patil
    student_payload = {
        "displayName": "Laxmi Patil",
        "username": "@laxmi_patil",
        "handle": "@laxmi_patil",
        "email": "laxmi@bldea.edu",
        "program": "BCA",
        "department": "Computer Science & Engineering",
        "semester": 5,
        "usn": "2BL22CS088",
        "bio": "Passionate full-stack developer and AI researcher at BLDEA.",
        "skills": ["Python", "React", "Cloud Computing", "DSA"],
        "college": "BLDE Association's Commerce, BHS Arts & TGP Science College",
        "xp": 220
    }
    req = urllib.request.Request(f"{BASE}/api/accounts", data=json.dumps(student_payload).encode('utf-8'), headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as resp:
        created = json.loads(resp.read().decode())
    print("✅ Successfully registered student account:", created.get("account", {}).get("handle"))

    # 3. Student shares a post (Lecture Notes)
    post_payload = {
        "id": "post_live_101",
        "type": "pdf",
        "title": "Cloud Computing Architecture Handwritten Notes (Unit 1-4)",
        "subject": "Cloud Computing",
        "department": "Computer Science & Engineering",
        "desc": "Verified lecture notes covering AWS, Virtualization, Microservices, and Docker.",
        "author": "Laxmi Patil",
        "handle": "@laxmi_patil",
        "fileName": "Cloud_Computing_Unit1-4_Notes.pdf",
        "fileSize": "3.4 MB"
    }
    req = urllib.request.Request(f"{BASE}/api/posts", data=json.dumps(post_payload).encode('utf-8'), headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as resp:
        post_resp = json.loads(resp.read().decode())
    print("✅ Successfully shared post:", post_resp.get("post", {}).get("title"))

    # 4. Another user searches for "Laxmi"
    req = urllib.request.Request(f"{BASE}/api/accounts/search?q=Laxmi")
    with urllib.request.urlopen(req) as resp:
        search_res = json.loads(resp.read().decode())
    print(f"✅ Search found {len(search_res)} matching student(s):", [s.get("handle") for s in search_res])
    assert len(search_res) >= 1
    assert search_res[0].get("handle") == "@laxmi_patil"

    # 5. Fetch posts for @laxmi_patil
    req = urllib.request.Request(f"{BASE}/api/posts?handle=@laxmi_patil")
    with urllib.request.urlopen(req) as resp:
        posts = json.loads(resp.read().decode())
    print(f"✅ Found {len(posts)} post(s) for @laxmi_patil")
    assert len(posts) >= 1

    # 6. Increment seen counter on post
    req = urllib.request.Request(f"{BASE}/api/posts/post_live_101/view", data=b"{}", headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as resp:
        view_res = json.loads(resp.read().decode())
    print("✅ Seen view counter incremented:", view_res)

    print("\n🎉 ALL FRESH FLOW VERIFICATIONS PASSED 100%!")

if __name__ == "__main__":
    run_test()
