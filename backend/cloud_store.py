# ============================================================
# Campus OS — Vercel Blob Cloud Persistence Layer
# Provides cross-device realtime data sharing for accounts,
# posts, and notifications via Vercel Blob CDN.
# ============================================================

import json
import os
import time
import urllib.request
import urllib.error

def _get_token():
    token = os.environ.get("BLOB_READ_WRITE_TOKEN", "")
    if not token:
        # Check .env.local in parent or root directory
        for p in [".env.local", "../.env.local", os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env.local")]:
            if os.path.exists(p):
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        for line in f:
                            if "BLOB_READ_WRITE_TOKEN=" in line:
                                token = line.split("=", 1)[1].strip().strip('"').strip("'")
                                os.environ["BLOB_READ_WRITE_TOKEN"] = token
                                break
                    if token:
                        break
                except Exception:
                    pass
    return token

BLOB_API_URL = "https://blob.vercel-storage.com"

# Cache to reduce redundant network calls within a single lambda invocation
_cache = {}
_cache_ts = {}
CACHE_TTL = 5  # seconds


def _get_blob_url(filename):
    """Get the public CDN URL for a blob file."""
    return f"{BLOB_API_URL}/{filename}"


def put_cloud_json(filename, data):
    """Upload JSON data to Vercel Blob. Returns the public URL."""
    token = _get_token()
    if not token:
        return None
    try:
        payload = json.dumps(data, ensure_ascii=False, default=str).encode("utf-8")
        req = urllib.request.Request(
            f"{BLOB_API_URL}/{filename}",
            data=payload,
            headers={
                "authorization": f"Bearer {token}",
                "x-api-version": "7",
                "content-type": "application/json",
            },
            method="PUT",
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            _cache[filename] = data
            _cache_ts[filename] = time.time()
            return result.get("url")
    except Exception as e:
        print(f"[CloudStore] PUT {filename} error: {e}")
        return None


def get_cloud_json(filename, default=None):
    """Download JSON data from Vercel Blob. Uses in-memory cache."""
    token = _get_token()
    if not token:
        return default

    # Check cache
    now = time.time()
    if filename in _cache and (now - _cache_ts.get(filename, 0)) < CACHE_TTL:
        return _cache[filename]

    try:
        # Vercel Blob prefix matches the base name
        prefix = filename.split(".")[0]
        list_url = f"{BLOB_API_URL}?prefix={prefix}&limit=20"
        req = urllib.request.Request(
            list_url,
            headers={
                "authorization": f"Bearer {token}",
            },
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=6) as resp:
            listing = json.loads(resp.read().decode("utf-8"))

        blobs = [b for b in listing.get("blobs", []) if b.get("pathname") == filename]
        if not blobs:
            return default

        # Pick the most recently uploaded blob
        blobs.sort(key=lambda x: x.get("uploadedAt", ""), reverse=True)
        blob_url = blobs[0].get("url")
        if not blob_url:
            return default

        # Download the actual content with cache-buster
        fetch_url = f"{blob_url}?cb={int(now)}"
        with urllib.request.urlopen(fetch_url, timeout=6) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            _cache[filename] = data
            _cache_ts[filename] = now
            return data

    except Exception as e:
        print(f"[CloudStore] GET {filename} error: {e}")
        return default


# ============================================================
# HIGH-LEVEL CLOUD DATA OPERATIONS
# ============================================================

def cloud_get_accounts():
    """Get all accounts from cloud storage."""
    return get_cloud_json("campus_accounts.json", default=[])


def cloud_save_accounts(accounts_list):
    """Save full accounts list to cloud."""
    return put_cloud_json("campus_accounts.json", accounts_list)


def cloud_upsert_account(account_dict):
    """Add or update a single account in the cloud accounts list."""
    accounts = cloud_get_accounts()
    handle = (account_dict.get("handle") or account_dict.get("username") or "").lower()
    if not handle:
        return

    # Remove existing entry with same handle
    accounts = [a for a in accounts if (a.get("handle") or a.get("username") or "").lower() != handle]
    accounts.insert(0, account_dict)

    cloud_save_accounts(accounts)
    return account_dict


def cloud_delete_account(handle):
    """Remove an account from cloud storage."""
    clean = handle.lower()
    accounts = cloud_get_accounts()
    accounts = [a for a in accounts if (a.get("handle") or a.get("username") or "").lower() != clean]
    cloud_save_accounts(accounts)


def cloud_get_posts():
    """Get all posts from cloud storage."""
    return get_cloud_json("campus_posts.json", default=[])


def cloud_save_posts(posts_list):
    """Save full posts list to cloud."""
    return put_cloud_json("campus_posts.json", posts_list)


def cloud_add_post(post_dict):
    """Add a new post to the cloud posts list."""
    posts = cloud_get_posts()
    # Remove duplicate if same id
    pid = post_dict.get("id", "")
    if pid:
        posts = [p for p in posts if p.get("id") != pid]
    posts.insert(0, post_dict)
    cloud_save_posts(posts)
    return post_dict


def cloud_delete_post(post_id):
    """Remove a post from cloud storage."""
    posts = cloud_get_posts()
    posts = [p for p in posts if p.get("id") != post_id]
    cloud_save_posts(posts)


def cloud_get_notifications():
    """Get all notifications from cloud storage."""
    return get_cloud_json("campus_notifications.json", default=[])


def cloud_add_notification(notif_dict):
    """Add a notification to cloud storage."""
    notifs = cloud_get_notifications()
    notifs.insert(0, notif_dict)
    # Keep only last 100 notifications
    notifs = notifs[:100]
    put_cloud_json("campus_notifications.json", notifs)
    return notif_dict


def cloud_search_accounts(query):
    """Search accounts in cloud storage by name, handle, usn, department, skills."""
    if not query:
        return cloud_get_accounts()

    q = query.lower().strip().replace("@", "")
    accounts = cloud_get_accounts()
    results = []
    for a in accounts:
        searchable = " ".join([
            (a.get("displayName") or a.get("name") or ""),
            (a.get("handle") or a.get("username") or ""),
            (a.get("email") or ""),
            (a.get("department") or ""),
            (a.get("usn") or ""),
            (a.get("bio") or ""),
            (a.get("college") or ""),
            (a.get("program") or ""),
            " ".join(a.get("skills") or []),
        ]).lower()
        if q in searchable:
            results.append(a)
    return results
