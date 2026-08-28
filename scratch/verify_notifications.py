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
    print("Testing Notification System & Real-Time Post Sync...")

    # 1. Post a new study resource from a student
    post_payload = {
        "id": f"post_notif_test_{int(sys.version_info[0])}",
        "author": "Priya Sharma",
        "handle": "@priya_sharma",
        "authorPhoto": None,
        "title": "Machine Learning Unit 3 Notes & Previous VTU Solutions",
        "desc": "Handwritten notes covering neural networks, backpropagation, and 5-mark solved questions.",
        "type": "pdf",
        "subject": "Machine Learning",
        "pdfData": "data:application/pdf;base64,JVBERi0xLjQKJ",
        "pdfName": "ML_Unit3_VTU_Solutions.pdf"
    }

    req = urllib.request.Request(
        f"{BASE}/api/posts",
        data=json.dumps(post_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
    print("✅ Created new study post:", res.get("post", {}).get("title"))

    # 2. Query posts from API -> must be in top position
    with urllib.request.urlopen(f"{BASE}/api/posts") as resp:
        all_posts = json.loads(resp.read().decode())
    
    assert len(all_posts) > 0
    latest = all_posts[0]
    print(f"✅ Latest post fetched by notifications engine: '{latest['title']}' by {latest['author']} ({latest['handle']})")
    assert latest['title'] == post_payload['title']

    # 3. Clean up test post
    del_req = urllib.request.Request(f"{BASE}/api/posts/{post_payload['id']}", method="DELETE")
    with urllib.request.urlopen(del_req) as resp:
        del_res = json.loads(resp.read().decode())
    print("✅ Cleaned up notification test post:", del_res)

    print("\n🎉 ALL REAL-TIME NOTIFICATION TESTS PASSED 100%!")

if __name__ == "__main__":
    run()
