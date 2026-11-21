// Thử QUÁI CHUNG trên MÁY CHỦ PHÒNG THẬT (Cloudflare p2d-phong) bằng hai tài khoản thử, không qua trình duyệt: hai kết nối WebSocket
// nói đúng giao thức của src/net/online-cf.js vào cùng một tinh cầu, một tuyến vắng (mặc định tuyến 58, người chơi thật vào từ tuyến 1).
// Soát: chữ ký bảng phòng thật khớp bảng máy khách tự tính từ data/; người giữ quái báo vị trí thì người kia nhận; máu chung; đòn đứng
// xa quá tầm không tính; hạ quái thì cả hai nhận tin, công chia đúng theo sát thương; đánh con đã chết thì phòng bảo dọn; hồi sinh.
// Không ghi gì vào Supabase (phòng không lưu quái chung), chỉ đăng nhập lấy vé.
//   TK1=… MK1=… TK2=… MK2=… node tools/cloud/quai-that.mjs        MAP=bản đồ (mặc định bản đồ đầu trong quai_chung.maps; mã tinh cầu
//   tông môn cũng được: bảng dựng từ dòng tinh cầu thật)  L=tuyến
// Mật khẩu chỉ đưa qua biến môi trường, không bao giờ ghi vào kho.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { napData } from '../quai-chung.mjs';
import { cauHinhMayChu, O } from '../../src/game/quai-chung-bang.js';
import { khBangQuai } from '../../src/game/kh-bai.js';

const GOC = resolve(import.meta.dirname, '../..');
const client = readFileSync(resolve(GOC, 'src/net/client.js'), 'utf8');
const SB = client.match(/SUPABASE_URL = '([^']+)'/)[1], KEY = client.match(/SUPABASE_PUBLISHABLE_KEY = '([^']+)'/)[1];
const CF = JSON.parse(readFileSync(resolve(GOC, 'data/config.json'), 'utf8')).realtime.cf_url;
const data = napData(), CH = cauHinhMayChu(data), MAP = process.env.MAP || data.config.quai_chung.maps[0], L = +(process.env.L || 58);
// MAP=<mã tinh cầu tông môn>: bảng dựng từ dòng tinh cầu thật (p2d_kh_ds) bằng đúng mã máy chủ phòng dùng (kh-bai.js khBangQuai)
const khDong = /^[0-9a-f-]{36}$/i.test(MAP) ? (await (await fetch(`${SB}/rest/v1/rpc/p2d_kh_ds`, { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: '{}' })).json()).find(x => x.id === MAP) : null;
const B = khDong ? khBangQuai(CH.kh, khDong) : CH.maps[MAP];
if (!B) { console.error(`bản đồ ${MAP} không có bãi quái chung`); process.exit(1); }

let hong = 0;
const thu = (dk, ten, them = '') => { console.log(`${dk ? '✅' : '❌'} ${ten}${them ? ' — ' + them : ''}`); if (!dk) hong++; };
const ngu = ms => new Promise(r => setTimeout(r, ms));

async function veCua(tk, mk) {
  const email = tk.includes('@') ? tk : `${tk.toLowerCase()}@nguoichoi.invalid`;
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify({ email, password: mk }) });
  const j = await r.json();
  if (!j.access_token) throw new Error(`không đăng nhập được ${tk}: ${j.error_description || j.msg || r.status}`);
  return { ve: j.access_token, id: j.user.id };
}

// Một kết nối: gom mọi tin nhận được; cho(f) chờ tới khi có tin thoả f
function noi(ten, ve) {
  const tin = [], doi = [];
  const ws = new WebSocket(`${CF}?r=${encodeURIComponent('dao:' + MAP)}&l=${L}`, ['p2d', ve]);
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } tin.push(m); for (const d of [...doi]) if (d.f(m)) { doi.splice(doi.indexOf(d), 1); d.r(m); } };
  const X = {
    ten, ws, tin,
    mo: new Promise((r, j) => { ws.onopen = r; ws.onerror = () => j(new Error(ten + ': không nối được phòng')); }),
    gui: o => ws.send(JSON.stringify(o)),
    cho: (f, ms = 6000) => { const co = tin.find(f); if (co) return Promise.resolve(co); return Promise.race([new Promise(r => doi.push({ f, r })), ngu(ms).then(() => null)]); },
    sach: () => { tin.length = 0; },
  };
  return X;
}

const [t1, t2] = [[process.env.TK1, process.env.MK1], [process.env.TK2, process.env.MK2]];
if (!t1[0] || !t1[1] || !t2[0] || !t2[1]) { console.error('cần TK1, MK1, TK2, MK2'); process.exit(1); }
const [va, vb] = [await veCua(...t1), await veCua(...t2)];
const A = noi('A', va.ve), Bm = noi('B', vb.ve);
await A.mo; await Bm.mo;
const [wa, wb] = [await A.cho(m => m.t === 'w', 8000), await Bm.cho(m => m.t === 'w', 8000)];
thu(!!wa && !!wb, `Hai tài khoản thử vào ${MAP} tuyến ${L} trên máy chủ phòng thật`, wa && wb ? `phòng ${wa.room || ''}` : 'không nhận được tin chào');
thu(wa?.q?.v === B.v && wb?.q?.v === B.v, 'Chữ ký bảng quái chung của phòng thật khớp bảng máy khách tự tính từ data/', `phòng ${wa?.q?.v ?? 'không có bảng'}, máy khách ${B.v}`);
if (wa?.q?.v !== B.v) { A.ws.close(); Bm.ws.close(); console.log(`quai-that: HỎNG ${hong}`); process.exit(1); }

// Chọn một con còn sống, đầy máu (phòng báo trong tin chào những ô khác mặc định)
const lech = new Set((wa.q.d || []).map(r => r[0]));
const bai = B.s.find(r => r[1] >= 3 && [0, 1, 2].every(j => !lech.has(r[0] * O + j)));
const [O1, MAX, X0, Y0] = [bai[0] * O, bai[3], bai[4], bai[5]];
let n = 0;

// 1. A giữ con O1 (báo vị trí) và đánh một đòn: A nhận lời đáp, B thấy vị trí và máu mới
A.sach(); Bm.sach();
A.gui({ t: 'q', n: ++n, x: X0 + 14, y: Y0, m: [[O1, X0 + 3, Y0, 0]], h: [[O1, 5]] });
const qa1 = await A.cho(m => m.t === 'qa' && m.n === n);
thu(qa1?.h?.[0]?.[1] === MAX - 5, 'A đánh 5: phòng trừ máu và đáp riêng cho A', `máu ${qa1?.h?.[0]?.[1]} / ${MAX}`);
const bThay = await Bm.cho(m => m.t === 'b' && m.qh?.some(r => r[0] === O1));
thu(bThay?.qh?.find(r => r[0] === O1)?.[1] === MAX - 5, 'B nhận máu mới của con đó qua gói lô', `máu ${bThay?.qh?.find(r => r[0] === O1)?.[1]}`);
const bViTri = await Bm.cho(m => m.t === 'b' && m.q?.some(r => r[0] === va.id && r.slice(1).some(e => e[0] === O1)));
thu(!!bViTri, 'B thấy A đang giữ con đó, đúng chỗ A báo', bViTri ? JSON.stringify(bViTri.q.find(r => r[0] === va.id).slice(1).find(e => e[0] === O1)) : '');

// 2. B đánh từ xa quá tầm: không tính
Bm.sach();
Bm.gui({ t: 'q', n: ++n, x: X0 + 3000, y: Y0, h: [[O1, 7]] });
const qa2 = await Bm.cho(m => m.t === 'qa' && m.n === n);
thu(qa2?.h?.[0]?.[1] === MAX - 5, 'B đứng xa quá tầm đánh: phòng không tính', `máu ${qa2?.h?.[0]?.[1]}`);

// 3. B lại gần đánh 10: máu chung
Bm.gui({ t: 'q', n: ++n, x: X0 + 20, y: Y0, h: [[O1, 10]] });
const qa3 = await Bm.cho(m => m.t === 'qa' && m.n === n);
thu(qa3?.h?.[0]?.[1] === MAX - 15, 'B lại gần đánh 10: máu chung trừ tiếp', `máu ${qa3?.h?.[0]?.[1]} / ${MAX}`);

// 4. A kết liễu (đòn to, phòng kẹp theo máu còn lại): cả hai nhận tin hạ quái, công chia theo sát thương
A.sach(); Bm.sach();
A.gui({ t: 'q', n: ++n, x: X0 + 14, y: Y0, h: [[O1, MAX * 10]] });
const [ka, kb] = [await A.cho(m => m.t === 'qk' && m.s === O1), await Bm.cho(m => m.t === 'qk' && m.s === O1)];
const cong = new Map(ka?.c || []), phanB = 10 / MAX;
thu(!!ka && !!kb, 'A kết liễu: cả hai nhận tin hạ quái', ka ? `hồi sau ${ka.r} ms, con kế ${ka.ra ? 'dị chủng' : 'thường'}` : '');
thu(Math.abs((cong.get(vb.id) || 0) - phanB) < 0.002 && Math.abs((cong.get(va.id) || 0) + (cong.get(vb.id) || 0) - 1) < 0.002, 'Công chia đúng theo sát thương (đòn kết liễu bị kẹp theo máu còn lại)', `A ${cong.get(va.id)}, B ${cong.get(vb.id)} (B góp 10 / ${MAX})`);

// 5. Đánh con đã chết: phòng bảo dọn (máu âm = số ms còn tới lúc hồi)
Bm.sach();
Bm.gui({ t: 'q', n: ++n, x: X0 + 20, y: Y0, h: [[O1, 3]] });
const qa5 = await Bm.cho(m => m.t === 'qa' && m.n === n);
thu(qa5?.h?.[0]?.[1] < 0, 'Đánh con đã chết: phòng bảo dọn, kèm giờ hồi', `${qa5?.h?.[0]?.[1]} ms`);

// 6. Người vào sau thấy con đó đang chờ hồi; tới giờ thì phòng coi như sống lại đầy máu
const C = noi('C', vb.ve);   // B nối lại (phòng đóng kết nối cũ của cùng tài khoản)
await C.mo;
const wc = await C.cho(m => m.t === 'w', 8000);
const cho6 = (wc?.q?.d || []).find(r => r[0] === O1);
thu(!!cho6 && cho6[1] < 0, 'Vào lại sau: tin chào báo con đó đang chờ hồi', JSON.stringify(cho6));
await ngu(Math.max(0, -(cho6?.[1] ?? 0)) + 800);
C.sach();
C.gui({ t: 'q', n: ++n, x: X0 + 20, y: Y0, h: [[O1, 1]] });
const qa6 = await C.cho(m => m.t === 'qa' && m.n === n);
const maxMoi = MAX * ((ka?.ra ? CH.hiem[1] : 1));
thu(qa6?.h?.[0]?.[1] === maxMoi - 1, 'Tới giờ hồi: con đó sống lại đầy máu (đánh 1 còn máu tối đa − 1)', `máu ${qa6?.h?.[0]?.[1]} / ${maxMoi}`);

for (const X of [A, Bm, C]) try { X.ws.close(); } catch { /* đã đóng */ }
console.log(hong ? `quai-that: HỎNG ${hong}` : 'quai-that: ok');
process.exit(hong ? 1 : 0);
