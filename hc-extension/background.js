chrome.runtime.onInstalled.addListener(() => {
  console.log('ホロカ→DECKLOG インストール完了');
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'HC_OPEN_DECKLOG') {
    // トップページを開くだけ。ナビゲーションは decklog.js に任せる
    chrome.tabs.create({ url: 'https://decklog.bushiroad.com/' });
    return false;
  }
});
