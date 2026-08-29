import re

with open('c:/Users/chann/OneDrive/Desktop/channu/college OS/frontend/admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

style = re.search(r'<style[^>]*>(.*?)</style>', content, re.DOTALL).group(1)
open_c = style.count('{')
close_c = style.count('}')
print(f"frontend/admin.html Style Block: {{ = {open_c}, }} = {close_c} (diff: {open_c - close_c})")
