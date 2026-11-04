"""Dựng riêng bộ khung giao diện GPT (ui_kit.py) và gộp vào data/art.json, không dựng lại cả kho hình (build.py dựng hết)."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import px, ui_kit, ui_kit2, ui_hoa_dao, ui_pham_cap, ui_icon, ui_vu_khi, hero_tny, thu_cuoi
n = ui_kit.build(px.save) + ui_kit2.build(px.save) + ui_hoa_dao.build(px.save) + ui_pham_cap.build(px.save) + ui_icon.build(px.save) + ui_vu_khi.build(px.save) + hero_tny.build(px.save) + thu_cuoi.build(px.save)
p = Path(__file__).resolve().parents[2] / 'data' / 'art.json'
art = json.loads(p.read_text(encoding='utf-8'))
art['sprites'].update({k: v for k, v in px.MANIFEST.items() if k.startswith(("ui.k-", "ui.hd-", "ui.pc-", "ui.ic-", "ui.vk-", "hero.tny", "hero.ly-hoa", "mount."))})
art['sprites'] = dict(sorted(art['sprites'].items()))
p.write_text(json.dumps(art, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print('khung giao diện GPT:', n)
