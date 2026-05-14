chrome.runtime.onInstalled.addListener(() => {
  console.log('ホロカ→DECKLOG インストール完了');
});

const DECKLOG_CREATE = 'https://decklog.bushiroad.com/create?c=9';

const pendingTabs = new Set();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'HC_OPEN_DECKLOG') {
    chrome.tabs.create({ url: 'https://decklog.bushiroad.com/' }, (tab) => {
      pendingTabs.add(tab.id);
    });
    return false;
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!pendingTabs.has(tabId)) return;
  if (changeInfo.status !== 'complete') return;
  if (!tab.url) return;

  const url = tab.url;

  // /create に到達 → 監視終了
  if (url.startsWith('https://decklog.bushiroad.com/create')) {
    pendingTabs.delete(tabId);
    return;
  }

  // decklog ドメイン内（トップ・title 等）
  if (url.startsWith('https://decklog.bushiroad.com/')) {
    const res = await chrome.storage.local.get('hc_pending');
    if (!res.hc_pending) { pendingTabs.delete(tabId); return; }

    // 3秒待っても別ドメインに飛ばなければ「ログイン済み」→ /create へ
    setTimeout(() => {
      if (!pendingTabs.has(tabId)) return; // その間に別処理が完了した場合はスキップ
      chrome.tabs.get(tabId, (t) => {
        if (chrome.runtime.lastError || !t || !t.url) return;
        if (t.url.startsWith('https://decklog.bushiroad.com/') &&
            !t.url.startsWith('https://decklog.bushiroad.com/create')) {
          chrome.storage.local.get('hc_pending', (r) => {
            if (r.hc_pending) {
              chrome.tabs.update(tabId, { url: DECKLOG_CREATE });
            } else {
              pendingTabs.delete(tabId);
            }
          });
        }
      });
    }, 3000);
    return;
  }

  // decklog 外（bushi-navi.com 等）= ログイン後のリダイレクト → /create へ直接ジャンプ
  const res = await chrome.storage.local.get('hc_pending');
  if (res.hc_pending) {
    chrome.tabs.update(tabId, { url: DECKLOG_CREATE });
  } else {
    pendingTabs.delete(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  pendingTabs.delete(tabId);
});
