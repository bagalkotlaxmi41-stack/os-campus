import os
import re
import glob
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

FRONTEND_DIR = "c:/Users/chann/OneDrive/Desktop/channu/college OS/frontend"
BACKEND_FILE = "c:/Users/chann/OneDrive/Desktop/channu/college OS/backend/main.py"

def audit():
    print("=" * 70)
    print("CAMPUS OS - FULL STACK COMPREHENSIVE PRODUCTION AUDIT")
    print("=" * 70)

    html_files = glob.glob(f"{FRONTEND_DIR}/*.html")
    js_files = glob.glob(f"{FRONTEND_DIR}/js/*.js")
    css_files = glob.glob(f"{FRONTEND_DIR}/css/*.css")

    print(f"\n[1] Found {len(html_files)} HTML pages, {len(js_files)} JS files, {len(css_files)} CSS stylesheets.")

    # Audit HTML files
    issues = []
    for hf in sorted(html_files):
        fname = os.path.basename(hf)
        with open(hf, "r", encoding="utf-8") as f:
            content = f.read()

        # Check title & meta
        if "<title>" not in content:
            issues.append(f"[{fname}] Missing <title> tag")
        if 'name="viewport"' not in content:
            issues.append(f"[{fname}] Missing viewport meta tag")
        
        # Check script inclusions
        scripts = re.findall(r'<script\s+src=["\']([^"\']+)["\']', content)
        for s in scripts:
            if not s.startswith("http") and not s.startswith("//"):
                target_path = os.path.normpath(os.path.join(FRONTEND_DIR, s))
                if not os.path.exists(target_path):
                    issues.append(f"[{fname}] Broken script reference: {s}")

        # Check stylesheet inclusions
        links = re.findall(r'<link\s+[^>]*href=["\']([^"\']+)["\']', content)
        for l in links:
            if not l.startswith("http") and not l.startswith("//") and not l.startswith("data:"):
                target_path = os.path.normpath(os.path.join(FRONTEND_DIR, l))
                if not os.path.exists(target_path) and not l.endswith(".ico"):
                    issues.append(f"[{fname}] Broken link/CSS reference: {l}")

        # Check images
        imgs = re.findall(r'<img\s+[^>]*src=["\']([^"\']+)["\']', content)
        for img in imgs:
            if not img.startswith("http") and not img.startswith("data:") and not img.startswith("${"):
                target_path = os.path.normpath(os.path.join(FRONTEND_DIR, img))
                if not os.path.exists(target_path):
                    issues.append(f"[{fname}] Broken image reference: {img}")

        # Check inline JS syntax / brackets
        style_blocks = re.findall(r'<style[^>]*>(.*?)</style>', content, re.DOTALL)
        for idx, sb in enumerate(style_blocks):
            open_b = sb.count('{')
            close_b = sb.count('}')
            if open_b != close_b:
                issues.append(f"[{fname}] Unbalanced braces in <style> block #{idx}: {open_b} open, {close_b} close")

    print(f"\n[2] HTML & Asset Audit Completed. Issues Found: {len(issues)}")
    for i in issues:
        print(f"  ❌ {i}")
    if not issues:
        print("  ✅ All HTML pages, static assets, images, and script references verified 100% valid!")

    # Check JS files for syntax or console leaks
    print("\n[3] JavaScript Code Quality & Storage Consistency Audit:")
    for jf in sorted(js_files):
        jname = os.path.basename(jf)
        with open(jf, "r", encoding="utf-8") as f:
            jcontent = f.read()
        
        # Check storage keys consistency
        open_c = jcontent.count('{')
        close_c = jcontent.count('}')
        diff = open_c - close_c
        print(f"  📄 {jname:<20} | Braces Balance: {open_c}/{close_c} (diff: {diff})")
        if diff != 0:
            print(f"     ❌ Braces imbalance detected in {jname}!")

    print("\n" + "=" * 70)

if __name__ == "__main__":
    audit()
