"""Builds rivers.geojson: Natural Earth 1:10m river centrelines cropped to India.

Source file (public domain):
  https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_rivers_lake_centerlines.geojson

Usage:  python tools/build_rivers.py path/to/ne_10m_rivers_lake_centerlines.geojson

Pieces of the same river that touch end-to-end are joined, so the app can
interpolate colour along a river between monitoring sites.
"""
import json
import sys
import unicodedata

BBOX = (66.0, 6.0, 98.0, 37.0)  # lon/lat around India


def in_bbox(line):
    return any(BBOX[0] < x < BBOX[2] and BBOX[1] < y < BBOX[3] for x, y in line)


def key(pt):
    return (round(pt[0], 5), round(pt[1], 5))


def merge(lines):
    """Join lines whose endpoints touch, flipping direction where needed."""
    lines = [list(l) for l in lines]
    merged = True
    while merged:
        merged = False
        for i in range(len(lines)):
            for j in range(len(lines)):
                if i == j:
                    continue
                a, b = lines[i], lines[j]
                if key(a[-1]) == key(b[0]):
                    joined = a + b[1:]
                elif key(a[-1]) == key(b[-1]):
                    joined = a + b[::-1][1:]
                elif key(a[0]) == key(b[0]):
                    joined = a[::-1] + b[1:]
                else:
                    continue
                lines = [l for k, l in enumerate(lines) if k not in (i, j)] + [joined]
                merged = True
                break
            if merged:
                break
    return lines


def main(src, dst='rivers.geojson'):
    ne = json.load(open(src, encoding='utf-8'))
    by_name = {}
    for f in ne['features']:
        g = f['geometry']
        if g is None or f['properties'].get('featurecla') != 'River':
            continue
        parts = g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]
        name = f['properties'].get('name_en') or f['properties'].get('name') or 'Unnamed river'
        # Natural Earth spells some names with diacritics (Godävari); keep plain letters.
        name = ''.join(c for c in unicodedata.normalize('NFKD', name) if not unicodedata.combining(c))
        by_name.setdefault(name, []).extend(p for p in parts if in_bbox(p))

    features = []
    for name, parts in sorted(by_name.items()):
        for line in merge(parts):
            coords = [[round(x, 4), round(y, 4)] for x, y in line]
            features.append({'type': 'Feature', 'properties': {'name': name},
                             'geometry': {'type': 'LineString', 'coordinates': coords}})

    with open(dst, 'w', encoding='utf-8') as out:
        json.dump({'type': 'FeatureCollection', 'features': features}, out, separators=(',', ':'), ensure_ascii=False)
    print(f'{len(features)} river lines from {sum(1 for p in by_name.values() if p)} rivers -> {dst}')


if __name__ == '__main__':
    main(sys.argv[1])
