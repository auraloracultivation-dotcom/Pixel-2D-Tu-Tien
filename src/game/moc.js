// Mốc quà (data/he-thong.json → moc; chủ dự án 19/11/2026 03:26): hạ bao nhiêu quái, chơi bao nhiêu giờ, triệu hồi bao nhiêu lần,
// lên cảnh giới nào thì nhận quà. Mỗi mốc là một nhiệm vụ hệ thống trên máy chủ (id moc-*, migration 20261119040000_p2d_moc_qua.sql):
// máy chủ kiểm lại khi nhận. Ở đây chỉ tính để hiện tiến độ, nút Nhận và chấm đỏ, cùng cách tính với máy chủ p2d_ht_dk:
// quái chặn trên 6 con mỗi giây chơi; giờ chơi lấy từ máy chủ (p2d_cho_mo_trang_thai → giay, cộng thêm thời gian từ lúc hỏi).

const KILL_PER_S = 6;

// Giờ chơi máy chủ đã đếm (giây), hỏi lại mỗi 10 phút; chưa hỏi được thì null
export function playSec(game) {
  const P = game.mocPlay;
  if (P && Date.now() - P.at < 600000) return P.giay + (Date.now() - P.at) / 1000;
  if (game.cloud && !playSec.busy) {
    playSec.busy = true;
    import('../net/market.js').then(N => N.marketLock()).then(r => { if (r?.giay != null) game.mocPlay = { giay: r.giay, at: Date.now() }; })
      .catch(() => {}).finally(() => { playSec.busy = false; });
  }
  return P ? P.giay : null;
}

// Số hiện tại của một nhóm mốc
export function mocValue(game, k, ht) {
  const s = game.save;
  if (k === 'kills') return s?.stats?.kills || 0;
  if (k === 'gio') { const g = playSec(game); return g == null ? null : g / 3600; }
  if (k === 'trieu') return ht?.so_lan || 0;
  if (k === 'realm') return s?.realm || 0;
  return 0;
}

// Các nhóm mốc kèm trạng thái từng mốc: { ...nhóm, v, list: [{ ...mốc, ok, got }] }
export function mocGroups(game, ht) {
  const M = game.data['he-thong']?.moc, xong = new Set(ht?.xong || []);
  if (!M || !game.save) return [];
  const g = playSec(game);
  return M.groups.map(G => {
    const raw = mocValue(game, G.k, ht);
    // quái: hiện đúng số máy chủ tính (chặn 6 con mỗi giây chơi), không để thanh đầy mà bấm Nhận báo chưa xong (góp ý người chơi 19/11/2026)
    const v = G.k === 'kills' && raw != null && g != null ? Math.min(raw, Math.floor(g * KILL_PER_S)) : raw;
    const reach = n => v != null && v >= n && (G.k !== 'kills' || g != null);
    return { ...G, v, raw, list: G.list.map(m => ({ ...m, got: xong.has(m.id), ok: !xong.has(m.id) && reach(m.n) })) };
  });
}

export const mocReady = (game, ht) => !!game.cloud && mocGroups(game, ht).some(G => G.list.some(m => m.ok));
