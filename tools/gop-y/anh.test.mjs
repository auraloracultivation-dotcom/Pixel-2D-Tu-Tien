// Bài thử phần kiểm ảnh của hàm gop-y-anh (supabase/functions/gop-y-anh/anh.js). Chạy: node --test tools/gop-y/
import test from 'node:test';
import assert from 'node:assert/strict';
import { GIOI_HAN, giaiAnh, loaiTheoByte, maLoi, duongDanHopLe, mimeCua } from '../../supabase/functions/gop-y-anh/anh.js';

const JPG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d];
const WEBP = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];
const url = (bytes, kieu = 'jpeg') => `data:image/${kieu};base64,` + Buffer.from(bytes).toString('base64');
const pad = (head, n) => [...head, ...new Array(n - head.length).fill(7)];

test('nhận đúng kiểu theo byte đầu', () => {
  assert.equal(loaiTheoByte(Uint8Array.from(JPG)), 'jpg');
  assert.equal(loaiTheoByte(Uint8Array.from(PNG)), 'png');
  assert.equal(loaiTheoByte(Uint8Array.from(WEBP)), 'webp');
  assert.equal(loaiTheoByte(Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0])), null);   // GIF
  assert.equal(loaiTheoByte(Uint8Array.from([0xff, 0xd8])), null);
  assert.equal(mimeCua('webp'), 'image/webp');
});

test('giải data URL hợp lệ', () => {
  const g = giaiAnh(url(pad(JPG, 1000)), GIOI_HAN.lon);
  assert.equal(g.loi, undefined);
  assert.equal(g.duoi, 'jpg');
  assert.equal(g.mime, 'image/jpeg');
  assert.equal(g.bytes.length, 1000);
  assert.deepEqual([...g.bytes.slice(0, 3)], [0xff, 0xd8, 0xff]);
});

test('kiểu lấy theo byte, không theo phần khai báo', () => {
  assert.equal(giaiAnh(url(pad(PNG, 64), 'jpeg'), GIOI_HAN.lon).duoi, 'png');
  assert.equal(giaiAnh(url(pad([0x3c, 0x73, 0x76, 0x67], 64), 'png'), GIOI_HAN.lon).loi, 'kieu');   // "<svg" giả làm PNG
});

test('từ chối đầu sai, base64 hỏng, rỗng', () => {
  assert.equal(giaiAnh('', 100).loi, 'rong');
  assert.equal(giaiAnh(null, 100).loi, 'rong');
  assert.equal(giaiAnh('data:image/gif;base64,R0lGOD', 100).loi, 'kieu');
  assert.equal(giaiAnh('data:text/html;base64,PGI+', 100).loi, 'kieu');
  assert.equal(giaiAnh('data:image/jpeg;base64,@@@@', 100).loi, 'hong');
  assert.equal(giaiAnh('data:image/jpeg;base64,abc', 100).loi, 'hong');   // thiếu ký tự đệm
});

test('chặn ảnh quá lớn (cả trước lẫn sau khi giải)', () => {
  assert.equal(giaiAnh(url(pad(JPG, GIOI_HAN.nho + 1)), GIOI_HAN.nho).loi, 'qua_lon');
  assert.equal(giaiAnh(url(pad(JPG, GIOI_HAN.nho)), GIOI_HAN.nho).loi, undefined);
  assert.equal(giaiAnh('data:image/jpeg;base64,' + 'A'.repeat(4_000_000), GIOI_HAN.lon).loi, 'qua_lon');
});

test('mã lỗi nghiệp vụ từ thông báo Postgres', () => {
  assert.equal(maLoi('gui_nhanh_qua'), 'gui_nhanh_qua');
  assert.equal(maLoi('ERROR: het_luot_hom_nay'), 'het_luot_hom_nay');
  assert.equal(maLoi('permission denied for function x'), 'loi');
  assert.equal(maLoi(undefined), 'loi');
});

test('đường dẫn kho chỉ nhận dạng do máy chủ đặt', () => {
  assert.ok(duongDanHopLe('137/lon.jpg'));
  assert.ok(duongDanHopLe('5/nho.webp'));
  for (const p of ['../1/lon.jpg', '1/lon.gif', '1/x.jpg', 'a/lon.jpg', '1/lon.jpg/..', null, 12]) assert.equal(duongDanHopLe(p), false, String(p));
});
