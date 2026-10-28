// Bảng clip vừa quay: xem lại, Chia sẻ, Lưu về máy, Bỏ; bên dưới là ô nhận quà chia sẻ (data/record.json "share").
// Bảng dựng bằng code (không thêm vào index.html) để khỏi đụng phần DOM chung.
import { giftOn, giftReady, giftClaimed, loggedIn, gemTypes, claimGift, unlockGift } from '../game/record-gift.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));

export function createRecordPanel(game, cfg, onRecord) {
  const T = cfg.text, S = cfg.share;
  const root = el('div', 'panel rec-panel'); root.hidden = true;
  const head = el('div', 'rec-head'), title = el('b', null, T.title), x = el('button', 'mini', T.close);
  head.append(title, x);
  const body = el('div', 'rec-body');
  root.append(head, body);
  document.body.append(root);

  let clip = null, url = '', pick = gemTypes(game)[0]?.id, note = '', busy = false;

  function close() {
    root.hidden = true; game.uiOpen = false;
    if (url) URL.revokeObjectURL(url);
    url = ''; clip = null; body.innerHTML = '';
  }
  x.onclick = close;

  const fileOf = c => new File([c.blob], `${cfg.file}-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.${c.ext}`, { type: c.blob.type });

  // iPhone/iPad không tải file về được từ trang web (nhất là khi cài lên màn hình chính): lưu qua bảng chia sẻ → "Lưu video"
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function download(c) {
    const a = el('a'); a.href = url; a.download = fileOf(c).name;
    document.body.append(a); a.click(); a.remove();
  }

  // Mở bảng chia sẻ của máy với file clip. Trả về 'ok' | 'huy' | 'khong' (máy không chia sẻ file được)
  async function sheet() {
    const f = fileOf(clip);
    if (!navigator.canShare?.({ files: [f] })) return 'khong';
    try { await navigator.share({ files: [f], title: T.share_title }); return 'ok'; }
    catch (e) { return e?.name === 'AbortError' ? 'huy' : 'khong'; }
  }

  // Ưu tiên TikTok: chép sẵn mô tả có tag (TikTok không nhận chữ gửi kèm), mở bảng chia sẻ để chọn TikTok
  async function tiktok() {
    const long = clip.sec >= S.min_sec;
    try { navigator.clipboard?.writeText(T.tiktok_caption).catch(() => {}); } catch { /* không chép được: vẫn chia sẻ */ }
    const r = await sheet();
    if (r === 'khong') { download(clip); note = T.no_share; }
    else note = T.tiktok_after;
    if (r !== 'huy' && long) unlockGift();
    render();
  }

  async function save() {
    if (ios) {
      const r = await sheet();
      note = r === 'khong' ? T.save_ios_fail : r === 'ok' ? T.saved_ios : T.save_ios;
    } else { download(clip); note = T.saved; }
    render();
  }

  function giftBox() {
    const box = el('div', 'rec-gift');
    box.append(el('b', null, fill(T.gift_head, { lv: S.gem_level })));
    if (giftClaimed(game)) { box.append(el('small', null, T.gift_done)); return box; }
    if (!loggedIn(game)) { box.append(el('small', null, T.gift_need_login)); return box; }
    box.append(el('small', null, fill(T.gift_how, { sec: S.min_sec, where: S.platforms, tag: S.tag })));
    if (!giftReady(game)) { box.append(el('small', 'rec-hint', fill(T.gift_need_clip, { sec: S.min_sec }))); return box; }
    const chips = el('div', 'rec-gems');
    chips.append(el('small', null, T.gift_pick));
    for (const g of gemTypes(game)) {
      const c = el('button', 'mini rec-gem' + (g.id === pick ? ' on' : ''), g.name);
      c.style.setProperty('--gem', g.color);
      c.onclick = () => { pick = g.id; render(); };
      chips.append(c);
    }
    const input = el('input', 'rec-link'); input.type = 'url'; input.placeholder = T.gift_link; input.inputMode = 'url';
    input.value = giftBox.draft || ''; input.oninput = () => { giftBox.draft = input.value; };
    const go = el('button', 'mini rec-go', busy ? T.gift_wait : T.gift_claim); go.disabled = busy;
    go.onclick = async () => {
      if (busy) return;
      busy = true; note = ''; render();
      const r = await claimGift(game, input.value, pick);
      busy = false;
      if (r.gem) { note = fill(T.gift_got, { gem: r.gem }); giftBox.draft = ''; game.sfx?.('pickup'); game.toast(note, 3); }
      else note = fill(T.err[r.error] || T.err.loi, { tag: S.tag });
      render();
    };
    box.append(chips, input, go);
    return box;
  }

  function render() {
    body.innerHTML = '';
    if (clip) {
      const v = el('video', 'rec-video'); v.src = url; v.controls = true; v.playsInline = true; v.loop = true; v.muted = false;
      const mb = (clip.blob.size / 1048576).toFixed(1);
      const info = el('small', 'rec-info', fill(T.info, { sec: Math.round(clip.sec), mb, fmt: clip.ext.toUpperCase() }));
      const acts = el('div', 'card-acts');
      const b = (text, fn) => { const k = el('button', 'mini', text); k.onclick = fn; return k; };
      const tk = el('button', 'mini rec-tiktok', T.tiktok); tk.onclick = tiktok;
      acts.append(b(T.save, save), b(T.drop, close));
      body.append(v, info, tk, acts);
      if (clip.ext === 'webm') body.append(el('small', 'rec-hint', T.webm_note));
    } else {
      const acts = el('div', 'card-acts');
      const k = el('button', 'mini', T.rec_start); k.onclick = () => { close(); onRecord?.(); };
      acts.append(k); body.append(acts);
    }
    if (note) body.append(el('p', 'rec-note', note));
    if (giftOn(game)) body.append(giftBox());
  }

  function openClip(c) {
    if (url) URL.revokeObjectURL(url);
    clip = c; url = URL.createObjectURL(c.blob); note = '';
    title.textContent = T.title;
    root.hidden = false; game.uiOpen = true; render();
  }

  function openGift() {
    clip = null; note = '';
    title.textContent = T.gift_open;
    root.hidden = false; game.uiOpen = true; render();
  }

  return { openClip, openGift, close, get open() { return !root.hidden; } };
}
