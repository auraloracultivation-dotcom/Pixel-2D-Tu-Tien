// Ghi clip từ khung vẽ game: chép khung vẽ sang một tấm nhỏ hơn (nhẹ cho máy, kèm chữ góc), ghép tiếng game, ghi bằng MediaRecorder.
// Không sửa vòng vẽ của game: mỗi khung hình trình duyệt, tấm nhỏ chép lại hình mới nhất của khung vẽ chính.

const TYPES = [
  ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'],
  ['video/mp4;codecs=avc1,mp4a', 'mp4'],
  ['video/mp4', 'mp4'],
  ['video/webm;codecs=vp9,opus', 'webm'],
  ['video/webm;codecs=vp8,opus', 'webm'],
  ['video/webm', 'webm'],
];

// Máy có quay được không, và dạng file nào (ưu tiên MP4 vì TikTok, Zalo nhận thẳng)
export function pickType() {
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return null;
  for (const [mime, ext] of TYPES) {
    try { if (MediaRecorder.isTypeSupported(mime)) return { mime, ext }; } catch { /* trình duyệt cũ */ }
  }
  return null;
}

export function isWeak(cfg) {
  const cores = navigator.hardwareConcurrency || 8, mem = navigator.deviceMemory || 8;
  return cores <= cfg.weak.cores || mem <= cfg.weak.mem;
}

// Cỡ clip: giữ tỉ lệ khung vẽ, cạnh dài không quá `long`, số chẵn (bộ mã hoá H.264 cần)
export function clipSize(w, h, long) {
  const k = Math.min(1, long / Math.max(w, h));
  const even = v => Math.max(2, Math.round(v * k / 2) * 2);
  return { w: even(w), h: even(h) };
}

function drawMark(ctx, w, h, mark) {
  const s = Math.max(10, Math.round(Math.min(w, h) / 34));
  ctx.save();
  ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
  ctx.lineJoin = 'round';
  const x = w - s * 0.8, y = h - s * 0.8;
  ctx.font = `600 ${Math.round(s * 0.72)}px system-ui, sans-serif`;
  ctx.lineWidth = Math.max(2, s * 0.22); ctx.strokeStyle = 'rgba(27,24,48,.85)'; ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.strokeText(mark.sub, x, y); ctx.fillText(mark.sub, x, y);
  const y2 = y - s * 0.95;
  ctx.font = `800 ${s}px system-ui, sans-serif`;
  ctx.lineWidth = Math.max(3, s * 0.3); ctx.strokeText(mark.title, x, y2);
  ctx.fillStyle = '#ffd86b'; ctx.fillText(mark.title, x, y2);
  ctx.restore();
}

// Bắt đầu ghi. src: khung vẽ game; master: nút âm lượng tổng của game (có thể null khi chưa có tiếng).
// Trả về { stop(): Promise<{ blob, sec, ext, mime }>, elapsed(), cancel() }
export function startRecording(src, master, cfg) {
  const type = pickType();
  if (!type) throw new Error('unsupported');
  const weak = isWeak(cfg);
  const size = clipSize(src.width, src.height, weak ? cfg.long.weak : cfg.long.strong);
  const copy = document.createElement('canvas');
  copy.width = size.w; copy.height = size.h;
  const ctx = copy.getContext('2d');
  ctx.imageSmoothingEnabled = false;   // giữ nét pixel khi thu nhỏ

  let raf = 0, live = true;
  const paint = () => {
    if (!live) return;
    if (src.width && src.height) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, copy.width, copy.height);
      ctx.drawImage(src, 0, 0, copy.width, copy.height);
      drawMark(ctx, copy.width, copy.height, cfg.mark);
    }
    raf = requestAnimationFrame(paint);
  };
  paint();

  const stream = copy.captureStream(cfg.fps);
  let tap = null;
  if (master?.context?.createMediaStreamDestination) {
    try {
      tap = master.context.createMediaStreamDestination();
      master.connect(tap);
      for (const t of tap.stream.getAudioTracks()) stream.addTrack(t);
    } catch { tap = null; /* không lấy được tiếng: vẫn quay hình */ }
  }

  const rec = new MediaRecorder(stream, {
    mimeType: type.mime,
    videoBitsPerSecond: (weak ? cfg.kbps.weak : cfg.kbps.strong) * 1000,
    audioBitsPerSecond: cfg.audio_kbps * 1000,
  });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const t0 = performance.now();
  rec.start(1000);   // mỗi giây cắt một mảnh, lỡ trang đóng giữa chừng vẫn đỡ mất

  function cleanup() {
    live = false; cancelAnimationFrame(raf);
    for (const t of stream.getTracks()) t.stop();
    if (tap) { try { master.disconnect(tap); } catch { /* đã ngắt */ } }
  }

  return {
    type, size, weak,
    elapsed: () => (performance.now() - t0) / 1000,
    stop: () => new Promise((resolve, reject) => {
      const sec = (performance.now() - t0) / 1000;
      rec.onstop = () => { cleanup(); resolve({ blob: new Blob(chunks, { type: type.mime.split(';')[0] }), sec, ext: type.ext, mime: type.mime }); };
      rec.onerror = e => { cleanup(); reject(e.error || e); };
      if (rec.state === 'inactive') rec.onstop(); else rec.stop();
    }),
    cancel: () => { try { if (rec.state !== 'inactive') rec.stop(); } catch { /* đã dừng */ } cleanup(); },
  };
}
