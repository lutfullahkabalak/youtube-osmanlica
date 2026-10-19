#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
for file in ./*.js ./landing-page/*.js; do
  node --check "$file"
done
node --test ./*.test.cjs
python3 - <<'PY'
import json
from pathlib import Path
m = json.loads(Path('manifest.json').read_text())
assert m['manifest_version'] == 3
files = [m['background']['service_worker'], m['action']['default_popup']]
for entry in m['content_scripts']:
    files.extend(entry['js'])
for entry in m['web_accessible_resources']:
    files.extend(entry['resources'])
for name in files:
    assert Path(name).is_file(), name
assert json.loads(Path('package.json').read_text())['version'] == m['version']
print('Manifest, sürüm ve font dosyaları doğrulandı.')
PY
