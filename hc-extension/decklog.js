(async function() {
  const delay = ms => new Promise(r => setTimeout(r, ms));

  // storageからデッキデータを取得
  let deckData = null;
  for (let i = 0; i < 10; i++) {
    const result = await chrome.storage.local.get('hc_pending');
    if (result.hc_pending) {
      deckData = result.hc_pending;
      await chrome.storage.local.remove('hc_pending');
      break;
    }
    await delay(500);
  }
  if (!deckData) return; // データがなければ何もしない

  // window.postMessageでMAIN worldに渡す
  window.postMessage({ type: 'HC_EXEC', data: deckData }, '*');
})();
