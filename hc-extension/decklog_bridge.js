chrome.storage.local.get('hc_deck_data', function(result) {
  if (!result.hc_deck_data) return;
  chrome.storage.local.remove('hc_deck_data');
  window.postMessage({
    type: 'HC_EXEC_DECKLOG',
    data: JSON.parse(result.hc_deck_data)
  }, '*');
});
