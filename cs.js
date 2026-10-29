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
const CS_PREFECTURES = ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"];
let csFilterBranch = "";
let csDateSort = "desc";
let csFilterPrefecture = "";
let csFilterSales = "";
let pendingCsDeleteId = null;
let supportEndMigrationRunning = false;
let legacyCsMigrationRunning = false;

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
// 最終訪問日からのカラー判定
// =============================================
function getVisitColorClass(p) {
  return getCardFreshness(p).cardClass;
}

function getLastVisitInfo(p) {
  const freshness = getCardFreshness(p);
  const dateStr = freshness.latest?.endDate || freshness.latest?.startDate;
  if (freshness.status === "none") return { text: "⚠️ 対応記録なし", cls: "last-visit-red" };
  const lastDate = new Date(dateStr);
  const fmt = lastDate.toLocaleDateString("ja-JP", { year:"numeric", month:"2-digit", day:"2-digit" });
  const cls = freshness.status === "danger" ? "last-visit-red" : freshness.status === "warning" ? "last-visit-yellow" : "last-visit-green";
  return { text: `最終対応：${fmt}（${freshness.months}か月前）${freshness.status === "danger" ? " ⚠️" : ""}`, cls };
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
  if (p.hasCamera) products.push("カメラ");
  if (p.hasMobile) products.push("モバイル");
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
  if (!dateStr) return { phase, latest, months: null, status: "none", cardClass: "cs-card-no-record" };
  const lastDate = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  let months = (today.getFullYear() - lastDate.getFullYear()) * 12 + today.getMonth() - lastDate.getMonth();
  if (today.getDate() < lastDate.getDate()) months -= 1;
  months = Math.max(0, months);
  const warningAt = phase === "活用支援/サポート" ? 5 : 2;
  const dangerAt = phase === "活用支援/サポート" ? 10 : 4;
  const status = months >= dangerAt ? "danger" : months >= warningAt ? "warning" : "normal";
  return { phase, latest, months, status, cardClass: `cs-card-${status}` };
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

function normalizeCsActivityItem(item) {
  return LEGACY_CS_ACTIVITY_TARGETS[item] || item;
}

// =============================================
// 現在フェーズ（フェーズ＋活動区分）
//  - 自動：訪問履歴から判定
//      オンボーディング未完了 → オンボーディング①〜⑥の最新を最優先
//      オンボーディング完了   → サポートの最新を反映
//  - 手動：カード編集／詳細画面で変更。手動変更より後に訪問履歴の追加・編集
//          または完了チェックの変更があれば自動判定に戻る
// =============================================
const CS_PHASE_ONBOARDING = "活用支援/オンボーディング";
const CS_PHASE_SUPPORT = "活用支援/サポート";
const ONBOARDING_STEP_ITEMS = ["オンボーディング①","オンボーディング②","オンボーディング③","オンボーディング④","オンボーディング⑤","オンボーディング⑥"];

function visitDateKey(visit) {
  return visit?.endDate || visit?.startDate || String(visit?.createdAt || "").slice(0, 10) || "";
}

function pickLatestVisit(entries) {
  return entries.slice().sort((a, b) => visitDateKey(b.visit).localeCompare(visitDateKey(a.visit)) || b.index - a.index)[0]?.visit || null;
}

function getAutoCurrentPhase(p) {
  const entries = (p.visits || []).map((visit, index) => ({
    index,
    visit: { ...visit, status: normalizeVisitStatus(visit.status), taskItem: normalizeCsActivityItem(String(visit.taskItem || "").trim()) },
  }));
  if (p.onboardingCompleted) {
    const latestSupport = pickLatestVisit(entries.filter(e => e.visit.status === CS_PHASE_SUPPORT));
    return { phase: CS_PHASE_SUPPORT, taskItem: latestSupport?.taskItem || "", visit: latestSupport };
  }
  const latestStep = pickLatestVisit(entries.filter(e => e.visit.status === CS_PHASE_ONBOARDING && ONBOARDING_STEP_ITEMS.includes(e.visit.taskItem)));
  if (latestStep) return { phase: CS_PHASE_ONBOARDING, taskItem: latestStep.taskItem, visit: latestStep };
  const latestAny = pickLatestVisit(entries);
  if (latestAny) return { phase: latestAny.status, taskItem: latestAny.taskItem || "", visit: latestAny };
  return { phase: CS_PHASE_ONBOARDING, taskItem: "", visit: null };
}

function getLatestVisitRecordedAt(p) {
  return (p.visits || []).map(v => String(v.updatedAt || v.createdAt || "")).filter(Boolean).sort().at(-1) || "";
}

function getManualCurrentPhase(p) {
  const phase = String(p.csCurrentPhase || "").trim();
  if (!phase || !p.csCurrentPhaseUpdatedAt) return null;
  return { phase: normalizeVisitStatus(phase), taskItem: String(p.csCurrentTask || "").trim(), updatedAt: String(p.csCurrentPhaseUpdatedAt) };
}

function getCurrentPhaseInfo(p) {
  const manual = getManualCurrentPhase(p);
  if (manual) {
    const newerVisit = getLatestVisitRecordedAt(p) > manual.updatedAt;
    const newerCompletion = String(p.onboardingCompletedUpdatedAt || "") > manual.updatedAt;
    if (!newerVisit && !newerCompletion) return { phase: manual.phase, taskItem: manual.taskItem, source: "manual" };
  }
  return { ...getAutoCurrentPhase(p), source: "auto" };
}

function formatCurrentPhase(info) {
  return [getVisitStatusLabel(info.phase), info.taskItem].filter(Boolean).join("/");
}

function getCurrentPhaseLabel(p) {
  return formatCurrentPhase(getCurrentPhaseInfo(p));
}

// 表示用HTML（"/" の位置でだけ改行させる）
function currentPhaseHtml(info) {
  return escapeHtml(formatCurrentPhase(info)).replace(/\//g, "/<wbr>");
}

// 現在フェーズ入力欄（カード編集・詳細画面で共用）
function currentPhaseTaskOptions(phaseKey, selected = "") {
  if (!phaseKey) return "";
  const items = getCsPhase(normalizeVisitStatus(phaseKey)).items.map(row => row.item);
  return `<option value="">-- 活動区分を選択 --</option>` + items.map(item => `<option value="${escapeHtml(item)}"${item === selected ? " selected" : ""}>${escapeHtml(item)}</option>`).join("");
}

function setupCurrentPhaseInputs(phaseSelect, taskSelect, hint, p) {
  if (!phaseSelect || !taskSelect) return;
  const info = p ? getCurrentPhaseInfo(p) : { phase: "", taskItem: "", source: "auto" };
  const autoLabel = p ? formatCurrentPhase(getAutoCurrentPhase(p)) : "訪問履歴から自動判定";
  phaseSelect.innerHTML = `<option value="">自動（訪問履歴から反映）</option>` + CS_PHASES.map(row => `<option value="${escapeHtml(row.key)}">${escapeHtml(getVisitStatusLabel(row.key))}</option>`).join("");
  const initialPhase = info.source === "manual" ? info.phase : "";
  const initialTask = info.source === "manual" ? info.taskItem : "";
  phaseSelect.value = initialPhase;
  phaseSelect.dataset.initialPhase = initialPhase;
  phaseSelect.dataset.initialTask = initialTask;
  const sync = (selectedTask = "") => {
    const phase = phaseSelect.value;
    taskSelect.disabled = !phase;
    taskSelect.innerHTML = phase ? currentPhaseTaskOptions(phase, selectedTask) : `<option value="">（自動）</option>`;
    if (hint) hint.textContent = phase ? "手動で設定します。以降に訪問履歴を追加・編集すると自動判定に戻ります。" : `自動判定：${autoLabel}`;
  };
  phaseSelect.onchange = () => sync("");
  sync(initialTask);
}

// 保存用の差分（変更がなければ空オブジェクト）
function currentPhaseUpdates(phaseSelect, taskSelect) {
  if (!phaseSelect || !taskSelect) return {};
  const phase = phaseSelect.value, task = phase ? taskSelect.value : "";
  const initialPhase = phaseSelect.dataset.initialPhase || "", initialTask = phaseSelect.dataset.initialTask || "";
  if (phase === initialPhase && task === initialTask) return {};
  if (!phase) return { csCurrentPhase: "", csCurrentTask: "", csCurrentPhaseUpdatedAt: "" };
  return { csCurrentPhase: phase, csCurrentTask: task, csCurrentPhaseUpdatedAt: new Date().toISOString() };
}

async function toggleOnboardingCompleted(projectId, checked, input) {
  try {
    await db.collection("cs_projects").doc(projectId).update({
      onboardingCompleted: !!checked,
      onboardingCompletedUpdatedAt: new Date().toISOString(),
    });
    showToast(checked ? "オンボーディング完了にしました" : "オンボーディング完了を解除しました");
  } catch (err) {
    console.error(err);
    if (input) input.checked = !checked;
    showToast("保存に失敗しました", "error");
  }
}

// 複数値（、区切り等）の分割
function splitMultiValue(value) {
  return String(value || "").split(/[、,，\n\/／・]+/).map(s => s.trim()).filter(Boolean);
}

function pillsHtml(values, emptyText = "—") {
  return values.length
    ? `<div class="cs-pill-list">${values.map(v => `<span class="cs-pill">${escapeHtml(v)}</span>`).join("")}</div>`
    : `<span class="cs-pill-empty">${emptyText}</span>`;
}

// 旧版の活動区分を現行の選択肢へ移すためだけの対応表。登録画面の選択肢には使わない。
const LEGACY_CS_ACTIVITY_TARGETS = {
  "勉強会":"オンボーディング①",
  "キックオフ実施":"オンボーディング①", "導入目的共有":"オンボーディング①",
  "成功指標設定（KPI）":"オンボーディング②", "環境構築":"オンボーディング②",
  "設定支援":"オンボーディング③", "マニュアル提供":"オンボーディング④",
  "初期教育":"オンボーディング⑤", "運用設計":"オンボーディング⑥",
  "利用状況モニタリング":"現地サポート", "ログ分析":"遠隔サポート",
  "未利用機能活用提案":"遠隔サポート", "定例会実施":"その他",
  "問題点ヒアリング":"その他", "利用者教育":"現地サポート", "管理者教育":"現地サポート",
  "データ分析支援":"遠隔サポート", "ベストプラクティス紹介":"遠隔サポート",
  "他施設事例紹介":"遠隔サポート", "業務改善提案":"その他",
  "KPI達成支援":"遠隔サポート", "新機能案内":"遠隔サポート",
  "導入効果測定":"遠隔サポート", "KPI評価":"遠隔サポート", "ROI算出":"遠隔サポート",
  "成果報告会":"現地サポート", "院内展開支援":"現地サポート", "活用レポート提供":"遠隔サポート",
  "契約更新管理":"その他", "更新提案":"その他", "機能追加提案":"その他",
  "ライセンス追加提案":"その他", "他部署展開提案":"その他", "上位プラン提案":"その他",
  "ユーザー会参加":"現地サポート", "事例取材":"現地サポート",
  "講演協力":"現地サポート", "紹介依頼":"その他", "共同プロジェクト":"その他",
  "リファレンス顧客化":"その他",
};

function migrateLegacyVisit(visit) {
  const oldItem = String(visit.taskItem || "").trim();
  const mappedItem = LEGACY_CS_ACTIVITY_TARGETS[oldItem];
  const status = mappedItem
    ? (CS_PHASES[0].items.some(row => row.item === mappedItem) ? CS_PHASES[0].key : CS_PHASES[1].key)
    : normalizeVisitStatus(visit.status);
  const options = getCsPhase(status).items.map(row => row.item);
  const taskItem = mappedItem || (options.includes(oldItem) ? oldItem : oldItem ? "その他" : "");
  const hasLegacyFields = !!(visit.taskContent || visit.taskEffect);
  if (visit.status === status && oldItem === taskItem && !hasLegacyFields) return visit;
  const archived = visit.legacyActivity || {
    status: visit.status || "", taskItem: oldItem,
    taskContent: visit.taskContent || "", taskEffect: visit.taskEffect || "",
  };
  return { ...visit, status, taskItem, taskContent:"", taskEffect:"", legacyActivity:archived };
}

function legacyCsUpdates(project) {
  const updates = {};
  if (Array.isArray(project.visits)) {
    const visits = project.visits.map(migrateLegacyVisit);
    if (visits.some((visit,index) => visit !== project.visits[index])) updates.visits = visits;
  }
  const mappedProjectItem = LEGACY_CS_ACTIVITY_TARGETS[project.csTaskItem];
  const phase = mappedProjectItem
    ? (CS_PHASES[0].items.some(row => row.item === mappedProjectItem) ? CS_PHASES[0].key : CS_PHASES[1].key)
    : normalizeVisitStatus(project.csTaskPhase);
  if (project.csTaskPhase && project.csTaskPhase !== phase) updates.csTaskPhase = phase;
  if (project.csTaskItem) {
    const options = getCsPhase(phase).items.map(row => row.item);
    const item = mappedProjectItem
      || (options.includes(project.csTaskItem) ? project.csTaskItem : "その他");
    if (item !== project.csTaskItem) updates.csTaskItem = item;
  }
  const dashboardPhase = project.csDashboard?.currentPhase;
  if (dashboardPhase && dashboardPhase !== normalizeVisitStatus(dashboardPhase)) {
    updates["csDashboard.currentPhase"] = normalizeVisitStatus(dashboardPhase);
  }
  return updates;
}

async function migrateLegacyCsProject(ref) {
  return db.runTransaction(async transaction => {
    const current = await transaction.get(ref);
    if (!current.exists) return false;
    const updates = legacyCsUpdates(current.data());
    if (!Object.keys(updates).length) return false;
    transaction.update(ref, updates);
    return true;
  });
}

async function migrateLegacyCsRecords(docs) {
  if (legacyCsMigrationRunning) return;
  const targets = docs.filter(doc => Object.keys(legacyCsUpdates(doc.data())).length);
  if (!targets.length) return;
  legacyCsMigrationRunning = true;
  try {
    for (const doc of targets) await migrateLegacyCsProject(doc.ref);
    showToast(`${targets.length}件の旧活動区分を現行区分へ更新しました`);
  } catch (error) {
    console.error("旧活動区分の移行に失敗しました:", error);
    showToast("旧活動区分の更新に失敗しました", "error");
  } finally {
    legacyCsMigrationRunning = false;
  }
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
  const currentPhase = getCurrentPhaseInfo(p);

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
        ${v.taskItem ? `<div class="cs-visit-task"><strong>${escapeHtml(normalizeCsActivityItem(v.taskItem))}</strong></div>` : ""}
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
          <div class="cs-card-current-phase"><span>現在フェーズ</span><strong title="${currentPhase.source === "manual" ? "手動設定" : "訪問履歴から自動反映"}">${currentPhaseHtml(currentPhase)}</strong></div>
          <label class="cs-onboarding-done"><input type="checkbox"${p.onboardingCompleted ? " checked" : ""} onchange="toggleOnboardingCompleted('${p.id}', this.checked, this)"/> オンボーディング完了</label>
          <div class="cs-card-sub">
            ${p.branch ? `<span class="cs-meta-tag cs-meta-branch">${escapeHtml(p.branch)}支店</span>` : ""}
            ${p.prefecture ? `<span class="cs-meta-tag">${escapeHtml(p.prefecture)}</span>` : ""}
            <span class="cs-meta-tag cs-meta-date">稼働 ${startFmt}</span>
            ${p.csPerson ? `<span class="cs-meta-tag cs-meta-person">支援担当 ${escapeHtml(p.csPerson)}</span>` : ""}
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
    const searchable = [p.hospitalName,p.prefecture,p.salesPerson].join(" ").toLowerCase();
    const matchName   = searchable.includes(csSearchQuery.toLowerCase());
    const matchPerson = !csFilterPerson || p.csPerson === csFilterPerson;
    const matchStatus = !csFilterStatus || getCurrentPhaseInfo(p).phase === csFilterStatus;
    const matchBranch = !csFilterBranch || p.branch === csFilterBranch;
    const matchPrefecture = !csFilterPrefecture || p.prefecture === csFilterPrefecture;
    const matchSales = !csFilterSales || p.salesPerson === csFilterSales;
    return matchName && matchPerson && matchStatus && matchBranch && matchPrefecture && matchSales;
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
  const latestDate = getLatestVisitDateText(p);
  const memo = getLatestVisitMemo(p);
  return `<tr>
    <td class="cs-list-hospital" data-label="病院名"><a class="cs-list-hospital-link" href="cs-dashboard.html?id=${encodeURIComponent(p.id)}">${escapeHtml(p.hospitalName || "")}</a></td>
    <td data-label="支援担当">${escapeHtml(p.csPerson || "—")}</td>
    <td data-label="担当営業">${escapeHtml(p.salesPerson || "—")}</td>
    <td data-label="都道府県">${escapeHtml(p.prefecture || "—")}</td>
    <td data-label="CSステータス"><span class="cs-list-status">${currentPhaseHtml(getCurrentPhaseInfo(p))}</span></td>
    <td data-label="最終対応日"><span class="cs-list-visit">${escapeHtml(latestDate)}</span></td>
    <td class="cs-list-memo" data-label="メモ"><div class="cs-list-memo-preview">${escapeHtml(memo || "—")}</div></td>
  </tr>`;
}

function getFilteredCsListProjects() {
  const q = csSearchQuery.toLowerCase();
  return allCsProjects.filter(p => {
    const searchable = [p.hospitalName,p.prefecture,p.salesPerson].join(" ").toLowerCase();
    const matchName = searchable.includes(q);
    const matchPerson = !csFilterPerson || p.csPerson === csFilterPerson;
    const matchStatus = !csFilterStatus || getCurrentPhaseInfo(p).phase === csFilterStatus;
    const matchPrefecture = !csFilterPrefecture || p.prefecture === csFilterPrefecture;
    const matchSales = !csFilterSales || p.salesPerson === csFilterSales;
    return matchName && matchPerson && matchStatus && matchPrefecture && matchSales;
  });
}

function renderCsList() {
  const tbody = document.getElementById("csTableBody");
  if (!tbody) return;

  const filtered = getFilteredCsListProjects();
  filtered.sort((a, b) => {
    const aDate=getLatestVisitDateValue(a),bDate=getLatestVisitDateValue(b);
    if(!aDate&&bDate)return 1;
    if(aDate&&!bDate)return -1;
    const latestDiff = csDateSort === "asc" ? aDate - bDate : bDate - aDate;
    if (latestDiff !== 0) return latestDiff;
    return (a.startDate || "").localeCompare(b.startDate || "");
  });

  document.getElementById("csProjectCount").textContent = `${filtered.length} 件`;
  tbody.innerHTML = filtered.length
    ? filtered.map(createCsListRow).join("")
    : `<tr><td colspan="7" class="cs-list-loading">該当するCS案件がありません</td></tr>`;
  renderCsBasicList(filtered);
  updateCsStats();
}

// =============================================
// 基本情報一覧（表示・Excel出力で共用の列定義）
//   type: text / multi（、等で区切られた値）/ products / systems
// =============================================
const CS_PRODUCT_DEFS = [
  ["hasBedside","BS端末"],["hasBedNavi","ベッドナビ"],["hasNemiri","眠りSCAN"],["hasRisha","離床CATCH"],["hasVital","バイタル連携"],
  ["hasEhr","EHR連携"],["hasNurse","NC情報連携"],["hasNcNotify","NC通知連携"],["hasCamera","カメラ"],["hasMobile","モバイル"],
];
const CS_PROJECT_TYPE_LABELS = { new:"新規導入", add:"病棟追加", vup:"バージョンアップ" };

const CS_BASIC_COLUMNS = [
  { label:"病院名", type:"hospital", get:p => getHospitalDisplayParts(p).hospitalName },
  { label:"支店", get:p => p.branch },
  { label:"都道府県", get:p => p.prefecture },
  { label:"案件タイプ", get:p => CS_PROJECT_TYPE_LABELS[p.projectType] || p.projectType },
  { label:"導入病棟名", type:"multi", get:p => p.ward },
  { label:"稼働開始日", get:p => p.startDate },
  { label:"サポートエンド", get:p => p.supportEndDate },
  { label:"担当営業", get:p => p.salesPerson },
  { label:"支援担当", get:p => p.csPerson },
  { label:"導入担当者", get:p => p.solPm },
  { label:"システム種類", type:"systems" },
  { label:"導入製品", type:"products" },
  { label:"病床移動運用", get:p => p.moveOp },
  { label:"病床番号変更担当", type:"multi", get:p => p.bedNumStaff },
  { label:"床頭台移動担当", type:"multi", get:p => p.bedMoveStaff },
  { label:"新規/既存", get:p => p.newOrExisting },
  { label:"経営主体", get:p => p.keieiShukai },
  { label:"許可病床数", get:p => p.kyokaBedNum },
  { label:"病棟構成", get:p => p.byokoKosei },
  { label:"導入病床数", get:p => p.donyuBedNum },
  { label:"ベッドサイド端末", get:p => p.bedsideTerminal },
  { label:"ステーション端末", get:p => p.stationTerminal },
  { label:"眠りSCAN", get:p => p.nemiriScan },
  { label:"離床CATCH", get:p => p.rishoCatch },
  { label:"Wi-Fiベッドナビ", get:p => p.wifiNav },
  { label:"カメラ", get:p => p.cameraCount },
  { label:"モバイル", get:p => p.mobileCount },
  { label:"タブレット設置位置", get:p => p.tabletPos },
  { label:"電子カルテ", get:p => p.electronicKarte },
  { label:"ナースコール", get:p => p.nurseCall },
  { label:"周辺連携機能", get:p => p.shuhenRenkei },
  { label:"案件概要", get:p => p.ankenGaiyou },
  { label:"簡易メモ", get:p => getHospitalDisplayParts(p).quickMemo },
  { label:"備考", type:"long", get:p => p.memo },
];

function getCsSystemColumns(projects) {
  const found = new Set();
  projects.forEach(p => getSystemLabels(p).forEach(s => found.add(s)));
  return [...CS_SYSTEM_TYPES, ...[...found].filter(s => !CS_SYSTEM_TYPES.includes(s))];
}

function basicCellHtml(col, p) {
  if (col.type === "hospital") {
    const name = col.get(p);
    return `<a class="cs-list-hospital-link" href="cs-dashboard.html?id=${encodeURIComponent(p.id)}">${escapeHtml(name || "")}</a>`;
  }
  if (col.type === "systems") return pillsHtml(getSystemLabels(p));
  if (col.type === "products") return pillsHtml(getProductLabels(p));
  if (col.type === "multi") return pillsHtml(splitMultiValue(col.get(p)));
  const value = String(col.get(p) ?? "").trim();
  return value ? escapeHtml(value) : `<span class="cs-pill-empty">—</span>`;
}

function renderCsBasicList(filtered) {
  const head = document.getElementById("csBasicHead");
  const body = document.getElementById("csBasicBody");
  if (!head || !body) return;
  const rows = filtered.slice().sort((a,b) => (getHospitalDisplayParts(a).hospitalName || "").localeCompare(getHospitalDisplayParts(b).hospitalName || "", "ja"));
  head.innerHTML = `<tr>${CS_BASIC_COLUMNS.map(col => `<th class="cs-basic-col-${col.type || "text"}">${escapeHtml(col.label)}</th>`).join("")}</tr>`;
  body.innerHTML = rows.length
    ? rows.map(p => `<tr>${CS_BASIC_COLUMNS.map(col => `<td class="cs-basic-col-${col.type || "text"}" data-label="${escapeHtml(col.label)}">${basicCellHtml(col, p)}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${CS_BASIC_COLUMNS.length}" class="cs-list-loading">該当するCS案件がありません</td></tr>`;
}

function setCsListView(view) {
  const target = view === "basic" ? "basic" : "activity";
  document.querySelectorAll("[data-cs-list-view]").forEach(el => {
    el.hidden = el.dataset.csListView !== target;
  });
  document.querySelectorAll(".cs-list-tab").forEach(btn => {
    const active = btn.dataset.view === target;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.body.dataset.csListView = target;
  try { localStorage.setItem("csListView", target); } catch (_) {}
  if (location.hash !== `#${target}`) history.replaceState(null, "", `#${target}`);
}

function initCsListTabs() {
  const tabs = document.querySelectorAll(".cs-list-tab");
  if (!tabs.length) return;
  tabs.forEach(btn => btn.addEventListener("click", () => setCsListView(btn.dataset.view)));
  let initial = location.hash.replace("#", "");
  if (!["basic","activity"].includes(initial)) {
    try { initial = localStorage.getItem("csListView") || "activity"; } catch (_) { initial = "activity"; }
  }
  setCsListView(initial);
}

async function exportCsBasicXlsx() {
  try { await loadXlsxLibrary(); }
  catch (error) { showToast(error.message, "error"); return; }
  const projects = getFilteredCsListProjects().sort((a,b) => (getHospitalDisplayParts(a).hospitalName || "").localeCompare(getHospitalDisplayParts(b).hospitalName || "", "ja"));
  const systemColumns = getCsSystemColumns(projects);
  const header1 = [], header2 = [], merges = [], widths = [];
  CS_BASIC_COLUMNS.forEach(col => {
    const start = header1.length;
    if (col.type === "systems" || col.type === "products") {
      const subs = col.type === "systems" ? systemColumns : CS_PRODUCT_DEFS.map(([,label]) => label);
      subs.forEach((sub, i) => { header1.push(i === 0 ? col.label : ""); header2.push(sub); widths.push({ wch: Math.max(6, sub.length * 2 + 2) }); });
      if (subs.length > 1) merges.push({ s:{ r:0, c:start }, e:{ r:0, c:start + subs.length - 1 } });
    } else {
      header1.push(col.label); header2.push("");
      merges.push({ s:{ r:0, c:start }, e:{ r:1, c:start } });
      widths.push({ wch: col.type === "hospital" ? 28 : col.type === "long" ? 50 : col.type === "multi" ? 24 : 14 });
    }
  });
  const rows = projects.map(p => {
    const row = [];
    CS_BASIC_COLUMNS.forEach(col => {
      if (col.type === "systems") {
        const systems = getSystemLabels(p);
        systemColumns.forEach(s => row.push(systems.includes(s) ? "〇" : ""));
      } else if (col.type === "products") {
        CS_PRODUCT_DEFS.forEach(([key]) => row.push(p[key] ? "〇" : ""));
      } else if (col.type === "multi") {
        row.push(splitMultiValue(col.get(p)).join("/"));
      } else {
        row.push(String(col.get(p) ?? "").trim());
      }
    });
    return row;
  });
  const sheet = XLSX.utils.aoa_to_sheet([header1, header2, ...rows]);
  sheet["!merges"] = merges;
  sheet["!cols"] = widths;
  sheet["!autofilter"] = { ref: `A2:${XLSX.utils.encode_col(header2.length - 1)}${Math.max(2, rows.length + 2)}` };
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "基本情報一覧");
  XLSX.writeFile(book, `パラサイト_基本情報一覧_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast(`${rows.length}件の基本情報を出力しました`);
}

function renderCsView() {
  if (document.getElementById("csTableBody")) renderCsList();
  else renderCsProjects();
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
  const from = document.getElementById("csExportFrom")?.value || "";
  const to = document.getElementById("csExportTo")?.value || "";
  if (from && to && from > to) { showToast("出力期間の開始日と終了日を確認してください", "error"); return; }
  try { await loadXlsxLibrary(); }
  catch (error) { showToast(error.message, "error"); return; }
  const projects = allCsProjects.filter(p => !csFilterBranch || p.branch === csFilterBranch);
  const rows = [["項目名","病院名","直近活動日","対応者","直近活動内容","最終活動日","活動総数"]];
  projects.forEach(p => {
    const visits = (p.visits || []).filter(visit => {
      const date = visit.endDate || visit.startDate || String(visit.createdAt || "").slice(0,10);
      return date && (!from || date >= from) && (!to || date <= to);
    });
    if ((from || to) && !visits.length) return;
    const latest = visits.slice().sort((a,b) => String(b.endDate || b.startDate || b.createdAt || "").localeCompare(String(a.endDate || a.startDate || a.createdAt || "")))[0] || {};
    const date = latest.endDate || latest.startDate || "";
    rows.push([normalizeCsActivityItem(latest.taskItem) || "", getHospitalDisplayParts(p).hospitalName, date, latest.assignee || p.csPerson || "", latest.freeText || "", date, visits.length]);
  });
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{wch:22},{wch:28},{wch:14},{wch:16},{wch:50},{wch:14},{wch:12}];
  sheet["!autofilter"] = { ref:`A1:G${Math.max(1, rows.length)}` };
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "活動内容");
  const period = from || to ? `_${from || "開始以前"}-${to || "終了以降"}` : "_全期間";
  XLSX.writeFile(book, `パラサイト_活動内容_${csFilterBranch || "全支店"}${period}_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast(`${Math.max(0, rows.length - 1)}件の活動内容を出力しました`);
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
  initCsListTabs();
  const branchSelect = document.getElementById("csBranch");
  if (branchSelect) branchSelect.innerHTML = `<option value="">-- 選択 --</option>` + CS_BRANCHES.map(branch => `<option value="${branch}">${branch}</option>`).join("");
  const prefectureInput = document.getElementById("csPrefecture");
  if (prefectureInput) prefectureInput.innerHTML = `<option value="">-- 選択 --</option>` + CS_PREFECTURES.map(value=>`<option value="${value}">${value}</option>`).join("");
  const startDateInput = document.getElementById("csStartDate");
  if (startDateInput) startDateInput.addEventListener("change", () => {
    document.getElementById("csSupportEndDate").value = supportEndSevenYearsAfter(startDateInput.value);
  });
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
  const dateSort = document.getElementById("csDateSort");
  if (dateSort) dateSort.addEventListener("change", e => {
    csDateSort = e.target.value;
    renderCsList();
  });
  const prefectureFilter=document.getElementById("csPrefectureFilter");
  if(prefectureFilter){
    prefectureFilter.innerHTML=`<option value="">全都道府県</option>`+CS_PREFECTURES.map(value=>`<option value="${value}">${value}</option>`).join("");
    prefectureFilter.addEventListener("change",e=>{csFilterPrefecture=e.target.value;renderCsView();});
  }
  const salesFilter=document.getElementById("csSalesFilter");
  if(salesFilter)salesFilter.addEventListener("change",e=>{csFilterSales=e.target.value;renderCsView();});
  // 登録フォームの担当者プルダウン
  if (document.getElementById("csSalesPerson")) populateCsStaffSelect();

  // フォームイベント
  const projectForm = document.getElementById("csProjectForm");
  const visitForm = document.getElementById("visitForm");
  if (projectForm) projectForm.addEventListener("submit", saveCsProject);
  if (visitForm) visitForm.addEventListener("submit", saveVisit);

  // モーダル外クリックで閉じる
  ["visitModal","csDeleteModal"].forEach(id => {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.addEventListener("click", e => {
      if (e.target.id === id) {
        if      (id === "visitModal")    closeVisitModal();
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
      updateCsSalesFilter();
      populateCsStaffSelect();
      renderCsBranchTabs();
      renderCsView();
      migrateExistingSupportEndDates(snapshot.docs);
      migrateLegacyCsRecords(snapshot.docs);
    }, err => {
      console.error("CS Firestore error:", err);
      showToast("CSデータ取得に失敗しました", "error");
    });
}

function updateCsSalesFilter() {
  const select=document.getElementById("csSalesFilter");
  if(!select)return;
  const current=select.value;
  const values=[...new Set(allCsProjects.map(p=>String(p.salesPerson||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ja"));
  select.innerHTML=`<option value="">全担当営業</option>`+values.map(value=>`<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  if(current&&values.includes(current))select.value=current;else csFilterSales="";
}

async function migrateExistingSupportEndDates(docs) {
  if (supportEndMigrationRunning) return;
  const targets = docs.filter(doc => {
    const data = doc.data();
    return data.startDate && data.supportEndAutoMigratedV1 !== true;
  });
  if (!targets.length) return;
  supportEndMigrationRunning = true;
  try {
    for (let offset = 0; offset < targets.length; offset += 450) {
      const batch = db.batch();
      targets.slice(offset, offset + 450).forEach(doc => {
        batch.update(doc.ref, {
          supportEndDate: supportEndSevenYearsAfter(doc.data().startDate),
          supportEndAutoMigratedV1: true,
        });
      });
      await batch.commit();
    }
    showToast(`${targets.length}件のサポートエンドを更新しました`);
  } catch (error) {
    console.error("サポートエンド一括更新エラー:", error);
    showToast("既存案件のサポートエンド更新に失敗しました", "error");
  } finally {
    supportEndMigrationRunning = false;
  }
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
  setupCurrentPhaseInputs(document.getElementById("csCurrentPhase"), document.getElementById("csCurrentTask"), document.getElementById("csCurrentPhaseHint"), null);
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
  setupCurrentPhaseInputs(document.getElementById("csCurrentPhase"), document.getElementById("csCurrentTask"), document.getElementById("csCurrentPhaseHint"), p);
  document.getElementById("csPrefecture").value   = p.prefecture || "";
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
  document.getElementById("csProjectType").value = p.projectType || "new";
  document.getElementById("csNewOrExisting").value = p.newOrExisting || "";
  ["KeieiShukai","KyokaBedNum","ByokoKosei","DonyuBedNum","BedsideTerminal","StationTerminal","NemiriScan","RishoCatch","WifiNav","CameraCount","MobileCount","TabletPos","ElectronicKarte","NurseCall","ShuhenRenkei","AnkenGaiyou"].forEach(suffix => {
    const key = suffix.charAt(0).toLowerCase() + suffix.slice(1);
    document.getElementById(`cs${suffix}`).value = p[key] || "";
  });
  document.getElementById("csHasBedside").checked = !!p.hasBedside;
  document.getElementById("csHasBedNavi").checked = !!p.hasBedNavi;
  document.getElementById("csHasNemiri").checked  = !!p.hasNemiri;
  document.getElementById("csHasRisha").checked   = !!p.hasRisha;
  document.getElementById("csHasVital").checked   = !!p.hasVital;
  document.getElementById("csHasEhr").checked     = !!p.hasEhr;
  document.getElementById("csHasNurse").checked   = !!p.hasNurse;
  document.getElementById("csHasNcNotify").checked = !!p.hasNcNotify;
  document.getElementById("csHasCamera").checked = !!p.hasCamera;
  document.getElementById("csHasMobile").checked = !!p.hasMobile;
  populateCsStaffSelect();
  document.getElementById("csSalesPerson").value  = p.salesPerson || "";
  document.getElementById("csPerson").value       = p.csPerson || "";
  document.getElementById("csModal").classList.add("open");
}

function closeCsModal() {
  document.getElementById("csModal").classList.remove("open");
}

function supportEndSevenYearsAfter(startDate) {
  const match = String(startDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const year = Number(match[1]) + 7, month = Number(match[2]), day = Number(match[3]);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2,"0")}-${String(Math.min(day,lastDay)).padStart(2,"0")}`;
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
    prefecture:    document.getElementById("csPrefecture").value,
    ward:          document.getElementById("csWard").value.trim(),
    startDate:     document.getElementById("csStartDate").value,
    supportEndDate:document.getElementById("csSupportEndDate").value || supportEndSevenYearsAfter(document.getElementById("csStartDate").value),
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
    hasCamera:     document.getElementById("csHasCamera").checked,
    hasMobile:     document.getElementById("csHasMobile").checked,
    projectType:   document.getElementById("csProjectType").value,
    newOrExisting: document.getElementById("csNewOrExisting").value.trim(),
    keieiShukai:    document.getElementById("csKeieiShukai").value.trim(),
    kyokaBedNum:    document.getElementById("csKyokaBedNum").value.trim(),
    byokoKosei:     document.getElementById("csByokoKosei").value.trim(),
    donyuBedNum:    document.getElementById("csDonyuBedNum").value.trim(),
    bedsideTerminal:document.getElementById("csBedsideTerminal").value.trim(),
    stationTerminal:document.getElementById("csStationTerminal").value.trim(),
    nemiriScan:     document.getElementById("csNemiriScan").value.trim(),
    rishoCatch:     document.getElementById("csRishoCatch").value.trim(),
    wifiNav:        document.getElementById("csWifiNav").value.trim(),
    cameraCount:    document.getElementById("csCameraCount").value.trim(),
    mobileCount:    document.getElementById("csMobileCount").value.trim(),
    tabletPos:      document.getElementById("csTabletPos").value.trim(),
    electronicKarte:document.getElementById("csElectronicKarte").value.trim(),
    nurseCall:      document.getElementById("csNurseCall").value.trim(),
    shuhenRenkei:   document.getElementById("csShuhenRenkei").value.trim(),
    ankenGaiyou:    document.getElementById("csAnkenGaiyou").value.trim(),
  };
  Object.assign(data, currentPhaseUpdates(document.getElementById("csCurrentPhase"), document.getElementById("csCurrentTask")));
  if (!data.branch) { showToast("支店を選択してください", "error"); return; }
  if (!data.hospitalName) { showToast("病院名を入力してください", "error"); return; }
  try {
    if (id) {
      await db.collection("cs_projects").doc(id).update(data);
      showToast("CS案件を更新しました");
    } else {
      data.visits    = [];
      data.createdAt = new Date().toISOString();
      data.supportEndAutoMigratedV1 = true;
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
    updateVisitTaskOptions(normalizeCsActivityItem(targetVisit.taskItem) || "");
    document.getElementById("visitStartDate").value = targetVisit.startDate || "";
    document.getElementById("visitEndDate").value = targetVisit.endDate || "";
    document.getElementById("visitFreeText").value = targetVisit.freeText || "";
    document.getElementById("visitAssignee").value = targetVisit.assignee || "";
    document.getElementById("visitIsVisit").checked = isVisitRecord(targetVisit);
  } else {
    document.getElementById("visitStatus").value = getCurrentPhaseInfo(p).phase;
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

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("csDashboardRoot")) return;
  initCs();
});
