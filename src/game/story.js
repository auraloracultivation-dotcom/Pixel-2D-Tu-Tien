// Chạy kịch bản data/story.json: mỗi bước làm các việc trong "do" rồi chờ điều kiện "until".
export function createStory(game) {
  const steps = game.data.story.steps;
  const st = { busy: false, counters: {}, events: {} };

  const step = () => steps[game.save.step];

  async function runStep() {
    const s = step();
    if (!s) return;
    st.counters = {}; st.events = {};
    if (s.map && game.map.id !== s.map && !game.save.stepDone) await game.travel(s.map, null, false);
    if (!game.save.stepDone) {
      st.busy = true;
      for (const a of s.do || []) await act(a);
      st.busy = false;
      game.save.stepDone = true;
      game.persist();
    }
  }

  async function act(a) {
    const g = game;
    if (a.fly) await g.travel(a.fly, a.spawn, true, { text: a.text, with: a.with, kind: a.kind });
    else if (a.say) await g.dialog.say(a.say.map(([who, text]) => [who ? (g.data.npcs[who]?.name || who) : '', fill(text)]));
    else if (a.choose_element) {
      const els = g.data.elements;
      const id = await g.dialog.choose('Đá linh căn sáng lên... Linh căn của bạn là:',
        Object.entries(els).filter(([k]) => !k.startsWith('_')).map(([k, e]) => ({ id: k, label: e.name, desc: e.desc, color: e.color })));
      g.save.element = id; g.persist();
    }
    else if (a.pickups) for (const [x, y] of a.at) g.addPickup(a.pickups, x, y);
    else if ('dark' in a) g.darkTarget = a.dark;
    else if (a.spawn) {
      for (let i = 0; i < a.n; i++) {
        const p = g.map.freeNear(a.at[0], a.at[1], a.spread || 1, 6);
        g.spawn(a.spawn, p.x, p.y, { story: true });
      }
    }
    else if ('nodeath' in a) g.noDeath = a.nodeath;
    else if (a.flash) g.flashT = 0.35;
    else if (a.kill_all) { for (const m of g.mobs) m.dead = true; g.mobs = []; g.bullets = []; }
    else if (a.npc_add) g.addNpc(a.npc_add, a.near_player ? null : a.at);
    else if (a.npc_remove) g.npcs = g.npcs.filter(n => n.id !== a.npc_remove);
    else if (a.flag) g.save.flags[a.flag] = true;
    else if (a.shake) g.screen.shake(a.shake, 0.6);
    else if (a.weapon) { g.save.weapon = a.weapon; g.refreshStats(); }
    else if (a.gear) g.giveGear(a.gear);
    else if (a.item) g.save.items[a.item] = (g.save.items[a.item] || 0) + 1;
    else if (a.reward) g.giveReward(a.reward);
    g.persist();
  }

  function fill(text) {
    const el = game.save.element ? game.data.elements[game.save.element].name : '';
    return text.replace('{element}', el);
  }

  function check(u) {
    const g = game, p = g.player;
    if (u.any) return u.any.some(check);
    if (u.reach) { const c = g.map.center(u.reach[0], u.reach[1]); return Math.hypot(p.x - c.x, p.y - c.y) < (u.r || 1) * g.map.T; }
    if (u.collect) return (st.counters[u.collect] || 0) >= u.n;
    if (u.kill) return (st.counters['kill:' + u.kill] || 0) >= u.n;
    if (u.realm) return g.save.realm >= u.realm;
    if (u.kill_all) return !g.mobs.some(m => m.story && !m.dead);
    if (u.hp_below) return p.hp / p.maxHp < u.hp_below;
    if (u.talk) return !!st.events['talk:' + u.talk];
    if (u.layer) return g.save.realm > 0 || g.save.layer >= u.layer;
    if (u.map) return g.map.id === u.map;
    if (u.boss_dead) return !!st.events.boss_dead;
    return false;
  }

  function advance() {
    game.save.step += 1; game.save.stepDone = false;
    game.persist();
    runStep();
  }

  return {
    // Mở lại game: làm lại bước đang dở từ đầu (trừ bước chơi tự do và bước "once" đã làm: có thưởng, không phát lại)
    start() {
      const s = step();
      if (s && !s.until.never && !s.once) game.save.stepDone = false;
      return runStep();
    },
    get busy() { return st.busy; },
    update() {
      const s = step();
      if (!s || st.busy || !game.save.stepDone || game.traveling) return;
      if (check(s.until)) advance();
    },
    notify(type, id) {
      if (type === 'collect') st.counters[id] = (st.counters[id] || 0) + 1;
      else if (type === 'kill') st.counters['kill:' + id] = (st.counters['kill:' + id] || 0) + 1;
      else st.events[type + (id ? ':' + id : '')] = true;
      if (type === 'boss') st.events.boss_dead = true;
    },
    // Chữ nhiệm vụ và ô chỉ đường đang hiện
    goal() {
      const s = step();
      if (!s || !game.save.stepDone || !s.goal) return null;
      const key = s.until.collect || (s.until.kill && 'kill:' + s.until.kill);
      const n = key ? Math.min(st.counters[key] || 0, s.until.n) : 0;
      return { text: s.goal.replace('{n}', n), target: (s.target_map || s.map) === game.map.id ? s.target : null };
    },
    // NPC này đang được nhiệm vụ chờ nói chuyện?
    wants(npcId) { const s = step(); return !!(s && s.until.talk === npcId && game.save.stepDone); },
  };
}
