let _hcExecStarted = false;
window.addEventListener('message', function(e) {
  if (!e.data || e.data.type !== 'HC_EXEC') return;
  if (_hcExecStarted) return;
  _hcExecStarted = true;
  window.postMessage({ type: 'HC_EXEC_ACK' }, '*');
  execDecklog(e.data.data);
});

async function execDecklog(deckData) {
  const delay = ms => new Promise(r => setTimeout(r, ms));

  // ログインボタンが表示されている場合はクリックして認証へ（SPAの場合）
  // ページ描画を少し待つ
  await delay(1500);
  const loginBtn = document.querySelector(
    'a[href*="login"], button[class*="login"], a[class*="login"], ' +
    '.login-btn, [class*="LoginBtn"], a[href*="p.bushiroad"]'
  );
  if (loginBtn) {
    // ログイン後に再度 create ページに戻ってくるまで待つ
    // データは storage に残したまま → 戻ってきた時に decklog.js が再処理
    loginBtn.click();
    return;
  }

  let stdInp = null;
  for (let i = 0; i < 60; i++) {
    stdInp = document.querySelector('input[type="radio"][name="regulation"][value="S"]');
    if (stdInp) break;
    await delay(500);
  }
  if (!stdInp) { alert('スタンダードが見つかりません'); return; }
  stdInp.click();
  await delay(1200);

  let ready = false;
  for (let w = 0; w < 30; w++) {
    if (document.querySelector('.card-searchform') ||
        document.querySelectorAll('input[type=radio]').length > 3) {
      ready = true; break;
    }
    await delay(500);
  }
  if (!ready) { alert('カード選択画面タイムアウト'); return; }

  const selType = async label => {
    const inp = Array.from(document.querySelectorAll('input[type=radio]')).find(r => {
      const lbl = r.closest('label') || document.querySelector('label[for="'+r.id+'"]');
      return lbl && lbl.textContent.trim().indexOf(label) > -1;
    });
    if (inp) { inp.click(); await delay(700); return true; }
    return false;
  };

  const tryAdd = async (no, cnt, rarity) => {
    const t = Array.from(document.querySelectorAll('button,span')).find(b => {
      const tx = b.textContent.trim(); return tx === 'カード番号' || tx === 'No.';
    });
    if (t) { t.click(); await delay(400); }
    const inp = Array.from(document.querySelectorAll('input')).find(i => {
      const p = i.placeholder || ''; return p.indexOf('番号') > -1 || p.indexOf('キーワード') > -1;
    });
    if (!inp) return false;
    inp.focus();
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, no);
    ['input', 'change', 'keyup'].forEach(ev => inp.dispatchEvent(new Event(ev, { bubbles: true })));
    await delay(1500);
    const items = document.querySelectorAll('.card-item');
    if (!items.length) return false;
    let el = null;
    if (rarity && items.length > 1) {
      const r = rarity.toUpperCase();
      for (const item of items) {
        // カードアイテムのテキストにレアリティが含まれるか確認
        const txt = (item.textContent || '').toUpperCase();
        const img = item.querySelector('img');
        const src = img ? img.src.toUpperCase() : '';
        if (txt.includes(r) || src.includes('_' + r + '.')) { el = item; break; }
      }
    }
    if (!el) el = items[0];
    const inc = el.querySelector('.card-inc'); if (!inc) return false;
    for (let i = 0; i < cnt; i++) { inc.click(); await delay(350); }
    return true;
  };

  let ok = 0, ng = [];
  const { oshi, main, yell } = deckData;
  if (oshi) {
    await selType('推しホロメン');
    if (await tryAdd(oshi.id, 1, oshi.rarity || '')) ok++; else ng.push(oshi.id + '(推し)');
    await delay(400);
  }
  if (yell && yell.length) {
    await selType('エールデッキ');
    for (const c of yell) {
      if (!c.id) continue;
      if (await tryAdd(c.id, c.count, c.rarity || '')) ok++; else ng.push(c.id);
      await delay(300);
    }
  }
  if (main && main.length) {
    await selType('メインデッキ');
    for (const c of main) {
      if (!c.id) continue;
      if (await tryAdd(c.id, c.count, c.rarity || '')) ok++; else ng.push(c.id);
      await delay(300);
    }
  }

  alert('完了: ' + ok + '件成功' + (ng.length ? '\n失敗: ' + ng.join(', ') : ''));

  // 完了を decklog.js (ISOLATED world) に通知 → storage からデータ削除
  window.postMessage({ type: 'HC_DONE' }, '*');
}
