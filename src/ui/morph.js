// Vá cây phần tử cũ cho giống cây mới dựng, thay vì thay cả cây (chủ dự án 11/11/2026 20:50: mặc đồ, mang linh thú là điện thoại chớp
// một cái). Thay cả thẻ nhân vật làm iPhone vẽ lại từ đầu: hình nền, vòng phù văn đang xoay chạy lại, nhân vật trống một khung.
// Giữ phần tử cũ, chỉ sửa thuộc tính, chữ, trình xử lý onclick khác đi; khác loại thì mới thay. Canvas: giống hệt (cùng data-k, hoặc
// hình nhỏ cùng điểm ảnh) thì giữ cái cũ. Chỉ dùng cho khối dựng bằng el() với onclick (không addEventListener, sẽ mất khi giữ cũ).
const SAME_PX = 64 * 64;   // canvas nhỏ hơn cỡ này: so điểm ảnh (biểu tượng món đồ)

function sameCanvas(a, b) {
  if (a.width !== b.width || a.height !== b.height || a.className !== b.className) return false;
  if (a.dataset.k || b.dataset.k) return a.dataset.k === b.dataset.k;
  if (a.width * a.height > SAME_PX) return false;
  try { return a.toDataURL() === b.toDataURL(); } catch { return false; }
}

export function morph(from, to) {
  if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName) { from.replaceWith(to); return to; }
  if (from.nodeType === 3) { if (from.data !== to.data) from.data = to.data; return from; }
  if (from.nodeType !== 1) { from.replaceWith(to); return to; }
  if (from.nodeName === 'CANVAS') {
    if (!sameCanvas(from, to)) { from.replaceWith(to); return to; }
    if (from.style.cssText !== to.style.cssText) from.style.cssText = to.style.cssText;
    return from;
  }
  for (const a of [...from.attributes]) if (!to.hasAttribute(a.name)) from.removeAttribute(a.name);
  for (const a of to.attributes) if (from.getAttribute(a.name) !== a.value) from.setAttribute(a.name, a.value);
  from.onclick = to.onclick;
  if ('disabled' in from) from.disabled = to.disabled;
  const fc = [...from.childNodes], tc = [...to.childNodes];
  tc.forEach((c, i) => { if (i < fc.length) morph(fc[i], c); else from.append(c); });
  for (let i = tc.length; i < fc.length; i++) fc[i].remove();
  return from;
}

// Đổ nội dung mới vào box: lần đầu thì gắn, sau đó vá
export function patch(box, node) {
  if (box.childNodes.length === 1 && box.firstChild.nodeName === node.nodeName) morph(box.firstChild, node);
  else box.replaceChildren(node);
}

// Như patch nhưng cho một dãy con (cột mục, hàng mục con)
export function patchList(box, nodes) {
  const old = [...box.childNodes];
  nodes.forEach((n, i) => { if (i < old.length) morph(old[i], n); else box.append(n); });
  for (let i = nodes.length; i < old.length; i++) old[i].remove();
}
