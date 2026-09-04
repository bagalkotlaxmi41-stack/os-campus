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
    """Upload JSON data to Vercel Blob with deterministic filename (no random suffix). Returns the public URL."""
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
                "x-add-random-suffix": "false",
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
    """Download JSON data from Vercel Blob. Uses in-memory cache and falls back to listing."""
    token = _get_token()
    if not token:
        return default

    # Check cache
    now = time.time()
    if filename in _cache and (now - _cache_ts.get(filename, 0)) < CACHE_TTL:
        return _cache[filename]

    # 1. Try direct canonical URL first (when x-add-random-suffix: false is used)
    direct_url = f"https://vecycnq2hep3nnfw.public.blob.vercel-storage.com/{filename}?cb={int(now)}"
    try:
        req = urllib.request.Request(direct_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                _cache[filename] = data
                _cache_ts[filename] = now
                return data
    except Exception:
        pass

    # 2. Fallback to listing blobs (limit 1000 to find the most recent upload)
    try:
        prefix = filename.split(".")[0]
        list_url = f"{BLOB_API_URL}?prefix={prefix}&limit=1000"
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
            # Also match blobs whose pathname starts with prefix
            blobs = [b for b in listing.get("blobs", []) if b.get("pathname", "").startswith(prefix)]
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

def deduplicate_accounts_list(accounts_list):
    """Cleanly merge duplicate accounts for the same user (by handle or email)."""
    if not accounts_list or not isinstance(accounts_list, list):
        return []

    merged = {}
    email_to_key = {}

    for acc in accounts_list:
        raw_h = (acc.get("handle") or acc.get("username") or "").strip()
        if not raw_h:
            continue
        h = raw_h.lower() if raw_h.startswith("@") else "@" + raw_h.lower()
        em = (acc.get("email") or "").strip().lower()

        # Canonical key
        key = h
        if em and em != "campus0012@gmail.com" and em in email_to_key:
            key = email_to_key[em]

        if key in merged:
            # Merge fields (keep best data)
            existing = merged[key]
            for field in ["email", "photo", "password_hash", "password", "bio", "usn", "department", "semester", "program", "college"]:
                if acc.get(field) and not existing.get(field):
                    existing[field] = acc.get(field)
            if (acc.get("updatedAt") or 0) > (existing.get("updatedAt") or 0):
                existing["updatedAt"] = acc.get("updatedAt")
            if acc.get("role") in ["OWNER_ADMIN", "ADMIN"]:
                existing["role"] = acc.get("role")
        else:
            acc_copy = dict(acc)
            acc_copy["handle"] = h
            acc_copy["username"] = h
            merged[key] = acc_copy
            if em and em != "campus0012@gmail.com":
                email_to_key[em] = key

    # Return list sorted by updatedAt or createdAt desc
    return sorted(list(merged.values()), key=lambda x: x.get("updatedAt") or x.get("createdAt") or 0, reverse=True)


def cloud_get_accounts():
    """Get all accounts from cloud storage (deduplicated)."""
    raw = get_cloud_json("campus_accounts.json", default=[])
    return deduplicate_accounts_list(raw)


def cloud_save_accounts(accounts_list):
    """Save full accounts list to cloud after deduplication."""
    clean_list = deduplicate_accounts_list(accounts_list)
    return put_cloud_json("campus_accounts.json", clean_list)


def cloud_upsert_account(account_dict):
    """Add or update a single account in the cloud accounts list."""
    accounts = cloud_get_accounts()
    raw_h = (account_dict.get("handle") or account_dict.get("username") or "").strip()
    if not raw_h:
        return
    handle = raw_h.lower() if raw_h.startswith("@") else "@" + raw_h.lower()
    email_clean = (account_dict.get("email") or "").strip().lower()

    # Find existing by handle OR non-empty email
    matched_idx = -1
    for idx, a in enumerate(accounts):
        a_h = (a.get("handle") or a.get("username") or "").strip().lower()
        if not a_h.startswith("@"):
            a_h = "@" + a_h
        a_em = (a.get("email") or "").strip().lower()
        if a_h == handle or (email_clean and email_clean != "campus0012@gmail.com" and a_em == email_clean):
            matched_idx = idx
            break

    account_dict["handle"] = handle
    account_dict["username"] = handle
    account_dict["updatedAt"] = int(time.time() * 1000)

    if matched_idx >= 0:
        # Merge onto existing
        existing = accounts[matched_idx]
        merged = {**existing, **account_dict}
        accounts[matched_idx] = merged
    else:
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
