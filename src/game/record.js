// Quay clip trong game: nút 🎥 cạnh nút tiếng. Bấm để quay, bấm lần nữa để dừng, rồi mở bảng xem lại / chia sẻ / lưu.
// Số liệu và chữ ở data/record.json (nạp riêng ở đây để khỏi sửa danh sách chung trong core/data.js).
// Khi đã chia sẻ một clip đủ dài mà chưa nhận quà, bấm nút mở bảng nhận quà (có nút Bắt đầu quay) thay vì quay ngay.
import { pickType, startRecording } from '../core/recorder.js';
import { createRecordPanel } from '../ui/record-panel.js';
import { giftReady, loggedIn } from './record-gift.js';

const ver = () => new URL(import.meta.url).searchParams.get('v') || 'dev';

async function loadCfg() {
  const r = await fetch(new URL(`../../data/record.json?v=${ver()}`, import.meta.url), { cache: 'no-cache' });
  if (!r.ok) throw new Error('record.json');
  return r.json();
}

function addStyle() {
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = new URL(`../ui/record.css?v=${ver()}`, import.meta.url).href;
  document.head.append(l);
}

export async function createRecord(game, audio) {
  const mute = document.getElementById('btn-mute');
  if (!mute) return null;
  let cfg;
  try { cfg = await loadCfg(); } catch { return null; }   // thiếu file thì game vẫn chạy, chỉ không có nút quay
  const T = cfg.text;
  game.recordCfg = cfg;
  addStyle();

  const btn = document.createElement('button');
  btn.id = 'btn-rec'; btn.setAttribute('aria-label', T.btn_label); btn.title = T.btn_label;
  mute.after(btn);

  let rec = null, tick = 0, warned = false;
  const panel = createRecordPanel(game, cfg, () => start());

  function paint() {
    if (rec) { btn.classList.add('on'); btn.textContent = `● ${Math.floor(rec.elapsed())}`; }
    else { btn.classList.remove('on'); btn.textContent = T.btn; }
    btn.classList.toggle('gift', !rec && loggedIn(game) && giftReady(game));
  }

  function start() {
    if (rec) return;
    if (!pickType()) { game.toast(T.unsupported, 3); return; }
    const canvas = document.getElementById('game');
    try { rec = startRecording(canvas, audio?.master || null, cfg); }
    catch { rec = null; game.toast(T.fail, 2.5); return; }
    warned = false;
    game.toast(audio?.muted ? `${T.start} ${T.muted}` : T.start, 2.5);
    tick = setInterval(() => {
      if (!rec) return;
      const t = rec.elapsed();
      if (!warned && t >= cfg.max_sec - cfg.warn_sec) { warned = true; game.toast(T.near_end.replace('{n}', cfg.warn_sec), 2); }
      if (t >= cfg.max_sec) { stop(T.auto_stop.replace('{n}', cfg.max_sec)); return; }
      paint();
    }, 250);
    paint();
  }

  async function stop(msg) {
    if (!rec) return;
    const r = rec; rec = null; clearInterval(tick); paint();
    let clip;
    try { clip = await r.stop(); } catch { game.toast(T.fail, 2.5); return; }
    if (msg) game.toast(msg, 2.5);
    if (clip.sec < cfg.min_sec || !clip.blob.size) { game.toast(T.too_short, 2); return; }
    panel.openClip(clip);
  }

  btn.addEventListener('pointerdown', e => {
    e.stopPropagation();
    if (rec) { stop(); return; }
    if (panel.open) return;
    if (loggedIn(game) && giftReady(game)) { panel.openGift(); return; }
    start();
  });

  // Ra khỏi game (về màn hình chính, khoá máy) thì dừng để không mất clip
  document.addEventListener('visibilitychange', () => { if (document.hidden && rec) stop(T.hidden_stop); });

  paint();
  setInterval(() => { if (!rec) paint(); }, 5000);   // đăng nhập xong, nhận quà xong thì đổi dấu trên nút
  return { start, stop, get recording() { return !!rec; } };
}
