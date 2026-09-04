import json, os, re, time, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from bs4 import BeautifulSoup

BASE = "https://kaquucomponentes.com"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; InventoryCatalogBot/1.0; +personal-use)"}
SESSION = requests.Session()
SESSION.headers.update(HEADERS)

ROOTS = {
    "Apple": "5263-apple",
    "Samsung": "106-samsung",
    "Xiaomi": "251-xiaomi",
    "Oppo": "5283-oppo",
}

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")

def get(url, params=None, retries=3):
    for attempt in range(retries):
        try:
            r = SESSION.get(url, params=params, timeout=20)
            if r.status_code == 200:
                return r.text
            print(f"  ! HTTP {r.status_code} for {url}", file=sys.stderr)
        except requests.RequestException as e:
            print(f"  ! error {e} for {url} (attempt {attempt+1})", file=sys.stderr)
        time.sleep(1.5 * (attempt + 1))
    return None

def parse_depth_tree(html):
    """Parse the block-category sidebar widget: returns list of
    {id, name, url, children:[{id,name,url}]} for depth0 items with their depth1 children."""
    soup = BeautifulSoup(html, "lxml")
    root_ul = soup.select_one("ul.category-sub-menu, ul.category-tree, div.block-category ul")
    # Fallback: find any <li data-depth="0"> occurrences directly in whole doc
    items = []
    lis = soup.select('li[data-depth="0"]')
    for li in lis:
        a = li.find("a", recursive=False)
        if a is None:
            a = li.find("a")
        if a is None or not a.get("href"):
            continue
        node = {"id": cat_id_from_url(a["href"]), "name": a.get_text(strip=True), "url": a["href"], "children": []}
        sub_ul = li.find("ul", class_="category-sub-menu")
        if sub_ul:
            for sub_li in sub_ul.find_all("li", attrs={"data-depth": "1"}, recursive=False):
                sub_a = sub_li.find("a")
                if sub_a and sub_a.get("href"):
                    node["children"].append({
                        "id": cat_id_from_url(sub_a["href"]),
                        "name": sub_a.get_text(strip=True),
                        "url": sub_a["href"],
                    })
        items.append(node)
    return items

def cat_id_from_url(url):
    m = re.search(r"/(\d+)-[a-z0-9-]+", url)
    return m.group(1) if m else None

def parse_products(html):
    soup = BeautifulSoup(html, "lxml")
    out = []
    for it in soup.select(".product-miniature, article.js-product-miniature, .js-product"):
        name = it.get("data-name")
        if not name:
            el = it.select_one(".product-title, h3, h2")
            name = el.get_text(strip=True) if el else None
        price = it.get("data-price")
        if not price:
            el = it.select_one(".price")
            price = el.get_text(strip=True) if el else None
        pid = it.get("data-id-product")
        link_el = it.select_one("a.product-thumbnail, a")
        url = link_el.get("href") if link_el else None
        ref_el = it.select_one(".product-reference, [data-product-reference]")
        ref = ref_el.get_text(strip=True) if ref_el else None
        out.append({"id": pid, "name": name, "price": price, "url": url, "ref": ref})
    return out

def total_products_count(html):
    m = re.search(r"(\d+)\s+productos", html) or re.search(r"(\d+)\s+resultado", html)
    return int(m.group(1)) if m else None

def fetch_all_products(url):
    all_products = []
    page = 1
    seen_ids = set()
    while True:
        html = get(url, params={"resultsPerPage": 1000, "page": page})
        if not html:
            break
        products = parse_products(html)
        new = [p for p in products if p["id"] not in seen_ids]
        for p in new:
            seen_ids.add(p["id"])
        all_products.extend(new)
        total = total_products_count(html)
        if total is None or len(all_products) >= total or not new:
            break
        page += 1
        time.sleep(0.3)
    return all_products

def scrape_leaf(brand, line_name, model_name, node):
    """Fetch a leaf (part-type) category page and all its products, handling pagination."""
    all_products = fetch_all_products(node["url"])
    return {
        "brand": brand,
        "line": line_name,
        "model": model_name,
        "part_type_id": node["id"],
        "part_type_name": node["name"],
        "part_type_url": node["url"],
        "products": all_products,
    }

PART_TYPE_KEYWORDS = [
    ("Pantallas", ["pantalla"]),
    ("Baterías", ["bateria", "batería"]),
    ("Tapas", ["tapa trasera", "tapa "]),
    ("Chasis", ["chasis"]),
    ("Conectores", ["conector"]),
    ("Cámaras", ["camara", "cámara"]),
    ("Altavoces", ["altavoz", "altavoces", "auricular", "microfono", "micrófono", "vibrador"]),
    ("Flex", ["flex", "cable flex"]),
    ("Adhesivos", ["adhesivo", "pegatina"]),
    ("Sim & Botones", ["sim ", "porta sim", "boton", "botón"]),
    ("IC & Tornillos", ["tornillo", " ic ", "circuito"]),
]

def classify_part_type(product_name):
    if not product_name:
        return "Otros"
    name = product_name.lower()
    for category, keywords in PART_TYPE_KEYWORDS:
        for kw in keywords:
            if kw in name:
                return category
    return "Otros"

def scrape_flat_model(brand, line_name, model):
    """For models with no part-type subcategories on the source site, fetch the model's
    own category page directly and classify each product into a part-type bucket by name."""
    products = fetch_all_products(model["url"])
    buckets = {}
    for p in products:
        cat = classify_part_type(p.get("name"))
        buckets.setdefault(cat, []).append(p)
    results = []
    for cat, prods in buckets.items():
        results.append({
            "brand": brand,
            "line": line_name,
            "model": model["name"],
            "part_type_id": f"model{model['id']}-{re.sub(r'[^a-z0-9]+', '-', cat.lower())}",
            "part_type_name": cat,
            "part_type_url": model["url"],
            "products": prods,
        })
    return results

def main():
    tree = {}  # brand -> line_name -> {id,url, models:[{id,name,url,part_types:[...]}]}
    leaf_tasks = []  # list of (brand, line_name, model_name, node)

    for brand, root_slug in ROOTS.items():
        print(f"=== {brand} root ===")
        html = get(f"{BASE}/{root_slug}")
        if not html:
            print(f"FAILED to fetch root for {brand}")
            continue
        lines = parse_depth_tree(html)
        tree[brand] = {}
        for line in lines:
            line_name = line["name"]
            line_url = line["url"]
            print(f"  -- line: {line_name} ({line_url})")
            line_html = get(line_url)
            if not line_html:
                print(f"     FAILED to fetch line {line_name}")
                continue
            models = parse_depth_tree(line_html)
            tree[brand][line_name] = {"id": line["id"], "url": line_url, "models": []}
            for model in models:
                model_entry = {
                    "id": model["id"], "name": model["name"], "url": model["url"],
                    "part_types": [{"id": c["id"], "name": c["name"], "url": c["url"]} for c in model["children"]],
                }
                tree[brand][line_name]["models"].append(model_entry)
                # One request per model gets ALL its products (site shows full listing
                # on the model page even when part-type subcategories exist), so we
                # always scrape at the model level and classify by keyword.
                leaf_tasks.append(("model", brand, line_name, model_entry))
            time.sleep(0.2)

    with open(f"{OUT_DIR}/categories_tree.json", "w", encoding="utf-8") as f:
        json.dump(tree, f, ensure_ascii=False, indent=2)
    print(f"\nTree saved. Models to scrape: {len(leaf_tasks)}")

    def run_task(task):
        _, brand, line_name, model_entry = task
        return scrape_flat_model(brand, line_name, model_entry)

    results = []
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = {pool.submit(run_task, task): task for task in leaf_tasks}
        done = 0
        for fut in as_completed(futures):
            task = futures[fut]
            done += 1
            try:
                res = fut.result()
                results.extend(res)
            except Exception as e:
                print(f"  ! failed task {task[:3]}: {e}", file=sys.stderr)
            if done % 25 == 0 or done == len(leaf_tasks):
                print(f"  progress: {done}/{len(leaf_tasks)}")
                with open(f"{OUT_DIR}/products_raw.json", "w", encoding="utf-8") as f:
                    json.dump(results, f, ensure_ascii=False, indent=2)

    with open(f"{OUT_DIR}/products_raw.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    total_products = sum(len(r["products"]) for r in results)
    print(f"\nDONE. Leaf categories scraped: {len(results)}. Total product rows: {total_products}")

if __name__ == "__main__":
    main()
