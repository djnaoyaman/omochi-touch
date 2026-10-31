from pathlib import Path
import json,re
root=Path(__file__).parent
page=root/'index.html'
s=page.read_text()
assert 'https://djnaoyaman.github.io/profile.html' in s
assert 'マーケティングとブランディングを本業' not in s
assert '鎌・くらんぽのクランポック' not in s
for data in re.findall(r'<script type="application/ld\+json">([\s\S]*?)</script>',s):json.loads(data)
assert '2026-10-31' in (root/'sitemap.xml').read_text()
print('Profile text, parent link, JSON-LD and sitemap checks passed')
