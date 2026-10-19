#!/usr/bin/env python3
"""Create a load-unpacked directory and ZIP without tests or development files."""
import json
from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'dist/youtube-osmanlica'
FILES = ('manifest.json', 'core.js', 'background.js', 'content.js', 'popup.html',
         'popup.css', 'popup.js', 'README.md', 'fonts/eKalemDuz.ttf')


def main():
    manifest = json.loads((ROOT / 'manifest.json').read_text())
    assert manifest['manifest_version'] == 3
    for name in FILES:
        source = ROOT / name
        target = DEST / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        assert source.read_bytes() == target.read_bytes()
    archive = DEST.with_suffix('.zip')
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as package:
        for name in FILES:
            package.write(DEST / name, 'youtube-osmanlica/' + name)
    store_archive = ROOT / 'dist/youtube-osmanlica-webstore.zip'
    with zipfile.ZipFile(store_archive, 'w', zipfile.ZIP_DEFLATED) as package:
        for name in FILES:
            package.write(DEST / name, name)
    with zipfile.ZipFile(store_archive) as package:
        assert 'manifest.json' in package.namelist()
    print(f"Sürüm: {manifest['version']}")
    print(f'Yüklenebilir klasör: {DEST}')
    print(f'ZIP: {archive}')
    print(f'Mağaza ZIP: {store_archive}')


if __name__ == '__main__':
    main()
