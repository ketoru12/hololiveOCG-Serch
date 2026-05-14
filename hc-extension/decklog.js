(async function () {
  const delay = ms => new Promise(r => setTimeout(r, ms));

  // ─── /create ページ：デッキ登録処理 ───
  if (location.pathname.startsWith('/create')) {
    let deckData = null;
    for (let i = 0; i < 10; i++) {
      const res = await chrome.storage.local.get('hc_pending');
      if (res.hc_pending) { deckData = res.hc_pending; break; }
      await delay(500);
    }
    if (!deckData) return;

    window.postMessage({ type: 'HC_EXEC', data: deckData }, '*');

    window.addEventListener('message', async function handler(e) {
      if (!e.data || e.data.type !== 'HC_DONE') return;
      await chrome.storage.local.remove('hc_pending');
      window.removeEventListener('message', handler);
    });
    return;
  }

  // ─── トップページ等：ログイン確認後に /create へ ───
  const res = await chrome.storage.local.get('hc_pending');
  if (!res.hc_pending) return;

  // SPA の描画を待つ
  await delay(2500);

  // ログイン済みかチェック：ログアウトリンク or ユーザー系要素があれば OK
  const LOGGED_IN_SELECTORS = [
    'a[href*="logout"]',
    '[class*="logout"]',
    '[class*="Logout"]',
    '[class*="mypage"]',
    '[class*="MyPage"]',
    '[class*="user-icon"]',
    '[class*="UserIcon"]',
    '[class*="avatar"]',
    '[class*="Avatar"]',
  ];
  const isLoggedIn = LOGGED_IN_SELECTORS.some(sel => document.querySelector(sel));

  if (isLoggedIn) {
    // ログイン済み → create ページへ
    location.href = 'https://decklog.bushiroad.com/create?c=9';
  } else {
    // 未ログイン → バナーを表示してユーザーにログインを促す
    const banner = document.createElement('div');
    banner.id = 'hc-login-banner';
    banner.style.cssText = [
      'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999',
      'background:#5e5a9b;color:white;border-radius:12px;padding:14px 24px',
      'font-size:14px;font-weight:bold;box-shadow:0 4px 20px rgba(0,0,0,.4)',
      'display:flex;align-items:center;gap:14px;white-space:nowrap',
    ].join(';');
    banner.innerHTML =
      '<span>🃏 ホロカのデッキデータが待機中です。ブシナビにログインしてください。</span>' +
      '<button id="hc-login-ok" style="background:white;color:#5e5a9b;border:none;border-radius:8px;' +
      'padding:6px 14px;font-size:13px;font-weight:bold;cursor:pointer;">ログイン完了 →</button>';
    document.body.appendChild(banner);

    // 「ログイン完了」ボタンを押したら /create へ
    document.getElementById('hc-login-ok').addEventListener('click', () => {
      banner.remove();
      location.href = 'https://decklog.bushiroad.com/create?c=9';
    });

    // ログイン後に別ページへ遷移してから戻ってきた場合も検知
    // (ページ遷移で再実行されるため、このスクリプトが再度走ってログイン判定される)
  }
})();
