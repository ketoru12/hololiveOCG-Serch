// ページからpostMessageを受け取る
window.addEventListener('message', async function(e) {
  if (!e.data || e.data.type !== 'HC_SEND_TO_DECKLOG') return;
  const deckData = e.data.data;

  // chrome.storage にデータを保存
  await chrome.storage.local.set({ hc_pending: deckData });

  // background.js にタブ管理を委譲（ログインリダイレクト対応）
  chrome.runtime.sendMessage({ type: 'HC_OPEN_DECKLOG' });
});

// 拡張機能が有効なことをページに通知
window.postMessage({ type: 'HC_READY' }, '*');
