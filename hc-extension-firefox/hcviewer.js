// ページからpostMessageを受け取る
window.addEventListener('message', async function(e) {
  if (!e.data || e.data.type !== 'HC_SEND_TO_DECKLOG') return;
  const deckData = e.data.data;

  try {
    // chrome.storage にデータを保存
    await chrome.storage.local.set({ hc_pending: deckData });

    // background.js にタブ管理を委譲（ログインリダイレクト対応）
    chrome.runtime.sendMessage({ type: 'HC_OPEN_DECKLOG' });
  } catch (err) {
    console.warn('[ホロカ拡張機能] エラー:', err.message);
    // 拡張機能が無効・再読み込みされた場合はページ側フォールバックに任せる
  }
});

// 拡張機能が有効なことをページに通知
window.postMessage({ type: 'HC_READY' }, '*');
