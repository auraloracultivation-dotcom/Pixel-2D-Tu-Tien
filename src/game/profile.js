// Hồ sơ người chơi khác (chạm tên ở bảng xếp hạng): tải từ máy chủ (net/rank.js → fetchPlayer), nhớ tạm 60 giây mỗi người.
// Bản lưu trả về chỉ gồm những gì cần để xem và dựng bản sao so tài (cảnh giới, đồ đang mặc, công pháp, chiêu, linh thú,
// đồng hành, hình dáng). Đó là dữ liệu người khác: lọc lại theo data/ của bản game này trước khi dùng (món lạ, chỉ số lạ bỏ đi).
const cache = new Map(), inflight = new Map();
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

export function loadPlayer(game, k, force) {
  const c = cache.get(k);
  if (!force && c && Date.now() - c.at < 60000) return Promise.resolve(c.data);
  if (!inflight.has(k)) {
    inflight.set(k, import('../net/rank.js').then(m => m.fetchPlayer(k)).then(raw => {
      const data = { ...raw, save: cleanSave(game.data, raw?.save) };
      cache.set(k, { at: Date.now(), data });
      return data;
    }).finally(() => inflight.delete(k)));
  }
  return inflight.get(k);
}

function cleanItem(data, it) {
  const I = data.items;
  if (!it || !I.bases[it.base]) return null;
  const main = Object.fromEntries(Object.entries(obj(it.main)).filter(([s, v]) => I.stats[s] && Number.isFinite(v)));
  const gem = g => {
    if (typeof g !== 'string') return null;
    const [t, lv] = g.split(':');
    return I.gems.types[t]?.values?.[num(lv) - 1] != null ? g : null;
  };
  return {
    uid: it.uid, base: it.base, rarity: I.rarities.some(r => r.id === it.rarity) ? it.rarity : I.rarities[0].id,
    lvl: num(it.lvl), plus: num(it.plus), pb: num(it.pb), el: data.elements[it.el] ? it.el : undefined,
    wt: data.weapons[it.wt] ? it.wt : undefined, main,
    lines: (Array.isArray(it.lines) ? it.lines : []).filter(l => I.stats[l?.s] && Number.isFinite(l.v)).map(l => ({ s: l.s, v: l.v })),
    sockets: (Array.isArray(it.sockets) ? it.sockets : []).map(gem),
  };
}

// Bản lưu sạch: chỉ trường đã biết, giá trị trong khoảng hợp lệ; dùng được cho playerStats, skillSlots, heroLook
export function cleanSave(data, s) {
  s = obj(s);
  const R = data.realms, wid = Object.keys(data.weapons).find(k => !k.startsWith('_'));
  const bag = (Array.isArray(s.bag) ? s.bag : []).map(it => cleanItem(data, it)).filter(Boolean);
  const equip = {};
  for (const [slot, uid] of Object.entries(obj(s.equip))) {
    const it = data.items.slots[slot] && bag.find(i => i.uid === uid);
    if (it && data.items.bases[it.base].slot === slot) equip[slot] = uid;
  }
  const pet = data.pets.pets[s.pet] ? s.pet : null, comp = data.companions.list[s.companion] && data.npcs[s.companion] ? s.companion : null;
  const pst = obj(obj(s.pets)[pet]), cst = obj(obj(s.comps)[comp]);
  const techs = {};
  for (const [id, t] of Object.entries(obj(s.techs))) if (data.techniques.list[id]) techs[id] = { lv: num(obj(t).lv) };
  const skillLv = {};
  for (const [id, lv] of Object.entries(obj(s.skillLv))) if (data.skills[id]) skillLv[id] = num(lv, 1);
  const snack = obj(s.snack);
  return {
    realm: Math.max(0, Math.min(R.names.length - 1, Math.floor(num(s.realm)))),
    layer: Math.max(1, Math.min(R.layers, Math.floor(num(s.layer, 1)))),
    element: data.elements[s.element] ? s.element : null,
    weapon: data.weapons[s.weapon] ? s.weapon : wid,
    root: s.root, bag, equip, gems: {}, mats: {}, nextUid: 1,
    techSlots: (Array.isArray(s.techSlots) ? s.techSlots : []).filter(id => data.techniques.list[id]), techs,
    snack: data.snacks?.list?.[snack.id] ? { id: snack.id, until: num(snack.until) } : null,
    flags: { boiNguyen: num(obj(s.flags).boiNguyen) },
    loadout: Array.isArray(s.loadout) ? s.loadout.slice(0, 3).map(id => (data.skills[id] ? id : null)) : undefined,
    skillLv,
    pet, pets: pet ? { [pet]: { lv: Math.max(1, num(pst.lv, 1)), exp: 0, star: num(pst.star), evo: !!pst.evo } } : {},
    companion: comp, comps: comp ? { [comp]: { lv: Math.max(1, num(cst.lv, 1)), exp: 0 } } : {},
    look: data.heroes.list[s.look] ? s.look : data.heroes.default, outfit: typeof s.outfit === 'string' ? s.outfit : undefined, gioi: s.gioi,
  };
}
