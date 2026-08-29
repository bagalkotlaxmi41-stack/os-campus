import re

def check_file_braces(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find style blocks
    style_blocks = re.findall(r'<style[^>]*>(.*?)</style>', content, re.DOTALL)
    for i, s in enumerate(style_blocks):
        open_c = s.count('{')
        close_c = s.count('}')
        print(f"{filepath} Style Block {i}: {{ = {open_c}, }} = {close_c} (diff: {open_c - close_c})")

    # If it's a CSS file
    if filepath.endswith('.css'):
        open_c = content.count('{')
        close_c = content.count('}')
        print(f"{filepath}: {{ = {open_c}, }} = {close_c} (diff: {open_c - close_c})")

check_file_braces('c:/Users/chann/OneDrive/Desktop/channu/college OS/frontend/css/components.css')
check_file_braces('c:/Users/chann/OneDrive/Desktop/channu/college OS/frontend/profile.html')
check_file_braces('c:/Users/chann/OneDrive/Desktop/channu/college OS/frontend/feed.html')
