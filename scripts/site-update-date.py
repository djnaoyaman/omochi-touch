#!/usr/bin/env python3
"""Synchronize an explicit site release date, never the visitor's clock."""
import argparse
from datetime import date, datetime
import json
from pathlib import Path
import re
import subprocess
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
JST = ZoneInfo('Asia/Tokyo')
PATTERN = re.compile(r'<time data-site-updated datetime="[^"]+">[^<]+</time>')

def markup(value):
    day = date.fromisoformat(value)
    return f'<time data-site-updated datetime="{value}">{day.year}年{day.month}月{day.day}日（JST）</time>'

def source_date():
    # Weather observations have their own dates, not editorial revision dates.
    paths = ['.', ':!tests', ':!test-artifacts', ':!scripts', ':!tools', ':!docs',
             ':!.github', ':!README.md', ':!site-update.json', ':!data/entry-weather.json']
    value = subprocess.check_output(['git', 'log', '-1', '--format=%cI', '--', *paths], cwd=ROOT, text=True).strip()
    if not value:
        raise ValueError('Cannot verify source commit date; checkout full Git history.')
    return datetime.fromisoformat(value).astimezone(JST).date()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    choice = parser.add_mutually_exclusive_group(required=True)
    choice.add_argument('--date', help='Actual site release date YYYY-MM-DD in JST')
    choice.add_argument('--check', action='store_true', help='Check HTML and Git source date (CI)')
    choice.add_argument('--check-content', action='store_true', help='Check metadata and HTML before commit')
    args = parser.parse_args()
    metadata_file = ROOT / 'site-update.json'
    metadata = json.loads(metadata_file.read_text())
    assert metadata['timezone'] == 'Asia/Tokyo', 'Timezone must remain explicit'
    if args.date:
        date.fromisoformat(args.date)
        metadata['date'] = args.date
    expected = markup(metadata['date'])
    for name in metadata['pages']:
        path = ROOT / name
        html = path.read_text()
        assert len(PATTERN.findall(html)) == 1, f'{name}: expected exactly one site update date'
        if args.date:
            html = PATTERN.sub(expected, html)
            path.write_text(html)
        assert expected in html, f'{name}: footer differs from site-update.json'
        assert html.index('<footer') < html.index(expected) < html.index('</footer>'), f'{name}: date must be inside footer'
    if args.date:
        metadata_file.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
    if args.check:
        expected_day = date.fromisoformat(metadata['date'])
        actual_day = source_date()
        assert expected_day == actual_day, f'Site date {expected_day} differs from source commit JST date {actual_day}; run --date {actual_day}'
    print(f"Site update date synchronized: {metadata['date']} JST ({len(metadata['pages'])} pages)")

if __name__ == '__main__':
    main()
