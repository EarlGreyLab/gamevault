import json
import pathlib
import re

path = pathlib.Path('data') / 'games.json'
text = path.read_text(encoding='utf-8')
data = json.loads(text)
console_platforms = {'PS1', 'PS2', 'PS3', 'PSP', 'VITA', 'NDS', 'N3DS', 'WII', 'WIIU', 'NSW'}


def slug(s):
    s = str(s or '')
    s = re.sub(r"[’'\"?!.:,/&]", '', s)
    s = re.sub(r"\s+", '-', s)
    s = re.sub(r"[^a-z0-9\-]", '', s.lower())
    s = re.sub(r"-+", '-', s)
    return s.strip('-')

updated = 0
for game in data.get('GAMES', []):
    if not isinstance(game, dict):
        continue
    p = str(game.get('p', 'PC') or 'PC').upper()
    if p in console_platforms and not game.get('cover') and not game.get('consoleCover'):
        game['consoleCover'] = f"covers/{p.lower()}/{slug(game.get('t'))}.jpg"
        updated += 1

path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f'Updated {updated} console games with consoleCover metadata')
