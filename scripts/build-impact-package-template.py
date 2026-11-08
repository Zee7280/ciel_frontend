#!/usr/bin/env python3
"""
Builds public/ciel-impact-package.html from the designer's standalone CIEL_Report_Package.html.

    python3 scripts/build-impact-package-template.py ~/Downloads/CIEL_Report_Package.html

It strips the embedded original form, demo data and JSON importer (the app feeds the viewer through
window.CIELPackage.load), hides the evidence-attach UI, adds the role-gating API (setAllowedTabs /
setActions), keeps server-stored evidence flags through portable(), and aligns the embedded analyzer
contract to the backend CII v4.5 weights. Every edit is anchored with an assertion, so a changed
upstream file fails loudly instead of shipping a half-patched viewer.
"""
import re, sys, hashlib, os
_here = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Downloads/CIEL_Report_Package.html')
dst = os.path.join(_here, '..', 'public', 'ciel-impact-package.html')
s = open(src, encoding='utf-8').read()
orig_len = len(s)

def once(old, new, label):
    global s
    n = s.count(old)
    assert n == 1, f'{label}: expected 1 match, got {n}'
    s = s.replace(old, new)

def cut(pattern, label, flags=re.S):
    global s
    m = list(re.finditer(pattern, s, flags))
    assert len(m) == 1, f'{label}: expected 1 match, got {len(m)}'
    s = s[:m[0].start()] + s[m[0].end():]

# 1. embedded original report form + demo data are not needed inside the app
cut(r'<script id="source-locked" type="application/octet-stream">.*?</script>\n', 'source-locked')
cut(r'<script id="demo" type="application/json">.*?</script>\n', 'demo')
cut(r'<dialog id="load-dialog".*?</dialog>\n', 'load-dialog')
cut(r'<dialog id="source-dialog".*?</dialog>\n', 'source-dialog')
cut(r'<button class="btn quiet" id="source-button".*?</button><button class="btn" id="load-button">Load answers</button>', 'header buttons')

# 2. JS that drove the removed UI
once(", DEMO=JSON.parse($('#demo').textContent)", '', 'DEMO const')
once("$('#load-button').onclick=openLoad;$('#save-button').onclick=savePackage;", "$('#save-button').onclick=savePackage;", 'load binding')
cut(r"\$\('#source-button'\)\.onclick=.*?\n", 'source-button binding')
cut(r"\$\('#download-source'\)\.onclick=.*?\n", 'download-source binding')
cut(r"\$\('#capture-source'\)\.onclick=.*?\n", 'capture-source binding')
cut(r"function openLoad\(\)\{.*?(?=// Event bindings stay outside regenerated panels\.)", 'openLoad..captureSource')
cut(r"\$\('#json-file'\)\.onchange=.*?(?=\$\('#attach-source'\)\.innerHTML=)", 'json/load-form/empty bindings')
once("  clone.querySelector('#source-frame').removeAttribute('srcdoc');\n", '', 'source-frame clone line')

# 3. header banner: no "load another report"
old_banner = s[s.index("$('#mode-banner').innerHTML=pkg.demo?"): s.index("$('#footer-state')")]
new_banner = "$('#mode-banner').innerHTML='<b><span class=\"status-dot\"></span>Report snapshot · '+esc(pkg.project.id||'local package')+'</b><span>Built from the submitted report. Restricted evidence is listed by name only.</span>';\n"
s = s.replace(old_banner, new_banner)

# 4. restricted evidence wording
once("(e.dataUrl?'View ↗':'File needed')", "(e.dataUrl?'View ↗':'Restricted')", 'file needed label')
once("'Attach all the original files from the report, including session evidence.'", "'No evidence files were attached to this report.'", 'empty evidence copy')
once("(!evidence.length?'<button class=\"btn\" id=\"empty-attach\">+ Attach evidence</button>':'')", "''", 'empty attach button')
once("if($('#empty-attach'))$('#empty-attach').onclick=()=>$('#attach-dialog').showModal();\n", '', 'empty attach handler')

# 5. attach UI hidden: the package is generated from the report, not hand-edited
assert s.count('</style>') >= 1
s = s.replace('</style>', '#attach-button,#attach-dialog{display:none!important}\n#analyzer-export-button[hidden],#save-button[hidden],#print-button[hidden]{display:none!important}\n</style>', 1)

# 5b. analyzer packet export is an Admin tool: hidden until the host grants it via setActions()
once('<button class="btn" id="analyzer-export-button"', '<button class="btn" id="analyzer-export-button" hidden', 'analyzer button hidden')

# 5c. server-stored (non-embedded) evidence must survive portable()/analyzer export, otherwise the
#     bridge's factualFlags reports every restricted file as a missing original
once("isDemo:!!e.isDemo,missing:!src}", "isDemo:!!e.isDemo,serverStored:e.serverStored===true,storageId:e.storageId||'',missing:!src}", 'normalizeFile passthrough')

# 6. start empty; the app loads the snapshot through CIELPackage.load()
once("applyPackage(normalize(restorePackage||DEMO,{demo:!restorePackage}));setTab('flash');",
     "applyPackage(normalize(restorePackage||{data:{},project:{},evidence:[]}));setTab('flash');", 'init')

# 7. tab gating API
once("load:raw=>applyPackage(normalize(raw)),setTab});",
     "load:raw=>applyPackage(normalize(raw)),setTab,setAllowedTabs,setActions});", 'api')
once("function jumpReport(id){", "function setActions(a){a=a||{};const map={analyzer:'analyzer-export-button',save:'save-button',print:'print-button'};for(const [k,id] of Object.entries(map))if(k in a)$('#'+id).hidden=!a[k];}\nfunction jumpReport(id){", 'setActions')
once("function jumpReport(id){", "function setAllowedTabs(list){const ok=new Set(list);const tabs=['flash','report','evidence'];for(const t of tabs)$('#tab-'+t).hidden=!ok.has(t);if(!ok.has(activeTab))setTab(tabs.find(t=>ok.has(t))||'flash');}\nfunction jumpReport(id){", 'setAllowedTabs')

# 9. scoring weights: the shipped R2 contract moved points from section 6 to section 9 and dropped the
#    bonus. CIEL PK keeps the CURRENT backend weights (cii-v4-5.constants.ts), so the embedded contract
#    is aligned to them — otherwise the Admin's analyzer packet would contradict the locked scores.
import json as _json
cm = re.search(r'(<script id="ciel-analyzer-contract" type="application/json">)(.*?)(</script>)', s, re.S)
assert cm, 'analyzer contract block'
contract = _json.loads(cm.group(2))
BACKEND_MAX = {'1': 10, '2': 10, '3': 5, '4': 30, '5': 10, '6': 10, '7': 15, '8': 5, '9': 5}
BACKEND_AI_DIMS = {'1': 10, '2': 10, '3': 5, '4A': 15, '4B': 15, '5': 10, '6': 10, '8': 5, '9': 5}
for sec in contract['scoring']['package_sections']:
    sec['maximum'] = BACKEND_MAX[str(sec['section'])]
for dim in contract['scoring']['ai_dimensions']:
    dim['maximum'] = BACKEND_AI_DIMS[str(dim['dimension'])]
assert sum(d['maximum'] for d in contract['scoring']['ai_dimensions']) == 85
assert sum(s_['maximum'] for s_ in contract['scoring']['package_sections']) == 100
contract['scoring']['bonus_max'] = 5
contract['scoring']['weights_source'] = 'ciel_backend/src/reports/cii-v4-5.constants.ts (CII v4.5 current weights; R2 re-weighting of sections 6/9 not adopted)'
contract['framework_version'] = '5.0'
s = s[:cm.start()] + cm.group(1) + _json.dumps(contract, separators=(',', ':'), ensure_ascii=False) + cm.group(3) + s[cm.end():]

# 7b. favicon for the rare case the viewer is opened directly in a tab (it normally sits in an iframe)
once('<meta charset="utf-8">',
     '<meta charset="utf-8"><link rel="icon" href="/favicon.ico"><link rel="apple-touch-icon" href="/icons/ciel-192.png">',
     'favicon')

# 8. leftover references must be gone
for dead in ['source-frame','load-dialog','source-dialog','load-form','json-file','empty-button','openLoad','decodeSource','captureSource','DEMO']:
    assert dead not in s, f'leftover reference: {dead}'

open(dst, 'w', encoding='utf-8').write(s)
print('ok', orig_len, '->', len(s), hashlib.sha256(s.encode()).hexdigest()[:12])
