// Đo người chơi bằng PostHog (gửi: src/net/analytics.js; cấu hình: data/config.json → analytics). Không sửa luồng game: bọc game.begin để biết
// lúc vào game, rồi mỗi poll_s giây so trạng thái bản lưu để ghi đổi bản đồ, lên cảnh giới, mua chiêu Vạn Bảo Lâu, bước nhiệm vụ người mới.
// Tên sự kiện tiếng Việt không dấu cho dễ đọc trên bảng PostHog.
import { startAnalytics, identify, track, flush } from '../net/analytics.js';

export function startAnalyticsHook(game) {
  const cfg = game.data.config.analytics, q = new URLSearchParams(location.search);
  if ((/^(localhost|127\.0\.0\.1)$/.test(location.hostname) || q.has('thu')) && !q.has('ph')) return;   // máy kiểm thử, chơi thử tự động: không gửi (?ph=1 để thử)
  if (!startAnalytics({ ...cfg, build: new URL(import.meta.url).searchParams.get('v') || 'dev' })) return;
  track('$pageview');
  const t0 = performance.now();
  let last = null;
  const snap = () => {
    const s = game.save;
    return s && { map: s.map, realm: s.realm || 0, layer: s.layer || 1, step: s.step || 0, skills: [...(s.boughtSkills || [])] };
  };
  const base = () => ({ ban_do: game.save?.map, canh_gioi: game.save?.realm || 0, tang: game.save?.layer || 1 });
  let entering = null, before = null;   // đang vào game: thông tin lượt vào, bản lưu cũ lúc bấm (vào lại sau khi đăng xuất)
  const begin = game.begin;
  game.begin = opts => {   // không chờ begin xong (có thể chờ máy chủ lâu): vào game ghi khi bản lưu đã nạp, xem vòng dưới
    const uid = opts?.session?.user?.id;
    if (uid) identify(uid);
    entering = { moi: !!opts?.fresh, dang_nhap: !!uid }; before = game.save; last = null;
    return begin(opts);
  };
  setInterval(() => {   // bản lưu vừa nạp xong (game.save có) thì ghi vao_game một lần
    if (!entering || !game.save || game.save === before) return;
    track('vao_game', { ...base(), ...entering, giay_tai: Math.round((performance.now() - t0) / 1000) });
    entering = null; last = snap();
  }, 1000);
  setInterval(() => {
    const now = snap();
    if (!now || !last || entering) return;
    if (now.map !== last.map) track('doi_ban_do', { tu: last.map, den: now.map, canh_gioi: now.realm });
    if (now.realm !== last.realm || now.layer !== last.layer) track('len_canh_gioi', { canh_gioi: now.realm, tang: now.layer, ban_do: now.map });
    if (now.step !== last.step) track('buoc_nguoi_moi', { buoc: now.step });
    for (const k of now.skills) if (!last.skills.includes(k)) track('mua_chieu', { chieu: k, ...base() });
    last = now;
  }, (cfg.poll_s || 15) * 1000);
  addEventListener('pagehide', () => { track('roi_game', { ...base(), phut: Math.round((performance.now() - t0) / 60000) }); flush(true); });
}
