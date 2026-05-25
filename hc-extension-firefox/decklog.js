(async function () {
  const delay = ms => new Promise(r => setTimeout(r, ms));

  // /create ページ以外は background.js がナビゲーションを担当するので何もしない
  if (!location.pathname.startsWith('/create')) return;

  // storageからデッキデータを取得（まだ消さない）
  let deckData = null;
  for (let i = 0; i < 10; i++) {
    const res = await chrome.storage.local.get('hc_pending');
    if (res.hc_pending) { deckData = res.hc_pending; break; }
    await delay(500);
  }
  if (!deckData) return;

  // MAIN world（decklog_main.js）に渡す
  window.postMessage({ type: 'HC_EXEC', data: deckData }, '*');

  // HC_DONE を受け取ったらストレージから削除
  window.addEventListener('message', async function handler(e) {
    if (!e.data || e.data.type !== 'HC_DONE') return;
    await chrome.storage.local.remove('hc_pending');
    window.removeEventListener('message', handler);
  });
})();
