import re

with open('c:/Users/chann/OneDrive/Desktop/channu/college OS/frontend/profile.html', 'r', encoding='utf-8') as f:
    content = f.read()

style = re.search(r'<style[^>]*>(.*?)</style>', content, re.DOTALL).group(1)
lines = style.splitlines()

depth = 0
for i, line in enumerate(lines, 1):
    prev = depth
    for ch in line:
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
    if depth > 1 and prev <= 1 and '@media' not in line:
        print(f"Style L{i} increased depth to {depth}: {line}")
    elif depth == 1 and prev == 0 and '@media' not in line:
        print(f"Style L{i} increased base depth to {depth}: {line}")
