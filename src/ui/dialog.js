// Hộp thoại kể chuyện và chọn lựa. Chạm để hiện hết chữ / sang câu tiếp.
// Hộp thoại xếp hàng: lời chào lễ, thưởng bí cảnh... gọi lúc đang có hộp khác thì đợi hộp đó xong rồi mới hiện.
// (Trước đây hộp mới đè hộp cũ, lời hứa của hộp cũ không bao giờ xong nên truyện đứng mãi ở bước đó.)
export function createDialog(onLine) {
  const box = document.getElementById('dialog');
  const who = document.getElementById('dlg-who');
  const text = document.getElementById('dlg-text');
  const choices = document.getElementById('dlg-choices');
  const hint = document.getElementById('dlg-hint');
  const d = { open: false };
  let full = '', shown = 0, timer = null, next = null, line = Promise.resolve();
  const queue = run => { const p = line.then(() => new Promise(run)); line = p.catch(() => {}); return p; };

  function type(str) {
    full = str; shown = 0; text.textContent = '';
    clearInterval(timer);
    timer = setInterval(() => {
      shown += 2; text.textContent = full.slice(0, shown);
      if (shown >= full.length) clearInterval(timer);
    }, 22);
  }

  box.addEventListener('pointerdown', e => {
    e.stopPropagation();
    if (choices.childElementCount) return;
    if (shown < full.length) { shown = full.length; text.textContent = full; clearInterval(timer); return; }
    if (next) next();
  });

  // lines: [[tên, câu], ...]
  d.say = lines => queue(resolve => {
    let i = 0;
    d.open = true; box.hidden = false; choices.innerHTML = ''; hint.hidden = false;
    const show = () => {
      if (i >= lines.length) { next = null; d.open = false; box.hidden = true; resolve(); return; }
      const [n, s] = lines[i++];
      who.textContent = n; type(s); onLine?.();
    };
    next = show; show();
  });

  // Lật câu kế (tự hành); đang có lựa chọn thì thôi
  d.skip = () => {
    if (choices.childElementCount) return;
    if (shown < full.length) { shown = full.length; text.textContent = full; clearInterval(timer); }
    else if (next) next();
  };

  // options: [{id, label, desc, color}]
  d.choose = (title, options) => queue(resolve => {
    d.open = true; box.hidden = false; hint.hidden = true; who.textContent = '';
    full = title; shown = title.length; text.textContent = title; clearInterval(timer);
    choices.innerHTML = '';
    for (const o of options) {
      const b = document.createElement('button');
      b.className = 'choice';
      b.style.borderLeft = `6px solid ${o.color || '#1b1830'}`;
      const l = document.createElement('b'); l.textContent = o.label;
      const s = document.createElement('small'); s.textContent = o.desc || '';
      b.append(l, s);
      b.addEventListener('pointerdown', e => {
        e.stopPropagation();
        choices.innerHTML = ''; d.open = false; box.hidden = true; resolve(o.id);
      });
      choices.append(b);
    }
  });
  // Hỏi một dòng chữ (đặt tên...): trả về chữ đã gõ, hoặc null nếu bấm thôi
  d.ask = (title, placeholder, max, ok, cancel) => queue(resolve => {
    d.open = true; box.hidden = false; hint.hidden = true; who.textContent = '';
    full = title; shown = title.length; text.textContent = title; clearInterval(timer);
    choices.innerHTML = '';
    const inp = document.createElement('input');
    inp.className = 'dlg-input'; inp.maxLength = max; inp.placeholder = placeholder; inp.autocomplete = 'off';
    const done = v => { choices.innerHTML = ''; d.open = false; box.hidden = true; resolve(v); };
    const mk = (label, v) => {
      const b = document.createElement('button'); b.className = 'choice';
      const l = document.createElement('b'); l.textContent = label; b.append(l);
      b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); done(v()); });
      return b;
    };
    inp.addEventListener('pointerdown', e => e.stopPropagation());
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') done(inp.value); });
    choices.append(inp, mk(ok, () => inp.value), mk(cancel, () => null));
    setTimeout(() => inp.focus(), 50);
  });
  return d;
}
