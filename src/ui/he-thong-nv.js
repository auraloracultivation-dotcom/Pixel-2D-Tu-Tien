// Mục Nhiệm vụ của Hệ Thống (data/he-thong.json → missions, ngay, text; chủ dự án 06/11/2026 18:03): hệ thống nói một câu ở đầu
// (câu xong của nhiệm vụ vừa nhận), điểm, việc truyện đang làm, các nhiệm vụ kèm quà; nhiệm vụ câu hỏi lựa chọn trả lời ngay trong
// bảng (sai thì hệ thống trêu, chọn lại). Làm hết nhiệm vụ hệ thống thì hiện nhiệm vụ ngày (việc ngày trong bản lưu). Nhận xong thì
// gọi nhận thư luôn để quà vào túi. Máy chủ kiểm mọi thứ (net/he-thong.js).
import { htTask, missionList, dailyList } from '../game/he-thong.js';
import { gemInfo } from '../game/items.js';
import { matInfo } from '../game/cave.js';

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');

// Chữ quà của một nhiệm vụ: "3.000 Linh Thạch, Hồi Xuân Đan ×10, Trang bị phẩm Linh"
export function quaText(game, qua = []) {
  const D = game.data, T = D.items.line_tiers.list, X = D['he-thong'].text;
  return qua.map(q => q.coins ? `${q.coins.toLocaleString('vi-VN')} ${D.shop?.name || 'Linh Thạch'}`
    : q.mat ? `${matInfo(D, q.mat)?.name || q.mat} ×${q.n}`
    : q.gem ? `${gemInfo(D, q.gem)?.name || q.gem} ×${q.n}`
    : q.pill ? `${D.cave.pills[q.pill]?.name || q.pill} ×${q.n}`
    : q.gear != null ? fill(X.pool_gear, { t: T[q.gear]?.name || '' }) : '').filter(Boolean).join(', ');
}

const openQ = { id: null, bad: new Set() };   // câu hỏi đang mở và đáp án đã chọn sai (giữ qua lần vẽ lại)
const takeMail = game => import('../game/market.js').then(M => M.claimMail(game)).catch(() => {});

// api: { ht, setHt(ht), render(), minimize(), say }
export function renderTasks(game, body, api) {
  const H = game.data['he-thong'], X = H.text, ht = api.ht;
  if (api.say) { const s = el('div', 'ht-say'); s.append(el('b', null, H.name), el('p', null, api.say)); body.append(s); }
  body.append(el('div', 'ht-pts', fill(X.points, { p: ht.diem })));
  const t = htTask(game);
  if (t && !game.story?.current?.()?.until?.never) {   // hết truyện: Tự hành không còn việc truyện, khỏi Dẫn đường (chủ dự án 06/11 17:51)
    body.append(el('div', 'ht-sub', X.story_hint), el('p', 'ht-line ht-goal', t));
    const g = el('button', 'ht-btn', game.pilot ? H.guide_on : H.guide); g.type = 'button'; g.disabled = !!game.pilot;
    g.onclick = async () => { const P = await import('../game/pilot.js'); if (!game.pilot) P.togglePilot(game); api.minimize(); };
    body.append(g);
  }
  const done = (r, m) => {   // nhận xong: cộng điểm, hệ thống nói câu xong, nhận thư
    api.setHt({ ...ht, diem: r.diem, xong: r.xong ?? ht.xong, ngay_xong: r.ngay_xong ?? ht.ngay_xong }, m.xong || H.ngay.xong);
    game.toast(fill(X.claimed, { p: r.them }), 2); game.sfx?.('levelup');
    if (m.qua?.length) takeMail(game);
  };
  const err = e => { const s = String(e?.message || ''); game.toast(s.includes('chua_xong') ? X.todo : X.summon_err, 2); };
  const list = missionList(game, ht.xong);
  body.append(el('div', 'ht-sub', H.task_head));
  for (const m of list) {
    const row = el('div', `ht-mis${m.ok ? ' ok' : ''}`);
    row.append(el('b', null, m.goal));
    if (m.tip && !m.ok) row.append(el('small', null, m.tip));
    const qt = quaText(game, m.qua);
    row.append(el('small', 'ht-qua', fill(X.reward, { r: `${qt ? qt + ' · ' : ''}${fill(X.pts_tag, { p: H.points })}` })));
    const b = el('button', 'ht-btn sm'); b.type = 'button';
    if (m.hoi) {   // câu hỏi lựa chọn
      b.textContent = X.answer; b.disabled = !m.ok || !game.cloud;
      const opts = el('div', 'ht-opts'); opts.hidden = openQ.id !== m.id;
      const h = k => [...(m.id + k)].reduce((a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;   // xáo đáp án cố định theo nhiệm vụ
      m.hoi.opts.map((o, i) => [o, i]).sort((x, y) => h(x[1]) - h(y[1])).forEach(([o, i]) => {
        const ob = el('button', 'ht-opt', o); ob.type = 'button';
        if (openQ.id === m.id && openQ.bad.has(i)) { ob.classList.add('bad'); ob.disabled = true; }
        ob.onclick = async () => {
          opts.querySelectorAll('button').forEach(x => { x.disabled = true; });
          try { const N = await import('../net/he-thong.js'); done(await N.htAnswer(m.id, i), m); }
          catch (e) {
            opts.querySelectorAll('button').forEach(x => { x.disabled = false; });
            if (String(e?.message || '').includes('sai')) { openQ.bad.add(i); api.setHt(ht, m.hoi.sai); game.sfx?.('hit'); } else err(e);
          }
        };
        opts.append(ob);
      });
      b.onclick = () => { opts.hidden = !opts.hidden; if (openQ.id !== m.id) openQ.bad = new Set(); openQ.id = opts.hidden ? null : m.id; };
      row.append(b, opts);
    } else if (!m.ok && m.go) {
      b.textContent = X.go; b.onclick = () => { api.minimize(); game.openOldPanel?.({ btn: m.go }); }; row.append(b);
    } else {
      b.textContent = m.ok ? X.claim : X.todo; b.disabled = !m.ok || !game.cloud;
      b.onclick = async () => { b.disabled = true; try { const N = await import('../net/he-thong.js'); done(await N.htClaim(m.id), m); } catch (e) { err(e); b.disabled = false; } };
      row.append(b);
    }
    body.append(row);
  }
  // Nhiệm vụ ngày
  const N = H.ngay, day = dailyList(game, ht);
  body.append(el('div', 'ht-sub', N.head));
  if (!day) body.append(el('p', 'ht-line ht-muted', N.locked));
  else if (day.every(d => d.got)) body.append(el('p', 'ht-line ht-muted', N.done));
  else for (const d of day) {
    const row = el('div', `ht-mis${d.ok && !d.got ? ' ok' : ''}`), b = el('button', 'ht-btn sm', d.got ? X.claimed_tag : d.ok ? X.claim : X.todo);
    row.append(el('b', null, d.text), el('small', 'ht-qua', fill(X.reward, { r: fill(X.pts_tag, { p: H.points }) })));
    b.type = 'button'; b.disabled = d.got || !d.ok || !game.cloud;
    b.onclick = async () => { b.disabled = true; try { const M = await import('../net/he-thong.js'); done(await M.htDaily(d.id), {}); } catch (e) { err(e); b.disabled = false; } };
    row.append(b); body.append(row);
  }
  if (!game.cloud) body.append(el('p', 'ht-line ht-muted', X.login));
}
