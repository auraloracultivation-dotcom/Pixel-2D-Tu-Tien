// Hộp thoại kể chuyện và chọn lựa. Chạm để hiện hết chữ / sang câu tiếp.
export function createDialog(onLine) {
  const box = document.getElementById('dialog');
  const who = document.getElementById('dlg-who');
  const text = document.getElementById('dlg-text');
  const choices = document.getElementById('dlg-choices');
  const hint = document.getElementById('dlg-hint');
  const d = { open: false };
  let full = '', shown = 0, timer = null, next = null;

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
  d.say = lines => new Promise(resolve => {
    let i = 0;
    d.open = true; box.hidden = false; choices.innerHTML = ''; hint.hidden = false;
    const show = () => {
      if (i >= lines.length) { next = null; d.open = false; box.hidden = true; resolve(); return; }
      const [n, s] = lines[i++];
      who.textContent = n; type(s); onLine?.();
    };
    next = show; show();
  });

  // options: [{id, label, desc, color}]
  d.choose = (title, options) => new Promise(resolve => {
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
  return d;
}
