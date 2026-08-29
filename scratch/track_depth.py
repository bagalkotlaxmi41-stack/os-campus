import re

def track_depth(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    style_blocks = re.findall(r'<style[^>]*>(.*?)</style>', content, re.DOTALL)
    if style_blocks:
        lines = style_blocks[0].splitlines()
    else:
        lines = content.splitlines()

    depth = 0
    for i, line in enumerate(lines, 1):
        prev = depth
        for ch in line:
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
        if depth != prev and depth > 0 and '@media' not in line and '{' in line and '}' not in line:
            pass
        if i > len(lines) - 30:
            print(f"L{i} [depth={depth}]: {line}")

print("--- PROFILE.HTML ---")
track_depth('c:/Users/chann/OneDrive/Desktop/channu/college OS/frontend/profile.html')
print("--- COMPONENTS.CSS ---")
track_depth('c:/Users/chann/OneDrive/Desktop/channu/college OS/frontend/css/components.css')
