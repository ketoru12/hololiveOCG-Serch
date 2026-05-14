chrome.runtime.onInstalled.addListener(() => {
  console.log('ホロカ→DECKLOG インストール完了');
});

const DECKLOG_TOP    = 'https://decklog.bushiroad.com/';
const DECKLOG_CREATE = 'https://decklog.bushiroad.com/create?c=9';

// ログイン→DECKLOGへ誘導するタブID
const pendingTabs = new Set();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'HC_OPEN_DECKLOG') {
    // createページ直接ではなくトップページを開き、ログインリダイレクトを確実に発生させる
    chrome.tabs.create({ url: DECKLOG_TOP }, (tab) => {
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
    // createページに到達 → 監視終了（decklog.jsが処理を引き継ぐ）
    pendingTabs.delete(tabId);

  } else if (url.startsWith('https://decklog.bushiroad.com/')) {
    // DECKLOGドメインにいてcreateページ以外（トップ・マイデッキ等）
    // → ログイン済みなのでcreateページへ誘導
    chrome.tabs.update(tabId, { url: DECKLOG_CREATE });

  }
  // ブシナビ等のログインページにいる間は何もしない（ユーザーにログインしてもらう）
});

chrome.tabs.onRemoved.addListener((tabId) => {
  pendingTabs.delete(tabId);
});
