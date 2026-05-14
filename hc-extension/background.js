chrome.runtime.onInstalled.addListener(() => {
  console.log('ホロカ→DECKLOG インストール完了');
});

const DECKLOG_CREATE = 'https://decklog.bushiroad.com/create?c=9';

// タブごとの状態管理
// 'waiting'  : decklog トップを開いた直後（ユーザーがログイン操作中）
// 'left'     : ログインのため外部ドメイン（bushi-navi等）に移動した
const tabState = new Map();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'HC_OPEN_DECKLOG') {
    chrome.tabs.create({ url: 'https://decklog.bushiroad.com/' }, (tab) => {
      tabState.set(tab.id, 'waiting');
    });
    return false;
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tabState.has(tabId)) return;
  if (changeInfo.status !== 'complete') return;
  if (!tab.url) return;

  const url = tab.url;
  const state = tabState.get(tabId);

  // ① /create に到達 → 監視終了
  if (url.startsWith('https://decklog.bushiroad.com/create')) {
    tabState.delete(tabId);
    return;
  }

  // ② decklog ドメイン内（トップ・マイデッキ等）
  if (url.startsWith('https://decklog.bushiroad.com/')) {
    if (state === 'left') {
      // ログイン後に decklog に戻ってきた → /create へ
      const res = await chrome.storage.local.get('hc_pending');
      if (res.hc_pending) {
        chrome.tabs.update(tabId, { url: DECKLOG_CREATE });
      } else {
        tabState.delete(tabId);
      }
    }
    // state === 'waiting'（最初に開いた直後）は何もしない
    // → ユーザーが自分でログインボタンを押すまで待つ
    return;
  }

  // ③ decklog 外（bushi-navi.com、p.bushiroad.com、ログインページ等）
  // → ログインのために離脱した
  const res = await chrome.storage.local.get('hc_pending');
  if (res.hc_pending) {
    tabState.set(tabId, 'left');  // ログイン後に decklog に戻ってきたら /create へ
  } else {
    tabState.delete(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabState.delete(tabId);
});
