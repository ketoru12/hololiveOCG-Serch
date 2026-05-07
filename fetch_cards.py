"""
hololive OFFICIAL CARD GAME カードデータ取得ツール
使い方: python fetch_cards.py [--type holomen|oshi|support|yell|all] [--force] [--no-json]
  --type   : 取得対象（省略時は all）
  --force  : 既存エントリも上書き更新する
  --no-json: master_cards.json の生成をスキップ
"""
import urllib.request
import urllib.parse
import csv
import json
import os
import re
import sys
import time
import argparse

# ── 設定 ──────────────────────────────────────────────────────────────────────
BASE_URL = 'https://hololive-official-cardgame.com'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DELAY    = 0.4   # リクエスト間隔（秒）

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'ja,en;q=0.9',
    'Referer': 'https://hololive-official-cardgame.com/cardlist/',
}

TARGETS = {
    'holomen': {
        'kind'   : 'ホロメン',
        'csv'    : 'hololive_cards.csv',
        'img_dir': 'image/holomen',
    },
    'oshi': {
        'kind'   : '推しホロメン',
        'csv'    : 'hololive_oshi.csv',
        'img_dir': 'image/OSR',
    },
    'support': {
        'kind'   : 'サポート',
        'csv'    : 'hololive_support.csv',
        'img_dir': 'image/support',
    },
    'yell': {
        'kind'   : 'エール',
        'csv'    : None,          # CSV なし（画像のみ）
        'img_dir': 'image/cheer',
    },
}

# ── ユーティリティ ─────────────────────────────────────────────────────────────
def fetch(url, retries=3):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.read().decode('utf-8', errors='replace')
        except Exception as e:
            if i == retries - 1:
                raise
            time.sleep(1)

def strip_tags(html):
    """HTMLタグを除去してテキストのみ返す"""
    return re.sub(r'<[^>]+>', '', html).strip()

def clean_text(s):
    """改行・連続スペースを整理"""
    s = re.sub(r'\r\n|\r', '\n', s)
    s = re.sub(r'[ \t]+', ' ', s)
    return s.strip()

def img_alts(html):
    """HTML内の img alt 属性を順に返す"""
    return re.findall(r'<img[^>]+alt="([^"]*)"[^>]*/?>', html)

def after_tag(html, pattern):
    """指定パターンの次のdd/p内テキストを返す"""
    m = re.search(pattern + r'\s*<dd>(.*?)</dd>', html, re.DOTALL)
    return clean_text(strip_tags(m.group(1))) if m else ''

# ── ページ全IDを収集 ───────────────────────────────────────────────────────────
def get_all_ids(kind):
    """cardsearch_ex から {page_id: img_fname} の辞書を全ページ取得する。
    cardsearch_ex のサムネイル img src からファイル名を抽出するため、
    詳細ページを開かずに「この画像は取得済みか」を判定できる。
    """
    kind_enc = urllib.parse.quote(kind, safe='')
    search_url = (
        f'{BASE_URL}/cardlist/cardsearch/'
        f'?keyword=&attribute%5B%5D=all&expansion_name='
        f'&card_kind%5B%5D={kind_enc}'
        f'&rare%5B%5D=all&bloom_level%5B%5D=all&parallel%5B%5D=all&view=image'
    )

    html = fetch(search_url)
    max_page_m = re.search(r'var max_page\s*=\s*(\d+)', html)
    max_page = int(max_page_m.group(1)) if max_page_m else 1
    print(f'  [{kind}] max_page={max_page}')

    # page_id → img_fname のペアを抽出するパターン
    # cardsearch_ex の HTML: <a href="/cardlist/?id=XXX"...><img src="/wp-content/...fname.png"...>
    PAIR_PAT = re.compile(
        r'/cardlist/\?id=(\d+)[^"]*"[^>]*>.*?'
        r'<img[^>]+src="(/wp-content/images/cardlist/[^"]+)"',
        re.DOTALL
    )

    def extract(text):
        return {pid: os.path.basename(src) for pid, src in PAIR_PAT.findall(text)}

    all_pairs = extract(html)

    ex_base = search_url.replace('/cardsearch/', '/cardsearch_ex').replace(
        'attribute%5B%5D=', 'attribute%5B0%5D='
    ).replace(
        'card_kind%5B%5D=', 'card_kind%5B0%5D='
    ).replace(
        'rare%5B%5D=',       'rare%5B0%5D='
    ).replace(
        'bloom_level%5B%5D=', 'bloom_level%5B0%5D='
    ).replace(
        'parallel%5B%5D=',   'parallel%5B0%5D='
    )

    for page in range(1, max_page + 1):
        url = f'{ex_base}&page={page}'
        try:
            page_html = fetch(url)
            new = extract(page_html)
            all_pairs.update(new)
            print(f'  page {page}/{max_page}: +{len(new)} (total {len(all_pairs)})')
        except Exception as e:
            print(f'  page {page}: ERROR {e}')
        time.sleep(DELAY)

    # page_id 降順（新しい順）でソートして返す
    return sorted(all_pairs.items(), key=lambda x: int(x[0]), reverse=True)

# ── カード詳細ページのパース ───────────────────────────────────────────────────
def parse_detail_section(html):
    """cardlist-Detail_Box_Inner セクションを切り出す"""
    start = html.find('cardlist-Detail_Box_Inner')
    end   = html.find('cardlist-Detail_Products', start)
    return html[start:end] if start != -1 else ''

def parse_products_section(html):
    """cardlist-Detail_Products セクションを切り出す"""
    start = html.find('cardlist-Detail_Products')
    end   = html.find('share-area', start)
    return html[start:end] if start != -1 else ''

def parse_image(detail):
    m = re.search(r'<div class="img[^"]*">\s*<img src="([^"]+)"', detail)
    if m:
        src = m.group(1)
        return (src if src.startswith('http') else BASE_URL + src), os.path.basename(src)
    return '', ''

def parse_name(detail):
    m = re.search(r'<h1 class="name">([^<]+)</h1>', detail)
    return clean_text(m.group(1)) if m else ''

def parse_number(detail):
    m = re.search(r'<p class="number">[^<]*<span>(h[^<]+)</span>', detail)
    return m.group(1).strip() if m else ''

def parse_card_type(detail):
    m = re.search(r'<dt>カードタイプ</dt>\s*<dd>([^<]+)</dd>', detail)
    return clean_text(m.group(1)) if m else ''

def parse_tags(detail):
    m = re.search(r'<dt>タグ</dt>\s*<dd>(.*?)</dd>', detail, re.DOTALL)
    if not m:
        return []
    return [clean_text(t) for t in re.findall(r'>(#[^<]+)<', m.group(1))]

def parse_products(products_html):
    """収録商品名リストを返す（名称を整形して返す）"""
    names = []
    for m in re.finditer(r'<div class="products-ttl">.*?<p>(.*?)</p>', products_html, re.DOTALL):
        names.append(_clean_product(clean_text(strip_tags(m.group(1)))))
    return names

def _clean_product(name):
    """商品名を整形する
    ・ブースターパック「〇〇」 → 〇〇
    ・【イベント物販／...】〇〇 → 〇〇
    """
    if not name:
        return name
    # ブースターパック「〇〇」→ 〇〇
    m = re.match(r'ブースターパック「(.+)」', name)
    if m:
        return m.group(1)
    # 【...】〇〇 → 〇〇
    name = re.sub(r'^【[^】]+】', '', name).strip()
    return name

def parse_color(detail):
    """色 dt に続く img の alt を返す"""
    m = re.search(r'<dt>色</dt>\s*<dd>\s*<img[^>]+alt="([^"]+)"', detail)
    return m.group(1) if m else ''

def parse_hp(detail):
    m = re.search(r'<dt>HP</dt>\s*<dd>(\d+)</dd>', detail)
    return m.group(1) if m else ''

def parse_bloom(detail):
    m = re.search(r'<dt>Bloomレベル</dt>\s*<dd>([^<]+)</dd>', detail)
    return clean_text(m.group(1)) if m else ''

def parse_life(detail):
    m = re.search(r'<dt>LIFE</dt>\s*<dd>(\d+)</dd>', detail)
    return m.group(1) if m else ''

def parse_baton(detail):
    """バトンタッチ枚数（img の数）を返す"""
    m = re.search(r'<dt>バトンタッチ</dt>\s*<dd>(.*?)</dd>', detail, re.DOTALL)
    if not m:
        return ''
    imgs = re.findall(r'<img', m.group(1))
    return str(len(imgs)) if imgs else ''

def parse_arts(detail):
    """arts リスト: [(text, icons_str, tokkou), ...]"""
    results = []
    for arts_div in re.finditer(r'<div class="sp arts">(.*?)</div>', detail, re.DOTALL):
        inner = arts_div.group(1)
        # p タグを分割（最初の <p>アーツ</p> はスキップ）
        paragraphs = re.findall(r'<p>(.*?)</p>', inner, re.DOTALL)
        for p in paragraphs:
            if strip_tags(p).strip() in ('アーツ', ''):
                continue
            # 外側 <span> の内容を rfind で正確に取得（ネストした tokkou span があっても崩れない）
            outer_start = p.find('<span>')
            outer_end   = p.rfind('</span>')
            if outer_start == -1 or outer_end == -1:
                continue
            span_content = p[outer_start + len('<span>'):outer_end]
            # tokkou（中身は <img alt="緑+50"> 形式）
            tokkou_m = re.search(r'<span class="tokkou">(.*?)</span>', span_content, re.DOTALL)
            if tokkou_m:
                tok_alts = img_alts(tokkou_m.group(1))  # e.g. ['緑+50']
                tokkou = tok_alts[0] if tok_alts else ''
            else:
                tokkou = ''
            # icons（span 内の img alt、tokkou span の中は除く）
            span_for_icons = re.sub(r'<span class="tokkou">.*?</span>', '', span_content, flags=re.DOTALL)
            icons = img_alts(span_for_icons)
            icons_str = ','.join(icons)
            # art text: span内テキスト（imgとtokkou spanを除く）
            span_no_img = re.sub(r'<img[^>]+/?>', '', span_content)
            span_no_tok = re.sub(r'<span class="tokkou">.*?</span>', '', span_no_img, flags=re.DOTALL)
            art_main = clean_text(strip_tags(span_no_tok))
            # p 内の outer span 外テキスト（追加効果）
            p_after_span = p[outer_end + len('</span>'):]
            extra_text = clean_text(strip_tags(p_after_span))
            art_text = (art_main + '\n' + extra_text).strip() if extra_text else art_main
            results.append((art_text, icons_str, tokkou))
    return results

def parse_keyword(detail):
    """キーワード: (name, effect) を返す。複数ある場合は最初の1つ"""
    keywords = []
    for kw_div in re.finditer(r'<div class="keyword">(.*?)</div>', detail, re.DOTALL):
        inner = kw_div.group(1)
        paragraphs = re.findall(r'<p>(.*?)</p>', inner, re.DOTALL)
        kw_texts = [clean_text(strip_tags(p)) for p in paragraphs if strip_tags(p).strip() != 'キーワード']
        # 最初のpタグ: "<img>キーワード名" → spanの中身
        for p in paragraphs:
            span_m = re.search(r'<span>(.*?)</span>', p, re.DOTALL)
            if span_m:
                kw_name = clean_text(strip_tags(span_m.group(1)))
                kw_effect_raw = p[p.find('</span>') + len('</span>'):] if '</span>' in p else ''
                kw_effect = clean_text(strip_tags(kw_effect_raw))
                # 次の <p> があれば effect に追加
                if kw_effect:
                    keywords.append((kw_name, kw_effect))
                break
    return keywords

def parse_extra(detail):
    m = re.search(r'<div class="extra">(.*?)</div>', detail, re.DOTALL)
    if not m:
        return ''
    paragraphs = re.findall(r'<p>(.*?)</p>', m.group(1), re.DOTALL)
    texts = [clean_text(strip_tags(p)) for p in paragraphs if strip_tags(p) != 'エクストラ']
    return '\n'.join(texts)

def parse_oshi_skill(detail):
    """推しスキル（oshi skill div）"""
    m = re.search(r'<div class="oshi skill">(.*?)</div>', detail, re.DOTALL)
    if not m:
        return ''
    paragraphs = re.findall(r'<p>(.*?)</p>', m.group(1), re.DOTALL)
    texts = [clean_text(strip_tags(p)) for p in paragraphs if strip_tags(p) not in ('推しスキル', '')]
    return '\n'.join(texts)

def parse_sp_oshi_skill(detail):
    """SP推しスキル（sp skill div）"""
    m = re.search(r'<div class="sp skill">(.*?)</div>', detail, re.DOTALL)
    if not m:
        return ''
    paragraphs = re.findall(r'<p>(.*?)</p>', m.group(1), re.DOTALL)
    texts = [clean_text(strip_tags(p)) for p in paragraphs if strip_tags(p) not in ('SP推しスキル', '')]
    return '\n'.join(texts)

def parse_stage_skill(detail):
    """ステージスキル（stage skill div）"""
    m = re.search(r'<div class="stage skill">(.*?)</div>', detail, re.DOTALL)
    if not m:
        return ''
    paragraphs = re.findall(r'<p>(.*?)</p>', m.group(1), re.DOTALL)
    texts = [clean_text(strip_tags(p)) for p in paragraphs if strip_tags(p) not in ('ステージスキル', '')]
    return '\n'.join(texts)

def parse_support_cardtype_parts(detail):
    """サポートの「カードタイプ」フィールドを分解して (cardType, cardType2, cardType3) を返す。
    HTML: <dt>カードタイプ</dt><dd>サポート・アイテム・LIMITED</dd>
    → ('サポート', 'アイテム', 'LIMITED')
    """
    m = re.search(r'<dt>カードタイプ</dt>\s*<dd>([^<]+)</dd>', detail)
    if not m:
        return 'サポート', '', ''
    parts = [p.strip() for p in clean_text(m.group(1)).split('・')]
    ct  = parts[0] if len(parts) > 0 else 'サポート'
    ct2 = parts[1] if len(parts) > 1 else ''
    ct3 = parts[2] if len(parts) > 2 else ''
    return ct, ct2, ct3

def parse_support_effect(detail):
    """サポートカードの能力テキストを取得する。
    HTML: <dt>能力テキスト</dt><dd>...</dd>
    """
    m = re.search(r'<dt>能力テキスト</dt>\s*<dd>(.*?)</dd>', detail, re.DOTALL)
    if not m:
        return ''
    # <br> を改行に変換してタグを除去
    text = re.sub(r'<br\s*/?>', '\n', m.group(1))
    return clean_text(strip_tags(text)).strip()

# ── カードデータをビルド ─────────────────────────────────────────────────────
def build_page_url(page_id, kind):
    kind_enc = urllib.parse.quote(kind, safe='')
    return (
        f'{BASE_URL}/cardlist/?id={page_id}'
        f'&keyword=&attribute%5B0%5D=all&expansion_name='
        f'&card_kind%5B0%5D={kind_enc}'
        f'&rare%5B0%5D=all&bloom_level%5B0%5D=all&parallel%5B0%5D=all&view=text'
    )

def build_holomen_row(page_id, kind):
    url = build_page_url(page_id, kind)
    html = fetch(url)
    detail   = parse_detail_section(html)
    products_html = parse_products_section(html)

    img_url, img_fname = parse_image(detail)
    name      = parse_name(detail)
    number    = parse_number(detail)
    card_type = parse_card_type(detail)
    color     = parse_color(detail)
    hp        = parse_hp(detail)
    bloom     = parse_bloom(detail)
    baton     = parse_baton(detail)
    extra     = parse_extra(detail)
    tags      = parse_tags(detail)
    products  = parse_products(products_html)
    arts      = parse_arts(detail)
    keywords  = parse_keyword(detail)

    # arts 最大3
    def art_fields(idx):
        if idx < len(arts):
            return arts[idx]
        return ('', '', '')

    # keywords 最大2
    def kw_fields(idx):
        if idx < len(keywords):
            return keywords[idx]
        return ('', '')

    kw1_name, kw1_effect = kw_fields(0)
    kw2_name, _ = kw_fields(1)

    row = {
        'page_id'      : page_id,
        'url'          : url,
        'img'          : img_url,
        'name'         : name,
        'cardType'     : card_type,
        'color'        : color,
        'hp'           : hp,
        'bloom'        : bloom,
        'arts1_text'   : art_fields(0)[0],
        'arts1_icons'  : art_fields(0)[1],
        'arts1_tokkou' : art_fields(0)[2],
        'arts2_text'   : art_fields(1)[0],
        'arts2_icons'  : art_fields(1)[1],
        'arts2_tokkou' : art_fields(1)[2],
        'arts3_text'   : art_fields(2)[0],
        'arts3_icons'  : art_fields(2)[1],
        'arts3_tokkou' : art_fields(2)[2],
        'keyword1'     : kw1_name,
        'keyword2'     : kw2_name,
        'keywordEffect': kw1_effect,
        'baton'        : baton,
        'extra'        : extra,
        'number'       : number,
        'product1'     : products[0] if len(products) > 0 else '',
        'product2'     : products[1] if len(products) > 1 else '',
        'product3'     : products[2] if len(products) > 2 else '',
        'product4'     : products[3] if len(products) > 3 else '',
        'product5'     : products[4] if len(products) > 4 else '',
        'tag1'         : tags[0] if len(tags) > 0 else '',
        'tag2'         : tags[1] if len(tags) > 1 else '',
        'tag3'         : tags[2] if len(tags) > 2 else '',
        'tag4'         : tags[3] if len(tags) > 3 else '',
        'tag5'         : tags[4] if len(tags) > 4 else '',
        'tag6'         : tags[5] if len(tags) > 5 else '',
    }
    return row, img_url, img_fname, number

def build_oshi_row(page_id, kind):
    url = build_page_url(page_id, kind)
    html = fetch(url)
    detail   = parse_detail_section(html)
    products_html = parse_products_section(html)

    img_url, img_fname = parse_image(detail)
    name       = parse_name(detail)
    number     = parse_number(detail)
    card_type  = parse_card_type(detail)
    color      = parse_color(detail)
    life       = parse_life(detail)
    oshi_skill = parse_oshi_skill(detail)
    sp_skill   = parse_sp_oshi_skill(detail)
    stage_skill= parse_stage_skill(detail)
    products   = parse_products(products_html)

    row = {
        'page_id'     : page_id,
        'url'         : url,
        'img'         : img_url,
        'name'        : name,
        'cardType'    : card_type,
        'color'       : color,
        'life'        : life,
        'oshiSkill'   : oshi_skill,
        'spOshiSkill' : sp_skill,
        'stageSkill'  : stage_skill,
        'product1'    : products[0] if len(products) > 0 else '',
        'product2'    : products[1] if len(products) > 1 else '',
        'product3'    : products[2] if len(products) > 2 else '',
        'product4'    : products[3] if len(products) > 3 else '',
        'product5'    : products[4] if len(products) > 4 else '',
        'number'      : number,
    }
    return row, img_url, img_fname, number

def build_support_row(page_id, kind):
    url = build_page_url(page_id, kind)
    html = fetch(url)
    detail        = parse_detail_section(html)
    products_html = parse_products_section(html)

    img_url, img_fname          = parse_image(detail)
    name                        = parse_name(detail)
    number                      = parse_number(detail)
    card_type, card_type2, card_type3 = parse_support_cardtype_parts(detail)
    effect                      = parse_support_effect(detail)
    products                    = parse_products(products_html)

    row = {
        'page_id'  : page_id,
        'url'      : url,
        'img'      : img_url,
        'name'     : name,
        'cardType' : card_type,
        'cardType2': card_type2,
        'cardType3': card_type3,
        'effect'   : effect,
        'product1' : products[0] if len(products) > 0 else '',
        'product2' : products[1] if len(products) > 1 else '',
        'product3' : products[2] if len(products) > 2 else '',
        'product4' : products[3] if len(products) > 3 else '',
        'product5' : products[4] if len(products) > 4 else '',
        'number'   : number,
    }
    return row, img_url, img_fname, number

# ── 画像ダウンロード ──────────────────────────────────────────────────────────
def download_image(img_url, img_dir, img_fname):
    if not img_url or not img_fname:
        return False
    dest = os.path.join(BASE_DIR, img_dir, img_fname)
    if os.path.exists(dest):
        return False  # 既存
    try:
        req = urllib.request.Request(img_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read()
        with open(dest, 'wb') as f:
            f.write(data)
        return True
    except Exception as e:
        print(f'    画像DL失敗: {img_fname}: {e}')
        return False

# ── CSV 読み書き ───────────────────────────────────────────────────────────────
def load_csv(csv_path):
    """既存 CSV を { page_id: row_dict } で返す。
    旧形式（page_id 列なし）は { number: row_dict } にフォールバック。
    utf-8-sig (BOM付き) / utf-8 どちらも正しく読み込む。
    """
    if not os.path.exists(csv_path):
        return {}, []
    with open(csv_path, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        use_page_id = 'page_id' in fieldnames
        rows = {}
        for r in reader:
            key = r.get('page_id') if use_page_id else r.get('number')
            if key:
                rows[key] = r
    return rows, fieldnames

def save_csv(csv_path, rows_dict, fieldnames):
    """rows_dict { page_id: row } を CSV に書き出す（number → page_id 昇順）。
    BOM付き UTF-8 で書き出すことで Excel でも文字化けしない。
    """
    sorted_rows = sorted(
        rows_dict.values(),
        key=lambda r: (r.get('number', ''), int(r.get('page_id', 0) or 0))
    )
    with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(sorted_rows)

# ── 各タイプの処理 ─────────────────────────────────────────────────────────────
HOLOMEN_FIELDS = [
    'page_id',
    'url','img','name','cardType','color','hp','bloom',
    'arts1_text','arts1_icons','arts1_tokkou',
    'arts2_text','arts2_icons','arts2_tokkou',
    'arts3_text','arts3_icons','arts3_tokkou',
    'keyword1','keyword2','keywordEffect','baton','extra','number',
    'product1','product2','product3','product4','product5',
    'tag1','tag2','tag3','tag4','tag5','tag6',
]
OSHI_FIELDS = [
    'page_id',
    'url','img','name','cardType','color','life',
    'oshiSkill','spOshiSkill','stageSkill',
    'product1','product2','product3','product4','product5','number',
]
SUPPORT_FIELDS = [
    'page_id',
    'url','img','name','cardType','cardType2','cardType3','effect',
    'product1','product2','product3','product4','product5','number',
]

def process_target(key, force=False):
    target   = TARGETS[key]
    kind     = target['kind']
    img_dir  = os.path.join(BASE_DIR, target['img_dir'])
    csv_path = os.path.join(BASE_DIR, target['csv']) if target['csv'] else None

    os.makedirs(img_dir, exist_ok=True)

    print(f'\n=== {kind} ===')

    # 既存 CSV ロード
    existing, fieldnames = {}, []
    if csv_path:
        existing, fieldnames = load_csv(csv_path)
        if not fieldnames:
            fieldnames = (HOLOMEN_FIELDS if key == 'holomen' else
                          OSHI_FIELDS    if key == 'oshi'    else
                          SUPPORT_FIELDS)
        print(f'  既存: {len(existing)} 件')

    # 全 ID + img_fname ペアを取得
    pairs = get_all_ids(kind)
    print(f'  サイト上の総件数: {len(pairs)}')

    # 画像の既存ファイル一覧
    existing_imgs = set(os.listdir(img_dir))

    new_count  = 0
    skip_count = 0
    img_count  = 0
    err_count  = 0

    for page_id, img_hint in pairs:
        try:
            # page_id が既に CSV に存在 → CSV・画像ともに処理済み → 全スキップ
            if not force and page_id in existing:
                skip_count += 1
                continue

            # 詳細ページ取得
            if key == 'holomen':
                row, img_url, img_fname, number = build_holomen_row(page_id, kind)
            elif key == 'oshi':
                row, img_url, img_fname, number = build_oshi_row(page_id, kind)
            elif key == 'support':
                row, img_url, img_fname, number = build_support_row(page_id, kind)
            elif key == 'yell':
                url = f'{BASE_URL}/cardlist/?id={page_id}'
                html = fetch(url)
                detail = parse_detail_section(html)
                img_url, img_fname = parse_image(detail)
                number = parse_number(detail)
                row = None
            else:
                continue

            if not number:
                print(f'  [id={page_id}] number 取得失敗 → スキップ')
                err_count += 1
                time.sleep(DELAY)
                continue

            # CSV 更新（page_id ベース：同一カード番号の別バージョンも別行で保存）
            if csv_path and row:
                existing[page_id] = row
                new_count += 1
                print(f'  {"UPDATE" if force else "NEW":6s} {number}  [{img_fname}]')

            # 画像ダウンロード（カード番号が既存でも img_fname が未取得なら DL）
            if img_fname and img_fname not in existing_imgs:
                if download_image(img_url, target['img_dir'], img_fname):
                    existing_imgs.add(img_fname)
                    img_count += 1
                    print(f'  DL    {img_fname}')

        except Exception as e:
            print(f'  [id={page_id}] ERROR: {e}')
            err_count += 1

        time.sleep(DELAY)

    # CSV 書き出し
    if csv_path and existing:
        save_csv(csv_path, existing, fieldnames)
        print(f'\n  CSV 保存: {csv_path}')

    print(f'  結果: 新規/更新={new_count}件 スキップ={skip_count}件 画像DL={img_count}件 エラー={err_count}件')

# ── arts_text パーサー ────────────────────────────────────────────────────────
def _parse_arts_text(text):
    """'アーツ名　ダメージ\n効果テキスト' を (name, damage, effect) に分解"""
    if not text:
        return '', '', ''
    lines = text.split('\n', 1)
    header = lines[0]
    body   = lines[1].strip() if len(lines) > 1 else ''
    if '　' in header:
        name, maybe_dmg = header.rsplit('　', 1)
        maybe_dmg = maybe_dmg.strip()
        if maybe_dmg.isdigit():
            return name.strip(), maybe_dmg, body
        # 数字でなければダメージではなく名前の一部
        return header.strip(), '', body
    return header.strip(), '', body


# ── master_cards.json 生成 ────────────────────────────────────────────────────
def build_master_json():
    all_cards = []

    def products_list(r):
        return [r.get(f'product{i}', '').strip() for i in range(1, 6)
                if r.get(f'product{i}', '').strip()]

    def local_img(img_url, sub_dir):
        """ローカル画像があればローカルパス、なければ元 URL を返す"""
        fname = os.path.basename(img_url)
        if fname and os.path.exists(os.path.join(BASE_DIR, sub_dir, fname)):
            return f'/{sub_dir}/{fname}'
        return img_url

    def rows_sorted(existing):
        """全行を (number, page_id) 順で返す（全バージョン含む）"""
        return sorted(
            (r for r in existing.values() if r.get('number')),
            key=lambda r: (r.get('number', ''), int(r.get('page_id', 0) or 0))
        )

    # ── ホロメン ──────────────────────────────────────────────────────────────
    existing, _ = load_csv(os.path.join(BASE_DIR, 'hololive_cards.csv'))
    for r in rows_sorted(existing):
        arts = []
        for i in range(1, 4):
            text = r.get(f'arts{i}_text', '').strip()
            if not text:
                continue
            name, damage, effect = _parse_arts_text(text)
            arts.append({
                'name'  : name,
                'damage': damage,
                'text'  : effect,
                'icons' : r.get(f'arts{i}_icons',  '').strip(),
                'tokkou': r.get(f'arts{i}_tokkou', '').strip(),
            })
        card_type = r.get('cardType', '').strip()
        tags = [r.get(f'tag{i}', '').strip() for i in range(1, 7)
                if r.get(f'tag{i}', '').strip()]
        extra = r.get('extra', '').strip()
        all_cards.append({
            'id'          : r.get('number', '').strip(),
            'page_id'     : r.get('page_id', '').strip(),
            'name'        : r.get('name', '').strip(),
            'category'    : 'ホロメン',
            'color'       : r.get('color', '').strip() or None,
            'kind'        : r.get('bloom', '').strip(),
            'value'       : r.get('hp', '').strip(),
            'cardType'    : card_type,
            'baton_touch' : r.get('baton', '').strip(),
            'arts'        : arts,
            'keywordName' : r.get('keyword1', '').strip(),
            'keywordEffect': r.get('keywordEffect', '').strip(),
            'extra'       : extra,
            'unlimited'   : '何枚でも入れられる' in extra,
            'products'    : products_list(r),
            'img'         : local_img(r.get('img', ''), 'image/holomen'),
            'tags'        : tags,
        })

    # ── 推しホロメン ──────────────────────────────────────────────────────────
    existing, _ = load_csv(os.path.join(BASE_DIR, 'hololive_oshi.csv'))
    for r in rows_sorted(existing):
        skills = []
        for label, key in [('推しスキル', 'oshiSkill'),
                            ('SP推しスキル', 'spOshiSkill'),
                            ('ステージスキル', 'stageSkill')]:
            v = r.get(key, '').strip()
            if v:
                skills.append({'label': label, 'text': v})
        all_cards.append({
            'id'      : r.get('number', '').strip(),
            'page_id' : r.get('page_id', '').strip(),
            'name'    : r.get('name', '').strip(),
            'category': '推しホロメン',
            'color'   : r.get('color', '').strip() or None,
            'kind'    : '推し',
            'value'   : r.get('life', '').strip(),
            'skills'  : skills,
            'products': products_list(r),
            'img'     : local_img(r.get('img', ''), 'image/OSR'),
            'tags'    : [],
        })

    # ── サポート ──────────────────────────────────────────────────────────────
    existing, _ = load_csv(os.path.join(BASE_DIR, 'hololive_support.csv'))
    for r in rows_sorted(existing):
        all_cards.append({
            'id'        : r.get('number', '').strip(),
            'page_id'   : r.get('page_id', '').strip(),
            'name'      : r.get('name', '').strip(),
            'category'  : 'サポート',
            'color'     : None,
            'kind'      : r.get('cardType2', '').strip(),
            'limited'   : r.get('cardType3', '').strip(),
            'value'     : '0',
            'effect'    : r.get('effect', '').strip(),
            'products'  : products_list(r),
            'img'       : local_img(r.get('img', ''), 'image/support'),
            'tags'      : [],
        })

    all_cards.sort(key=lambda c: (c['id'], int(c.get('page_id', 0) or 0)))
    out_path = os.path.join(BASE_DIR, 'master_cards.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(all_cards, f, ensure_ascii=False, indent=2)
    print(f'\n  master_cards.json 生成: {len(all_cards)} 件 → {out_path}')


# ── エントリポイント ──────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description='ホロカ公式サイトからカードデータを取得')
    parser.add_argument('--type', choices=['holomen','oshi','support','yell','all'],
                        default='all', help='取得対象 (default: all)')
    parser.add_argument('--force', action='store_true',
                        help='既存エントリも上書き更新する')
    parser.add_argument('--no-json', action='store_true',
                        help='master_cards.json の生成をスキップ')
    args = parser.parse_args()

    targets = list(TARGETS.keys()) if args.type == 'all' else [args.type]
    for key in targets:
        process_target(key, force=args.force)

    if not args.no_json:
        build_master_json()

    print('\n完了！')

if __name__ == '__main__':
    main()
