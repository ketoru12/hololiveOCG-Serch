chrome.runtime.onInstalled.addListener(() => {
  console.log('ホロカ→DECKLOG インストール完了');
});

const DECKLOG_CREATE = 'https://decklog.bushiroad.com/create?c=9';

// ログイン後にDECKLOGへ誘導するタブID
const pendingTabs = new Set();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'HC_OPEN_DECKLOG') {
    chrome.tabs.create({ url: DECKLOG_CREATE }, (tab) => {
      pendingTabs.add(tab.id);
    });
    return false;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!pendingTabs.has(tabId)) return;
  if (changeInfo.status !== 'complete') return;
  if (!tab.url) return;

  const url = tab.url;

  if (url.startsWith('https://decklog.bushiroad.com/create')) {
    // createページに到達 → 監視終了
    pendingTabs.delete(tabId);
  } else if (url.startsWith('https://decklog.bushiroad.com/')) {
    // DECKLOGドメインだがcreateページ以外（ログイン後トップ等）→ createへ誘導
    chrome.tabs.update(tabId, { url: DECKLOG_CREATE });
  }
  // ブシナビ等ログインページ滞在中は何もしない（ユーザーにログインしてもらう）
});

chrome.tabs.onRemoved.addListener((tabId) => {
  pendingTabs.delete(tabId);
});
