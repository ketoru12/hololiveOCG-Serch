window.addEventListener('message', function(e) {
  if (!e.data || e.data.type !== 'HC_EXEC') return;
  execDecklog(e.data.data);
});

async function execDecklog(deckData) {
  const delay = ms => new Promise(r => setTimeout(r, ms));

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

  const tryAdd = async (no, cnt) => {
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
    const el = document.querySelector('.card-item'); if (!el) return false;
    const inc = el.querySelector('.card-inc'); if (!inc) return false;
    for (let i = 0; i < cnt; i++) { inc.click(); await delay(350); }
    return true;
  };

  let ok = 0, ng = [];
  const { oshi, main } = deckData;
  if (oshi) {
    await selType('推しホロメン');
    if (await tryAdd(oshi.id, 1)) ok++; else ng.push(oshi.id + '(推し)');
    await delay(400);
  }
  if (main && main.length) {
    await selType('メインデッキ');
    for (const c of main) {
      if (!c.id) continue;
      if (await tryAdd(c.id, c.count)) ok++; else ng.push(c.id);
      await delay(300);
    }
  }
  alert('完了: ' + ok + '件成功' + (ng.length ? '\n失敗: ' + ng.join(', ') : ''));
}
