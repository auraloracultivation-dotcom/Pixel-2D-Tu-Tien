// Biểu cảm Hệ Thống (data/he-thong.json → mat; hình assets/art/he-thong/mat.png do tools/art/he_thong_mat.py cắt từ ảnh chủ dự án
// tạo, 06/11/2026 19:03). Một dải khung cùng cỡ xếp ngang; mỗi hình là một ô CSS dời vị trí nền (giữ điểm ảnh sắc nét).
// face(k): tạo một ô biểu cảm phóng k lần. show(tên): đứng yên một biểu cảm. play(tên chuỗi): chạy chuỗi khung rồi về biểu cảm sau.
// react(sự việc): chọn biểu cảm theo data mat.ev (một tên, hoặc danh sách để bốc ngẫu nhiên; tên chuỗi khung thì chạy chuỗi).

export function createFace(game, k = 1) {
  const M = game.data['he-thong']?.mat;
  const node = document.createElement('i');
  node.className = 'ht-face';
  if (!M) { node.hidden = true; return { node, show() {}, play() {}, react() {} }; }
  const url = new URL(`../../${M.src}`, import.meta.url).href, n = M.frames.length;
  Object.assign(node.style, { width: `${M.w * k}px`, height: `${M.h * k}px`, backgroundImage: `url("${url}")`, backgroundSize: `${M.w * n * k}px ${M.h * k}px` });
  let timer = null, cur = 'thuong';
  const at = name => { const i = M.frames.indexOf(name); node.style.backgroundPosition = `${-Math.max(0, i) * M.w * k}px 0`; };
  const stop = () => { clearInterval(timer); timer = null; };
  const show = name => { stop(); cur = M.frames.includes(name) ? name : 'thuong'; at(cur); };
  // chạy chuỗi khung (mat.anim[tên]: danh sách tên khung), lặp loops lần rồi đứng ở then
  const play = (name, then = 'thuong', loops = 1) => {
    const seq = M.anim?.[name];
    if (!seq) { show(name); return; }
    stop(); let i = 0;
    at(seq[0]);
    timer = setInterval(() => {
      i++;
      if (i >= seq.length * loops) { show(then); return; }
      at(seq[i % seq.length]);
    }, M.ms || 110);
  };
  const react = (ev, then) => {
    let v = M.ev?.[ev];
    if (Array.isArray(v)) v = v[Math.floor(Math.random() * v.length)];
    if (!v) return;
    const [name, after] = String(v).split('>');   // "khen>nhay-mat": chạy chuỗi khen rồi đứng nháy mắt
    if (M.anim?.[name]) play(name, after || then || 'thuong'); else show(name);
  };
  show('thuong');
  return { node, show, play, react, get cur() { return cur; } };
}
