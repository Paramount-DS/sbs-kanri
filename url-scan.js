// =============================================
// URLデータ検出ツール - url-scan.js
// Firestore内の全案件データを読み取り、URLを含む項目を一覧化・削除する。
// 検出・削除のロジックは url-guard.js（window.UrlGuard）を使用。
// ※ パスワードを保存している "config" コレクションは読み込まない。
// =============================================

const SCAN_TARGETS = [
  { name: "sapporo_projects",   label: "札幌支店" },
  { name: "sendai_projects",    label: "仙台支店" },
  { name: "saitama_projects",   label: "さいたま支店" },
  { name: "tokyo_projects",     label: "東京支店" },
  { name: "yokohama_projects",  label: "横浜支店" },
  { name: "nagoya_projects",    label: "名古屋支店" },
  { name: "osaka_projects",     label: "大阪支店" },
  { name: "hiroshima_projects", label: "広島支店" },
  { name: "fukuoka_projects",   label: "福岡支店" },
  { name: "cs_projects",        label: "導入支援（CS）" },
  { name: "projects",           label: "旧データ（projects）" },
];

// 項目名の日本語表示（ここにないキーはそのまま表示）
const FIELD_LABELS = {
  memo: "備考", quickMemo: "クイックメモ", freeText: "訪問内容",
  ankenGaiyou: "案件概要", scheduleStatus: "スケジュール状況", shuhenRenkei: "周辺連携機能",
  byokoKosei: "病棟構成", donyuByoko: "導入病棟", keieiShukai: "経営主体",
  electronicKarte: "電子カルテ", nurseCall: "ナースコール", tabletPos: "タブレット設置位置",
  hospitalName: "病院名", ward: "導入病棟名",
};

let findings = [];      // { id, collection, docId, path, text, stripped, checked }
let originalDocs = {};  // "collection/docId" -> 検出時点の元データ（バックアップ用）
let busy = false;

const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function setStatus(msg, type) {
  const s = $("status");
  s.textContent = msg || "";
  s.className = "status" + (type ? " " + type : "");
}

function setBusy(flag) {
  busy = flag;
  $("scanBtn").disabled = flag;
  $("selectAllBtn").disabled = flag;
  $("selectNoneBtn").disabled = flag;
  $("backupBtn").disabled = flag;
  updateSelectionUi();
}

function labelOf(collectionName) {
  const t = SCAN_TARGETS.find(x => x.name === collectionName);
  return t ? t.label : collectionName;
}

function docTitle(data) {
  const name = (data && data.hospitalName) || "（病院名なし）";
  return data && data.ward ? name + "（" + data.ward + "）" : name;
}

function fieldLabel(data, path) {
  // 訪問履歴は「何件目・いつの訪問か」が分かるようにする
  if (path[0] === "visits" && typeof path[1] === "number") {
    const v = (data.visits || [])[path[1]] || {};
    const date = v.endDate || v.startDate || "";
    const rest = path.slice(2).map(k => FIELD_LABELS[k] || k).join(" / ");
    return "訪問履歴 " + (path[1] + 1) + "件目" + (date ? "（" + date + "）" : "") + (rest ? "　" + rest : "");
  }
  const last = path[path.length - 1];
  return FIELD_LABELS[last] || UrlGuard.pathLabel(path);
}

// URL部分をハイライトして追加（textContent 経由なので入力値がHTMLとして解釈されることはない）
function appendHighlighted(parent, text) {
  const re = UrlGuard.newRegex();
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m[0] === "") { re.lastIndex++; continue; }
    if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
    parent.appendChild(el("mark", "", m[0]));
    last = m.index + m[0].length;
  }
  if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
}

// =============================================
// スキャン
// =============================================
async function runScan(opts) {
  opts = opts || {};
  setBusy(true);
  findings = [];
  originalDocs = {};
  const stats = [];

  for (let i = 0; i < SCAN_TARGETS.length; i++) {
    const t = SCAN_TARGETS[i];
    setStatus("読み込み中… " + t.label + "（" + (i + 1) + " / " + SCAN_TARGETS.length + "）");
    try {
      const snap = await db.collection(t.name).get();
      let hitDocs = 0, hitItems = 0;
      snap.forEach(doc => {
        const data = doc.data();
        const res = UrlGuard.scan(data);
        if (!res.length) return;
        hitDocs++;
        hitItems += res.length;
        originalDocs[t.name + "/" + doc.id] = data;
        res.forEach(r => findings.push({
          id: findings.length,
          collection: t.name,
          docId: doc.id,
          path: r.path,
          text: r.text,
          stripped: UrlGuard.strip(r.text),
          checked: true,
        }));
      });
      stats.push({ label: t.label, total: snap.size, hitDocs, hitItems });
    } catch (err) {
      console.error(t.name, err);
      stats.push({ label: t.label, error: err.message || String(err) });
    }
  }

  renderSummary(stats);
  renderResults();
  setBusy(false);

  if (!opts.keepStatus) {
    const failed = stats.filter(s => s.error).length;
    if (failed) {
      setStatus("スキャン完了。ただし " + failed + " 件の読み込みに失敗しました（下の内訳を確認してください）。", "err");
    } else if (findings.length === 0) {
      setStatus("スキャン完了。URLを含むデータは見つかりませんでした。", "ok");
    } else {
      setStatus("スキャン完了。URLを含む項目が " + findings.length + " 件見つかりました。内容を確認して、削除する項目を選んでください。");
    }
  }
  return stats;
}

// =============================================
// 表示
// =============================================
function renderSummary(stats) {
  const body = $("summaryBody");
  body.innerHTML = "";
  stats.forEach(s => {
    const tr = document.createElement("tr");
    tr.appendChild(el("td", "", s.label));
    if (s.error) {
      const td = el("td", "error", "読み込みに失敗：" + s.error);
      td.colSpan = 3;
      tr.appendChild(td);
    } else {
      tr.appendChild(el("td", "num", String(s.total)));
      tr.appendChild(el("td", "num" + (s.hitDocs ? " hit" : ""), String(s.hitDocs)));
      tr.appendChild(el("td", "num" + (s.hitItems ? " hit" : ""), String(s.hitItems)));
    }
    body.appendChild(tr);
  });
  $("summarySection").hidden = false;
}

function renderResults() {
  const root = $("results");
  root.innerHTML = "";

  if (findings.length === 0) {
    $("toolbar").hidden = true;
    root.appendChild(el("div", "none", "URLを含むデータはありませんでした"));
    return;
  }

  SCAN_TARGETS.forEach(t => {
    const items = findings.filter(f => f.collection === t.name);
    if (!items.length) return;

    const group = el("div", "group");
    const head = el("div", "group-head");
    head.appendChild(el("h3", "", t.label));
    head.appendChild(el("span", "", items.length + " 項目"));
    group.appendChild(head);

    // ドキュメント単位にまとめる
    const byDoc = new Map();
    items.forEach(f => {
      if (!byDoc.has(f.docId)) byDoc.set(f.docId, []);
      byDoc.get(f.docId).push(f);
    });

    byDoc.forEach((list, docId) => {
      const data = originalDocs[t.name + "/" + docId];
      const card = el("div", "doc");
      const dh = el("div", "doc-head", docTitle(data));
      dh.appendChild(el("small", "", "ID: " + docId));
      card.appendChild(dh);

      list.forEach(f => {
        const row = el("div", "row");

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = f.checked;
        cb.setAttribute("aria-label", "この項目のURLを削除する");
        cb.addEventListener("change", () => { f.checked = cb.checked; updateSelectionUi(); });
        row.appendChild(cb);

        const content = el("div");
        const fl = el("div", "field", fieldLabel(data, f.path));
        fl.title = UrlGuard.pathLabel(f.path);
        content.appendChild(fl);

        const cmp = el("div", "cmp");
        const before = el("div", "box before");
        before.appendChild(el("span", "tag", "現在の内容"));
        appendHighlighted(before, f.text);
        const after = el("div", "box after" + (f.stripped === "" ? " empty" : ""));
        after.appendChild(el("span", "tag", "削除後"));
        after.appendChild(document.createTextNode(f.stripped === "" ? "（空欄になります）" : f.stripped));
        cmp.appendChild(before);
        cmp.appendChild(after);
        content.appendChild(cmp);

        row.appendChild(content);
        card.appendChild(row);
      });
      group.appendChild(card);
    });
    root.appendChild(group);
  });

  $("toolbar").hidden = false;
  updateSelectionUi();
}

function updateSelectionUi() {
  const n = findings.filter(f => f.checked).length;
  $("selCount").textContent = findings.length ? n + " / " + findings.length + " 項目を選択中" : "";
  $("applyBtn").disabled = busy || n === 0;
  $("applyBtn").textContent = n ? "選択した " + n + " 項目のURLを削除" : "選択した項目のURLを削除";
}

function setAllChecked(flag) {
  findings.forEach(f => { f.checked = flag; });
  document.querySelectorAll("#results input[type=checkbox]").forEach(cb => { cb.checked = flag; });
  updateSelectionUi();
}

// =============================================
// バックアップ（JSONダウンロード）
// =============================================
function downloadBackup(targetFindings) {
  const keys = Array.from(new Set(targetFindings.map(f => f.collection + "/" + f.docId)));
  const payload = {
    exportedAt: new Date().toISOString(),
    note: "URL削除前のデータ（対象ドキュメントの全フィールド）",
    documents: keys.map(k => {
      const idx = k.indexOf("/");
      return { collection: k.slice(0, idx), docId: k.slice(idx + 1), data: originalDocs[k] };
    }),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  a.href = url;
  a.download = "url-scan-backup-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return keys.length;
}

// =============================================
// URL削除（Firestoreへ保存）
// =============================================
// トランザクションで最新データを読み直し、対象の項目だけURLを取り除く。
// 他の人が同時に編集した内容を上書きしないため、変更のあったトップレベル項目のみ更新する。
async function fixDocument(collectionName, docId, paths) {
  const ref = db.collection(collectionName).doc(docId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return 0;
    const data = snap.data();
    const touched = new Set();
    let changed = 0;
    paths.forEach(path => {
      const cur = UrlGuard.getAtPath(data, path);
      if (typeof cur === "string" && UrlGuard.contains(cur)) {
        UrlGuard.setAtPath(data, path, UrlGuard.strip(cur));
        touched.add(path[0]);
        changed++;
      }
    });
    if (touched.size) {
      const upd = {};
      touched.forEach(k => { upd[k] = data[k]; });
      tx.update(ref, upd);
    }
    return changed;
  });
}

async function applySelected() {
  const sel = findings.filter(f => f.checked);
  if (!sel.length || busy) return;

  const ok = confirm(
    sel.length + " 項目からURLを削除して保存します。\n\n" +
    "・実行前に、対象データのバックアップ（JSON）が自動でダウンロードされます\n" +
    "・この操作は画面上では元に戻せません\n\n" +
    "実行しますか？"
  );
  if (!ok) return;

  setBusy(true);
  const nDocs = downloadBackup(sel);
  setStatus("バックアップを保存しました（" + nDocs + " 件分）。URLを削除しています…");

  const byDoc = new Map();
  sel.forEach(f => {
    const k = f.collection + "/" + f.docId;
    if (!byDoc.has(k)) byDoc.set(k, { collection: f.collection, docId: f.docId, paths: [] });
    byDoc.get(k).paths.push(f.path);
  });

  let fixedItems = 0, failedDocs = 0;
  for (const job of byDoc.values()) {
    try {
      fixedItems += await fixDocument(job.collection, job.docId, job.paths);
    } catch (err) {
      console.error(job.collection, job.docId, err);
      failedDocs++;
    }
  }

  // 最新の状態で再スキャンして一覧を更新
  await runScan({ keepStatus: true });
  if (failedDocs) {
    setStatus(fixedItems + " 項目のURLを削除しました。ただし " + failedDocs + " 件のデータで保存に失敗しました（一覧に残っています）。", "err");
  } else {
    setStatus(fixedItems + " 項目のURLを削除しました。" + (findings.length ? "残りの検出: " + findings.length + " 項目" : "URLを含むデータはなくなりました。"), "ok");
  }
}

// =============================================
// 初期化
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  $("scanBtn").addEventListener("click", () => { if (!busy) runScan(); });
  $("selectAllBtn").addEventListener("click", () => setAllChecked(true));
  $("selectNoneBtn").addEventListener("click", () => setAllChecked(false));
  $("backupBtn").addEventListener("click", () => {
    if (!findings.length) return;
    const n = downloadBackup(findings);
    setStatus("検出された " + n + " 件分のデータをJSONで保存しました。");
  });
  $("applyBtn").addEventListener("click", applySelected);
});
