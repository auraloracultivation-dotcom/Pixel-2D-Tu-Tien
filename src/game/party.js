// Bí cảnh tổ đội (data/party.json): lập đội, vào đội bằng mã, đội trưởng chọn bí cảnh rồi cả đội cùng vào.
// Trong bí cảnh, máy đội trưởng điều khiển quái; đồng bộ ở party-sync.js.
import { cleared } from './dun-mode.js';
import { realmLabel } from './stats.js';
import { onPartyMsg, resetSync } from './party-sync.js';

const P = game => game.data.party;
const DUNS = game => Object.keys(game.data.maps).filter(id => (game.data.maps[id].rooms || []).length);

// Đội trưởng là người vào kênh sớm nhất
export const isHost = game => !!game.party && game.party.roster[0]?.id === game.party.me;
export const inPartyRun = game => !!game.party?.run && game.map?.id === game.party.run.map;

function makeCode(n) { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }

async function open(game, code) {
  const { joinParty } = await import('../net/party.js');
  const me = { id: game.online.me.id, name: game.online.me.name, realm: realmLabel(game.save, game.data.realms) };
  const party = { code, me: me.id, roster: [], run: null };
  game.party = party;   // đặt trước khi chờ vào kênh để bấm hai lần không mở hai đội
  party.net = await joinParty(me, code, {
    onRoster: list => {
      party.roster = list.sort((a, b) => a.joined - b.joined);
      if (party.roster.length > P(game).max && party.roster.findIndex(r => r.id === me.id) >= P(game).max) { game.toast(P(game).full, 2); leaveParty(game); }
    },
    onMsg: msg => onPartyMsg(game, msg),
    onError: () => game.toast(P(game).lost, 2),
  });
}

export async function leaveParty(game) {
  const p = game.party;
  if (!p) return;
  if (inPartyRun(game) && isHost(game)) p.net?.send({ t: 'end' });
  game.party = null; resetSync(game);
  await p.net?.leave();
}

const names = game => game.party.roster.map(r => r.name).join(', ') || '...';

// Đội trưởng chọn bí cảnh (đã qua) và độ khó, báo cả đội rồi cùng vào
async function startRun(game) {
  const d = game.data, list = DUNS(game).filter(id => cleared(game, id) > 0);
  if (!list.length) { await game.dialog.say([['', P(game).none_done]]); return; }
  const id = await game.dialog.choose(P(game).pick, [...list.map(k => ({ id: k, label: d.maps[k].name, desc: '' })), { id: 'back', label: P(game).back, desc: '' }]);
  if (!d.maps[id]) return;
  const modes = d.dungeon.modes.slice(0, cleared(game, id) + 1);
  const mi = await game.dialog.choose(d.maps[id].name, [...modes.map((m, i) => ({ id: String(i), label: m.name, desc: m.desc, color: m.color })), { id: 'back', label: P(game).back, desc: '' }]);
  if (!modes[+mi] || mi === 'back') return;
  const run = { map: id, mode: +mi, n: game.party.roster.length };
  game.party.net?.send({ t: 'start', ...run });
  beginRun(game, run);
}

export function beginRun(game, run) {
  game.party.run = run; game.dunMode = run.mode; resetSync(game);
  game.toast(P(game).going.replace('{map}', game.data.maps[run.map].name).replace('{mode}', game.data.dungeon.modes[run.mode].name), 2.4);
  game.travel(run.map, 'vao', true);
}

export async function talkParty(game, npc) {
  const C = P(game), who = npc.def.name;
  if (!game.online) { await game.dialog.say([[who, C.offline]]); return; }
  if (!game.party) {
    const ch = await game.dialog.choose(`${who}: ${C.ask}`, [
      { id: 'make', label: C.create, desc: C.create_desc },
      { id: 'join', label: C.join, desc: C.join_desc },
      { id: 'back', label: C.back, desc: '' },
    ]);
    if (ch === 'make') { const code = makeCode(C.code_len); await open(game, code); await game.dialog.say([[who, C.made.replace('{code}', code)]]); }
    if (ch === 'join') {
      const code = (await game.dialog.ask(C.code_ask, C.code_ph, C.code_len, C.ok, C.back) || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length === C.code_len) { await open(game, code); await game.dialog.say([[who, C.joined.replace('{code}', code)]]); }
    }
    return;
  }
  const opts = isHost(game) ? [{ id: 'start', label: C.start, desc: C.start_desc }] : [];
  opts.push({ id: 'leave', label: C.leave, desc: '' }, { id: 'back', label: C.back, desc: '' });
  const title = `${C.roster.replace('{code}', game.party.code).replace('{names}', names(game))}${isHost(game) ? '' : '. ' + C.wait}`;
  const ch = await game.dialog.choose(title, opts);
  if (ch === 'start') await startRun(game);
  if (ch === 'leave') { await leaveParty(game); game.toast(C.left, 1.6); }
}
