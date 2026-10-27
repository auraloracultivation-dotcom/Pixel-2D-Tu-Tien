// MD5 nhỏ gọn (RFC 1321) cho chuỗi UTF-8, trả về hex. Dùng để tính mã chat 12 ký tự giống máy chủ
// (p2d_chat_key = left(md5('chat:' || uid), 12)) mà không cần máy chủ trả mã của người cùng tinh cầu.
const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

export function md5(str) {
  const bytes = [...new TextEncoder().encode(str)], n = bytes.length;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const bits = n * 8;
  for (let i = 0; i < 8; i++) bytes.push(i < 4 ? (bits >>> (8 * i)) & 0xff : Math.floor(bits / 2 ** (8 * i)) & 0xff);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let o = 0; o < bytes.length; o += 64) {
    const M = Array.from({ length: 16 }, (_, i) => bytes[o + i * 4] | (bytes[o + i * 4 + 1] << 8) | (bytes[o + i * 4 + 2] << 16) | (bytes[o + i * 4 + 3] << 24));
    let a = a0, b = b0, c = c0, d = d0;
    for (let i = 0; i < 64; i++) {
      let f, g;
      if (i < 16) { f = (b & c) | (~b & d); g = i; }
      else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * i) % 16; }
      const t = d; d = c; c = b;
      const x = (a + f + K[i] + M[g]) | 0, s = S[(i >> 4) * 4 + (i % 4)];
      b = (b + ((x << s) | (x >>> (32 - s)))) | 0; a = t;
    }
    a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0;
  }
  return [a0, b0, c0, d0].map(v => [0, 1, 2, 3].map(i => ((v >>> (8 * i)) & 0xff).toString(16).padStart(2, '0')).join('')).join('');
}
