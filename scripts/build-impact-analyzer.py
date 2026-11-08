#!/usr/bin/env python3
"""
Builds public/ciel-analyzer.html from the designer's standalone CIEL_Analyzer.html (Analyser R2).

    python3 scripts/build-impact-analyzer.py ~/Downloads/CIEL_Analyzer.html

CIEL PK ships this as a LOCAL review tool for Admin (option B): the official analyse / approve flow
stays on the dashboard (`cii-v4-5/analyse` + `cii-v4-5/approve`). To keep the tool consistent with
what the platform actually scores, the build:

  1. aligns the embedded R2 contract + rubric to the CURRENT backend CII v4.5 weights
     (section 6 = 10, section 9 = 5, bonus 5) and renames the rubric version so an AI result produced
     for the un-aligned R2 rubric is refused by the tool's own validator;
  2. forces offline mode: the tool only calls its `/api/ciel/cii/*` endpoints (which do not exist on
     the CIEL backend) when opened with `?live=1`;
  3. swaps the 25 MB of embedded badge / logo PNGs for the app's existing public assets
     (public/certificate-badges/*.png, public/iel-pk-logo.png), so the page is ~3.5 MB;
  4. aligns the L6 qualification thresholds to the backend's gate ratios (4B >= 0.8, evidence >= 0.85,
     sustainability >= 0.7).

Every edit is anchored with an assertion so a changed upstream file fails loudly.
"""
import json
import os
import re
import sys

_here = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Downloads/CIEL_Analyzer.html')
dst = os.path.join(_here, '..', 'public', 'ciel-analyzer.html')
public = os.path.join(_here, '..', 'public')

s = open(src, encoding='utf-8').read()
orig_len = len(s)

RUBRIC_VERSION = 'CIEL-CII-2026.11-R2-CIELPK-WEIGHTS'
# Mirrors CII_V45_DIMENSIONS maxPoints in ciel_backend/src/reports/cii-v4-5.constants.ts
BACKEND_SECTION_MAX = {'1': 10, '2': 10, '3': 5, '4': 30, '5': 10, '6': 10, '7': 15, '8': 5, '9': 5}
BACKEND_AI_DIMS = {'1': 10, '2': 10, '3': 5, '4A': 15, '4B': 15, '5': 10, '6': 10, '8': 5, '9': 5}
# Upstream rubric sums: dim 6 = 5, dim 9 = 10. Scale criteria so each dimension matches the backend.
DIM_SCALE = {'6': 2.0, '9': 0.5}
BADGE_FILES = {
    'L1': '/certificate-badges/level-1-participation-acknowledgement.png',
    'L2': '/certificate-badges/level-2-foundation-stage-contributor.png',
    'L3': '/certificate-badges/level-3-emerging-community-contributor.png',
    'L4': '/certificate-badges/level-4-developing-impact-contributor.png',
    'L5': '/certificate-badges/level-5-distinguished-impact-contributor.png',
    'L6': '/certificate-badges/level-6-transformative-impact-contributor.png',
}
LOGO_FILE = '/iel-pk-logo.png'


def once(old, new, label):
    global s
    n = s.count(old)
    assert n == 1, f'{label}: expected 1 match, got {n}'
    s = s.replace(old, new)


def json_block(id_):
    m = re.search(r'(<script id="%s" type="application/json">)(.*?)(</script>)' % id_, s, re.S)
    assert m, f'json block {id_}'
    return m


def replace_json_block(id_, value):
    global s
    m = json_block(id_)
    s = s[:m.start()] + m.group(1) + json.dumps(value, separators=(',', ':'), ensure_ascii=False) + m.group(3) + s[m.end():]


# 1a. contract
contract = json.loads(json_block('ciel-contract').group(2))
for sec in contract['scoring']['package_sections']:
    sec['maximum'] = BACKEND_SECTION_MAX[str(sec['section'])]
for dim in contract['scoring']['ai_dimensions']:
    dim['maximum'] = BACKEND_AI_DIMS[str(dim['dimension'])]
assert sum(d['maximum'] for d in contract['scoring']['ai_dimensions']) == 85
assert sum(x['maximum'] for x in contract['scoring']['package_sections']) == 100
contract['scoring']['bonus_max'] = 5
contract['scoring']['weights_source'] = (
    'ciel_backend/src/reports/cii-v4-5.constants.ts (CII v4.5 current weights; R2 re-weighting of sections 6/9 not adopted)'
)
contract['framework_version'] = '5.0'
contract['rubric_version'] = RUBRIC_VERSION
l6 = contract['scoring']['badge_policy']['l6']
l6['minimum_sustainability'] = 3.5   # backend gate: section 9 >= 0.7 of 5
l6['minimum_manual_evidence'] = 12.75  # backend gate: dimension 7 >= 0.85 of 15
l6['thresholds_source'] = 'computeCiiV45Result qualityGates.L6 (4B >= 0.8, 7 >= 0.85, 9 >= 0.7)'
contract['deployment'] = {
    'mode': 'local_review_tool',
    'note': 'Offline by default. Official analyse/approve runs on the CIEL PK dashboard (cii-v4-5). Open with ?live=1 only once the /api/ciel/cii endpoints exist.',
}
replace_json_block('ciel-contract', contract)

# 1b. rubric
rubric = json.loads(json_block('ciel-rubric').group(2))
assert len(rubric) == 45, len(rubric)
for c in rubric:
    scale = DIM_SCALE.get(str(c['dimension']))
    if scale:
        c['max'] = c['max'] * scale
        if float(c['max']).is_integer():
            c['max'] = int(c['max'])
sums = {}
for c in rubric:
    sums[str(c['dimension'])] = sums.get(str(c['dimension']), 0) + c['max']
for dim, mx in BACKEND_AI_DIMS.items():
    assert abs(sums[dim] - mx) < 1e-9, (dim, sums[dim], mx)
assert sums['7'] == 15
replace_json_block('ciel-rubric', rubric)

# 1c. spec (prompt + response contract) carries the rubric version the AI must echo back
spec = json.loads(json_block('ciel-spec').group(2))
spec['rubricVersion'] = RUBRIC_VERSION
replace_json_block('ciel-spec', spec)

# 2. offline by default
once(
    "HOSTED=['https:','http:'].includes(location.protocol)&&query.get('demo')!=='1';",
    "HOSTED=query.get('live')==='1';",
    'hosted detection',
)

# 3. badge / logo assets -> public files
for path in list(BADGE_FILES.values()) + [LOGO_FILE]:
    assert os.path.exists(os.path.join(public, path.lstrip('/'))), f'missing public asset {path}'
m = re.search(r'const OFFICIAL_CIEL_PK_LOGO_LOCKED = "data:image/png;base64,[A-Za-z0-9+/=]+";', s)
assert m, 'logo const'
s = s[:m.start()] + 'const OFFICIAL_CIEL_PK_LOGO_LOCKED = %s;' % json.dumps(LOGO_FILE) + s[m.end():]
m = re.search(r'const BADGES = \{.*?\};', s, re.S)
assert m, 'badges const'
s = s[:m.start()] + 'const BADGES = %s;' % json.dumps(BADGE_FILES) + s[m.end():]

# 4. L6 qualification thresholds in the runtime check (contract above carries the same numbers)
once("if((reviewedScore('9')??0)<8)reasons.push('Sustainability below 8/10');",
     "if((reviewedScore('9')??0)<3.5)reasons.push('Sustainability below 3.5/5');", 'l6 sustainability')
once("if((evidenceTotal()??0)<12)reasons.push('Manual evidence below 12/15');",
     "if((evidenceTotal()??0)<12.75)reasons.push('Manual evidence below 12.75/15');", 'l6 evidence')

# 4b. the rubric guide text quotes the same L6 numbers
once("Measured Change ≥12/15, Sustainability ≥8/10, evidence ≥12/15,",
     "Measured Change ≥12/15, Sustainability ≥3.5/5, evidence ≥12.75/15,", 'l6 guide text')
assert 'Sustainability ≥8/10' not in s

# 4c. the tool opens in its own tab: same CIEL PK favicon as the app
once('<meta charset="utf-8">',
     '<meta charset="utf-8"><link rel="icon" href="/favicon.ico"><link rel="apple-touch-icon" href="/icons/ciel-192.png">',
     'favicon')

# 5. sanity: no large embedded images remain (pdf.js gzip blobs are allowed)
for mm in re.finditer(r'[A-Za-z0-9+/=]{20000,}', s):
    before = s[max(0, mm.start() - 120):mm.start()]
    assert 'pdfjs' in before, 'unexpected large blob near: ' + before[-80:]
assert 'data:image/png;base64' not in s
assert "query.get('demo')!=='1'" not in s

open(dst, 'w', encoding='utf-8').write(s)
print('ok', orig_len, '->', len(s))
