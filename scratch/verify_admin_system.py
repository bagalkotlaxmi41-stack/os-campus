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

def run_tests():
    print("=" * 60)
    print("CAMPUS OS - ADMIN & OWNER CONTROL CENTER TEST SUITE")
    print("=" * 60)

    # 1. Test Admin Authentication (Valid Key)
    print("\n[1] Testing Master Key Authentication...")
    req = urllib.request.Request(
        f"{BASE}/api/admin/auth",
        data=json.dumps({"key": "AdminMaster#2026", "email": "owner@campusos.edu"}).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        auth_data = json.loads(resp.read().decode())
    assert auth_data.get("status") == "success"
    assert "token" in auth_data
    print("✅ Master key authentication passed. Token received:", auth_data["token"][:16] + "...")

    # 2. Test Admin Authentication (Invalid Key -> 401)
    print("\n[2] Testing Authentication Rejection for Invalid Key...")
    req_bad = urllib.request.Request(
        f"{BASE}/api/admin/auth",
        data=json.dumps({"key": "WrongPassword123"}).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        urllib.request.urlopen(req_bad)
        raise AssertionError("Expected 401 Unauthorized for bad key!")
    except urllib.error.HTTPError as e:
        assert e.code == 401
        print("✅ Invalid key correctly rejected with HTTP 401 Unauthorized.")

    # 3. Test Admin Stats Aggregation
    print("\n[3] Testing Admin Executive Stats Radar...")
    with urllib.request.urlopen(f"{BASE}/api/admin/stats") as resp:
        stats = json.loads(resp.read().decode())
    assert stats.get("status") == "success"
    print(f"✅ Aggregated Stats: Students={stats['total_students']}, Posts={stats['total_posts']}, Banners={stats['total_banners']}, Likes={stats['total_likes']}")
    assert "branch_breakdown" in stats
    assert "uptime_seconds" in stats

    # 4. Test Hero Banners API
    print("\n[4] Testing Hero Banners Management...")
    with urllib.request.urlopen(f"{BASE}/api/banners") as resp:
        banners = json.loads(resp.read().decode())
    print(f"✅ Fetched {len(banners)} active public hero banners.")
    assert len(banners) >= 1

    # Create new custom hero banner
    test_banner_id = f"test_banner_{int(auth_data['token'].split('_')[-1][:6], 16) if '_' in auth_data['token'] else 999}"
    banner_payload = {
        "id": test_banner_id,
        "title": "Placement Drive 2026 &<br /><span class=\"text-hero-gradient\">Tech Career Conclave</span>",
        "subtitle": "Top MNCs hiring final-year engineering and computer science students.",
        "badge": "🚀 Placement Drive",
        "cta_text": "Apply Now →",
        "cta_url": "dashboard.html",
        "secondary_text": "View Companies",
        "secondary_url": "notes.html",
        "image_url": "img/banner1.jpg",
        "sort_order": 1,
        "active": 1
    }
    req_create_banner = urllib.request.Request(
        f"{BASE}/api/admin/banners",
        data=json.dumps(banner_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req_create_banner) as resp:
        create_res = json.loads(resp.read().decode())
    assert create_res.get("status") == "success"
    print("✅ Created new custom hero banner:", banner_payload["title"][:35] + "...")

    # Toggle banner
    req_toggle = urllib.request.Request(f"{BASE}/api/admin/banners/{test_banner_id}/toggle", method="PUT")
    with urllib.request.urlopen(req_toggle) as resp:
        toggle_res = json.loads(resp.read().decode())
    assert toggle_res.get("status") == "success"
    print(f"✅ Toggled banner status. Active is now: {toggle_res['active']}")

    # 5. Test Live Broadcast Alert
    print("\n[5] Testing Campus-Wide Broadcast Alert...")
    broadcast_payload = {
        "title": "VTU Autonomous Semester Schedule 2026",
        "message": "Final examination dates published on college noticeboard.",
        "author": "Controller of Examinations"
    }
    req_broadcast = urllib.request.Request(
        f"{BASE}/api/admin/broadcast",
        data=json.dumps(broadcast_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req_broadcast) as resp:
        bc_res = json.loads(resp.read().decode())
    assert bc_res.get("status") == "success"
    print("✅ Broadcast alert dispatched:", broadcast_payload["title"])

    # 6. Test Admin Audit Logs
    print("\n[6] Testing Administrative Audit Trail...")
    with urllib.request.urlopen(f"{BASE}/api/admin/audit-logs") as resp:
        logs = json.loads(resp.read().decode())
    assert len(logs) > 0
    print(f"✅ Audit logs recorded: {len(logs)} action records found.")
    print(f"   Latest audit: [{logs[0]['action']}] {logs[0]['details']} by {logs[0]['actor']}")

    # 7. Clean up test banner & broadcast post
    print("\n[7] Cleaning Up Test Artifacts...")
    req_del_b = urllib.request.Request(f"{BASE}/api/admin/banners/{test_banner_id}", method="DELETE")
    with urllib.request.urlopen(req_del_b) as resp:
        del_b_res = json.loads(resp.read().decode())
    print("✅ Test banner cleaned up:", del_b_res)

    req_del_p = urllib.request.Request(f"{BASE}/api/posts/{bc_res['id']}", method="DELETE")
    with urllib.request.urlopen(req_del_p) as resp:
        del_p_res = json.loads(resp.read().decode())
    print("✅ Test broadcast post cleaned up:", del_p_res)

    print("\n" + "=" * 60)
    print("🏆 ALL OWNER & ADMIN CONTROL SUITE TESTS PASSED 100%!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
