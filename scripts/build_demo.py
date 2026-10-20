# Regenera app/inicio/content.ts desde app.html (fuente de verdad del front), que se sirve en /inicio detrás del cookie-gate.
# El Artifact estático (diligencia-demo.html) se retiró el 20/10/2026: el front ya no tiene datos de demo y sin servidor quedaría vacío.
# Uso: python scripts/build_demo.py
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'app.html').read_text(encoding='utf-8')
for marca in ('demo1234', 'loginScreen', 'DATOS DEMO', 'Transportes Andinos', 'chatResponses', 'contratoFindings'):
    assert marca not in src, f'app.html no debe contener datos de demo ({marca})'
(root / 'app' / 'inicio' / 'content.ts').write_text('export const DEMO_HTML = ' + json.dumps(src) + ';\n', encoding='utf-8')
print('content.ts', len(src), 'bytes')
