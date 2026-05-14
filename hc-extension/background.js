chrome.runtime.onInstalled.addListener(() => {
  console.log('ホロカ→DECKLOG インストール完了');
});

const DECKLOG_CREATE = 'https://decklog.bushiroad.com/create?c=9';

// デッキ登録フローを追跡するタブID
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

  // ログイン完了後に遷移するURL群 → /create へ誘導
  const isPostLogin =
    url.startsWith('https://www.bushi-navi.com/') ||
    url.startsWith('https://bushi-navi.com/') ||
    url.startsWith('https://p.bushiroad.com/') ||
    (url.startsWith('https://decklog.bushiroad.com/') && !url.includes('/create'));

  if (isPostLogin) {
    const res = await chrome.storage.local.get('hc_pending');
    if (res.hc_pending) {
      chrome.tabs.update(tabId, { url: DECKLOG_CREATE });
    } else {
      pendingTabs.delete(tabId);
    }
    return;
  }

  // /create に到達したら監視終了（decklog.js が処理を引き継ぐ）
  if (url.startsWith('https://decklog.bushiroad.com/create')) {
    pendingTabs.delete(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  pendingTabs.delete(tabId);
});
