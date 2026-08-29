import sys
import urllib.request

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE = "http://127.0.0.1:8000"

def test_urls():
    urls = [
        "/admin",
        "/admin.html",
        "/dashboard",
        "/feed",
        "/profile",
        "/notes",
        "/tasks",
        "/attendance",
        "/timetable",
        "/resources",
        "/auth",
        "/health",
        "/api/banners",
        "/api/accounts"
    ]

    print("Testing Clean URLs and /admin routing...")
    for u in urls:
        full_url = f"{BASE}{u}"
        try:
            with urllib.request.urlopen(full_url) as resp:
                status = resp.status
                content = resp.read(150)
                print(f"  [PASS] {u:<20} -> HTTP {status} (Length: {len(content)} bytes)")
                assert status == 200
        except Exception as e:
            print(f"  [FAIL] {u:<20} -> ERROR: {e}")
            raise e

    print("\n🏆 ALL CLEAN URLS AND /admin ROUTE PASSED 100% (NO 404 ERRORS)!")

if __name__ == "__main__":
    test_urls()
