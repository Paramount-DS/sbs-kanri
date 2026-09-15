// =============================================
// CUSTOMER SUCCESS - cs.js
// =============================================
'use strict';

const CIRCLE_NUMS = ["①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩",
                     "⑪","⑫","⑬","⑭","⑮","⑯","⑰","⑱","⑲","⑳"];

const CS_PHASES = [
  {
    key: "活用支援/オンボーディング",
    label: "活用支援/オンボーディング",
    goal: "オンボーディング",
    items: [
      { item:"オンボーディング①", content:"", effect:"" },
      { item:"オンボーディング②", content:"", effect:"" },
      { item:"オンボーディング③", content:"", effect:"" },
      { item:"オンボーディング④", content:"", effect:"" },
      { item:"オンボーディング⑤", content:"", effect:"" },
      { item:"オンボーディング⑥", content:"", effect:"" },
      { item:"その他", content:"", effect:"" },
    ],
  },
  {
    key: "活用支援/サポート",
    label: "活用支援/サポート",
    goal: "サポート",
    items: [
      { item:"現地サポート", content:"", effect:"" },
      { item:"遠隔サポート", content:"", effect:"" },
      { item:"その他", content:"", effect:"" },
    ],
  },
];

let allCsProjects = [];
let csSearchQuery = "";
let csFilterPerson = "";
let csFilterStatus = "";
const CS_BRANCHES = ["札幌","仙台","埼玉","東京","横浜","名古屋","大阪","広島","福岡"];
const CS_SYSTEM_TYPES = ["SBS","LiteA","LiteB","LiteC","LiteD","Connectハイブリッド","Connectオンプレ","眠りSCAN Viewer"];
let csFilterBranch = "";
let pendingCsDeleteId = null;

// =============================================
// ユーティリティ
// =============================================
function circleNum(n) {
  return CIRCLE_NUMS[n - 1] || `(${n})`;
}

function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function normalizeHospitalName(name) {
  return String(name || "").replace(/\s+/g, "").toLowerCase();
}

function getHospitalDisplayParts(project) {
  const hospitalName = String(project?.hospitalName || "").trim();
  const quickMemo = String(project?.quickMemo || "").trim();
  if (quickMemo) return { hospitalName, quickMemo };
  const legacyMatch = hospitalName.match(/^(.*?)[\s　]+([0-9０-９]+枚)$/);
  return legacyMatch
    ? { hospitalName: legacyMatch[1].trim(), quickMemo: legacyMatch[2] }
    : { hospitalName, quickMemo: "" };
}

function isDuplicateCsHospital(project, projects = allCsProjects) {
  const name = normalizeHospitalName(getHospitalDisplayParts(project).hospitalName);
  if (!name) return false;
  return projects.filter(p => normalizeHospitalName(getHospitalDisplayParts(p).hospitalName) === name).length > 1;
}

function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast toast-${type} show`;
  setTimeout(() => t.classList.remove("show"), 3000);
}

// =============================================
// 訪問ラベル生成
// オンボーディング→①オンボーディング
// サポート→④サポート（通番で）
// =============================================
function visitLabel(index, status) {
  const num = circleNum(index + 1);
  return `${num} ${getVisitStatusLabel(status)}`;
}

// =============================================
// 最終訪問日からのカラー判定
// =============================================
function getVisitColorClass(p) {
  return getCardFreshness(p).cardClass;
}

function getLastVisitInfo(p) {
  const freshness = getCardFreshness(p);
  const dateStr = freshness.latest?.endDate || freshness.latest?.startDate;
  if (!freshness.latest) return { text: "対応記録なし", cls: "last-visit-none" };
  if (!dateStr) return { text: "日付未設定", cls: "last-visit-none" };
  const lastDate = new Date(dateStr);
  const fmt = lastDate.toLocaleDateString("ja-JP", { year:"numeric", month:"2-digit", day:"2-digit" });
  const warning = freshness.cardClass === "cs-card-warning";
  const danger = freshness.cardClass === "cs-card-danger";
  return { text: `最終対応：${fmt}（${freshness.months}か月前）${danger ? " ⚠️" : ""}`, cls: danger ? "last-visit-orange" : warning ? "last-visit-yellow" : "last-visit-green" };
}

// =============================================
// EOS判定（サポートエンド2年前から）
// =============================================
function shouldShowEos(p) {
  if (!p.supportEndDate) return false;
  const end = new Date(p.supportEndDate);
  const twoYears = new Date(end);
  twoYears.setFullYear(twoYears.getFullYear() - 2);
  return new Date() >= twoYears;
}

function getProductLabels(p, longLabel = false) {
  const products = [];
  if (p.hasBedside) products.push("BS端末");
  if (p.hasBedNavi) products.push("ベッドナビ");
  if (p.hasNemiri)  products.push("眠りSCAN");
  if (p.hasRisha)   products.push("離床CATCH");
  if (p.hasVital)   products.push("バイタル連携");
  if (p.hasEhr)     products.push("EHR連携");
  if (p.hasNurse)   products.push("NC情報連携");
  if (p.hasNcNotify) products.push("NC通知連携");
  return products;
}

function getSystemLabels(p) {
  return [p.systemType1, p.systemType2].filter(Boolean);
}

function getLatestVisit(p) {
  const visits = p.visits || [];
  return visits.length ? visits[visits.length - 1] : null;
}

function getVisitStatusLabel(status) {
  return normalizeVisitStatus(status);
}

function normalizeVisitStatus(status) {
  const value = String(status || "").trim();
  if (["活用支援/サポート","support","SUP","活用","定着","活用促進","成果創出","拡大","事例創出","共創","拡大/事例創出"].includes(value)) return "活用支援/サポート";
  return "活用支援/オンボーディング";
}

function isSupportSideStatus(status) {
  return normalizeVisitStatus(status) === "活用支援/サポート";
}

function isVisitRecord(visit) {
  return visit?.isVisit === true || typeof visit?.isVisit === "undefined";
}

function getProjectActivityPhase(p) {
  return (p.visits || []).some(visit => isSupportSideStatus(visit.status))
    ? "活用支援/サポート"
    : "活用支援/オンボーディング";
}

function getLatestPhaseVisit(p, phase = getProjectActivityPhase(p)) {
  return (p.visits || []).filter(visit => normalizeVisitStatus(visit.status) === phase)
    .sort((a,b) => (b.endDate || b.startDate || "").localeCompare(a.endDate || a.startDate || ""))[0] || null;
}

function getCardFreshness(p) {
  const phase = getProjectActivityPhase(p);
  const latest = getLatestPhaseVisit(p, phase);
  const dateStr = latest?.endDate || latest?.startDate;
  if (!dateStr) return { phase, latest, months: 0, cardClass: "" };
  const lastDate = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  let months = (today.getFullYear() - lastDate.getFullYear()) * 12 + today.getMonth() - lastDate.getMonth();
  if (today.getDate() < lastDate.getDate()) months -= 1;
  months = Math.max(0, months);
  const warningAt = phase === "活用支援/サポート" ? 5 : 2;
  const dangerAt = phase === "活用支援/サポート" ? 10 : 4;
  return { phase, latest, months, cardClass: months >= dangerAt ? "cs-card-danger" : months >= warningAt ? "cs-card-warning" : "" };
}

function getLatestVisitDateText(p) {
  const latest = getLatestVisit(p);
  if (!latest) return "—";
  return latest.endDate || latest.startDate || "—";
}

function getLatestVisitDateValue(p) {
  const latestDate = getLatestVisitDateText(p);
  if (!latestDate || latestDate === "—") return 0;
  const time = new Date(latestDate).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getLatestVisitMemo(p) {
  const latest = getLatestVisit(p);
  return latest?.freeText || "";
}

function getCsPhase(key) {
  return CS_PHASES.find(phase => phase.key === key) || CS_PHASES[0];
}

function getCurrentCsPhase(p) {
  return getCsPhase(getProjectActivityPhase(p));
}

function getCsTaskSelection(p) {
  const phase = getCurrentCsPhase(p);
  const selectedItem = phase.key === p.csTaskPhase
    ? (phase.items.find(row => row.item === p.csTaskItem) || phase.items[0])
    : phase.items[0];
  return { phase, selectedItem };
}

function createCsTaskSection(p) {
  const { phase, selectedItem } = getCsTaskSelection(p);
  return `
    <div class="cs-task-section">
      <div class="cs-task-current">現在のフェーズ：<strong>${escapeHtml(phase.label)}</strong><em>${escapeHtml(phase.goal)}</em></div>
      <div class="cs-task-controls">
        <select class="cs-task-item-select" onchange="updateCsTaskItem('${p.id}', this.value)">
          ${phase.items.map(row => `<option value="${escapeHtml(row.item)}"${row.item === selectedItem.item ? " selected" : ""}>${escapeHtml(row.item)}</option>`).join("")}
        </select>
      </div>
      <div class="cs-task-detail">
        <div><span>内容</span>${escapeHtml(selectedItem.content)}</div>
        <div><span>効果</span>${escapeHtml(selectedItem.effect)}</div>
      </div>
    </div>`;
}

// =============================================
// CSカード生成
// =============================================
function createCsCard(p) {
  const lastVisit  = getLastVisitInfo(p);
  const showEos    = shouldShowEos(p);
  const visits     = p.visits || [];
  const duplicateBadge = isDuplicateCsHospital(p) ? `<span class="cs-duplicate-badge">重複</span>` : "";
  const hospitalDisplay = getHospitalDisplayParts(p);

  const products = getProductLabels(p);
  const productChecks = products.length
    ? products.map(product => `<span>☑ ${escapeHtml(product)}</span>`).join("")
    : `<span class="is-empty">未設定</span>`;

  // 直近3件の訪問
  const recentVisits = visits.slice(-3);
  const visitHtml = recentVisits.map((v, i) => {
    const realIdx = visits.length - recentVisits.length + i;
    const dateStr = v.startDate
      ? (v.endDate && v.endDate !== v.startDate ? `${v.startDate} 〜 ${v.endDate}` : v.startDate)
      : "日付未定";
    return `
      <div class="cs-visit-item">
        <div class="cs-visit-header">
          <span class="cs-visit-num">${circleNum(realIdx + 1)}</span>
          <span class="cs-visit-status-badge ${v.status}">
            ${escapeHtml(getVisitStatusLabel(v.status))}
          </span>
          ${isVisitRecord(v) ? `<span class="cs-visit-kind">訪問</span>` : `<span class="cs-visit-kind is-contact">対応</span>`}
          <button type="button" class="btn-cs-visit-edit" onclick="editCsVisit(event,'${p.id}',${realIdx})">編集</button>
          <button type="button" class="btn-cs-visit-delete" onclick="deleteVisit('${p.id}', ${realIdx})">削除</button>
          <span class="cs-visit-date">${dateStr}</span>
        </div>
        ${v.taskItem ? `<div class="cs-visit-task"><strong>${escapeHtml(v.taskItem)}</strong><span>${escapeHtml(v.taskContent || "")}</span></div>` : ""}
        ${v.assignee ? `<div class="cs-visit-assignee">対応者：${escapeHtml(v.assignee)}</div>` : ""}
        ${v.freeText ? `<div class="cs-visit-text">${escapeHtml(v.freeText)}</div>` : ""}
      </div>`;
  }).join("");

  const startFmt = p.startDate
    ? new Date(p.startDate).toLocaleDateString("ja-JP", { year:"numeric", month:"2-digit", day:"2-digit" })
    : "未設定";

  return `
    <div class="cs-card ${getVisitColorClass(p)}" data-id="${p.id}">
      ${showEos ? `<span class="eos-badge">EOS</span>` : ""}
      <div class="cs-card-head-grid">
        <div class="cs-card-identity">
          <div class="cs-card-title">${escapeHtml(hospitalDisplay.hospitalName)}${hospitalDisplay.quickMemo ? `　<span class="cs-card-quick-memo">メモ:${escapeHtml(hospitalDisplay.quickMemo)}</span>` : ""}${duplicateBadge}</div>
          <div class="cs-card-sub">
            ${p.branch ? `<span class="cs-meta-tag cs-meta-branch">${escapeHtml(p.branch)}支店</span>` : ""}
            <span class="cs-meta-tag cs-meta-date">稼働 ${startFmt}</span>
            ${p.csPerson ? `<span class="cs-meta-tag cs-meta-person">担当 ${escapeHtml(p.csPerson)}</span>` : ""}
          </div>
        </div>
      </div>
      ${products.length ? `<div class="cs-products">${products.map(pr => `<span class="cs-product-badge">${pr}</span>`).join("")}</div>` : ""}
      <div class="cs-install-info">
        <div><span>導入製品モデル①</span><strong>${escapeHtml(p.systemType1 || "—")}</strong></div>
        <div><span>導入製品モデル②</span><strong>${escapeHtml(p.systemType2 || "—")}</strong></div>
        <div class="cs-install-wide"><span>導入範囲</span><strong>${escapeHtml(p.ward || "—")}</strong></div>
        <div class="cs-install-wide"><span>導入製品</span><div class="cs-install-products">${productChecks}</div></div>
      </div>
      <div class="${lastVisit.cls} last-visit-indicator">${lastVisit.text}</div>
      ${visits.length
        ? `<details class="cs-visits-section">
             <summary class="cs-visits-label">訪問履歴（${visits.length}件）</summary>
             ${visitHtml}
           </details>`
        : `<div class="cs-visits-empty">訪問履歴（0件）</div>`}
      <div class="cs-card-actions">
        <button class="btn-cs-next" onclick="openVisitModal('${p.id}')">記録を追加</button>
        <button class="btn-cs-detail" onclick="location.href='cs-dashboard.html?id=${encodeURIComponent(p.id)}'">詳細</button>
        <button class="btn-cs-edit" onclick="openCsEditModal('${p.id}')">編集</button>
        <button class="btn-cs-delete" onclick="openCsDeleteModal('${p.id}')">削除</button>
      </div>
    </div>`;
}

// =============================================
// レンダリング
// =============================================
function renderCsProjects() {
  const container  = document.getElementById("csProjectList");
  const emptyState = document.getElementById("csEmptyState");
  if (!container || !emptyState) return;

  let filtered = allCsProjects.filter(p => {
    const matchName   = (p.hospitalName || "").toLowerCase().includes(csSearchQuery.toLowerCase());
    const matchPerson = !csFilterPerson || p.csPerson === csFilterPerson;
    const matchStatus = !csFilterStatus || normalizeVisitStatus(getLatestVisit(p)?.status) === csFilterStatus;
    const matchBranch = !csFilterBranch || p.branch === csFilterBranch;
    return matchName && matchPerson && matchStatus && matchBranch;
  });

  filtered.sort((a,b)=>(a.hospitalName||"").localeCompare(b.hospitalName||"","ja"));

  document.getElementById("csProjectCount").textContent = `${filtered.length} 件`;

  if (!filtered.length) {
    container.innerHTML = "";
    emptyState.style.display = "flex";
  } else {
    emptyState.style.display = "none";
    container.innerHTML = filtered.map(createCsCard).join("");
  }
  updateCsStats();
}

function createCsListRow(p) {
  const latest = getLatestVisit(p);
  const latestDate = getLatestVisitDateText(p);
  const memo = getLatestVisitMemo(p) || p.memo || "";
  return `<tr>
    <td class="cs-list-hospital"><a class="cs-list-hospital-link" href="cs-dashboard.html?id=${encodeURIComponent(p.id)}">${escapeHtml(p.hospitalName || "")}</a></td>
    <td>${escapeHtml(p.csPerson || "—")}</td>
    <td><span class="cs-list-status">${escapeHtml(getVisitStatusLabel(latest?.status))}</span></td>
    <td><span class="cs-list-visit">${escapeHtml(latestDate)}</span></td>
    <td class="cs-list-memo"><div class="cs-list-memo-preview" tabindex="0" data-memo="${escapeHtml(memo)}">${escapeHtml(memo || "—")}</div></td>
  </tr>`;
}

function renderCsList() {
  const tbody = document.getElementById("csTableBody");
  if (!tbody) return;

  let filtered = allCsProjects.filter(p => {
    const q = csSearchQuery.toLowerCase();
    const name = (p.hospitalName || "").toLowerCase();
    const matchName = name.includes(q);
    const matchPerson = !csFilterPerson || p.csPerson === csFilterPerson;
    const latestStatus = normalizeVisitStatus(getLatestVisit(p)?.status);
    const matchStatus = !csFilterStatus || latestStatus === csFilterStatus;
    return matchName && matchPerson && matchStatus;
  });

  filtered.sort((a, b) => {
    const latestDiff = getLatestVisitDateValue(b) - getLatestVisitDateValue(a);
    if (latestDiff !== 0) return latestDiff;
    return (a.startDate || "").localeCompare(b.startDate || "");
  });

  document.getElementById("csProjectCount").textContent = `${filtered.length} 件`;
  tbody.innerHTML = filtered.length
    ? filtered.map(createCsListRow).join("")
    : `<tr><td colspan="5" class="cs-list-loading">該当するCS案件がありません</td></tr>`;
  updateCsStats();
}

function renderCsView() {
  if (document.getElementById("csTableBody")) renderCsList();
  else renderCsProjects();
}

function initMemoPreviewPopup() {
  if (!document.getElementById("csTableBody") || document.getElementById("csMemoHoverPopup")) return;
  const popup = document.createElement("div");
  popup.id = "csMemoHoverPopup";
  popup.className = "cs-memo-hover-popup";
  popup.setAttribute("role", "tooltip");
  document.body.appendChild(popup);
  const show = target => {
    const memo = target?.dataset?.memo;
    if (!memo) return;
    popup.textContent = memo;
    popup.classList.add("show");
    const rect = target.getBoundingClientRect();
    const width = Math.min(560, window.innerWidth - 24);
    popup.style.width = `${width}px`;
    popup.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
    const below = rect.bottom + 8;
    popup.style.top = `${below + Math.min(320, popup.offsetHeight) > window.innerHeight ? Math.max(12, rect.top - popup.offsetHeight - 8) : below}px`;
  };
  const hide = () => popup.classList.remove("show");
  document.addEventListener("mouseover", event => { const target=event.target.closest?.(".cs-list-memo-preview"); if(target) show(target); });
  document.addEventListener("mouseout", event => { if(event.target.closest?.(".cs-list-memo-preview")) hide(); });
  document.addEventListener("focusin", event => { const target=event.target.closest?.(".cs-list-memo-preview"); if(target) show(target); });
  document.addEventListener("focusout", event => { if(event.target.closest?.(".cs-list-memo-preview")) hide(); });
  window.addEventListener("scroll", hide, true);
}

function renderCsBranchTabs() {
  const tabs = document.getElementById("csBranchTabs");
  if (!tabs) return;
  const branches = ["", ...CS_BRANCHES];
  tabs.innerHTML = branches.map(branch => {
    const label = branch || "すべて";
    const count = branch ? allCsProjects.filter(p => p.branch === branch).length : allCsProjects.length;
    return `<button type="button" class="cs-branch-tab${branch === csFilterBranch ? " active" : ""}" data-branch="${escapeHtml(branch)}">${label}<span>${count}</span></button>`;
  }).join("");
  tabs.querySelectorAll(".cs-branch-tab").forEach(button => button.addEventListener("click", () => {
    csFilterBranch = button.dataset.branch || "";
    renderCsBranchTabs();
    renderCsView();
  }));
}

function loadXlsxLibrary() {
  if (typeof XLSX !== "undefined") return Promise.resolve();
  const sources = [
    "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
    "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js"
  ];
  return new Promise((resolve, reject) => {
    const tryNext = index => {
      if (index >= sources.length) { reject(new Error("Excelライブラリを読み込めませんでした")); return; }
      const script = document.createElement("script");
      script.src = sources[index];
      script.onload = () => typeof XLSX !== "undefined" ? resolve() : tryNext(index + 1);
      script.onerror = () => tryNext(index + 1);
      document.head.appendChild(script);
    };
    tryNext(0);
  });
}

async function exportCsActivitiesXlsx() {
  try { await loadXlsxLibrary(); }
  catch (error) { showToast(error.message, "error"); return; }
  const projects = allCsProjects.filter(p => !csFilterBranch || p.branch === csFilterBranch);
  const rows = [["項目名","病院名","直近活動日","対応者","直近活動内容","最終活動日","活動総数"]];
  projects.forEach(p => {
    const visits = p.visits || [];
    const latest = visits.slice().sort((a,b) => String(b.endDate || b.startDate || b.createdAt || "").localeCompare(String(a.endDate || a.startDate || a.createdAt || "")))[0] || {};
    const date = latest.endDate || latest.startDate || "";
    rows.push([latest.taskItem || "", getHospitalDisplayParts(p).hospitalName, date, latest.assignee || p.csPerson || "", latest.freeText || latest.taskContent || "", date, visits.length]);
  });
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{wch:22},{wch:28},{wch:14},{wch:16},{wch:50},{wch:14},{wch:12}];
  sheet["!autofilter"] = { ref:`A1:G${Math.max(1, rows.length)}` };
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "活動内容");
  XLSX.writeFile(book, `パラサイト_活動内容_${csFilterBranch || "全支店"}_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast(`${projects.length}件の活動内容を出力しました`);
}

function updateCsStats() {
  const total = document.getElementById("csTotalStat");
  const scoped = csFilterBranch ? allCsProjects.filter(p => p.branch === csFilterBranch) : allCsProjects;
  if (total)  total.textContent  = scoped.length;
}

// =============================================
// Firestore リアルタイム同期
// =============================================
function initCs() {
  renderCsBranchTabs();
  const branchSelect = document.getElementById("csBranch");
  if (branchSelect) branchSelect.innerHTML = `<option value="">-- 選択 --</option>` + CS_BRANCHES.map(branch => `<option value="${branch}">${branch}</option>`).join("");
  // 検索
  const searchInput = document.getElementById("csSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      csSearchQuery = e.target.value;
      renderCsView();
    });
  }

  // 担当者フィルタ
  const staffSel = document.getElementById("csStaffFilter");
  if (staffSel) {
    updateCsStaffFilter();
    staffSel.addEventListener("change", e => {
      csFilterPerson = e.target.value;
      renderCsView();
    });
  }

  const statusSel = document.getElementById("csStatusFilter");
  if (statusSel) {
    statusSel.innerHTML = `<option value="">全CSステータス</option>` + CS_PHASES.map(phase => `<option value="${escapeHtml(phase.key)}">${escapeHtml(getVisitStatusLabel(phase.key))}</option>`).join("");
    statusSel.addEventListener("change", e => {
      csFilterStatus = e.target.value;
      renderCsView();
    });
  }
  initMemoPreviewPopup();

  // 登録フォームの担当者プルダウン
  if (document.getElementById("csSalesPerson")) populateCsStaffSelect();

  // フォームイベント
  const projectForm = document.getElementById("csProjectForm");
  const visitForm = document.getElementById("visitForm");
  if (projectForm) projectForm.addEventListener("submit", saveCsProject);
  if (visitForm) visitForm.addEventListener("submit", saveVisit);

  // モーダル外クリックで閉じる
  ["csModal","visitModal","csDetailModal","csDeleteModal"].forEach(id => {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.addEventListener("click", e => {
      if (e.target.id === id) {
        if      (id === "csModal")       closeCsModal();
        else if (id === "visitModal")    closeVisitModal();
        else if (id === "csDetailModal") closeCsDetailModal();
        else                             closeCsDeleteModal();
      }
    });
  });

  // Enterで削除確定
  const deletePassword = document.getElementById("csDeletePassword");
  if (deletePassword) {
    deletePassword.addEventListener("keydown", e => {
      if (e.key === "Enter") confirmCsDelete();
    });
  }

  // Firestore
  db.collection("cs_projects")
    .where("type", "==", "cs")
    .onSnapshot(snapshot => {
      allCsProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateCsStaffFilter();
      populateCsStaffSelect();
      renderCsBranchTabs();
      renderCsView();
    }, err => {
      console.error("CS Firestore error:", err);
      showToast("CSデータ取得に失敗しました", "error");
    });
}

function populateCsStaffSelect() {
  ["csSalesPerson", "csPerson"].forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    const listId = `${id}List`;
    let datalist = document.getElementById(listId);
    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = listId;
      input.parentNode.appendChild(datalist);
    }
    datalist.innerHTML = getCsStaffCandidates(id).map(s => `<option value="${escapeHtml(s)}"></option>`).join("");
    input.setAttribute("list", listId);
  });
}

function updateCsStaffFilter() {
  const sel = document.getElementById("csStaffFilter");
  if (!sel) return;
  const current = sel.value;
  const staff = getCsStaffCandidates();
  sel.innerHTML = `<option value="">全員表示</option>` +
    staff.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  if (current && staff.includes(current)) sel.value = current;
  else csFilterPerson = "";
}

function getCsStaffCandidates(targetId = "csPerson") {
  const staffSet = new Set();
  allCsProjects.forEach(p => {
    if (targetId === "csSalesPerson" && p.salesPerson && p.salesPerson.trim()) staffSet.add(p.salesPerson.trim());
    if (targetId !== "csSalesPerson" && p.csPerson && p.csPerson.trim()) staffSet.add(p.csPerson.trim());
  });
  const sorted = Array.from(staffSet).filter(s => s && s !== "その他").sort();
  if (staffSet.has("その他")) sorted.push("その他");
  return sorted;
}

// =============================================
// CS案件 登録・編集モーダル
// =============================================
function openCsAddModal() {
  document.getElementById("csModalTitle").textContent = "CS案件 新規登録";
  document.getElementById("csProjectForm").reset();
  document.getElementById("csEditId").value = "";
  populateCsStaffSelect();
  document.getElementById("csModal").classList.add("open");
}

function openCsEditModal(id) {
  const p = allCsProjects.find(x => x.id === id);
  if (!p) return;
  const hospitalDisplay = getHospitalDisplayParts(p);
  document.getElementById("csModalTitle").textContent = "CS案件 編集";
  document.getElementById("csEditId").value       = id;
  document.getElementById("csBranch").value       = p.branch || "";
  document.getElementById("csHospitalName").value = hospitalDisplay.hospitalName;
  document.getElementById("csQuickMemo").value     = hospitalDisplay.quickMemo;
  document.getElementById("csWard").value         = p.ward || "";
  document.getElementById("csStartDate").value    = p.startDate || "";
  document.getElementById("csSupportEndDate").value = p.supportEndDate || "";
  document.getElementById("csSolPm").value        = p.solPm || "";
  document.getElementById("csSystemType1").value  = p.systemType1 || "";
  document.getElementById("csSystemType2").value  = p.systemType2 || "";
  document.getElementById("csMoveOp").value       = p.moveOp || "";
  document.getElementById("csBedNumStaff").value  = p.bedNumStaff || "";
  document.getElementById("csBedMoveStaff").value = p.bedMoveStaff || "";
  document.getElementById("csMemo").value         = p.memo || "";
  document.getElementById("csHasBedside").checked = !!p.hasBedside;
  document.getElementById("csHasBedNavi").checked = !!p.hasBedNavi;
  document.getElementById("csHasNemiri").checked  = !!p.hasNemiri;
  document.getElementById("csHasRisha").checked   = !!p.hasRisha;
  document.getElementById("csHasVital").checked   = !!p.hasVital;
  document.getElementById("csHasEhr").checked     = !!p.hasEhr;
  document.getElementById("csHasNurse").checked   = !!p.hasNurse;
  document.getElementById("csHasNcNotify").checked = !!p.hasNcNotify;
  populateCsStaffSelect();
  document.getElementById("csSalesPerson").value  = p.salesPerson || "";
  document.getElementById("csPerson").value       = p.csPerson || "";
  document.getElementById("csModal").classList.add("open");
}

function closeCsModal() {
  document.getElementById("csModal").classList.remove("open");
}

async function saveCsProject(e) {
  e.preventDefault();
  const id = document.getElementById("csEditId").value;
  const hospitalInput = getHospitalDisplayParts({
    hospitalName: document.getElementById("csHospitalName").value,
    quickMemo: document.getElementById("csQuickMemo").value,
  });
  const data = {
    type:          "cs",
    branch:        document.getElementById("csBranch").value,
    hospitalName:  hospitalInput.hospitalName,
    quickMemo:     hospitalInput.quickMemo,
    ward:          document.getElementById("csWard").value.trim(),
    startDate:     document.getElementById("csStartDate").value,
    supportEndDate:document.getElementById("csSupportEndDate").value,
    salesPerson:   document.getElementById("csSalesPerson").value.trim(),
    csPerson:      document.getElementById("csPerson").value.trim(),
    solPm:         document.getElementById("csSolPm").value.trim(),
    systemType1:   document.getElementById("csSystemType1").value,
    systemType2:   document.getElementById("csSystemType2").value,
    moveOp:        document.getElementById("csMoveOp").value,
    bedNumStaff:   document.getElementById("csBedNumStaff").value.trim(),
    bedMoveStaff:  document.getElementById("csBedMoveStaff").value.trim(),
    memo:          document.getElementById("csMemo").value.trim(),
    hasBedside:    document.getElementById("csHasBedside").checked,
    hasBedNavi:    document.getElementById("csHasBedNavi").checked,
    hasNemiri:     document.getElementById("csHasNemiri").checked,
    hasRisha:      document.getElementById("csHasRisha").checked,
    hasVital:      document.getElementById("csHasVital").checked,
    hasEhr:        document.getElementById("csHasEhr").checked,
    hasNurse:      document.getElementById("csHasNurse").checked,
    hasNcNotify:   document.getElementById("csHasNcNotify").checked,
  };
  if (!data.branch) { showToast("支店を選択してください", "error"); return; }
  if (!data.hospitalName) { showToast("病院名を入力してください", "error"); return; }
  try {
    if (id) {
      await db.collection("cs_projects").doc(id).update(data);
      showToast("CS案件を更新しました");
    } else {
      data.visits    = [];
      data.createdAt = new Date().toISOString();
      await db.collection("cs_projects").add(data);
      showToast("CS案件を登録しました");
    }
    closeCsModal();
  } catch (err) {
    console.error(err);
    showToast("保存に失敗しました", "error");
  }
}

// =============================================
// 訪問追加モーダル
// =============================================
function updateVisitTaskOptions(selectedItem = "") {
  const status = document.getElementById("visitStatus").value;
  const phase = getCsPhase(normalizeVisitStatus(status));
  const select = document.getElementById("visitTaskItem");
  select.innerHTML = phase.items.map(item => `<option value="${escapeHtml(item.item)}">${escapeHtml(item.item)}</option>`).join("");
  if (selectedItem && phase.items.some(item => item.item === selectedItem)) select.value = selectedItem;
  updateVisitTaskDetail();
}

function updateVisitTaskDetail() {
  const phase = getCsPhase(normalizeVisitStatus(document.getElementById("visitStatus").value));
  const selected = phase.items.find(item => item.item === document.getElementById("visitTaskItem").value) || phase.items[0];
  const target = document.getElementById("visitTaskDetail");
  if (!target) return;
  target.innerHTML = selected ? `
    <div><span>ゴール</span><strong>${escapeHtml(phase.goal)}</strong></div>
    <div><span>内容</span><p>${escapeHtml(selected.content)}</p></div>
    <div><span>効果・結果</span><p>${escapeHtml(selected.effect)}</p></div>` : "";
}

function openVisitModal(projectId, editIndex = -1) {
  const p = allCsProjects.find(x => x.id === projectId);
  if (!p) return;
  const visits = p.visits || [];
  const targetVisit = editIndex >= 0 ? visits[editIndex] : null;
  const nextNum = targetVisit ? editIndex + 1 : visits.length + 1;
  document.getElementById("visitForm").reset();
  document.getElementById("visitNumLabel").textContent    = targetVisit ? `第 ${nextNum} 回 編集` : `第 ${nextNum} 回`;
  document.getElementById("visitHospitalLabel").textContent = p.hospitalName;
  document.getElementById("visitProjectId").value         = projectId;
  document.getElementById("visitEditIndex").value         = editIndex;
  document.getElementById("visitIsVisit").checked = false;
  if (targetVisit) {
    document.getElementById("visitStatus").value = normalizeVisitStatus(targetVisit.status);
    updateVisitTaskOptions(targetVisit.taskItem || "");
    document.getElementById("visitStartDate").value = targetVisit.startDate || "";
    document.getElementById("visitEndDate").value = targetVisit.endDate || "";
    document.getElementById("visitFreeText").value = targetVisit.freeText || "";
    document.getElementById("visitAssignee").value = targetVisit.assignee || "";
    document.getElementById("visitIsVisit").checked = isVisitRecord(targetVisit);
  } else {
    document.getElementById("visitStatus").value = getProjectActivityPhase(p);
    updateVisitTaskOptions();
    document.getElementById("visitAssignee").value = p.csPerson || "";
  }
  document.getElementById("visitModal").classList.add("open");
}

function editCsVisit(event,projectId,index){
  event?.preventDefault();
  event?.stopPropagation();
  openVisitModal(projectId,index);
}

function closeVisitModal() {
  document.getElementById("visitModal").classList.remove("open");
}

async function saveVisit(e) {
  e.preventDefault();
  const projectId = document.getElementById("visitProjectId").value;
  const editIndex = parseInt(document.getElementById("visitEditIndex").value, 10);
  const p = allCsProjects.find(x => x.id === projectId);
  if (!p) return;

  const visit = {
    status:    document.getElementById("visitStatus").value,
    taskItem:  document.getElementById("visitTaskItem").value,
    assignee:  document.getElementById("visitAssignee").value.trim(),
    isVisit:   document.getElementById("visitIsVisit").checked,
    startDate: document.getElementById("visitStartDate").value,
    endDate:   document.getElementById("visitEndDate").value,
    freeText:  document.getElementById("visitFreeText").value.trim(),
  };
  const selectedPhase = getCsPhase(normalizeVisitStatus(visit.status));
  const selectedTask = selectedPhase.items.find(item => item.item === visit.taskItem);
  visit.taskContent = selectedTask?.content || "";
  visit.taskEffect = selectedTask?.effect || "";

  const updatedVisits = [...(p.visits || [])];
  if (editIndex >= 0) {
    visit.createdAt = updatedVisits[editIndex]?.createdAt || new Date().toISOString();
    visit.updatedAt = new Date().toISOString();
    updatedVisits[editIndex] = visit;
  } else {
    visit.createdAt = new Date().toISOString();
    updatedVisits.push(visit);
  }
  try {
    await db.collection("cs_projects").doc(projectId).update({ visits: updatedVisits });
    showToast(editIndex >= 0 ? "訪問記録を更新しました" : "訪問記録を追加しました");
    closeVisitModal();
  } catch (err) {
    console.error(err);
    showToast("保存に失敗しました", "error");
  }
}

async function deleteVisit(projectId, index) {
  const p = allCsProjects.find(x => x.id === projectId);
  if (!p) return;
  const updatedVisits = [...(p.visits || [])];
  if (index < 0 || index >= updatedVisits.length) return;
  updatedVisits.splice(index, 1);
  try {
    await db.collection("cs_projects").doc(projectId).update({ visits: updatedVisits });
    showToast("訪問記録を削除しました");
  } catch (err) {
    console.error(err);
    showToast("削除に失敗しました", "error");
  }
}

async function updateCsTaskPhase(projectId, phaseKey) {
  const phase = getCsPhase(phaseKey);
  const firstItem = phase.items[0]?.item || "";
  try {
    await db.collection("cs_projects").doc(projectId).update({
      csTaskPhase: phase.key,
      csTaskItem: firstItem,
    });
    showToast("CSフェーズを更新しました");
  } catch (err) {
    console.error(err);
    showToast("CSフェーズの更新に失敗しました", "error");
  }
}

async function updateCsTaskItem(projectId, item) {
  const p = allCsProjects.find(x => x.id === projectId);
  const phase = p ? getCurrentCsPhase(p) : CS_PHASES[0];
  try {
    await db.collection("cs_projects").doc(projectId).update({ csTaskPhase: phase.key, csTaskItem: item });
    showToast("CS項目を更新しました");
  } catch (err) {
    console.error(err);
    showToast("CS項目の更新に失敗しました", "error");
  }
}

// =============================================
// CS詳細ポップアップ
// =============================================
function openCsDetailModal(id) {
  const p = allCsProjects.find(x => x.id === id);
  if (!p) return;
  document.getElementById("csDetailTitle").textContent = p.hospitalName || "CS詳細";

  const products = getProductLabels(p, true);
  const systems = getSystemLabels(p);

  const visits = p.visits || [];
  const visitRows = visits.map((v, i) => {
    const label   = visitLabel(i, v.status);
    const dateStr = v.startDate
      ? (v.endDate && v.endDate !== v.startDate ? `${v.startDate} 〜 ${v.endDate}` : v.startDate)
      : "—";
    return `<tr>
      <th>${label}</th>
      <td>
        <div style="font-size:11px;color:#5a6475;">${dateStr}</div>
        <div style="margin-top:3px;white-space:pre-wrap;">${escapeHtml(v.freeText || "—")}</div>
      </td>
    </tr>`;
  }).join("");

  document.getElementById("csDetailBody").innerHTML = `
    <table class="detail-table">
      <tbody>
        <tr><th>病院名</th><td>${escapeHtml(p.hospitalName||"")}</td></tr>
        <tr><th>導入病棟名</th><td>${escapeHtml(p.ward||"")}</td></tr>
        <tr><th>稼働開始日</th><td>${p.startDate||"—"}</td></tr>
        <tr><th>サポートエンド</th><td>${p.supportEndDate||"—"}</td></tr>
        <tr><th>担当営業</th><td>${escapeHtml(p.salesPerson||"")}</td></tr>
        <tr><th>担当CS</th><td>${escapeHtml(p.csPerson||"")}</td></tr>
        <tr><th>SOL PM</th><td>${escapeHtml(p.solPm||"")}</td></tr>
        <tr><th>システム種類</th><td>${systems.length ? systems.map(escapeHtml).join("、") : "—"}</td></tr>
        <tr><th>導入製品</th><td>${products.length ? products.join("、") : "—"}</td></tr>
        <tr><th>病床移動運用</th><td>${escapeHtml(p.moveOp||"")}</td></tr>
        <tr><th>病床番号変更担当</th><td>${escapeHtml(p.bedNumStaff||"")}</td></tr>
        <tr><th>床頭台移動担当</th><td>${escapeHtml(p.bedMoveStaff||"")}</td></tr>
        <tr><th>メモ</th><td style="white-space:pre-wrap;">${escapeHtml(p.memo||"")}</td></tr>
        ${visitRows}
      </tbody>
    </table>`;
  document.getElementById("csDetailModal").classList.add("open");
}

function closeCsDetailModal() {
  document.getElementById("csDetailModal").classList.remove("open");
}

// =============================================
// CS削除
// =============================================
function openCsDeleteModal(id) {
  pendingCsDeleteId = id;
  document.getElementById("csDeletePassword").value = "";
  document.getElementById("csDeleteError").textContent = "";
  document.getElementById("csDeleteModal").classList.add("open");
  setTimeout(() => document.getElementById("csDeletePassword").focus(), 100);
}

function closeCsDeleteModal() {
  document.getElementById("csDeleteModal").classList.remove("open");
  pendingCsDeleteId = null;
}

async function confirmCsDelete() {
  const pw = document.getElementById("csDeletePassword").value;
  if (pw !== "0000") {
    document.getElementById("csDeleteError").textContent = "パスワードが違います";
    return;
  }
  if (!pendingCsDeleteId) return;
  try {
    await db.collection("cs_projects").doc(pendingCsDeleteId).delete();
    showToast("CS案件を削除しました");
    closeCsDeleteModal();
  } catch (err) {
    console.error(err);
    showToast("削除に失敗しました", "error");
  }
}

// =============================================
// 初期化
// =============================================
// =============================================
// JSON 取込
// =============================================
let csImportData = [];

function openCsImportModal() {
  csImportData = [];
  document.getElementById("csImportFileInput").value = "";
  const tableInput = document.getElementById("csImportTableInput");
  if (tableInput) tableInput.value = "";
  document.getElementById("csImportPreview").style.display = "none";
  document.getElementById("csImportNoData").style.display = "none";
  document.getElementById("csImportError").textContent = "";
  document.getElementById("csImportExecuteBtn").disabled = true;
  document.getElementById("csImportModal").classList.add("open");
}

function closeCsImportModal() {
  document.getElementById("csImportModal").classList.remove("open");
  csImportData = [];
}

function normalizeCsHeader(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[▼▽]/g, "")
    .trim();
}

function isCheckedCell(value) {
  return ["○", "〇", "◯", "o", "O", "1", "true", "TRUE", "有", "あり", "yes", "YES"].includes(String(value || "").trim());
}

function getTableValue(row, indexes, names) {
  for (const name of names) {
    const index = indexes[normalizeCsHeader(name)];
    if (index !== undefined) return row[index] || "";
  }
  return "";
}

function parseCsTableText(text) {
  const lines = String(text || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delimiter).map(normalizeCsHeader);
  const indexes = {};
  headers.forEach((header, index) => { if (header) indexes[header] = index; });

  return lines.slice(1).map(line => {
    const row = line.split(delimiter);
    const hospitalName = getTableValue(row, indexes, ["病院名"]);
    return {
      type: "cs",
      hospitalName,
      ward: getTableValue(row, indexes, ["導入病棟"]),
      startDate: getTableValue(row, indexes, ["稼働開始日"]),
      supportEndDate: getTableValue(row, indexes, ["稼働終了日"]),
      salesPerson: getTableValue(row, indexes, ["担当営業"]),
      csPerson: getTableValue(row, indexes, ["担当CS"]),
      solPm: getTableValue(row, indexes, ["SOL PM", "SOLPM"]),
      systemType1: getTableValue(row, indexes, ["システム種類1"]),
      systemType2: getTableValue(row, indexes, ["システム種類2"]),
      hasBedside: isCheckedCell(getTableValue(row, indexes, ["BS端末"])),
      hasBedNavi: isCheckedCell(getTableValue(row, indexes, ["ベッドナビ"])),
      hasNemiri: isCheckedCell(getTableValue(row, indexes, ["眠りSCAN"])),
      hasRisha: isCheckedCell(getTableValue(row, indexes, ["離床CATCH"])),
      hasVital: isCheckedCell(getTableValue(row, indexes, ["バイタル連携"])),
      hasEhr: isCheckedCell(getTableValue(row, indexes, ["EHR連携"])),
      hasNurse: isCheckedCell(getTableValue(row, indexes, ["NC情報連携"])),
      hasNcNotify: isCheckedCell(getTableValue(row, indexes, ["NC通知連携"])),
      moveOp: getTableValue(row, indexes, ["病床移動時の運用"]),
      bedNumStaff: getTableValue(row, indexes, ["病床番号変更担当"]),
      bedMoveStaff: getTableValue(row, indexes, ["床頭台移動担当"]),
      memo: getTableValue(row, indexes, ["メモ"]),
      visits: [],
    };
  }).filter(row => row.hospitalName);
}

function normalizeCsImportItems(json) {
  const rows = Array.isArray(json) ? json : [json];
  const byHospital = new Map();
  rows.map(item => ({
    type:            "cs",
    hospitalName:    String(item.hospitalName || "").trim(),
    ward:            String(item.ward         || "").trim(),
    startDate:       String(item.startDate    || "").trim(),
    supportEndDate:  String(item.supportEndDate || "").trim(),
    salesPerson:     String(item.salesPerson  || "").trim(),
    csPerson:        String(item.csPerson     || "").trim(),
    solPm:           String(item.solPm        || "").trim(),
    systemType1:     String(item.systemType1  || "").trim(),
    systemType2:     String(item.systemType2  || "").trim(),
    hasBedside:      Boolean(item.hasBedside),
    hasBedNavi:      Boolean(item.hasBedNavi),
    hasNemiri:       Boolean(item.hasNemiri),
    hasRisha:        Boolean(item.hasRisha),
    hasVital:        Boolean(item.hasVital),
    hasEhr:          Boolean(item.hasEhr),
    hasNurse:        Boolean(item.hasNurse),
    hasNcNotify:     Boolean(item.hasNcNotify),
    moveOp:          String(item.moveOp       || "").trim(),
    bedNumStaff:     String(item.bedNumStaff  || "").trim(),
    bedMoveStaff:    String(item.bedMoveStaff || "").trim(),
    memo:            String(item.memo         || "").trim(),
    visits:          Array.isArray(item.visits) ? item.visits : [],
    createdAt:       new Date().toISOString(),
  })).filter(d => d.hospitalName).forEach(item => {
    byHospital.set(item.hospitalName, item);
  });
  return Array.from(byHospital.values());
}

function renderCsImportPreview(data) {
  csImportData = normalizeCsImportItems(data);
  const preview = document.getElementById("csImportPreview");
  const noData = document.getElementById("csImportNoData");
  const executeBtn = document.getElementById("csImportExecuteBtn");

  preview.style.display = "none";
  noData.style.display = "none";
  executeBtn.disabled = true;

  if (csImportData.length === 0) {
    noData.style.display = "block";
    return;
  }

  document.getElementById("csImportCount").textContent = csImportData.length;
  document.getElementById("csImportPreviewBody").innerHTML = csImportData.map(d => `
    <tr style="border-bottom:1px solid #f0f2f5;">
      <td style="padding:7px 10px;font-weight:600;">${escapeHtml(d.hospitalName)}</td>
      <td style="padding:7px 10px;">${escapeHtml(d.salesPerson || "―")}</td>
      <td style="padding:7px 10px;">${escapeHtml(d.csPerson || "―")}</td>
      <td style="padding:7px 10px;">${escapeHtml(d.startDate || "未設定")}</td>
      <td style="padding:7px 10px;">${escapeHtml(d.systemType1 || "―")}</td>
    </tr>`).join("");
  preview.style.display = "block";
  executeBtn.disabled = false;
}

function previewBundledCsCardImport() {
  document.getElementById("csImportFileInput").value = "";
  const tableInput = document.getElementById("csImportTableInput");
  if (tableInput) tableInput.value = "";
  document.getElementById("csImportError").textContent = "";
  document.getElementById("csImportModal").classList.add("open");

  if (!Array.isArray(window.CS_CARD_IMPORT_DATA) || window.CS_CARD_IMPORT_DATA.length === 0) {
    document.getElementById("csImportNoData").style.display = "block";
    document.getElementById("csImportExecuteBtn").disabled = true;
    document.getElementById("csImportError").textContent = "CS-CARDデータが見つかりませんでした";
    return;
  }

  renderCsImportPreview(window.CS_CARD_IMPORT_DATA);
}

function previewCsTableImport() {
  const input = document.getElementById("csImportTableInput");
  document.getElementById("csImportFileInput").value = "";
  document.getElementById("csImportError").textContent = "";

  const rows = parseCsTableText(input ? input.value : "");
  if (!rows.length) {
    document.getElementById("csImportPreview").style.display = "none";
    document.getElementById("csImportNoData").style.display = "block";
    document.getElementById("csImportExecuteBtn").disabled = true;
    document.getElementById("csImportError").textContent = "貼り付け表から取込可能なデータが見つかりませんでした";
    return;
  }
  renderCsImportPreview(rows);
}

function previewCsImport(input) {
  const file = input.files[0]; if (!file) return;
  const tableInput = document.getElementById("csImportTableInput");
  if (tableInput) tableInput.value = "";
  document.getElementById("csImportError").textContent = "";
  document.getElementById("csImportPreview").style.display = "none";
  document.getElementById("csImportNoData").style.display = "none";
  document.getElementById("csImportExecuteBtn").disabled = true;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      let json;
      try { json = JSON.parse(e.target.result); }
      catch(err) { document.getElementById("csImportError").textContent = "JSONの形式が正しくありません: " + err.message; return; }
      renderCsImportPreview(json);
    } catch(err) {
      console.error(err);
      document.getElementById("csImportError").textContent = "読み込みに失敗しました: " + err.message;
    }
  };
  reader.readAsText(file, "utf-8");
}

async function executeCsImport() {
  if (!csImportData.length) return;
  const btn = document.getElementById("csImportExecuteBtn");
  btn.disabled = true; btn.textContent = "取込中...";
  let added = 0, updated = 0, ng = 0;
  for (const item of csImportData) {
    try {
      const snapshot = await db.collection("cs_projects")
        .where("hospitalName", "==", item.hospitalName)
        .get();
      const existing = snapshot.docs.find(doc => (doc.data() || {}).type === "cs") || snapshot.docs[0];
      if (existing) {
        await db.collection("cs_projects").doc(existing.id).set(item, { merge: true });
        updated++;
      } else {
        await db.collection("cs_projects").add(item);
        added++;
      }
    }
    catch(err) { console.error(err); ng++; }
  }
  btn.textContent = "取込実行";
  closeCsImportModal();
  const ok = added + updated;
  showToast(ng === 0 ? `✅ ${added}件追加、${updated}件上書きしました` : `⚠️ ${ok}件成功、${ng}件失敗`, ng === 0 ? "success" : "error");
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("csDashboardRoot")) return;
  initCs();
  const importModal = document.getElementById("csImportModal");
  if (importModal) importModal.addEventListener("click", (e) => {
    if (e.target.id === "csImportModal") closeCsImportModal();
  });
});
