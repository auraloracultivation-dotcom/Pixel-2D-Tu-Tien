// Tab Mốc quà của Hệ Thống (data/he-thong.json → moc; chủ dự án 19/11/2026 03:26). Mỗi nhóm (Diệt yêu, Bế quan, Triệu hồi, Phá cảnh)
// một hộp quà riêng màu, số hiện tại, thanh tới mốc kế; dưới là mốc nhận được (sáng vàng), hai mốc kế (mờ, để người chơi thấy quà
// phía trước mà ham), mốc đã nhận gom một dòng. Quà hiện bằng hình + số (qua-icons.js), hộp trang bị bí ẩn có dấu ?.
// Nhận: máy chủ kiểm (htClaim như nhiệm vụ hệ thống), quà vào Hòm thư rồi nhận thư luôn; qi_pct thì cộng linh khí theo tầng đang tu.
import { mocGroups } from '../game/moc.js';
import { qiNeed } from '../game/stats.js';
import { quaRow } from './qua-icons.js';
import { spriteIcon } from './sprite-icon.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const num = n => Math.floor(n).toLocaleString('vi-VN');

// api: { ht, setHt(ht, line), render() }
export function renderMoc(game, body, api) {
  const H = game.data['he-thong'], M = H.moc, X = H.text, R = game.data.realms.names, ht = api.ht;
  const goal = (G, n) => fill(G.goal, { n: num(n), r: R[n] || n });
  const groups = mocGroups(game, ht), ready = groups.flatMap(G => G.list.filter(m => m.ok).map(m => [G, m]));
  body.append(el('p', 'ht-line ht-muted', M.intro));
  if (!game.cloud) body.append(el('p', 'ht-line ht-muted', M.need_login));
  let busy = false;
  const claimOne = async (G, m) => {
    const N = await import('../net/he-thong.js');
    game.persist?.(); await game.cloud?.flush?.();
    const r = await N.htClaim(m.id);
    for (const q of m.qua) if (q.qi_pct) game.gainQi(Math.round(qiNeed(game.save, game.data.realms) * q.qi_pct), game.player.x, game.player.y, false, true, true);
    return r;
  };
  const finish = (r, n) => {
    api.setHt({ ...ht, diem: r.diem, xong: r.xong ?? ht.xong }, H.ngay.xong);
    game.toast(fill(X.claimed, { p: (r.them || 0) * n }), 2); game.sfx?.('levelup'); game.htFace?.react('xong');
    import('../game/market.js').then(Mk => Mk.claimMail(game)).catch(() => {});
  };
  const fail = e => { busy = false; game.htFace?.react('loi'); game.toast(String(e?.message || '').includes('chua_xong') ? X.todo : X.summon_err, 2); api.render(); };
  if (ready.length > 1 && game.cloud) {
    const all = el('button', 'ht-btn big', `${M.claim_all} (${ready.length})`); all.type = 'button';
    all.onclick = async () => {
      if (busy) return; busy = true; all.disabled = true;
      let last = null, n = 0;
      try { for (const [G, m] of ready) { last = await claimOne(G, m); n++; } } catch (e) { if (!last) return fail(e); }
      finish(last, n);
    };
    body.append(all);
  }
  for (const G of groups) {
    const g = el('div', 'moc-g'); g.style.setProperty('--mc', G.mau); g.style.setProperty('--hr', `${G.hue || 0}deg`);
    const next = G.list.find(m => !m.got && !m.ok), prev = [...G.list].reverse().find(m => m.got || m.ok);
    const head = el('div', 'moc-h'), box = el('i', 'moc-hop'), txt = el('div', 'moc-ht');
    box.append(spriteIcon(game, 'ui.ic-qua', 0, 34));
    const cur = G.v == null ? '…' : G.k === 'realm' ? R[G.v] : `${num(G.v)} ${G.unit}`;
    txt.append(el('b', null, G.name), el('small', null, cur));
    if (G.k === 'kills' && G.raw > G.v && M.kill_cap) txt.append(el('small', 'moc-cap', fill(M.kill_cap, { a: num(G.raw) })));   // đã hạ nhiều hơn số được tính
    head.append(box, txt);
    if (next && G.v != null) {   // thanh tới mốc kế (tính từ mốc trước cho thanh nhích thấy rõ)
      const a = prev?.n || 0, f = Math.max(0, Math.min(1, (G.v - a) / (next.n - a)));
      const bar = el('div', 'moc-bar'), fillEl = el('i'); fillEl.style.width = (f * 100).toFixed(1) + '%';
      bar.append(fillEl, el('span', null, G.k === 'realm' ? goal(G, next.n) : fill(M.next, { a: num(G.v), b: num(next.n), u: G.unit })));
      head.append(bar);
    }
    g.append(head);
    const got = G.list.filter(m => m.got).length, show = [...G.list.filter(m => m.ok), ...G.list.filter(m => !m.got && !m.ok).slice(0, 2)];
    if (!show.length) g.append(el('p', 'ht-line ht-muted', M.all_done));
    for (const m of show) {
      const row = el('div', `moc-r${m.ok ? ' ok' : ''}`);
      row.append(el('b', null, goal(G, m.n)), quaRow(game, [...m.qua, { pts: H.points }], 24));
      const b = el('button', 'ht-btn sm', m.ok ? X.claim : X.todo); b.type = 'button'; b.disabled = !m.ok || !game.cloud;
      b.onclick = async () => { if (busy) return; busy = true; b.disabled = true; try { finish(await claimOne(G, m), 1); } catch (e) { fail(e); } busy = false; };
      row.append(b); g.append(row);
    }
    if (got) g.append(el('small', 'moc-da', `✓ ${got}/${G.list.length}`));
    body.append(g);
  }
}
