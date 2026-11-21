// Mục Nhiệm vụ của Hệ Thống (data/he-thong.json → missions, ngay, text; chủ dự án 06/11/2026 18:03): hệ thống nói một câu ở đầu
// (câu xong của nhiệm vụ vừa nhận), điểm, việc truyện đang làm, các nhiệm vụ kèm quà; nhiệm vụ câu hỏi lựa chọn trả lời ngay trong
// bảng (sai thì hệ thống trêu, chọn lại). Làm hết nhiệm vụ hệ thống thì hiện nhiệm vụ ngày (việc ngày trong bản lưu). Nhận xong thì
// gọi nhận thư luôn để quà vào túi. Máy chủ kiểm mọi thứ (net/he-thong.js).
import { qiNeed } from '../game/stats.js';
import { htTask, missionList, dailyList } from '../game/he-thong.js';
import { gemInfo } from '../game/items.js';
import { matInfo } from '../game/cave.js';
import { quaRow } from './qua-icons.js';

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

const nvLog = { mo: false };   // danh sách Hành trình đang mở hay gọn (giữ qua lần vẽ lại)
const openQ = { id: null, bad: new Set() };   // câu hỏi đang mở và đáp án đã chọn sai (giữ qua lần vẽ lại)
const takeMail = game => import('../game/market.js').then(M => M.claimMail(game)).catch(() => {});

// api: { ht, setHt(ht), render(), minimize(), say }
export function renderTasks(game, body, api) {
  const H = game.data['he-thong'], X = H.text, ht = api.ht;
  if (api.say) { const s = el('div', 'ht-say'), t = el('div'); t.append(el('b', null, H.name), el('p', null, api.say)); if (api.face) s.append(api.face.node); s.append(t); body.append(s); }
  body.append(el('div', 'ht-pts', fill(X.points, { p: ht.diem })));
  // Nhiệm vụ chính của truyện (src/game/story.js goal / list; thẻ trên màn chơi src/ui/nv-hud.js): số, tên, việc đang làm, nút Dẫn đường (Tự hành đi làm);
  // "Hành trình" mở danh sách các nhiệm vụ đã qua theo số thứ tự. Truyện đi theo nhiệm vụ 1 → N, không chia chương (chủ dự án 21/11/2026).
  const nv = game.story?.goal?.(), ds = game.story?.list?.() || [];
  if (nv?.so || ds.some(u => u.xong)) {
    const card = el('div', 'ht-nv');
    if (nv?.so) {
      card.append(el('small', null, fill(X.nv_head, { so: nv.so })), el('b', null, nv.ten || nv.text), el('p', 'ht-line', nv.of ? `${(nv.goc || nv.text).replace(/\s*\(\{n\}\/\d+\)\s*$/, '')}  ${nv.n}/${nv.of}` : nv.text));
    } else card.append(el('p', 'ht-line ht-muted', X.nv_het));
    const row = el('div', 'ht-nv-row');
    if (nv?.so) {
      const g = el('button', 'ht-btn', game.pilot ? H.guide_on : H.guide); g.type = 'button'; g.disabled = !!game.pilot;
      g.onclick = async () => { const P = await import('../game/pilot.js'); if (!game.pilot) P.togglePilot(game); api.minimize(); };
      row.append(g);
    }
    const lg = el('button', 'ht-btn sm ht-nv-log', nvLog.mo ? X.nv_log_dong : X.nv_log); lg.type = 'button';
    lg.onclick = () => { nvLog.mo = !nvLog.mo; api.render(); };
    row.append(lg); card.append(row);
    if (nvLog.mo) {
      const ol = el('div', 'ht-nv-ds');
      for (const u of ds) { if (!u.xong && !u.dang) continue; const d = el('div', 'ht-nv-d' + (u.dang ? ' dang' : '')); d.append(el('i', null, String(u.so)), el('span', null, u.ten || u.goal)); ol.append(d); }
      card.append(ol);
      requestAnimationFrame(() => { ol.scrollTop = ol.scrollHeight; ol.scrollIntoView({ block: 'nearest' }); });   // danh sách dài hơn khung: mở ra ở cuối (nhiệm vụ đang làm và các việc vừa qua) và kéo bảng vừa đủ để thấy dòng cuối; kéo lên để xem lại từ đầu
    }
    body.append(card);
  }
  const t = htTask(game);
  if (t && H.story_ui !== false && !game.story?.current?.()?.until?.never) {   // story_ui false: bỏ khung việc truyện (data/he-thong.json)   // hết truyện: Tự hành không còn việc truyện, khỏi Dẫn đường (chủ dự án 06/11 17:51)
    body.append(el('div', 'ht-sub', X.story_hint), el('p', 'ht-line ht-goal', t));
    const g = el('button', 'ht-btn', game.pilot ? H.guide_on : H.guide); g.type = 'button'; g.disabled = !!game.pilot;
    g.onclick = async () => { const P = await import('../game/pilot.js'); if (!game.pilot) P.togglePilot(game); api.minimize(); };
    body.append(g);
  }
  const done = (r, m) => {   // nhận xong: cộng điểm, hệ thống nói câu xong, nhận thư
    api.setHt({ ...ht, diem: r.diem, xong: r.xong ?? ht.xong, ngay_xong: r.ngay_xong ?? ht.ngay_xong }, m.xong || H.ngay.xong);
    game.toast(fill(X.claimed, { p: r.them }), 2); game.sfx?.('levelup');
    game.htFace?.react('xong');
    if (m.qua?.length) takeMail(game);
  };
  // Nhận thưởng: đẩy bản lưu lên máy chủ trước (máy chủ xét theo bản đã lưu; vừa xong việc mà chưa kịp lưu thì báo "chưa xong",
  // chơi thử 12/11/2026: bấm Nhận 5 lần vẫn không nhận được); máy chủ vẫn báo chưa xong thì đợi lưu xong rồi thử lại một lần
  const sync = async () => { game.persist?.(); for (let i = 0; i < 3; i++) { await game.cloud?.flush?.(); await new Promise(r => setTimeout(r, 300)); } };
  const claim = async fn => { await sync(); try { return await fn(); } catch (e) { if (!String(e?.message || '').includes('chua_xong')) throw e; await new Promise(r => setTimeout(r, 1500)); await sync(); return fn(); } };
  const err = e => { const s = String(e?.message || ''); game.htFace?.react('loi'); game.toast(s.includes('chua_xong') ? X.todo : X.summon_err, 2); };
  // thứ tự (chủ dự án 12/11/2026 10:44): chờ nhận thưởng trên đầu, chưa làm giữa, đã nhận cuối (sort giữ thứ tự gốc trong mỗi nhóm)
  const rank = d => (d.got ? 2 : d.ok ? 0 : 1);
  const list = missionList(game, ht.xong).sort((x, y) => rank(x) - rank(y));
  body.append(el('div', 'ht-sub', H.task_head));
  for (const m of list) {
    const row = el('div', `ht-mis${m.ok ? ' ok' : ''}`);
    row.append(el('b', null, m.goal));
    if (m.tip && !m.ok) row.append(el('small', null, m.tip));
    row.append(quaRow(game, [...(m.qua || []), { pts: H.points }], 22));   // quà bằng hình + số (chủ dự án 19/11/2026 03:26)
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
            if (String(e?.message || '').includes('sai')) { openQ.bad.add(i); api.setHt(ht, (Array.isArray(m.hoi.sai) ? m.hoi.sai[i] : m.hoi.sai) || X.wrong); game.sfx?.('hit'); game.htFace?.react('sai'); } else err(e);
          }
        };
        opts.append(ob);
      });
      b.onclick = () => { opts.hidden = !opts.hidden; if (openQ.id !== m.id) openQ.bad = new Set(); openQ.id = opts.hidden ? null : m.id; };
      row.append(b, opts);
    } else if (!m.ok && m.go) {
      b.textContent = X.go; b.onclick = () => { api.minimize(); game.openOldPanel?.({ btn: m.go }); }; row.append(b);
    } else if (!m.ok) {   // chơi thử 12/11/2026: bỏ khung truyện thì việc truyện / tu luyện không còn nút dẫn → Đi làm: truyện, cảnh giới bật Tự hành;
      // pháp bảo mở Trang bị → P.bảo; trang bị, cường hoá, khảm mở Trang bị
      const k = m.dk || {}, pb = Object.keys(k).some(x => x.startsWith('pb_'));
      b.textContent = X.go;
      b.onclick = async () => { api.minimize(); if (pb) game.openPhapBao?.(); else if ('step' in k || 'realm' in k) { const P = await import('../game/pilot.js'); if (!game.pilot) P.togglePilot(game); } else game.openSelf?.('do'); };
      row.append(b);
    } else {
      b.textContent = m.ok ? X.claim : X.todo; b.disabled = !m.ok || !game.cloud;
      b.onclick = async () => { b.disabled = true; try { const N = await import('../net/he-thong.js'); done(await claim(() => N.htClaim(m.id)), m); } catch (e) { err(e); b.disabled = false; } };
      row.append(b);
    }
    body.append(row);
  }
  // Nhiệm vụ ngày
  const N = H.ngay, day = dailyList(game, ht)?.sort((x, y) => rank(x) - rank(y));
  body.append(el('div', 'ht-sub', N.head));
  { const L = game.data.pets.thu_lenh; if (L && day) body.append(el('p', 'ht-line ht-muted', `${L.name}: ${ht?.thu_lenh ?? game.thuLenh ?? 0}/${L.per_mount} · mỗi ngày xong ${L.daily_need} việc được 1, đủ ${L.per_mount} đổi 1 thú cưỡi ở Ngự Thú Sư`)); }   // chủ dự án 16/11/2026
  if (!day) body.append(el('p', 'ht-line ht-muted', N.locked));
  else if (day.every(d => d.got)) body.append(el('p', 'ht-line ht-muted', N.done));
  else for (const d of day) {
    const row = el('div', `ht-mis${d.ok && !d.got ? ' ok' : ''}`), b = el('button', 'ht-btn sm', d.got ? X.claimed_tag : d.ok ? X.claim : X.todo);
    row.append(el('b', null, d.text), quaRow(game, [...(N.qi_pct ? [{ qi_pct: N.qi_pct }] : []), { pts: H.points }], 22));
    b.type = 'button'; b.disabled = d.got || (d.ok && !game.cloud);
    if (!d.ok) { b.textContent = X.go; b.onclick = async () => { api.minimize(); (await import('../game/dailyjob.js')).dailyGo(game, d.id); }; }   // chưa xong: tự hành đi làm
    else b.onclick = async () => { b.disabled = true; try { const M = await import('../net/he-thong.js'), r = await claim(() => M.htDaily(d.id)); if (r?.thu_lenh_them) { const L = game.data.pets.thu_lenh; game.thuLenh = r.thu_lenh; game.toast(`+1 ${L.name} (đang có ${r.thu_lenh}/${L.per_mount}). Đủ ${L.per_mount} thì đổi thú cưỡi ở Ngự Thú Sư.`, 4); } if (r) dayQi(game, day.every(x => x.got || x.id === d.id)); done(r, {}); } catch (e) { err(e); b.disabled = false; } };
    row.append(b); body.append(row);
  }
  if (!game.cloud) body.append(el('p', 'ht-line ht-muted', X.login));
}

// Việc ngày tặng thêm linh khí (chủ dự án 19/11/2026 03:13; data/he-thong.json → ngay.qi_pct, qi_all): mỗi việc một phần nhỏ linh khí cần
// của tầng đang tu; việc cuối cùng trong ngày thêm một đợt lớn kèm màn mừng (src/ui/reward-show.js)
const needPct = (game, k) => (k && game.save ? Math.round(qiNeed(game.save, game.data.realms) * k) : 0);
function dayQi(game, last) {
  const N = game.data['he-thong'].ngay, n = needPct(game, N.qi_pct), big = last ? needPct(game, N.qi_all) : 0;
  if (n) game.gainQi(n, game.player.x, game.player.y, false, true, true);   // số thật, không nhân đôi Thăng Linh Đan
  if (!big) return;
  game.gainQi(big, game.player.x, game.player.y, false, true, true);   // cộng ngay, màn mừng chỉ để xem (tải lại giữa chừng không mất)
  game.rewardGive?.({ qua: { ray: '#9fe8ff', ink: '#bff4ff', lvl: 2, name: `+${big.toLocaleString('vi-VN')} ${N.all_name}`, tag: N.all_tag, sub: '', spr: { id: 'ui.ic-tu-luyen' } } });
}
