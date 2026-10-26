// Màn đầu: đăng nhập tài khoản chung với game cũ, hoặc chơi thử không mạng.
// Phần mạng nạp lười: mất mạng thì vẫn chơi thử được.
import { loadSave } from '../core/save.js';

const $ = id => document.getElementById(id);
const NET_TIMEOUT = 8000;

function withTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('Hết thời gian chờ máy chủ.')), ms))]);
}

export function createLogin(onPlay0) {
  let auth = null, session = null, played = false;
  const onPlay = o => { played = true; onPlay0(o); };

  const msg = (t, bad) => { $('login-msg').textContent = t || ''; $('login-msg').classList.toggle('bad', !!bad); };
  const busy = on => { for (const b of document.querySelectorAll('#menu button, #menu input')) b.disabled = on; };

  function render() {
    if (played) return; // đã vào game: kết nối xong muộn cũng không hiện lại màn đầu
    $('menu').hidden = false;
    $('login-form').hidden = !!session;
    $('logged').hidden = !session;
    if (session) $('logged-name').textContent = auth.displayName(session);
    const has = !!loadSave(session ? session.user.id : 'guest');
    $('menu-continue').hidden = !has;
    $('menu-new').textContent = has ? 'Chơi lại từ đầu' : 'Bắt đầu';
    $('play-buttons').hidden = !session;
  }

  async function act(fn) {
    busy(true); msg('Đang kết nối...');
    try { await fn(); msg(''); } catch (e) { msg(e.message, true); }
    busy(false); render();
  }

  $('btn-login').onclick = () => act(async () => { session = await withTimeout(auth.signIn($('acc').value, $('pwd').value), NET_TIMEOUT); });
  $('btn-signup').onclick = () => act(async () => { session = await withTimeout(auth.signUp($('acc').value, $('pwd').value), NET_TIMEOUT); });
  $('btn-logout').onclick = () => act(async () => { await auth.signOut(); session = null; });
  $('btn-guest').onclick = () => {
    onPlay({ fresh: false, session: null, owner: 'guest' });
  };
  $('menu-continue').onclick = () => onPlay({ fresh: false, session, owner: session.user.id });
  $('menu-new').onclick = () => onPlay({ fresh: true, session, owner: session.user.id });

  return {
    async start() {
      render();
      $('login-form').hidden = false; msg('Đang kết nối máy chủ...');
      for (const id of ['btn-login', 'btn-signup']) $(id).disabled = true;
      try {
        auth = await withTimeout(import('../net/auth.js'), NET_TIMEOUT);
        session = await withTimeout(auth.getSession(), NET_TIMEOUT);
        msg('');
        for (const id of ['btn-login', 'btn-signup']) $(id).disabled = false;
      } catch {
        auth = null;
        msg('Không kết nối được máy chủ. Bạn vẫn chơi thử được (không mạng).', true);
      }
      render();
      if (!auth && !played) { $('login-form').hidden = true; $('logged').hidden = true; }
    },
  };
}
