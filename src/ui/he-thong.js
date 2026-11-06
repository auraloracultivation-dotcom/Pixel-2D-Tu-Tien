// Hệ Thống Tu Tiên (data/he-thong.json; chủ dự án 06/11/2026 16:15): bảng giữa màn hình kiểu bảng hệ thống của truyện xuyên không.
// Lần đầu vào: chữ chào hiện dần từng dòng. Chạm ra ngoài bảng: bảng thu nhỏ, bay sang biểu tượng "Hệ" bên phải (cạnh nút pháp bảo);
// chạm biểu tượng thì bảng phóng to lại từ đó. Ba mục: Nhiệm vụ / Hỏi đáp (data/faq.json) / Hỏi thêm (net/he-thong.js).
// Hệ thống tự lên tiếng (game/he-thong.js htTick): biểu tượng rung, hiện một dòng nhắc cạnh biểu tượng. Kiểu ở he-thong.css.
// Biểu tượng là khối tinh thể vẽ bằng canvas (không dùng hình ngoài). Chữ người chơi chỉ gán textContent.
import { every } from '../core/ticker.js';
import { needIntro, doneIntro, htTick, missionList } from '../game/he-thong.js';
import { renderTasks } from './he-thong-nv.js';
import { renderGacha } from './he-thong-qua.js';
import { createFace } from './he-thong-mat.js';
import { createWander } from './he-thong-dao.js';

const ver = () => new URL(import.meta.url).searchParams.get('v') || 'dev';
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

// Khối tinh thể sáng xanh có chữ Hệ (vẽ lại mỗi khung để lấp lánh)
function drawIcon(cv, label, t) {
  const c = cv.getContext('2d'), W = cv.width, s = W / 44;
  c.clearRect(0, 0, W, W);
  c.save(); c.scale(s, s);
  const g = c.createRadialGradient(22, 22, 2, 22, 22, 22);
  g.addColorStop(0, `rgba(120,220,255,${0.45 + 0.2 * Math.sin(t * 2)})`); g.addColorStop(1, 'rgba(120,220,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 44, 44);
  const P = [[22, 3], [38, 14], [38, 30], [22, 41], [6, 30], [6, 14]];
  c.beginPath(); P.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
  const f = c.createLinearGradient(6, 3, 38, 41); f.addColorStop(0, '#1a6a9a'); f.addColorStop(0.5, '#2fb0e0'); f.addColorStop(1, '#123a6a');
  c.fillStyle = f; c.fill(); c.lineWidth = 2; c.strokeStyle = '#0a1830'; c.stroke();
  c.beginPath(); c.moveTo(22, 6); c.lineTo(35, 15); c.lineTo(22, 22); c.lineTo(9, 15); c.closePath(); c.fillStyle = 'rgba(200,245,255,0.35)'; c.fill();
  const k = (t * 0.6) % 1;   // vệt sáng quét chéo
  c.save(); c.clip(); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(-10 + k * 64, 0, 5, 44); c.restore();
  c.font = 'bold 15px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = 3; c.strokeStyle = '#0a1830'; c.strokeText(label, 22, 24); c.fillStyle = '#eafaff'; c.fillText(label, 22, 24);
  c.restore();
}

export function createHeThong(game) {
  const C = game.data['he-thong'], F = game.data.faq;
  if (!C) return;
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL(`./he-thong.css?v=${ver()}`, import.meta.url).href;
  document.head.append(css);

  // Biểu tượng
  const ic = el('button', 'ht-icon'); ic.type = 'button'; ic.id = 'ht-icon'; ic.hidden = true; ic.title = C.name;
  const cv = document.createElement('canvas'); cv.width = 88; cv.height = 88;
  const MT = C.mat, icFace = createFace(game, MT?.icon_k || 0.75), headFace = createFace(game, MT?.head_k || 0.75), bigFace = createFace(game, MT?.big_k || 1);   // biểu cảm (he-thong-mat.js); chưa có hình thì vẽ tinh thể
  if (MT) { ic.append(icFace.node); ic.classList.add('has-face'); } else ic.append(cv);
  game.htFace = { react: (ev, then) => { headFace.react(ev, then); icFace.react(ev, then); bigFace.react(ev, then); } };
  const tip = el('div', 'ht-tip'); tip.hidden = true;
  // Bảng
  const back = el('div', 'ht-back'); back.hidden = true;
  const box = el('div', 'ht-box'), head = el('div', 'ht-head'), body = el('div', 'ht-body'), tabs = el('div', 'ht-tabs'), hint = el('div', 'ht-hint', C.close_hint);
  head.append(MT ? headFace.node : el('span', 'ht-dot'), el('b', null, C.name));
  box.append(head, tabs, body, hint); back.append(box);
  document.body.append(back, ic, tip);

  let tab = 'task', open = false, typing = null, mine = null, ht = { diem: 0, xong: [], ngay_xong: [] }, say = '';
  const H = C, fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
  async function loadHt() { if (!game.cloud) return; try { const N = await import('../net/he-thong.js'); ht = await N.htStatus(); if (open) render(); } catch { /* mạng lỗi */ } }
  const stop = ev => ev.stopPropagation();
  [ic, tip, back].forEach(e => e.addEventListener('pointerdown', stop));
  box.addEventListener('click', stop);
  back.addEventListener('click', () => minimize());
  ic.addEventListener('click', () => (open ? minimize() : show()));
  tip.addEventListener('click', () => { tip.hidden = true; show(); });

  function tabBar() {
    tabs.textContent = '';
    for (const [id, name] of Object.entries(C.tabs)) {
      if (id === 'faq' && !F) continue;
      const b = el('button', `ht-tab${id === tab ? ' on' : ''}`, name); b.type = 'button';
      b.onclick = () => { tab = id; render(); };
      tabs.append(b);
    }
  }
  function render() {
    tabBar(); body.textContent = '';
    if (tab === 'task') renderTasks(game, body, { ht, say, face: MT ? bigFace : null, setHt: (h, line) => { ht = h; say = line || say; render(); }, render, minimize });
    else if (tab === 'gacha') {
      renderGacha(game, body, ht, r => { ht = { ...ht, diem: r.diem }; render(); });
    } else if (tab === 'faq') {
      for (const gr of F.groups) {
        body.append(el('div', 'ht-sub', gr.title));
        for (const it of gr.list) {
          const card = el('div', 'ht-qa'), q = el('button', 'ht-q', it.q), a = el('div', 'ht-a'); q.type = 'button';
          for (const l of it.a) a.append(el('p', null, l));
          q.onclick = () => card.classList.toggle('on');
          card.append(q, a); body.append(card);
        }
      }
    } else {
      body.append(el('p', 'ht-line', C.ask_head));
      const ta = el('textarea', 'ht-ask'); ta.maxLength = 300; ta.rows = 3; ta.placeholder = C.ask_ph;
      const send = el('button', 'ht-btn', C.ask_send); send.type = 'button';
      send.onclick = async () => {
        const q = ta.value.trim();
        if (q.length < 4) { game.toast(C.ask_err.ngan, 1.6); return; }
        send.disabled = true;
        try { const N = await import('../net/he-thong.js'); await N.askSystem(q, game.save?.step); ta.value = ''; game.toast(C.ask_ok, 2); game.htFace?.react('ask_ok'); mine = null; render(); }
        catch (e) { const m = String(e?.message || ''); game.htFace?.react('ask_err'); game.toast(C.ask_err[Object.keys(C.ask_err).find(k => m.includes(k))] || (game.cloud ? C.ask_err.other : C.ask_err.chua_dang_nhap), 2.2); }
        finally { send.disabled = false; }
      };
      body.append(ta, send);
      if (mine === null && game.cloud) { mine = []; import('../net/he-thong.js').then(N => N.myQuestions()).then(r => { mine = r; if (open && tab === 'ask') render(); }).catch(() => {}); }
      if (mine?.length) {
        body.append(el('div', 'ht-sub', C.ask_mine));
        for (const m of mine) { const d = el('div', 'ht-mine'); d.append(el('b', null, m.q)); if (m.a) d.append(el('p', null, m.a)); body.append(d); }
      }
    }
  }

  // Phóng to từ biểu tượng / thu nhỏ về biểu tượng
  function fly(toIcon) {
    const r = ic.getBoundingClientRect(), b = box.getBoundingClientRect();
    const dx = r.left + r.width / 2 - (b.left + b.width / 2), dy = r.top + r.height / 2 - (b.top + b.height / 2);
    return `translate(${Math.round(dx)}px, ${Math.round(dy)}px) scale(0.08)`;
  }
  function show(intro) {
    if (open) return;
    open = true; back.hidden = false; game.uiOpen = game.uiOpen || 'he-thong'; loadHt();
    if (intro) { tab = 'task'; typeIntro(intro); headFace.react(intro === 'new' ? 'intro' : 'intro_old'); bigFace.react(intro === 'new' ? 'intro' : 'intro_old'); } else { render(); headFace.show(icFace.cur); }
    box.style.transition = 'none'; box.style.opacity = '0'; box.style.transform = fly();
    requestAnimationFrame(() => requestAnimationFrame(() => { box.style.transition = ''; box.style.opacity = '1'; box.style.transform = 'none'; }));
  }
  function minimize() {
    if (!open) return;
    if (typing) { clearInterval(typing); typing = null; doneIntro(game); }
    open = false; box.style.transform = fly(); box.style.opacity = '0';
    if (game.uiOpen === 'he-thong') game.uiOpen = false;
    setTimeout(() => { if (!open) back.hidden = true; }, 380);
    ic.classList.remove('wake'); ic.classList.add('land'); setTimeout(() => ic.classList.remove('land'), 500);
  }
  function typeIntro(kind) {
    tabs.textContent = ''; body.textContent = '';
    const lines = kind === 'new' ? C.intro : C.intro_old, wrap = el('div', 'ht-intro'); body.append(wrap);
    if (MT) wrap.append(bigFace.node);
    let li = 0, ci = 0, p = null;
    typing = setInterval(() => {
      if (li >= lines.length) { clearInterval(typing); typing = null; doneIntro(game); setTimeout(() => { if (open) render(); }, 1600); return; }
      if (!p) { p = el('p', 'ht-line'); wrap.append(p); }
      ci += 2; p.textContent = lines[li].slice(0, ci);
      if (ci >= lines[li].length) { li++; ci = 0; p = null; }
    }, 30);
  }
  function nudge(text, kind) {
    tip.textContent = text; tip.hidden = false; ic.classList.add('wake'); game.sfx?.('pickup');
    icFace.react('nudge_' + (kind || 'step'));
    clearTimeout(nudge.t); nudge.t = setTimeout(() => { tip.hidden = true; ic.classList.remove('wake'); icFace.show('thuong'); }, 7000);
  }

  // Chỗ biểu tượng: ngay bên phải nút pháp bảo (btn-art), không có thì bên phải nút chiêu thứ ba; sát mép phải thì lên trên
  function place() {
    const ref = [document.getElementById('btn-art'), document.getElementById('btn-s2')].find(e => e && !e.hidden && e.offsetParent);
    const S = ic.offsetWidth || 44, SH = ic.offsetHeight || 44, W = window.innerWidth;
    let x = W - S - 8, y = window.innerHeight * 0.5;
    if (ref) { const r = ref.getBoundingClientRect(); x = r.right + 6; y = r.top + (r.height - SH) / 2; if (x + S > W - 4) { x = r.left + (r.width - S) / 2; y = r.top - SH - 8; } }
    ic.style.left = `${Math.round(x)}px`; ic.style.top = `${Math.round(y)}px`;
    tip.style.right = `${Math.round(W - x + 6)}px`; tip.style.top = `${Math.round(y)}px`;
  }

  let last = performance.now();
  every(() => {
    const now = performance.now(), dt = (now - last) / 1000; last = now;
    const hud = document.getElementById('hud'), live = !!game.save && hud && !hud.hidden && !game.trip;
    ic.hidden = !live; if (!live) { tip.hidden = true; return; }
    if (!wander) place();
    const mum = wander?.say;   // lẩm bẩm khi đang đi ngó nghiêng
    if (mum && !open && tip.hidden) { tip.textContent = mum; tip.hidden = false; clearTimeout(nudge.t); nudge.t = setTimeout(() => { tip.hidden = true; }, 3200); }
    const k = needIntro(game);
    if (k && !open && !game.dialog?.open && !game.uiOpen) { show(k); return; }
    const say = htTick(game, dt);
    if (say && !open) nudge(say, say === C.nudge.death ? 'death' : say === C.nudge.idle ? 'idle' : 'step');
    // nhiệm vụ hệ thống xong mà chưa nhận điểm: nhắc (dò lại điểm mỗi 2 phút, nhắc cách nhau 3 phút)
    if (game.cloud && now - (loadHt.at || 0) > 120000) { loadHt.at = now; loadHt(); }
    if (!say && !open && !game.uiOpen && now - (nudge.claim || 0) > 180000 && missionList(game, ht.xong).some(m => m.ok)) { nudge.claim = now; nudge(C.nudge.claim, 'claim'); }
    // lâu lâu biểu tượng tự làm trò (mat.ambient_s giây một lần)
    if (MT && !open && tip.hidden && now > (nudge.amb ||= now + 20000)) { const [a, b] = MT.ambient_s || [25, 45]; nudge.amb = now + (a + Math.random() * (b - a)) * 1000; icFace.react('ambient'); }
  }, 1000);
  // Chạy lung tung như thú cưng (he-thong-dao.js): đặt biểu tượng mỗi khung hình, dòng nhắc bám theo bên cạnh
  const wander = MT && C.dao?.on ? createWander(game, ic, icFace, C.dao) : null;
  if (wander) {
    let t0 = performance.now();
    const loop = t => {
      const dt = Math.min(0.1, (t - t0) / 1000); t0 = t;
      if (!ic.hidden) {
        const p = wander.step(dt, open || ic.classList.contains('wake') || !tip.hidden), W = innerWidth, S = ic.offsetWidth || 56;
        if (p.x > W / 2) { tip.style.left = ''; tip.style.right = `${Math.round(W - p.x + 6)}px`; } else { tip.style.right = ''; tip.style.left = `${Math.round(p.x + S + 6)}px`; }
        tip.style.top = `${Math.round(p.y)}px`;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  const anim = t => { if (!ic.hidden) drawIcon(cv, C.icon, t / 1000); requestAnimationFrame(anim); };
  if (!MT) requestAnimationFrame(anim);
  game.openHeThong = () => show();
}
