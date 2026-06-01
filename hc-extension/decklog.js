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

  // MAIN world（decklog_main.js）のリスナー準備を待ってから送信
  // Firefox では MAIN world の初期化が遅れる場合があるためリトライする
  await delay(1000);
  let execAcked = false;
  window.addEventListener('message', function ackHandler(e) {
    if (!e.data || e.data.type !== 'HC_EXEC_ACK') return;
    execAcked = true;
    window.removeEventListener('message', ackHandler);
  });
  for (let attempt = 0; attempt < 5 && !execAcked; attempt++) {
    window.postMessage({ type: 'HC_EXEC', data: deckData }, '*');
    await delay(600);
  }

  // HC_DONE を受け取ったらストレージから削除
  window.addEventListener('message', async function handler(e) {
    if (!e.data || e.data.type !== 'HC_DONE') return;
    await chrome.storage.local.remove('hc_pending');
    window.removeEventListener('message', handler);
  });
})();
