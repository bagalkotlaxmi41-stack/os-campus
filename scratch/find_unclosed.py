import re

def find_unclosed(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    style_blocks = re.findall(r'<style[^>]*>(.*?)</style>', content, re.DOTALL)
    if style_blocks:
        lines = style_blocks[0].splitlines()
    else:
        lines = content.splitlines()

    depth = 0
    for i, line in enumerate(lines, 1):
        for ch in line:
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
        if depth < 0:
            print(f"Excess closing brace at line {i}: {line}")
    print(f"Final unclosed depth for {filepath}: {depth}")

find_unclosed('c:/Users/chann/OneDrive/Desktop/channu/college OS/frontend/css/components.css')
find_unclosed('c:/Users/chann/OneDrive/Desktop/channu/college OS/frontend/profile.html')
