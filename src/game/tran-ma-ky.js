// Trấn Ma Kỷ: cuốn sổ truyện của game (data/tran-ma-ky.json; docs/14-TRAN-MA-KY.md; chủ dự án 21/11/2026 03:47: "quan trọng nhất vẫn là cảm xúc người
// chơi khi vừa chơi vừa hiểu truyện… thấy tiến bộ, thấy yêu mến không nỡ rời và thấy được ý nghĩa game"). Truyện chia bảy quyển, mỗi quyển vài TRANG, mỗi
// trang một cảnh ngắn. Trang mở theo việc người chơi vừa làm được (tới một tinh cầu, hạ một trùm, lên một cảnh giới). Tệp này giữ luật: trang nào đã mở,
// đã đọc; lúc nào tự phát cảnh; phát cảnh; mừng khi đọc xong. Không vẽ gì: sổ ở src/ui/he-thong-ky.js, thẻ mở / khép quyển ở src/ui/the-quyen.js, dàn cảnh (tối màn, tiếng, hiệu ứng, nhịp lặng) ở src/game/tmk-canh.js.
//   Không giữ chân ai (docs/01-HUONG-DI.md "chill, không ép"): cảnh chỉ tự phát khi người chơi đang tự tay chơi và rảnh (không Tự đánh, không Tự hành, vừa
//   chạm màn, không có trùm, không đứng cạnh người lạ). Không đủ thì Hệ Thống nhắc một dòng, trang nằm chờ trong sổ, đọc lúc nào cũng được, đọc lại được.
//   Trang của quyển một do truyện chính (data/story.json) vừa kể tận nơi nên mở là coi như đã đọc (im), không phát lại.
//   Người chơi cũ: lần đầu có sổ, mọi trang đã đủ điều kiện được mở sẵn ở dạng CHƯA ĐỌC, không tự phát dồn dập; Hệ Thống báo một lần số trang chờ.
// Trạng thái ghi bằng cờ trong save.flags (mẫu sẵn có của truyện, máy chủ không soát cờ): xem _note của data/tran-ma-ky.json. Không phát thưởng.
import { every } from '../core/ticker.js';
import { totalLayer } from './stats.js';
import { dan, hetCanh } from './tmk-canh.js';

const D = game => game.data['tran-ma-ky'];
const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const st = { input: 0, last: 0, playing: false, queue: [], nudged: {}, since: {}, told: false, boot: 0, calm: 0, nhac: [] };

let ON = null;
export function tmkOn(game) {
  if (ON != null) return ON;
  const C = D(game); let v = null;
  try { const q = new URLSearchParams(location.search).get('tmk'); if (q != null) localStorage.setItem('p2d-tmk', q); v = localStorage.getItem('p2d-tmk'); } catch { /* không có kho nhớ: theo mặc định */ }
  return (ON = !!C && (v != null ? v === '1' : C.on !== false));
}

// Mọi trang theo thứ tự sổ, mỗi trang biết quyển của mình (p.q, p.qi, p.i). Gắn thẳng lên trang gốc bằng khoá ẩn, KHÔNG chép trang ra bản khác: chữ
// {dạng nam|dạng nữ} trong trang do src/game/gender.js thay ngay trên data mỗi lần đổi tài khoản, bản chép sẽ giữ chữ cũ; khoá ẩn thì gender.js không lần theo (khỏi đi vòng)
export function trangs(game) {
  const C = D(game);
  if (!C._ds) {
    const ds = [];
    C.quyen.forEach((q, qi) => q.trang.forEach((p, i) => { Object.defineProperty(p, 'q', { value: q, enumerable: false }); p.qi = qi; p.i = i; ds.push(p); }));
    Object.defineProperty(C, '_ds', { value: ds, enumerable: false });
  }
  return C._ds;
}
const trang = (game, id) => trangs(game).find(p => p.id === id);
const co = (game, k) => !!game.save?.flags?.[k];
export const daDoc = (game, id) => co(game, 'tmkd-' + id);
export const daMo = (game, p) => co(game, 'tmkm-' + p.id) || dieuKien(game, p.khi);

// Đủ điều kiện chưa (các khoá: _note của data/tran-ma-ky.json). boss: trùm hạ từ trước ngày có sổ thì không có cờ, xét điều kiện thay thế hoac
export function dieuKien(game, k) {
  const s = game.save;
  if (!k) return true;
  if (!s) return false;
  if (k.step != null && ((s.step || 0) < k.step || (k.xong && s.step === k.step && !s.stepDone))) return false;
  if (k.realm != null && (s.realm || 0) < k.realm) return false;
  if (k.total != null && totalLayer(s, game.data.realms) < k.total) return false;
  if (k.den && !s.visited?.[k.den]) return false;
  if (k.doc && ![].concat(k.doc).every(id => daDoc(game, id))) return false;
  if (k.o && game.map?.id !== k.o) return false;
  if (k.co && !Object.keys(s[k.co] || {}).length) return false;
  if (k.pb && !(s.phapBao?.items || []).some(i => i.type === k.pb)) return false;
  if (k.boss && !co(game, 'tmkb-' + k.boss)) return k.hoac ? dieuKien(game, k.hoac) : false;
  return true;
}

// Sổ nhìn từ bản lưu: từng quyển, từng trang (mo: đã mở, doc: đã đọc), tổng số
export function tmkSo(game) {
  const C = D(game), ds = trangs(game);
  const quyen = C.quyen.map((q, qi) => {
    const tr = ds.filter(p => p.qi === qi).map(p => ({ ...p, mo: daMo(game, p), doc: daDoc(game, p.id) }));
    return { ...q, so: C.so[qi] || String(qi + 1), trang: tr, doc: tr.filter(p => p.doc).length, moi: tr.filter(p => p.mo && !p.doc).length };
  });
  return { quyen, doc: quyen.reduce((a, q) => a + q.doc, 0), moi: quyen.reduce((a, q) => a + q.moi, 0), tong: ds.length };
}
// Chín thiên quy: lĩnh ngộ khi đọc xong trang mang nó (tu: trang ấy, để sổ gợi ý đọc tới đâu)
export function tmkQuy(game) {
  return D(game).quy.map(l => { const tu = trangs(game).find(p => p.quy === l.id); return { ...l, tu, co: !!tu && daDoc(game, tu.id) }; });
}
// Khẩu quyết: đoản quyết thuộc khi có pháp bảo loại đó, trường quyết theo điều kiện khi
export function tmkKq(game) {
  const K = D(game).kq, T = game.data['phap-bao'].types;
  return { doan: Object.entries(K.doan).filter(([id]) => T[id]).map(([id, q]) => ({ id, ten: T[id].name, color: T[id].color, loi: q.loi, co: dieuKien(game, { pb: id }) })),
    truong: K.truong.map(q => ({ ...q, co: dieuKien(game, q.khi) })) };
}
// Cấm Kỵ Các: mo = đã mở (đọc xong trang có mo 'cam'); coTrang = quyển trắng đã có chữ (đọc xong trang có mo 'trang'); list, trang: nội dung các quyển
export function tmkCam(game) {
  const mo = k => trangs(game).some(p => p.mo === k && daDoc(game, p.id)), c = D(game).cam;
  return { list: c.list, trang: c.trang, mo: mo('cam'), coTrang: mo('trang') };
}
export const canhGioiY = (game, realm) => (tmkOn(game) && D(game).canh_gioi?.[realm]) || '';
// Trang mới tự kể khi rảnh tay: người chơi tắt / bật ở bìa sổ (cờ tmk-im = tắt: chỉ còn lời nhắc của Hệ Thống)
export const tuKe = game => !co(game, 'tmk-im');
export function datTuKe(game, on) { const f = game.save?.flags; if (!f) return; if (on) delete f['tmk-im']; else f['tmk-im'] = true; game.persist?.(); }

// Trùm của truyện vừa gục (src/game/game.js onKill): ghi cờ nếu hạ đúng ở bản đồ trang ấy kể (Ma Vương tuần mượn hình các trùm này ở Phương Thiên Địa: không tính)
export function tmkKill(game, m) {
  const f = game.save?.flags;
  if (!f || !m?.id || f['tmkb-' + m.id] || !D(game) || !tmkOn(game)) return;
  if (!trangs(game).some(p => p.khi?.boss === m.id && p.khi.tai === game.map?.id)) return;
  f['tmkb-' + m.id] = true; game.persist?.();
}

// Rảnh để diễn một cảnh: không hội thoại, bảng, chuyến bay, thiên kiếp, đang gục, truyện chính đang chạy, chặng leo bậc, so tài, trùm còn sống
export function ranh(game) {
  const p = game.player;
  return !!p && p.hp > 0 && !st.playing && !game.dialog?.open && !game.uiOpen && !game.traveling && !game.trip && !game.trib?.active && !game.ghost
    && !game.story?.busy && !game.story?.rung?.() && !game.duel && !(game.mobs || []).some(m => !m.dead && m.def?.ai === 'boss');
}
// Người chơi đang tự tay chơi: không Tự đánh / Tự hành, vừa chạm màn, không đứng cạnh người khác (lúc mở hội thoại thế giới của mình đứng lại, của họ thì không)
function coMat(game) {
  const A = D(game).auto, p = game.player;
  if (game.auto || game.pilot || performance.now() - st.input > A.present_s * 1000) return false;
  return !(game.others?.visible?.() || []).some(o => o.x != null && Math.hypot(o.x - p.x, o.y - p.y) < A.near);
}

const ten = (game, who) => (who === 'he-thong' ? game.data['he-thong']?.short || game.data['he-thong']?.name || 'Hệ Thống' : who ? game.data.npcs[who]?.name || who : '');

// Phát cảnh của một trang. again: xem lại (không mừng, không ghi). Trả true khi cảnh chạy hết.
export async function phatTrang(game, id, again = false) {
  const p = trang(game, id), C = D(game), f = game.save?.flags;
  if (!p || !f || st.playing) return false;
  if (!ranh(game)) { game.toast(C.text.busy, 2); return false; }
  st.playing = true;
  let het = true;
  try {
    const dau = !again && !p.q.trang.some(x => daDoc(game, x.id)) && !f['tmkq-' + p.q.id];   // trang đầu tiên đọc của quyển: diễn thẻ mở quyển
    if (dau) { f['tmkq-' + p.q.id] = true; await game.theQuyen?.({ kind: 'mo', so: C.so[p.qi], ten: p.q.ten, noi: p.q.noi, lines: [p.q.mo] }); }
    let say = [];
    const xa = async () => { if (say.length) { const l = say; say = []; await game.dialog.say(l); } };
    for (const c of p.canh) {
      if (Array.isArray(c)) { say.push([ten(game, c[0]), c[1], c[2]]); continue; }
      await xa();
      if (c.dan) await dan(game, c.dan);   // dàn cảnh giữa hai câu: tối màn, rung, tiếng, hiệu ứng, lặng một nhịp (src/game/tmk-canh.js)
      else if (c.hoi) {
        const i = await game.dialog.choose(c.hoi.q, c.hoi.opts.map((o, k) => ({ id: k, label: o.label, color: '#5fd8f8' })), 400), o = c.hoi.opts[i ?? c.hoi.opts.length - 1];   // bỏ ngang: coi như chọn câu cuối (chưa quyết)
        if (o?.reply) await game.dialog.say([[ten(game, 'he-thong'), o.reply]]);
        if (!o || o.lai) { het = false; break; }
      }
    }
    await xa();
    if (het && !again && !daDoc(game, p.id)) docXong(game, p);
  } catch (e) { console.error('tmk', id, e); het = false; }
  finally { hetCanh(game); st.playing = false; st.last = performance.now(); }
  return het;
}

// Đọc xong một trang: ghi cờ (Nhật ký tu tiên tự chép dòng ghi), gỡ cờ "người ấy bị bắt" nếu trang kể chuyện trở về, mừng bằng thẻ nhỏ trên đầu nhân vật
// (thẻ lên tầng của src/ui/mung-canh.js: thang ô là số trang của quyển). im: trang truyện chính vừa kể, ghi lặng lẽ.
function docXong(game, p, im = false) {
  const f = game.save.flags, C = D(game), X = C.text, truoc = p.q.trang.filter(x => daDoc(game, x.id)).length;
  f['tmkd-' + p.id] = true; f['tmkm-' + p.id] = true;
  if (p.bo && f[p.bo]) delete f[p.bo];
  if (im && p.q.trang.every(x => f['tmkd-' + x.id])) {   // quyển khép lặng lẽ theo truyện chính (quyển một của người mới): không dựng thêm một màn sau phần mở đầu, Hệ Thống chỉ nhắc một dòng
    const ke = C.quyen[p.qi + 1];
    f['tmkk-' + p.q.id] = true; st.nhac.push(fill(X.nudge_khep, { q: C.so[p.qi], ten: p.q.ten, x: ke ? ke.goi : '' }));
  }
  game.persist?.();
  if (im) return;
  const lines = [];
  const l = p.quy && C.quy.find(x => x.id === p.quy);
  if (l) lines.push({ text: fill(X.law_got, { ten: l.ten }), gift: true, wrap: true }, { text: l.cau, soft: true, wrap: true });
  if (p.mo === 'cam') lines.push({ text: X.cam_got, gift: true, wrap: true });
  const so = tmkSo(game);
  lines.push({ text: fill(X.all, { a: so.doc, b: so.tong }), soft: true, wrap: true });
  if (game.mungTang) game.mungTang({ color: C.card.color, title: X.card_title, name: p.ten, cells: { n: p.q.trang.length, from: truoc, to: truoc + 1 }, lines, gain: 0 });
  else game.toast(`${X.card_title}: ${p.ten}`, 2.4);
  game.sfx?.('achieve', 0.5);
}

// Quyển vừa đọc hết: thẻ khép quyển (một lần), kèm câu trả lời của quyển cho câu hỏi "Ngươi đứng đây vì ai?" và quyển kế mở ở đâu
async function khepQuyen(game, q, qi) {
  const C = D(game), X = C.text, f = game.save.flags, ke = C.quyen[qi + 1], so = tmkSo(game);
  f['tmkk-' + q.id] = true; game.persist?.();
  st.playing = true;
  try {
    const lines = [X.ask, q.vi_ai, fill(X.all, { a: so.doc, b: so.tong })];
    lines.push(!ke ? X.end : ke.trang.some(x => daMo(game, x)) ? fill(X.next_open, { ten: ke.ten }) : fill(X.next_q, { x: ke.goi }));   // quyển cuối: sổ không có trang cuối
    await game.theQuyen?.({ kind: 'khep', so: C.so[qi], ten: q.ten, noi: q.noi, lines });
  } catch (e) { console.error('tmk', e); }
  finally { st.playing = false; st.last = performance.now(); }
}

function nhip(game) {
  const s = game.save, C = D(game), p = game.player;
  if (!s?.flags || !p || !game.map || game.trip || game.traveling) return;
  const f = s.flags, ds = trangs(game), now = performance.now();
  if (!st.boot) st.boot = now;
  if (!f['tmk-co']) {   // lần đầu có sổ trên bản lưu này: trang đã đủ điều kiện thì mở sẵn, chưa đọc, không tự phát
    for (const x of ds) if (dieuKien(game, x.khi)) f['tmkm-' + x.id] = true;
    f['tmk-co'] = true; game.persist?.(); return;
  }
  let doi = false;
  for (const x of ds) {
    if (f['tmkm-' + x.id] || !dieuKien(game, x.khi)) continue;
    f['tmkm-' + x.id] = true; doi = true;
    if (x.im) docXong(game, x, true); else st.queue.push(x.id);
  }
  if (doi) game.persist?.();
  const r = ranh(game); if (!r) st.calm = 0; else if (!st.calm) st.calm = now;
  const yen = r && now - st.calm >= C.auto.wait_s * 1000;   // rảnh được một lúc rồi mới diễn: vừa đóng bảng, vừa xong hội thoại thì cho thở một nhịp, không dồn hai màn liền nhau
  if (st.playing || now - st.boot < 6000) return;
  // quyển vừa đọc hết mà chưa khép: diễn thẻ khép quyển khi rảnh và có mặt
  const qi = C.quyen.findIndex(q => !f['tmkk-' + q.id] && q.trang.every(x => f['tmkd-' + x.id]));
  if (qi >= 0 && yen && (game.auto || game.pilot || coMat(game)) && now - st.last > C.auto.wait_s * 1000) {   // đang Tự đánh / Tự hành: thẻ tự đóng, game vẫn chạy
    if (tuKe(game)) khepQuyen(game, C.quyen[qi], qi);
    else { f['tmkk-' + C.quyen[qi].id] = true; game.persist?.(); game.toast(`${fill(C.text.close, { q: C.so[qi] })}: ${C.quyen[qi].ten}`, 2.6); }   // đã tắt tự kể: chỉ một dòng báo
    return;
  }
  if (st.nhac.length && yen) { game.htNudge?.(st.nhac.shift(), 'tmk'); st.last = now; return; }   // lời nhắc đang chờ (quyển vừa khép lặng lẽ)
  // trang vừa mở: tự phát khi rảnh và có mặt, không thì Hệ Thống nhắc một dòng (mỗi trang một lần)
  st.queue = st.queue.filter(id => !daDoc(game, id));
  const id = st.queue[0];
  if (id) {
    if (tuKe(game) && yen && coMat(game) && now - st.last > C.auto.gap_s * 1000) { st.queue.shift(); phatTrang(game, id); }
    else if (!st.nudged[id] && !game.dialog?.open && !game.uiOpen && (game.auto || game.pilot || !tuKe(game) || now - (st.since[id] ||= now) > C.auto.nudge_s * 1000)) {   // người đang tự tay chơi: chờ nudge_s giây xem có rảnh để kể không, kẻo vừa nhắc xong lại kể luôn
      st.nudged[id] = 1; game.htNudge?.(fill(C.text.nudge_new, { ten: trang(game, id).ten }), 'tmk');
    }
    return;
  }
  // người chơi cũ: báo một lần mỗi buổi số trang đang chờ trong sổ
  if (!st.told && now - st.boot > 20000 && now - st.last > 6000 && !game.dialog?.open && !game.uiOpen && !game.story?.rung?.() && (s.step || 0) >= 10) {   // 6 giây: không chen vào thẻ mừng của trang vừa đọc xong
    st.told = true;
    const n = tmkSo(game).moi;
    if (n > 0) game.htNudge?.(fill(C.text.nudge_old, { n }), 'tmk');
  }
}

export function createTranMaKy(game) {
  const C = D(game);
  if (!C || !tmkOn(game)) return;
  for (const p of trangs(game)) if (p.ghi) game.data.journal.flags['tmkd-' + p.id] = p.ghi;   // đọc xong trang nào, Nhật ký tu tiên chép dòng của trang ấy (src/game/journal.js)
  const cham = () => { st.input = performance.now(); };
  window.addEventListener('pointerdown', cham, true); window.addEventListener('keydown', cham, true);
  every(() => { try { nhip(game); } catch (e) { console.error('tmk', e); } }, 1000);
  game.tmk = { phat: (id, again) => phatTrang(game, id, again), so: () => tmkSo(game) };
}
