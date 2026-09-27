# Regenera las dos superficies desde app.html (fuente de verdad):
#  - app/inicio/content.ts  -> demo servida en Vercel detrás del cookie-gate (/inicio)
#  - diligencia-demo.html   -> Artifact estático (sin backend: usa los datos de respaldo)
# Uso: python scripts/build_demo.py
import json, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'app.html').read_text(encoding='utf-8')
assert 'demo1234' not in src and 'loginScreen' not in src, 'app.html no debe contener el login falso'
(root / 'app' / 'inicio' / 'content.ts').write_text('export const DEMO_HTML = ' + json.dumps(src) + ';\n', encoding='utf-8')
art = re.sub(r'<title>[^<]*</title>', '<title>Logicompliance</title>', src, count=1)
(root / 'diligencia-demo.html').write_text(art, encoding='utf-8')
print('content.ts', len(src), 'bytes · diligencia-demo.html', len(art), 'bytes')
