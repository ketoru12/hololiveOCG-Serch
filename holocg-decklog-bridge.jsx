import { useState, useEffect, useMemo } from "react";

// ── 公式サイト用 STEP1 ブックマークレット ─────────────────────────────────────
// hololive-official-cardgame.com/cardlist/ 系ページで動作
// img src から card番号を抽出し、oshi/main/yell カートを管理して JSON エクスポート
const BOOKMARKLET_OFFICIAL = `javascript:(function(){
'use strict';
if(document.getElementById('__hc_ui__')){alert('カートはすでに表示されています');return;}
var YELL_IDS=['hY01-001','hY02-001','hY03-001','hY04-001','hY05-001','hY06-001'];
var MAX_M=50,MAX_P=4,MAX_Y=20;
var deck={o:null,m:{},y:{}};
var sp=new URLSearchParams(location.search);
var ck=sp.get('card_kind[]')||sp.get('card_kind[0]')||'';
var defType=ck==='推しホロメン'?'oshi':'main';
function mTotal(){return Object.values(deck.m).reduce(function(s,c){return s+c.qty;},0);}
function yTotal(){return Object.values(deck.y).reduce(function(s,c){return s+c.qty;},0);}
function flash(msg,col){
  var f=document.createElement('div');f.textContent=msg;
  f.style.cssText='position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;background:'+col+';color:white;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:bold;pointer-events:none;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.4);';
  document.body.appendChild(f);setTimeout(function(){f.remove();},1500);
}
function addCard(id,name,img){
  if(YELL_IDS.indexOf(id)>=0){
    if(yTotal()>=MAX_Y){flash('エールが満杯 ('+MAX_Y+'枚)','#ef4444');return;}
    if(!deck.y[id])deck.y[id]={name:name,img:img,qty:0};
    deck.y[id].qty++;
    flash('エール追加: '+name+' ('+yTotal()+'/'+MAX_Y+')','#f59e0b');
  } else if(defType==='oshi'){
    var prev=deck.o?deck.o.name:null;
    deck.o={id:id,name:name,img:img};
    flash('推し: '+name+(prev?' ← '+prev:''),'#10b981');
  } else {
    if(mTotal()>=MAX_M){flash('メインが満杯 ('+MAX_M+'枚)','#ef4444');return;}
    if(deck.m[id]&&deck.m[id].qty>=MAX_P){flash(name+' は最大'+MAX_P+'枚','#f59e0b');return;}
    if(!deck.m[id])deck.m[id]={name:name,img:img,qty:0};
    deck.m[id].qty++;
    flash('追加: '+name+' ('+mTotal()+'/'+MAX_M+')','#22c55e');
  }
  renderUI();updateBadges();
}
var ui=null;
function renderUI(){
  if(!ui)return;
  var mt=mTotal(),yt=yTotal();
  ui.innerHTML='';
  var h=document.createElement('div');
  h.style.cssText='padding:10px 14px;background:#5e5a9b;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
  h.innerHTML='<span style="color:white;font-weight:bold;font-size:13px;">\\uD83C\\uDCCF デッキカート</span><div style="display:flex;gap:6px;"><button id="__hc_copy__" style="background:#22c55e;color:white;border:none;border-radius:6px;padding:3px 9px;font-size:11px;font-weight:bold;cursor:pointer;">\\uD83D\\uDCCB コピー</button><button id="__hc_clear__" style="background:#ef4444;color:white;border:none;border-radius:6px;padding:3px 7px;font-size:11px;cursor:pointer;">\\uD83D\\uDDD1\\uFE0F</button><button id="__hc_cls__" style="background:rgba(255,255,255,.15);color:white;border:none;border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;">\\u2715</button></div>';
  ui.appendChild(h);
  var sb=document.createElement('div');
  sb.style.cssText='padding:5px 12px;background:rgba(255,255,255,.05);font-size:10px;color:#94a3b8;flex-shrink:0;display:flex;gap:10px;flex-wrap:wrap;';
  sb.innerHTML='<span>推し:<b style="color:'+(deck.o?'#86efac':'#64748b')+'">'+(deck.o?deck.o.name:'未選択')+'</b></span><span>メイン:<b style="color:'+(mt>=MAX_M?'#fbbf24':'#93c5fd')+'">'+mt+'/'+MAX_M+'</b></span><span>エール:<b style="color:#fbbf24">'+yt+'/'+MAX_Y+'</b></span>';
  ui.appendChild(sb);
  var list=document.createElement('div');
  list.style.cssText='overflow-y:auto;flex:1;padding:6px;';
  var hasAny=deck.o||Object.keys(deck.m).length||Object.keys(deck.y).length;
  if(!hasAny){list.innerHTML='<div style="color:#64748b;text-align:center;padding:16px;font-size:12px;">カード画像の\\u300c+\\u300dをクリックして追加</div>';}
  function row(id,c,col,extra){return '<div style="display:flex;align-items:center;gap:6px;padding:4px 2px;border-bottom:1px solid rgba(255,255,255,.05);"><img src="'+c.img+'" style="width:22px;height:31px;object-fit:cover;border-radius:3px;"><div style="flex:1;min-width:0"><div style="color:#e2e8f0;font-size:10px;font-weight:bold;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+c.name+'</div><div style="color:#475569;font-size:9px;">'+id+'</div></div>'+extra+'</div>';}
  function ctrl(id,t,qty,atMax){return '<div style="display:flex;align-items:center;gap:2px;"><button onclick="window.__hcD(\''+id+'\',\''+t+'\')" style="background:#374151;color:white;border:none;border-radius:3px;width:17px;height:17px;cursor:pointer;font-size:11px;line-height:1;">\\u2212</button><span style="color:'+(atMax?'#fbbf24':'white')+';font-weight:bold;font-size:11px;min-width:14px;text-align:center;">'+qty+'</span><button onclick="window.__hcI(\''+id+'\',\''+t+'\')" style="background:#374151;color:white;border:none;border-radius:3px;width:17px;height:17px;cursor:pointer;font-size:11px;line-height:1;">+</button></div>';}
  if(deck.o){list.innerHTML+='<div style="font-size:9px;color:#10b981;font-weight:bold;margin:3px 2px 2px;">推しホロメン</div>'+row(deck.o.id,deck.o,'#10b981','<button onclick="window.__hcRO()" style="background:#374151;color:#94a3b8;border:none;border-radius:3px;padding:1px 5px;cursor:pointer;font-size:9px;">外す</button>');}
  var mkeys=Object.keys(deck.m);
  if(mkeys.length){list.innerHTML+='<div style="font-size:9px;color:#93c5fd;font-weight:bold;margin:5px 2px 2px;">メインデッキ ('+mt+'/'+MAX_M+')</div>';mkeys.forEach(function(id){list.innerHTML+=row(id,deck.m[id],'#5e5a9b',ctrl(id,'m',deck.m[id].qty,deck.m[id].qty>=MAX_P));});}
  var ykeys=Object.keys(deck.y);
  if(ykeys.length){list.innerHTML+='<div style="font-size:9px;color:#fbbf24;font-weight:bold;margin:5px 2px 2px;">エールデッキ ('+yt+'/'+MAX_Y+')</div>';ykeys.forEach(function(id){list.innerHTML+=row(id,deck.y[id],'#f59e0b',ctrl(id,'y',deck.y[id].qty,false));});}
  ui.appendChild(list);
  document.getElementById('__hc_copy__').onclick=function(){
    var json=JSON.stringify({oshi:deck.o?{id:deck.o.id,count:1}:null,main:Object.keys(deck.m).map(function(id){return{id:id,count:deck.m[id].qty};}),yell:Object.keys(deck.y).map(function(id){return{id:id,count:deck.y[id].qty};})});
    navigator.clipboard.writeText(json).then(function(){alert('\\u2705 コピーしました！\\nDECKLOGでSTEP2のブックマークレットを実行してください。');});
  };
  document.getElementById('__hc_clear__').onclick=function(){if(confirm('デッキをリセットしますか？')){deck={o:null,m:{},y:{}};renderUI();updateBadges();}};
  document.getElementById('__hc_cls__').onclick=function(){ui.remove();ui=null;document.querySelectorAll('.__hc_ov__').forEach(function(el){el.remove();});};
}
window.__hcRO=function(){deck.o=null;renderUI();updateBadges();};
window.__hcD=function(id,t){var d=t==='y'?deck.y:deck.m;if(!d[id])return;d[id].qty--;if(d[id].qty<=0)delete d[id];renderUI();updateBadges();};
window.__hcI=function(id,t){if(t==='y'){if(yTotal()>=MAX_Y){flash('エールが満杯','#ef4444');return;}if(deck.y[id])deck.y[id].qty++;}else{if(mTotal()>=MAX_M){flash('メインが満杯','#ef4444');return;}if(deck.m[id]&&deck.m[id].qty>=MAX_P){flash('最大'+MAX_P+'枚','#f59e0b');return;}if(deck.m[id])deck.m[id].qty++;}renderUI();};
function extractId(src){var m=src.match(/\\/([^\\/]+?)(?:_[A-Za-z]+)?\\.png/);return m?m[1]:null;}
function patchCards(){
  document.querySelectorAll('img[src*="/wp-content/images/cardlist/"]').forEach(function(img){
    if(img.dataset.hcPatched)return;
    img.dataset.hcPatched='1';
    var id=extractId(img.src);if(!id)return;
    var name=img.alt||id;
    var par=img.parentElement;if(!par)return;
    var pos=getComputedStyle(par).position;
    if(pos==='static')par.style.position='relative';
    var ov=document.createElement('div');
    ov.className='__hc_ov__';
    ov.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;cursor:pointer;border-radius:4px;pointer-events:none;';
    var btn=document.createElement('button');
    btn.textContent='+';
    btn.style.cssText='background:#5e5a9b;color:white;border:2px solid white;border-radius:50%;width:38px;height:38px;font-size:22px;font-weight:bold;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.6);pointer-events:auto;';
    btn.onclick=function(e){e.preventDefault();e.stopPropagation();addCard(id,name,img.src);};
    ov.appendChild(btn);par.appendChild(ov);
    par.addEventListener('mouseenter',function(){ov.style.opacity='1';ov.style.background='rgba(0,0,0,.4)';ov.style.pointerEvents='auto';});
    par.addEventListener('mouseleave',function(){ov.style.opacity='0';ov.style.background='';ov.style.pointerEvents='none';});
  });
}
function updateBadges(){
  document.querySelectorAll('img[data-hc-patched]').forEach(function(img){
    var id=extractId(img.src);if(!id)return;
    var par=img.parentElement;if(!par)return;
    var bdg=par.querySelector('.__hc_bdg__');
    var qty=deck.m[id]?deck.m[id].qty:deck.y[id]?deck.y[id].qty:0;
    var isO=deck.o&&deck.o.id===id;
    if(qty>0||isO){
      if(!bdg){bdg=document.createElement('div');bdg.className='__hc_bdg__';bdg.style.cssText='position:absolute;bottom:0;left:0;right:0;text-align:center;font-size:10px;font-weight:bold;color:white;padding:2px 0;border-radius:0 0 4px 4px;pointer-events:none;z-index:3;';par.appendChild(bdg);}
      bdg.style.background=isO?'rgba(16,185,129,.9)':YELL_IDS.indexOf(id)>=0?'rgba(245,158,11,.9)':'rgba(94,90,155,.9)';
      bdg.textContent=isO?'\\u63A8\\u3057\\u2B50':qty+'\\u679A';
      bdg.style.display='block';
    }else if(bdg){bdg.style.display='none';}
  });
}
new MutationObserver(function(){patchCards();updateBadges();}).observe(document.body,{childList:true,subtree:true});
ui=document.createElement('div');ui.id='__hc_ui__';
ui.style.cssText='position:fixed;bottom:20px;right:20px;z-index:9999;width:290px;max-height:65vh;display:flex;flex-direction:column;background:#1e1b4b;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.6);font-family:sans-serif;overflow:hidden;';
document.body.appendChild(ui);renderUI();patchCards();
flash('\\u2705 カートを起動しました！カード画像にカーソルを合わせると + ボタンが表示されます。','#5e5a9b');
})();`;

// ── エールカード（固定6種） ───────────────────────────────────────────────────
const YELL_CARDS = [
  { id: 'hY01-001', name: 'エール（白）', img: './image/cheer/hY01-001_C.png', color: '白', cardType: 'エール' },
  { id: 'hY02-001', name: 'エール（緑）', img: './image/cheer/hY02-001_C.png', color: '緑', cardType: 'エール' },
  { id: 'hY03-001', name: 'エール（赤）', img: './image/cheer/hY03-001_C.png', color: '赤', cardType: 'エール' },
  { id: 'hY04-001', name: 'エール（青）', img: './image/cheer/hY04-001_C.png', color: '青', cardType: 'エール' },
  { id: 'hY05-001', name: 'エール（紫）', img: './image/cheer/hY05-001_C.png', color: '紫', cardType: 'エール' },
  { id: 'hY06-001', name: 'エール（黄）', img: './image/cheer/hY06-001_C.png', color: '黄', cardType: 'エール' },
];
const YELL_IDS = new Set(YELL_CARDS.map(c => c.id));

// ── デッキルール ─────────────────────────────────────────────────────────────
const MAX_MAIN  = 50;
const MAX_PER   = 4;
const MAX_YELL  = 20;

// ── STEP2 ブックマークレット（oshi / main / yell 対応） ──────────────────────
const BOOKMARKLET_STEP2 = `javascript:(function(){
var raw=prompt('カートの「📋コピー」でコピーしたJSONを貼り付けてください:');
if(!raw)return;
var d;try{d=JSON.parse(raw);}catch(e){alert('JSON解析エラー: '+e.message);return;}
var delay=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
var selTab=async function(label){
  var lbl=Array.from(document.querySelectorAll('label')).find(function(l){return l.textContent.trim().indexOf(label)>-1;});
  if(lbl){var inp=lbl.querySelector('input[type=radio]');if(!inp&&lbl.htmlFor)inp=document.getElementById(lbl.htmlFor);if(inp){inp.click();inp.dispatchEvent(new Event('change',{bubbles:true}));await delay(700);return true;}}return false;
};
var tryAdd=async function(no,cnt){
  var t=Array.from(document.querySelectorAll('button,span')).find(function(b){var tx=b.textContent.trim();return tx==='カード番号'||tx==='No.';});
  if(t){t.click();await delay(400);}
  var inp=Array.from(document.querySelectorAll('input')).find(function(i){var p=i.placeholder||'';return p.indexOf('番号')>-1||p.indexOf('キーワード')>-1;});
  if(!inp)return false;
  inp.focus();Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(inp,no);
  ['input','change','keyup'].forEach(function(ev){inp.dispatchEvent(new Event(ev,{bubbles:true}));});
  await delay(1500);
  var el=document.querySelector('.card-item');if(!el)return false;
  var inc=el.querySelector('.card-inc');if(!inc)return false;
  for(var i=0;i<cnt;i++){inc.click();await delay(350);}return true;
};
(async function(){
  var oshi=d.oshi,main=d.main||[],yell=d.yell||[];
  var total=(oshi?1:0)+main.reduce(function(s,c){return s+(c.count||1);},0)+yell.reduce(function(s,c){return s+(c.count||1);},0);
  var kinds=(oshi?1:0)+main.length+yell.length;
  if(!confirm(kinds+'種類 計'+total+'枚を追加します。DECKLOGのデッキ作成画面であることを確認してOKを押してください。'))return;
  var stdBtn=Array.from(document.querySelectorAll('button')).find(function(b){return b.textContent.trim()==='スタンダード';});
  if(stdBtn){stdBtn.click();await delay(1500);}
  for(var w=0;w<20;w++){if(Array.from(document.querySelectorAll('label')).find(function(l){return l.textContent.trim().indexOf('メインデッキ')>-1;}))break;await delay(500);}
  var ok=0,ng=[];
  if(oshi){await selTab('推しホロメン');var s0=await tryAdd(oshi.id,1);if(s0)ok++;else ng.push(oshi.id+'(推し)');await delay(400);}
  if(main.length)await selTab('メインデッキ');
  for(var i=0;i<main.length;i++){var c=main[i];if(!c.id)continue;var s=await tryAdd(c.id,c.count||1);if(s)ok++;else ng.push(c.id);await delay(300);}
  if(yell.length)await selTab('エールデッキ');
  for(var i=0;i<yell.length;i++){var c=yell[i];if(!c.id)continue;var s=await tryAdd(c.id,c.count||1);if(s)ok++;else ng.push(c.id);await delay(300);}
  var res='✅ 完了: '+ok+'件成功';if(ng.length)res+='\\n⚠️ 失敗: '+ng.join(', ');alert(res);
})();
})();`;

// ── CSV パーサー（クォート内の改行・カンマ対応） ──────────────────────────────
function parseCSV(text) {
  const rows = [];
  let headers = null, row = [], field = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuote = false; }
      else { field += ch; }
    } else {
      if      (ch === '"')  { inQuote = true; }
      else if (ch === ',')  { row.push(field); field = ''; }
      else if (ch === '\n') {
        row.push(field); field = '';
        if (!headers) { headers = row.map(h => h.trim()); }
        else if (row.some(v => v)) {
          const obj = {};
          headers.forEach((h, j) => { obj[h] = (row[j] || '').trim(); });
          rows.push(obj);
        }
        row = [];
      } else if (ch !== '\r') { field += ch; }
    }
  }
  if (row.length || field) {
    row.push(field);
    if (headers && row.some(v => v)) {
      const obj = {};
      headers.forEach((h, j) => { obj[h] = (row[j] || '').trim(); });
      rows.push(obj);
    }
  }
  return rows;
}

function loadAllCards() {
  return Promise.all([
    fetch('./hololive_oshi.csv').then(r => r.text()),
    fetch('./hololive_cards.csv').then(r => r.text()),
    fetch('./hololive_support.csv').then(r => r.text()),
  ]).then(([oshiText, holoText, suppText]) => {
    const seen = new Set();
    const cards = [...YELL_CARDS]; // エールカードを先頭に
    YELL_CARDS.forEach(c => seen.add(c.id));

    for (const r of parseCSV(oshiText)) {
      if (!r.number || seen.has(r.number)) continue;
      seen.add(r.number);
      cards.push({ id: r.number, name: r.name, img: r.img, cardType: '推しホロメン', color: r.color, kind: '' });
    }
    for (const r of parseCSV(holoText)) {
      if (!r.number || seen.has(r.number)) continue;
      seen.add(r.number);
      cards.push({
        id: r.number, name: r.name, img: r.img,
        cardType: r.cardType && r.cardType.includes('Buzz') ? 'Buzzホロメン' : 'ホロメン',
        color: r.color, kind: r.bloom,
      });
    }
    for (const r of parseCSV(suppText)) {
      if (!r.number || seen.has(r.number)) continue;
      seen.add(r.number);
      cards.push({ id: r.number, name: r.name, img: r.img, cardType: 'サポート', color: '', kind: r.cardType2 });
    }
    return cards;
  });
}

// ── 定数 ────────────────────────────────────────────────────────────────────
const TYPE_LIST  = ['すべて', 'エール', '推しホロメン', 'ホロメン', 'Buzzホロメン', 'サポート'];
const COLOR_LIST = ['白', '赤', '青', '緑', '黄', '紫'];
const COLOR_BG   = { 白: '#e2e8f0', 赤: '#fca5a5', 青: '#93c5fd', 緑: '#86efac', 黄: '#fde68a', 紫: '#c4b5fd' };
const PAGE = 48;

// ── サブコンポーネント ────────────────────────────────────────────────────────
function CopyBtn({ text, label, color }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 2000); })}
      style={{
        padding: "11px 20px", borderRadius: 9, border: "none",
        background: ok ? "#22c55e" : color, color: "#fff",
        fontWeight: 800, fontSize: 13, cursor: "pointer",
        transition: "background 0.2s", display: "flex", alignItems: "center", gap: 8,
      }}
    >
      {ok ? "✅ コピーしました！" : `📋 ${label}`}
    </button>
  );
}

// ── メインアプリ ──────────────────────────────────────────────────────────────
export default function App() {
  const [allCards,   setAllCards]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState(false);
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('すべて');
  const [colorFilter,setColorFilter]= useState('');
  const [showAll,    setShowAll]    = useState(false);

  // デッキ状態
  const [oshi,      setOshi]      = useState(null);          // { id, name, img }
  const [mainCart,  setMainCart]  = useState({});            // { id: { name, img, qty } }
  const [yellCart,  setYellCart]  = useState({});            // { id: { name, img, qty } }
  const [cartOpen,  setCartOpen]  = useState(false);
  const [flash,     setFlash]     = useState(null);

  useEffect(() => {
    loadAllCards()
      .then(cards => { setAllCards(cards); setLoading(false); })
      .catch(() => { setLoadError(true); setLoading(false); });
  }, []);

  const showFlash = (msg, color = '#22c55e') => {
    setFlash({ msg, color });
    setTimeout(() => setFlash(null), 1500);
  };

  // ── カード追加ロジック ─────────────────────────────────────────────────────
  const addCard = (card) => {
    // 推しホロメン
    if (card.cardType === '推しホロメン') {
      if (oshi?.id === card.id) { showFlash(card.name + 'はすでに選択中', '#f59e0b'); return; }
      const prev = oshi?.name;
      setOshi({ id: card.id, name: card.name, img: card.img });
      showFlash('推しに' + card.name + 'をセット' + (prev ? ` (${prev}から入替え)` : ''), '#10b981');
      return;
    }
    // エールデッキ
    if (YELL_IDS.has(card.id)) {
      const yellTotal = Object.values(yellCart).reduce((s, c) => s + c.qty, 0);
      if (yellTotal >= MAX_YELL) { showFlash('エールデッキは最大' + MAX_YELL + '枚まで', '#ef4444'); return; }
      setYellCart(prev => ({
        ...prev,
        [card.id]: prev[card.id] ? { ...prev[card.id], qty: prev[card.id].qty + 1 } : { ...card, qty: 1 },
      }));
      showFlash('追加: ' + card.name + ' (エール ' + (yellTotal + 1) + '/' + MAX_YELL + '枚)', '#f59e0b');
      return;
    }
    // メインデッキ
    const mainTotal = Object.values(mainCart).reduce((s, c) => s + c.qty, 0);
    if (mainTotal >= MAX_MAIN) { showFlash('メインデッキが満杯です（' + MAX_MAIN + '枚）', '#ef4444'); return; }
    if (mainCart[card.id]?.qty >= MAX_PER) { showFlash(card.name + 'は最大' + MAX_PER + '枚まで', '#ef4444'); return; }
    setMainCart(prev => ({
      ...prev,
      [card.id]: prev[card.id] ? { ...prev[card.id], qty: prev[card.id].qty + 1 } : { ...card, qty: 1 },
    }));
    showFlash('追加: ' + card.name + ' (' + (mainTotal + 1) + '/' + MAX_MAIN + '枚)', '#22c55e');
  };

  const changeMainQty = (id, delta) => {
    setMainCart(prev => {
      const next = { ...prev };
      if (!next[id]) return next;
      if (delta > 0) {
        const total = Object.values(next).reduce((s, c) => s + c.qty, 0);
        if (next[id].qty >= MAX_PER || total >= MAX_MAIN) return next;
      }
      next[id] = { ...next[id], qty: next[id].qty + delta };
      if (next[id].qty <= 0) delete next[id];
      return next;
    });
  };

  const changeYellQty = (id, delta) => {
    setYellCart(prev => {
      const next = { ...prev };
      if (!next[id]) return next;
      if (delta > 0) {
        const total = Object.values(next).reduce((s, c) => s + c.qty, 0);
        if (total >= MAX_YELL) return next;
      }
      next[id] = { ...next[id], qty: next[id].qty + delta };
      if (next[id].qty <= 0) delete next[id];
      return next;
    });
  };

  const clearAll = () => {
    if (!confirm('デッキをすべてクリアしますか？')) return;
    setOshi(null); setMainCart({}); setYellCart({});
  };

  // ── 集計 ──────────────────────────────────────────────────────────────────
  const mainEntries = Object.entries(mainCart);
  const yellEntries = Object.entries(yellCart);
  const mainTotal   = mainEntries.reduce((s, [, c]) => s + c.qty, 0);
  const yellTotal   = yellEntries.reduce((s, [, c]) => s + c.qty, 0);
  const hasCart     = !!oshi || mainEntries.length > 0 || yellEntries.length > 0;

  const deckJson = JSON.stringify({
    oshi: oshi ? { id: oshi.id, count: 1 } : null,
    main: mainEntries.map(([id, c]) => ({ id, count: c.qty })),
    yell: yellEntries.map(([id, c]) => ({ id, count: c.qty })),
  });

  const copyCart = () => {
    if (!hasCart) { alert('カートが空です'); return; }
    navigator.clipboard.writeText(deckJson).then(() =>
      alert(`✅ コピーしました！\nDECKLOGでSTEP2のブックマークレットを実行してください。`)
    );
  };

  // ── フィルタリング ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allCards.filter(c => {
      if (typeFilter !== 'すべて' && c.cardType !== typeFilter) return false;
      if (colorFilter && c.color !== colorFilter) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allCards, search, typeFilter, colorFilter]);

  const displayed = showAll ? filtered : filtered.slice(0, PAGE);

  // ── スタイルヘルパー ──────────────────────────────────────────────────────
  const chip = (active, bg = '#5e5a9b') => ({
    padding: "4px 12px", borderRadius: 999, border: "none", cursor: "pointer",
    fontSize: 12, fontWeight: 700, transition: "all 0.15s",
    background: active ? bg : "rgba(255,255,255,0.1)",
    color: active ? "#fff" : "#94a3b8",
  });

  // カードのバッジ表示
  const badge = (card) => {
    if (card.cardType === '推しホロメン') return oshi?.id === card.id ? '推し⭐' : null;
    if (YELL_IDS.has(card.id)) return yellCart[card.id] ? yellCart[card.id].qty + 'エール' : null;
    return mainCart[card.id] ? mainCart[card.id].qty + '枚' : null;
  };
  const badgeColor = (card) => {
    if (card.cardType === '推しホロメン') return '#10b981';
    if (YELL_IDS.has(card.id)) return '#f59e0b';
    const qty = mainCart[card.id]?.qty;
    return qty >= MAX_PER ? '#f59e0b' : '#5e5a9b';
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#0f0c29,#1a1040,#0f0c29)",
      color: "#e2e8f0",
      fontFamily: "'Hiragino Sans','Segoe UI',sans-serif",
      paddingBottom: hasCart ? 150 : 52,
    }}>
      {/* ── フラッシュ通知 ── */}
      {flash && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 99999, background: flash.color, color: "white",
          padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 800,
          pointerEvents: "none", whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}>{flash.msg}</div>
      )}

      {/* ── ヘッダー ── */}
      <div style={{ textAlign: "center", padding: "36px 16px 28px" }}>
        <div style={{
          display: "inline-block", background: "rgba(94,90,155,0.3)",
          border: "1px solid rgba(94,90,155,0.5)", borderRadius: 999,
          padding: "3px 18px", fontSize: 10, letterSpacing: 4,
          color: "#a78bfa", marginBottom: 14, textTransform: "uppercase",
        }}>hololive OFFICIAL CARD GAME</div>
        <h1 style={{
          fontSize: "clamp(20px,5vw,34px)", fontWeight: 900, margin: "0 0 8px",
          background: "linear-gradient(90deg,#a78bfa,#fff 50%,#fb923c)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.3,
        }}>holocg-viewer → DECKLOG<br />デッキ登録ブリッジ</h1>
        <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
          このページ or 公式サイトでカードを選んでデッキを組み → JSONコピー → DECKLOGへ自動入力
        </p>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px" }}>

        {/* ── STEP1: カードピッカー ── */}
        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(94,90,155,0.4)",
          borderRadius: 18, overflow: "hidden", marginBottom: 22,
        }}>
          <div style={{
            background: "linear-gradient(90deg,rgba(94,90,155,0.3),transparent)",
            borderBottom: "1px solid rgba(94,90,155,0.3)",
            padding: "14px 22px", display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12, background: "#5e5a9b",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0,
            }}>🃏</div>
            <div>
              <div style={{ fontSize: 10, color: "#a78bfa", letterSpacing: 3, textTransform: "uppercase", marginBottom: 1 }}>STEP 01</div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>カードを選ぶ</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                推しホロメン: 1枚　メインデッキ: {mainTotal}/{MAX_MAIN}枚　エールデッキ: {yellTotal}/{MAX_YELL}枚
              </div>
            </div>
          </div>
          <div style={{ padding: "18px 20px" }}>
            {/* 検索 */}
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setShowAll(false); }}
              placeholder="カード名・番号で検索…"
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.07)", color: "#e2e8f0",
                fontSize: 14, marginBottom: 12, outline: "none", boxSizing: "border-box",
              }}
            />

            {/* タイプフィルター */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {TYPE_LIST.map(t => (
                <button key={t} onClick={() => { setTypeFilter(t); setShowAll(false); }} style={chip(typeFilter === t)}>
                  {t}
                </button>
              ))}
            </div>

            {/* カラーフィルター */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              <button onClick={() => { setColorFilter(''); setShowAll(false); }} style={chip(colorFilter === '')}>全色</button>
              {COLOR_LIST.map(col => (
                <button key={col} onClick={() => { setColorFilter(colorFilter === col ? '' : col); setShowAll(false); }}
                  style={{
                    ...chip(colorFilter === col, '#374151'),
                    background: colorFilter === col ? COLOR_BG[col] : "rgba(255,255,255,0.08)",
                    color: colorFilter === col ? '#1e1b4b' : '#94a3b8',
                  }}>
                  {col}
                </button>
              ))}
            </div>

            {/* カードグリッド */}
            {loading ? (
              <div style={{ color: "#64748b", textAlign: "center", padding: 48, fontSize: 14 }}>カードデータを読み込み中…</div>
            ) : loadError ? (
              <div style={{ color: "#f87171", textAlign: "center", padding: 48, fontSize: 13 }}>
                CSVの読み込みに失敗しました。同じドメインから配信されているか確認してください。
              </div>
            ) : (
              <>
                <div style={{ color: "#475569", fontSize: 11, marginBottom: 10 }}>
                  {filtered.length.toLocaleString()}件
                  {filtered.length > displayed.length && `（${displayed.length}件表示）`}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(88px,1fr))", gap: 8 }}>
                  {displayed.map(card => {
                    const bdg = badge(card);
                    const bdgColor = badgeColor(card);
                    const isSelected = card.cardType === '推しホロメン' && oshi?.id === card.id;
                    return (
                      <div
                        key={card.id}
                        onClick={() => addCard(card)}
                        style={{
                          cursor: "pointer", borderRadius: 8, overflow: "hidden",
                          background: isSelected ? "rgba(16,185,129,0.2)" : bdg ? "rgba(94,90,155,0.2)" : "rgba(255,255,255,0.05)",
                          border: isSelected ? "1px solid #10b981" : bdg ? "1px solid #5e5a9b" : "1px solid rgba(255,255,255,0.08)",
                          transition: "transform 0.12s", position: "relative",
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                      >
                        <img src={card.img} alt={card.name} loading="lazy"
                          style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} />
                        {bdg && (
                          <div style={{
                            position: "absolute", top: 3, right: 3,
                            background: bdgColor, color: "white", borderRadius: 999,
                            padding: "1px 5px", fontSize: 9, fontWeight: 800,
                          }}>{bdg}</div>
                        )}
                        <div style={{ padding: "4px 5px 6px" }}>
                          <div style={{
                            fontSize: 10, color: "#e2e8f0", fontWeight: 700, lineHeight: 1.3,
                            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                          }}>{card.name}</div>
                          <div style={{ fontSize: 9, color: "#475569", marginTop: 2 }}>{card.id}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!showAll && filtered.length > PAGE && (
                  <div style={{ textAlign: "center", marginTop: 16 }}>
                    <button onClick={() => setShowAll(true)} style={{
                      padding: "8px 22px", borderRadius: 8, border: "none",
                      background: "rgba(255,255,255,0.1)", color: "#94a3b8",
                      cursor: "pointer", fontSize: 12, fontWeight: 700,
                    }}>
                      もっと見る（残り {filtered.length - PAGE} 件）
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── 公式サイト用ブックマークレット ── */}
        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(99,102,241,0.4)",
          borderRadius: 18, overflow: "hidden", marginBottom: 22,
        }}>
          <div style={{
            background: "linear-gradient(90deg,rgba(99,102,241,0.25),transparent)",
            borderBottom: "1px solid rgba(99,102,241,0.3)",
            padding: "14px 22px", display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12, background: "#6366f1",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0,
            }}>🌐</div>
            <div>
              <div style={{ fontSize: 10, color: "#818cf8", letterSpacing: 3, textTransform: "uppercase", marginBottom: 1 }}>ALTERNATIVE STEP 01</div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>公式サイトで選ぶ</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>hololive-official-cardgame.com/cardlist/</div>
            </div>
          </div>
          <div style={{ padding: "16px 22px" }}>
            <p style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.8, margin: "0 0 14px" }}>
              公式サイトのカード一覧ページにカートUIを注入するブックマークレットです。<br />
              カード画像にカーソルを合わせると <b style={{ color: "#e2e8f0" }}>「＋」ボタン</b> が表示されます。
            </p>
            <div style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12, padding: "12px 16px", marginBottom: 14, fontSize: 12, color: "#94a3b8",
            }}>
              <div style={{ fontWeight: 700, color: "#818cf8", marginBottom: 8 }}>📌 使い方</div>
              <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 2.1 }}>
                <li>「コピー」ボタンでコードをコピーしてブックマーク登録</li>
                <li><b style={{ color: "#e2e8f0" }}>公式サイトのカード検索ページ</b>を開く</li>
                <li>ブックマークをクリック → カートUIが起動</li>
                <li>カード画像にカーソルを合わせて「＋」で追加</li>
                <li>「📋 コピー」でJSONをコピー → STEP2へ</li>
              </ol>
              <div style={{ marginTop: 10, padding: "6px 10px", background: "rgba(99,102,241,0.1)", borderRadius: 8, fontSize: 11 }}>
                💡 <b style={{ color: "#e2e8f0" }}>推しホロメン</b>検索中は自動的に推し枠に、<b style={{ color: "#e2e8f0" }}>hY0X-001</b> はエールデッキに割り当てられます
              </div>
            </div>
            <CopyBtn text={BOOKMARKLET_OFFICIAL} label="公式サイト用ブックマークレットをコピー" color="#6366f1" />
          </div>
        </div>

        {/* ── STEP2: DECKLOGブックマークレット ── */}
        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid #ea580c55",
          borderRadius: 18, overflow: "hidden", marginBottom: 22,
        }}>
          <div style={{
            background: "linear-gradient(90deg,#ea580c28,transparent)",
            borderBottom: "1px solid #ea580c30",
            padding: "14px 22px", display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12, background: "#ea580c",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0,
            }}>⚡</div>
            <div>
              <div style={{ fontSize: 10, color: "#ea580c", letterSpacing: 3, textTransform: "uppercase", marginBottom: 1 }}>STEP 02</div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>DECKLOG へ自動入力</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>decklog.bushiroad.com/create?c=9</div>
            </div>
          </div>
          <div style={{ padding: "16px 22px" }}>
            <div style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12, padding: "12px 16px", marginBottom: 14, fontSize: 12, color: "#94a3b8",
            }}>
              <div style={{ fontWeight: 700, color: "#a78bfa", marginBottom: 8 }}>📌 ブックマークレットの登録方法</div>
              <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 2.1 }}>
                <li>下の「コピー」ボタンでコードをコピー</li>
                <li>ブックマークバーを右クリック → 「ページを追加」</li>
                <li>名前を入力し、<b style={{ color: "#e2e8f0" }}>URL 欄</b>にコードを貼り付けて保存</li>
              </ol>
            </div>
            <ol style={{ margin: "0 0 16px", paddingLeft: 18, color: "#94a3b8", fontSize: 13, lineHeight: 2 }}>
              <li>DECKLOGにログインし、デッキ作成ページを開く</li>
              <li>「スタンダード」を選んでカード選択画面まで進む</li>
              <li>このブックマークレットをクリック</li>
              <li>STEP1 のカートで「📋 コピー」した JSON を貼り付けて OK</li>
              <li>推し → メインデッキ → エールデッキ の順に自動で追加される（完了まで待つ）</li>
            </ol>
            <CopyBtn text={BOOKMARKLET_STEP2} label="ブックマークレットをコピー" color="#ea580c" />
          </div>
        </div>

        {/* ── 注意事項 ── */}
        <div style={{
          padding: "13px 20px", background: "rgba(234,88,12,0.07)",
          border: "1px solid rgba(234,88,12,0.2)", borderRadius: 12,
          fontSize: 12, color: "#94a3b8", lineHeight: 2,
        }}>
          <strong style={{ color: "#fb923c" }}>⚠️ 注意事項</strong><br />
          • DECKLOGへの<b style={{ color: "#e2e8f0" }}>ログインを事前に</b>済ませてください<br />
          • STEP2はカード選択UIが表示された状態（推しホロメン / メインデッキ / エールデッキタブが見える画面）で実行してください<br />
          • スマホでは自動入力非対応です（PCのChrome推奨）<br />
          • カードが見つからない場合はブラウザのコンソール（F12）で確認できます
        </div>
      </div>

      {/* ── カートパネル（固定フッター） ── */}
      {hasCart && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          background: "#1e1b4b", borderTop: "1px solid rgba(94,90,155,0.5)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.6)",
        }}>
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "10px 16px" }}>
            {/* ステータスバー */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontSize: 11, flexWrap: "wrap" }}>
              <span style={{ color: "#86efac", fontWeight: 700 }}>推し：</span>
              <span style={{ color: "#fde68a", fontWeight: 700, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {oshi ? oshi.name : '未選択'}
              </span>
              <span style={{ color: "#93c5fd", fontWeight: 700 }}>メイン：</span>
              <span style={{ color: mainTotal >= MAX_MAIN ? "#fbbf24" : "#86efac", fontWeight: 900 }}>{mainTotal}</span>
              <span style={{ color: "#94a3b8" }}>/{MAX_MAIN}</span>
              <span style={{ color: "#f59e0b", fontWeight: 700 }}>エール：</span>
              <span style={{ color: yellTotal >= MAX_YELL ? "#fbbf24" : "#f59e0b", fontWeight: 900 }}>{yellTotal}</span>
              <span style={{ color: "#94a3b8" }}>/{MAX_YELL}</span>
            </div>

            {/* ボタン行 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: cartOpen ? 10 : 0 }}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>🛒 デッキカート</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setCartOpen(v => !v)} style={{
                  background: "rgba(255,255,255,0.1)", color: "#e2e8f0",
                  border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11,
                }}>{cartOpen ? "▼ 閉じる" : "▲ 詳細"}</button>
                <button onClick={copyCart} style={{
                  background: "#22c55e", color: "white", border: "none",
                  borderRadius: 6, padding: "5px 14px", cursor: "pointer", fontSize: 12, fontWeight: 800,
                }}>📋 コピー</button>
                <button onClick={clearAll} style={{
                  background: "#ef4444", color: "white", border: "none",
                  borderRadius: 6, padding: "5px 9px", cursor: "pointer", fontSize: 11,
                }}>🗑️</button>
              </div>
            </div>

            {/* デッキ詳細リスト */}
            {cartOpen && (
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {/* 推しホロメン */}
                {oshi && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#10b981", borderBottom: "1px solid rgba(16,185,129,0.3)", paddingBottom: 3, marginBottom: 5 }}>
                      推しホロメン
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <img src={oshi.img} alt={oshi.name} style={{ width: 24, height: 34, objectFit: "cover", borderRadius: 3, border: "2px solid #10b981" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 700 }}>{oshi.name}</div>
                        <div style={{ fontSize: 9, color: "#475569" }}>{oshi.id}</div>
                      </div>
                      <button onClick={() => setOshi(null)} style={{ background: "#374151", color: "#94a3b8", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 11 }}>外す</button>
                    </div>
                  </div>
                )}
                {/* メインデッキ */}
                {mainEntries.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#93c5fd", borderBottom: "1px solid rgba(147,197,253,0.3)", paddingBottom: 3, marginBottom: 5 }}>
                      メインデッキ（{mainTotal}/{MAX_MAIN}枚）
                    </div>
                    {mainEntries.map(([id, c]) => (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <img src={c.img} alt={c.name} style={{ width: 24, height: 34, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                          <div style={{ fontSize: 9, color: "#475569" }}>{id}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          <button onClick={() => changeMainQty(id, -1)} style={{ background: "#374151", color: "white", border: "none", borderRadius: 4, width: 20, height: 20, cursor: "pointer", fontSize: 13 }}>−</button>
                          <span style={{ color: c.qty >= MAX_PER ? "#f59e0b" : "white", fontWeight: 800, fontSize: 12, minWidth: 16, textAlign: "center" }}>{c.qty}</span>
                          <button onClick={() => changeMainQty(id, 1)} style={{ background: "#374151", color: "white", border: "none", borderRadius: 4, width: 20, height: 20, cursor: "pointer", fontSize: 13 }}>＋</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* エールデッキ */}
                {yellEntries.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#fbbf24", borderBottom: "1px solid rgba(251,191,36,0.3)", paddingBottom: 3, marginBottom: 5 }}>
                      エールデッキ（{yellTotal}/{MAX_YELL}枚）
                    </div>
                    {yellEntries.map(([id, c]) => (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <img src={c.img} alt={c.name} style={{ width: 24, height: 34, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                          <div style={{ fontSize: 9, color: "#475569" }}>{id}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          <button onClick={() => changeYellQty(id, -1)} style={{ background: "#374151", color: "white", border: "none", borderRadius: 4, width: 20, height: 20, cursor: "pointer", fontSize: 13 }}>−</button>
                          <span style={{ color: "#f59e0b", fontWeight: 800, fontSize: 12, minWidth: 16, textAlign: "center" }}>{c.qty}</span>
                          <button onClick={() => changeYellQty(id, 1)} style={{ background: "#374151", color: "white", border: "none", borderRadius: 4, width: 20, height: 20, cursor: "pointer", fontSize: 13 }}>＋</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
