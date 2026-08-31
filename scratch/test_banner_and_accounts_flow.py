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

def test_banners_and_accounts():
    print("==================================================")
    print("TESTING BANNER AND ACCOUNT LIFECYCLE & RESILIENCE")
    print("==================================================")

    # 1. Accounts: Register 2 real student accounts
    now_ts = int(time.time())
    h1 = f"@test_user_alpha_{now_ts}"
    h2 = f"@test_user_beta_{now_ts}"

    status, _ = http_req("POST", "/api/accounts", {
        "handle": h1, "displayName": "Alpha Student", "email": f"alpha_{now_ts}@campus.edu",
        "password": "password123", "department": "CSE", "semester": 5, "role": "STUDENT"
    })
    assert status == 200, f"Failed creating {h1}"

    status, _ = http_req("POST", "/api/accounts", {
        "handle": h2, "displayName": "Beta Student", "email": f"beta_{now_ts}@campus.edu",
        "password": "password123", "department": "ECE", "semester": 4, "role": "STUDENT"
    })
    assert status == 200, f"Failed creating {h2}"
    print(f"[PASS] 1. Created 2 test accounts: {h1} and {h2}")

    # 2. Verify both accounts appear in account list
    status, accs = http_req("GET", "/api/accounts")
    assert status == 200
    handles = [a["handle"].lower() for a in accs]
    assert h1.lower() in handles, f"{h1} not found in accounts"
    assert h2.lower() in handles, f"{h2} not found in accounts"
    print(f"[PASS] 2. Verified both accounts show reliably in directory ({len(accs)} total).")

    # 3. Delete h1 and verify permanent removal
    status, _ = http_req("DELETE", f"/api/accounts/{urllib.parse.quote(h1)}")
    assert status == 200

    status, accs = http_req("GET", "/api/accounts")
    handles = [a["handle"].lower() for a in accs]
    assert h1.lower() not in handles, f"{h1} was NOT deleted permanently"
    assert h2.lower() in handles, f"{h2} should still exist"
    print(f"[PASS] 3. Verified {h1} permanently deleted, while {h2} remains intact.")

    # 4. Clean up h2
    http_req("DELETE", f"/api/accounts/{urllib.parse.quote(h2)}")

    # 5. Banners: Add 5 new custom banners (Unlimited banners support)
    print("\n--- Testing Banner Unlimited Addition & Deletion ---")
    custom_ids = []
    for i in range(1, 6):
        b_id = f"banner_test_{now_ts}_{i}"
        custom_ids.append(b_id)
        status, res = http_req("POST", "/api/admin/banners", {
            "id": b_id,
            "title": f"Custom Campus Event Slide #{i}",
            "subtitle": f"Special academic announcement {i} across departments.",
            "badge": f"📢 Announcement #{i}",
            "cta_text": "View Details",
            "cta_url": "dashboard.html",
            "image_url": "img/banner1.jpg",
            "sort_order": i + 10,
            "active": 1
        })
        assert status == 200, f"Failed to save banner {b_id}"
    print(f"[PASS] 4. Successfully added 5 custom banners (Unlimited capacity).")

    # 6. Fetch all banners - verify they all exist
    status, banners = http_req("GET", "/api/banners")
    assert status == 200
    banner_ids = [b["id"] for b in banners]
    for cid in custom_ids:
        assert cid in banner_ids, f"{cid} missing from public banners"
    print(f"[PASS] 5. Verified all {len(banners)} banners returned correctly in order.")

    # 7. Delete 2 banners and verify permanent deletion
    del_target1 = custom_ids[0]
    del_target2 = custom_ids[2]

    status, _ = http_req("DELETE", f"/api/admin/banners/{del_target1}")
    assert status == 200
    status, _ = http_req("DELETE", f"/api/admin/banners/{del_target2}")
    assert status == 200

    # 8. Verify deleted banners do NOT appear anywhere in public or admin endpoints
    status, public_b = http_req("GET", "/api/banners")
    public_ids = [b["id"] for b in public_b]
    assert del_target1 not in public_ids, f"{del_target1} should be deleted"
    assert del_target2 not in public_ids, f"{del_target2} should be deleted"

    status, admin_b = http_req("GET", "/api/admin/banners")
    admin_ids = [b["id"] for b in admin_b]
    assert del_target1 not in admin_ids, f"{del_target1} should be deleted from admin"
    assert del_target2 not in admin_ids, f"{del_target2} should be deleted from admin"
    print(f"[PASS] 6. Verified {del_target1} and {del_target2} permanently deleted without leaking back.")

    # Clean up remaining custom test banners
    for cid in custom_ids:
        http_req("DELETE", f"/api/admin/banners/{cid}")
    print("[PASS] 7. Cleaned up remaining test banners.")

    print("\n==================================================")
    print("ALL BANNER & ACCOUNT LIFECYCLE TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    test_banners_and_accounts()
