import { useState } from "react";

const BOOKMARKLET_STEP1 = `javascript:(function(){
if(document.getElementById('__holo_cart_ui__')){alert('カートはすでに表示されています');return;}
if(!window.allCards||!window.allCards.length){alert('allCards が見つかりません。ページを完全に読み込んでから実行してください。');return;}
var cart={};
var ui=document.createElement('div');
ui.id='__holo_cart_ui__';
ui.style.cssText='position:fixed;bottom:20px;right:20px;z-index:9999;width:300px;max-height:65vh;display:flex;flex-direction:column;background:#1e1b4b;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.6);font-family:sans-serif;overflow:hidden;';
ui.innerHTML='<div style="padding:10px 14px;background:#5e5a9b;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;"><span style="color:white;font-weight:bold;font-size:13px;">🛒 デッキカート <span id="__cart_count__" style="background:rgba(255,255,255,0.25);border-radius:999px;padding:1px 8px;font-size:10px;">0枚</span></span><div style="display:flex;gap:6px;"><button id="__cart_export__" style="background:#22c55e;color:white;border:none;border-radius:6px;padding:3px 9px;font-size:11px;cursor:pointer;font-weight:bold;">📋 コピー</button><button id="__cart_clear__" style="background:#ef4444;color:white;border:none;border-radius:6px;padding:3px 7px;font-size:11px;cursor:pointer;">🗑️</button><button onclick="document.getElementById(\'__holo_cart_ui__\').remove()" style="background:rgba(255,255,255,0.15);color:white;border:none;border-radius:6px;padding:3px 7px;font-size:11px;cursor:pointer;">✕</button></div></div><div id="__cart_list__" style="overflow-y:auto;flex:1;padding:6px;"></div><div style="padding:6px 12px;background:rgba(255,255,255,0.05);font-size:10px;color:#94a3b8;flex-shrink:0;">モーダルのカード番号をクリックして追加</div>';
document.body.appendChild(ui);
function renderCart(){
  var list=document.getElementById('__cart_list__');
  var total=0;
  var keys=Object.keys(cart);
  if(keys.length===0){list.innerHTML='<div style="color:#64748b;text-align:center;padding:16px;font-size:12px;">カードを追加してください</div>';document.getElementById('__cart_count__').textContent='0枚';return;}
  list.innerHTML=keys.map(function(id){
    var c=cart[id];total+=c.qty;
    return '<div style="display:flex;align-items:center;gap:7px;padding:5px 3px;border-bottom:1px solid rgba(255,255,255,0.05);"><img src="'+c.img+'" style="width:28px;height:39px;object-fit:cover;border-radius:3px;flex-shrink:0;"><div style="flex:1;min-width:0;"><div style="color:#e2e8f0;font-size:10px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+c.name+'</div><div style="color:#94a3b8;font-size:9px;">'+id+'</div></div><div style="display:flex;align-items:center;gap:3px;flex-shrink:0;"><button onclick="changeQty(\''+id+'\',- 1)" style="background:#374151;color:white;border:none;border-radius:4px;width:20px;height:20px;cursor:pointer;font-size:13px;">−</button><span style="color:white;font-weight:bold;font-size:12px;min-width:14px;text-align:center;">'+c.qty+'</span><button onclick="changeQty(\''+id+'\',1)" style="background:#374151;color:white;border:none;border-radius:4px;width:20px;height:20px;cursor:pointer;font-size:13px;">＋</button></div></div>';
  }).join('');
  document.getElementById('__cart_count__').textContent=total+'枚';
}
window.changeQty=function(id,delta){if(!cart[id])return;cart[id].qty=Math.max(0,cart[id].qty+delta);if(cart[id].qty===0)delete cart[id];renderCart();};
window.addToCart=function(cardId){
  var card=window.allCards.find(function(c){return c.id===cardId;});
  if(!card){alert('カードが見つかりません: '+cardId);return;}
  if(cart[cardId])cart[cardId].qty++;
  else{var img=(card.img||'').startsWith('/')?card.img.slice(1):card.img;cart[cardId]={name:card.name,img:img,qty:1};}
  renderCart();
  var flash=document.createElement('div');
  flash.textContent='✅ '+card.name+' を追加';
  flash.style.cssText='position:fixed;top:20px;right:20px;z-index:99999;background:#22c55e;color:white;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:bold;animation:__holofade__ 1.5s forwards;pointer-events:none;';
  if(!document.getElementById('__holo_flash_st__')){var st=document.createElement('style');st.id='__holo_flash_st__';st.textContent='@keyframes __holofade__{0%{opacity:1}70%{opacity:1}100%{opacity:0}}';document.head.appendChild(st);}
  document.body.appendChild(flash);setTimeout(function(){flash.remove();},1600);
};
document.getElementById('__cart_export__').onclick=function(){
  var keys=Object.keys(cart);if(keys.length===0){alert('カートが空です');return;}
  var data=keys.map(function(id){return{id:id,count:cart[id].qty};});
  var json=JSON.stringify(data);
  navigator.clipboard.writeText(json).then(function(){alert('✅ '+keys.length+'種類をコピーしました！\\nDECKLOGでSTEP2のブックマークレットを実行してください。');}).catch(function(){prompt('コピーしてください:',json);});
};
document.getElementById('__cart_clear__').onclick=function(){if(confirm('カートを空にしますか？')){cart={};renderCart();}};
var modalId=document.getElementById('modalId');
if(modalId&&!modalId.__holoPatch){
  modalId.__holoPatch=true;
  modalId.style.cssText+='cursor:pointer!important;background:#ede9fe!important;padding:2px 8px!important;border-radius:6px!important;color:#5e5a9b!important;';
  modalId.title='クリックしてカートに追加';
  modalId.addEventListener('click',function(){var id=modalId.innerText.trim();if(id)addToCart(id);});
  new MutationObserver(function(){modalId.style.cursor='pointer';}).observe(modalId,{childList:true,characterData:true,subtree:true});
}
renderCart();
alert('✅ カート追加完了！\\nカードをクリック→モーダルのカード番号（紫バッジ）をクリックで追加できます。');
})();`;

const BOOKMARKLET_STEP2 = `javascript:(function(){
var raw=prompt('STEP1でコピーしたJSONを貼り付けてください:');
if(!raw)return;
var cards;try{cards=JSON.parse(raw);}catch(e){alert('JSON解析エラー: '+e.message);return;}
if(!Array.isArray(cards)||cards.length===0){alert('データが空です');return;}
var delay=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
var tryAdd=async function(cardNo,count){
  var tabs=Array.from(document.querySelectorAll('button,span,[role="tab"]'));
  var numTab=tabs.find(function(t){var tx=t.textContent.trim();return tx==='カード番号'||tx==='No.';});
  if(numTab){numTab.click();await delay(400);}
  var input=document.querySelector('input[placeholder*="カード番号"],input[placeholder*="番号"],input[placeholder*="キーワード"],.search-box input,input[type="search"]');
  if(!input){console.warn('入力欄なし:'+cardNo);return false;}
  input.focus();
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,cardNo);
  ['input','change','keyup'].forEach(function(ev){input.dispatchEvent(new Event(ev,{bubbles:true}));});
  await delay(1500);
  var added=0;
  for(var i=0;i<count;i++){
    var card=document.querySelector('.card-item:first-child,.cardItem:first-child,[class*="card_item"]:first-child,[class*="CardItem"]:first-child,.card-list li:first-child,.cardList li:first-child,[data-no="'+cardNo+'"],[data-card-no="'+cardNo+'"]');
    if(!card){console.warn('DOM見つからず:'+cardNo);break;}
    card.click();added++;await delay(400);
  }
  return added>0;
};
(async function(){
  var total=cards.reduce(function(s,c){return s+(c.count||1);},0);
  if(!confirm(cards.length+'種類 計'+total+'枚を追加します。\nDECKLOGのデッキ作成画面で実行中であることを確認してOKを押してください。'))return;
  var ok=0,ng=[];
  for(var i=0;i<cards.length;i++){
    var c=cards[i];var id=c.id||'';var cnt=c.count||1;
    if(!id){ng.push('(不明)');continue;}
    console.log('['+(i+1)+'/'+cards.length+'] '+id+' x'+cnt);
    var s=await tryAdd(id,cnt);if(s)ok++;else ng.push(id);
    await delay(300);
  }
  var msg='✅ 完了！ 成功:'+ok+'種類';
  if(ng.length)msg+='\n⚠️ 見つからなかった('+ng.length+'種類):\n'+ng.join(', ');
  alert(msg);
})();
})();`;

function CopyBtn({ text, label, color }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => {
      navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 2000); });
    }} style={{
      padding: "11px 20px", borderRadius: 9, border: "none",
      background: ok ? "#22c55e" : color, color: "#fff",
      fontWeight: 800, fontSize: 13, cursor: "pointer",
      transition: "background 0.2s", display: "flex", alignItems: "center", gap: 8,
    }}>
      {ok ? "✅ コピーしました！" : `📋 ${label}`}
    </button>
  );
}

const STEPS = [
  {
    n: "01", emoji: "🛒", color: "#5e5a9b",
    title: "holocg-viewer にカート機能を追加",
    site: "ketoru12.github.io/holocg-viewer/",
    code: BOOKMARKLET_STEP1,
    steps: [
      "コードをコピーしてブラウザのブックマークに登録（URL欄に貼り付ける）",
      "holocg-viewer を開いてブックマークをクリック → 画面右下にカートが出現",
      "カードをクリックしてモーダルを開く",
      "カード番号（紫バッジ）をクリック → カートに追加される",
      "枚数は ＋/− ボタンで調整",
      "デッキが完成したら「📋 コピー」ボタンを押す",
    ],
  },
  {
    n: "02", emoji: "⚡", color: "#ea580c",
    title: "DECKLOG へ自動入力",
    site: "decklog.bushiroad.com/create?c=9",
    code: BOOKMARKLET_STEP2,
    steps: [
      "DECKLOGにログインし、デッキ作成ページを開く",
      "「スタンダード」を選んでカード選択画面まで進む",
      "このブックマークレットをクリック",
      "STEP1 でコピーした JSON を貼り付けて OK",
      "自動でカードが検索・追加される（完了まで待つ）",
    ],
  },
];

export default function App() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#0f0c29,#1a1040,#0f0c29)",
      color: "#e2e8f0",
      fontFamily: "'Hiragino Sans','Segoe UI',sans-serif",
      padding: "36px 16px 52px",
    }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{
          display: "inline-block", background: "rgba(94,90,155,0.3)",
          border: "1px solid rgba(94,90,155,0.5)", borderRadius: 999,
          padding: "3px 18px", fontSize: 10, letterSpacing: 4,
          color: "#a78bfa", marginBottom: 14, textTransform: "uppercase",
        }}>hololive OFFICIAL CARD GAME</div>
        <h1 style={{
          fontSize: "clamp(20px,5vw,36px)", fontWeight: 900, margin: "0 0 8px",
          background: "linear-gradient(90deg,#a78bfa,#fff 50%,#fb923c)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.3,
        }}>holocg-viewer → DECKLOG<br />デッキ登録ブリッジ</h1>
        <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
          2つのブックマークレットでカード選択からデッキ登録を自動化
        </p>
      </div>

      <div style={{
        maxWidth: 680, margin: "0 auto 28px",
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 14, padding: "16px 22px",
      }}>
        <div style={{ fontWeight: 800, marginBottom: 9, fontSize: 13, color: "#a78bfa" }}>
          📌 ブックマークレットの登録方法（Chrome / Edge）
        </div>
        <ol style={{ margin: 0, paddingLeft: 18, color: "#94a3b8", fontSize: 12, lineHeight: 2.1 }}>
          <li>「コピー」ボタンでブックマークレットのコードをコピー</li>
          <li>ブックマークバーを右クリック → 「ページを追加」</li>
          <li>名前を入力し、<b style={{ color: "#e2e8f0" }}>URL 欄</b>にコピーしたコードを貼り付けて保存</li>
          <li>対象サイトを開いてブックマークをクリックするだけ！</li>
        </ol>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>
        {STEPS.map(s => (
          <div key={s.n} style={{
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${s.color}55`, borderRadius: 18, overflow: "hidden",
          }}>
            <div style={{
              background: `linear-gradient(90deg,${s.color}28,transparent)`,
              borderBottom: `1px solid ${s.color}30`,
              padding: "14px 22px", display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 12, background: s.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, flexShrink: 0,
              }}>{s.emoji}</div>
              <div>
                <div style={{ fontSize: 10, color: s.color, letterSpacing: 3, textTransform: "uppercase", marginBottom: 1 }}>
                  STEP {s.n}
                </div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{s.title}</div>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{s.site}</div>
              </div>
            </div>
            <div style={{ padding: "16px 22px" }}>
              <ol style={{ margin: "0 0 16px", paddingLeft: 18, color: "#94a3b8", fontSize: 13, lineHeight: 2 }}>
                {s.steps.map((t, i) => <li key={i}>{t}</li>)}
              </ol>
              <CopyBtn text={s.code} label="ブックマークレットをコピー" color={s.color} />
            </div>
          </div>
        ))}
      </div>

      <div style={{
        maxWidth: 680, margin: "22px auto 0",
        padding: "13px 20px", background: "rgba(234,88,12,0.07)",
        border: "1px solid rgba(234,88,12,0.2)", borderRadius: 12,
        fontSize: 12, color: "#94a3b8", lineHeight: 2,
      }}>
        <strong style={{ color: "#fb923c" }}>⚠️ 注意事項</strong><br />
        • DECKLOGへの<b style={{ color: "#e2e8f0" }}>ログインを事前に</b>済ませてください<br />
        • STEP2はカード選択UIが表示された状態（メインデッキ / エールデッキタブが見える画面）で実行してください<br />
        • カードが見つからない場合はブラウザのコンソール（F12）で確認できます
      </div>
    </div>
  );
}
