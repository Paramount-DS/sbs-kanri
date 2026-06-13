// =============================================
// CUSTOMER SUCCESS - cs.js
// =============================================
'use strict';

const CIRCLE_NUMS = ["①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩",
                     "⑪","⑫","⑬","⑭","⑮","⑯","⑰","⑱","⑲","⑳"];

const CS_STATE_OPTIONS = [
  "正常",
  "問題あり(システム)",
  "問題あり(運用)",
  "問題あり(システム/運用)",
  "課題あり(システム)",
  "課題あり(運用)",
  "課題あり(システム/運用)",
];

const CS_PHASES = [
  {
    key: "支援計画",
    label: "支援計画",
    goal: "早期稼働",
    items: [
      { item:"キックオフ実施", content:"導入目的・体制・スケジュール共有", effect:"関係者の認識統一、導入遅延防止" },
      { item:"導入目的共有", content:"解決したい課題や期待効果の整理", effect:"ゴールの明確化" },
      { item:"成功指標設定（KPI）", content:"効果測定指標の設定", effect:"導入成果を定量評価可能" },
      { item:"環境構築", content:"サーバ・ネットワーク・端末設定", effect:"安定稼働開始" },
      { item:"設定支援", content:"システム初期設定支援", effect:"運用開始までの負荷軽減" },
      { item:"マニュアル提供", content:"操作資料・運用資料整備", effect:"問い合わせ削減" },
      { item:"初期教育", content:"操作研修・管理者教育", effect:"早期運用開始" },
      { item:"運用設計", content:"通知ルールや業務フロー設計", effect:"現場定着の促進" },
    ],
  },
  {
    key: "定着",
    label: "定着",
    goal: "利用率向上",
    items: [
      { item:"利用状況モニタリング", content:"利用頻度・アクセス状況確認", effect:"利用低下の早期発見" },
      { item:"ログ分析", content:"利用傾向や課題分析", effect:"改善ポイントの可視化" },
      { item:"未利用機能活用提案", content:"利用されていない機能の提案", effect:"活用率向上" },
      { item:"定例会実施", content:"定期的な情報共有と課題確認", effect:"継続利用促進" },
      { item:"問題点ヒアリング", content:"現場課題の収集", effect:"解約リスク低減" },
      { item:"利用者教育", content:"追加研修・新規職員教育", effect:"操作定着" },
      { item:"管理者教育", content:"分析機能や運用管理教育", effect:"自走化促進" },
    ],
  },
  {
    key: "活用促進",
    label: "活用促進",
    goal: "業務改善",
    items: [
      { item:"データ分析支援", content:"利用データの分析支援", effect:"データ活用文化醸成" },
      { item:"ベストプラクティス紹介", content:"活用成功事例の共有", effect:"活用レベル向上" },
      { item:"他施設事例紹介", content:"他施設の運用紹介", effect:"新たな活用アイデア創出" },
      { item:"業務改善提案", content:"データに基づく改善提案", effect:"業務効率化" },
      { item:"KPI達成支援", content:"指標改善活動支援", effect:"導入目標達成" },
      { item:"新機能案内", content:"バージョンアップや新機能紹介", effect:"製品価値向上" },
    ],
  },
  {
    key: "成果創出",
    label: "成果創出",
    goal: "Outcome/ROI",
    items: [
      { item:"導入効果測定", content:"導入前後比較分析", effect:"効果の可視化" },
      { item:"KPI評価", content:"設定した指標の達成確認", effect:"成果確認" },
      { item:"ROI算出", content:"業務削減効果算出、費用対効果評価", effect:"投資価値の証明" },
      { item:"成果報告会", content:"経営層・管理者への報告", effect:"継続利用・横展開促進" },
      { item:"院内展開支援", content:"他病棟・他部署への展開支援", effect:"利用拡大" },
      { item:"活用レポート提供", content:"定期的な成果報告資料作成", effect:"意思決定支援" },
    ],
  },
  {
    key: "拡大",
    label: "拡大",
    goal: "更新・追加受注",
    items: [
      { item:"契約更新管理", content:"更新時期管理・事前フォロー", effect:"解約防止" },
      { item:"更新提案", content:"導入効果を踏まえた継続提案", effect:"更新率向上" },
      { item:"機能追加提案", content:"オプションや追加機能提案", effect:"単価向上" },
      { item:"ライセンス追加提案", content:"利用範囲拡大提案", effect:"売上拡大" },
      { item:"他部署展開提案", content:"他病棟・他施設展開提案", effect:"契約拡大" },
      { item:"上位プラン提案", content:"上位サービス提案", effect:"LTV向上" },
    ],
  },
  {
    key: "共創",
    label: "共創",
    goal: "共創・事例創出",
    items: [
      { item:"ユーザー会参加", content:"ユーザー同士の交流機会提供", effect:"ロイヤルティ向上" },
      { item:"事例取材", content:"成功事例の作成・公開", effect:"ブランド価値向上" },
      { item:"講演協力", content:"学会・セミナー登壇支援", effect:"認知拡大" },
      { item:"紹介依頼", content:"他施設への紹介依頼", effect:"新規案件創出" },
      { item:"共同プロジェクト", content:"研究・実証実験実施", effect:"関係強化" },
      { item:"リファレンス顧客化", content:"見学受入・営業協力", effect:"営業効率向上" },
    ],
  },
];

let allCsProjects = [];
let csSearchQuery = "";
let csFilterPerson = "";
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

function isDuplicateCsHospital(project, projects = allCsProjects) {
  const name = normalizeHospitalName(project.hospitalName);
  if (!name) return false;
  return projects.filter(p => normalizeHospitalName(p.hospitalName) === name).length > 1;
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
  const visits = p.visits || [];
  if (!visits.length) return "";
  const last = visits[visits.length - 1];
  const dateStr = last.endDate || last.startDate;
  if (!dateStr) return "";
  const lastDate = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  const months = (today.getFullYear() - lastDate.getFullYear()) * 12
               + (today.getMonth() - lastDate.getMonth());
  if (months <= 4)  return "cs-status-green";
  if (months <= 8)  return "cs-status-yellow";
  return "cs-status-orange";
}

function getLastVisitInfo(p) {
  const visits = p.visits || [];
  if (!visits.length) return { text: "訪問記録なし", cls: "last-visit-none" };
  const last = visits[visits.length - 1];
  const dateStr = last.endDate || last.startDate;
  if (!dateStr) return { text: "日付未設定", cls: "last-visit-none" };
  const lastDate = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  const months = (today.getFullYear() - lastDate.getFullYear()) * 12
               + (today.getMonth() - lastDate.getMonth());
  const fmt = lastDate.toLocaleDateString("ja-JP", { year:"numeric", month:"2-digit", day:"2-digit" });
  if (months <= 4)  return { text: `最終対応：${fmt}（${months}か月前）`, cls: "last-visit-green" };
  if (months <= 8)  return { text: `最終対応：${fmt}（${months}か月前）`, cls: "last-visit-yellow" };
  return { text: `最終対応：${fmt}（${months}か月前）⚠️`, cls: "last-visit-orange" };
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
  const labels = {
    "支援計画": "支援計画/Deployment",
    "定着": "定着/Adoption",
    "活用促進": "活用促進/Engagement",
    "成果創出": "成果創出/Outcome/ROI",
    "拡大": "拡大/Expansion",
    "事例創出": "共創/Advocacy",
    "共創": "共創/Advocacy",
    "拡大/事例創出": "拡大/Expansion",
  };
  if (status === "onboarding" || status === "OBD") return labels["支援計画"];
  if (status === "support" || status === "SUP" || status === "活用") return labels["活用促進"];
  return labels[status] || status || "—";
}

function normalizeVisitStatus(status) {
  if (status === "onboarding" || status === "OBD") return "支援計画";
  if (status === "support" || status === "SUP" || status === "活用") return "活用促進";
  if (status === "事例創出") return "共創";
  if (status === "拡大/事例創出") return "拡大";
  return status || "支援計画";
}

function isSupportSideStatus(status) {
  return ["support", "SUP", "活用", "活用促進", "成果創出", "拡大", "事例創出", "共創"].includes(status);
}

function getLatestVisitDateText(p) {
  const latest = getLatestVisit(p);
  if (!latest) return "—";
  return latest.endDate || latest.startDate || "—";
}

function getLatestVisitMemo(p) {
  const latest = getLatestVisit(p);
  return latest?.freeText || "";
}

function getCsState(p) {
  return p.state || p.taskStatus || "正常";
}

const CS_HEALTH_PHASES = [
  { key: "支援計画", label: "支援計画", english: "Deployment", weight: 15 },
  { key: "定着", label: "定着", english: "Adoption", weight: 20 },
  { key: "活用促進", label: "活用促進", english: "Engagement", weight: 20 },
  { key: "成果創出", label: "成果創出", english: "Outcome/ROI", weight: 20 },
  { key: "拡大", label: "拡大", english: "Expansion", weight: 15 },
  { key: "共創", label: "共創", english: "Advocacy", weight: 10 },
];

function normalizeHealthPhase(status) {
  const normalized = normalizeVisitStatus(status);
  if (normalized === "事例創出") return "共創";
  if (normalized === "拡大/事例創出") return "拡大";
  return normalized;
}

function normalizeHealthModel(value) {
  if (value === "Lite") return "SBS-Lite";
  return ["SBS", "SBS-Lite", "Connectハイブリット", "Connectオンプレ"].includes(value) ? value : "SBS";
}

function getCsHealthValues(p) {
  const values = Object.fromEntries(CS_HEALTH_PHASES.map(phase => [phase.key, 0]));
  const taskScores = Object.fromEntries(CS_HEALTH_PHASES.map(phase => [phase.key, new Map()]));
  (p.visits || []).forEach(visit => {
    const key = normalizeHealthPhase(visit.status);
    if (!(key in values)) return;
    const score = Number(visit.score);
    const taskItem = visit.taskItem || getCsPhase(key).items[0]?.item || "";
    taskScores[key].set(taskItem, Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0);
  });
  CS_HEALTH_PHASES.forEach(phase => {
    const definition = getCsPhase(phase.key);
    const total = definition.items.reduce((sum, item) => sum + (taskScores[phase.key].get(item.item) || 0), 0);
    values[phase.key] = definition.items.length ? Math.round(total / definition.items.length) : 0;
  });
  return values;
}

function getCsHealth(p) {
  const values = getCsHealthValues(p);
  const visits = p.visits || [];
  let currentIndex = -1;
  visits.forEach(visit => {
    const index = CS_HEALTH_PHASES.findIndex(phase => phase.key === normalizeHealthPhase(visit.status));
    if (index > currentIndex) currentIndex = index;
  });
  const activePhases = currentIndex >= 0 ? CS_HEALTH_PHASES.slice(0, currentIndex + 1) : [];
  const activeWeight = activePhases.reduce((sum, phase) => sum + phase.weight, 0);
  const weightedScore = activePhases.reduce((sum, phase) => sum + values[phase.key] * phase.weight, 0);
  let score = activeWeight ? Math.round(weightedScore / activeWeight) : 0;
  const dashboard = p.csDashboard;
  if (dashboard) {
    const ratio = (a, b) => {
      const x = Number(a), y = Number(b);
      return Number.isFinite(x) && Number.isFinite(y) && y > 0 ? x / y * 100 : null;
    };
    const usage = dashboard.usage || {}, activity = dashboard.csActivity || {}, kpi = dashboard.kpi || {}, renewal = dashboard.renewal || {};
    const usageRates = [ratio(usage.activeUsers, usage.targetUsers), ratio(usage.usedFeatures, usage.totalFeatures), ratio(usage.connectedDevices, usage.installedDevices)].filter(v => v !== null);
    const systemUsage = usageRates.length ? usageRates.reduce((a,b) => a+b, 0) / usageRates.length : null;
    const latestDate = visits.map(v => v.endDate || v.startDate).filter(Boolean).sort().at(-1) || activity.lastVisitDate || "";
    const elapsed = latestDate ? Math.ceil((new Date() - new Date(latestDate)) / 86400000) : null;
    const kpiRate = ratio(kpi.current, kpi.target);
    const unresolved = activity.unresolvedIssues === "" || activity.unresolvedIssues === undefined ? null : Number(activity.unresolvedIssues);
    const renewalDays = renewal.renewalDate ? Math.ceil((new Date(renewal.renewalDate) - new Date()) / 86400000) : null;
    const parts = [];
    if (systemUsage !== null) parts.push([Math.min(100, systemUsage) * .4, 40]);
    if (elapsed !== null) parts.push([elapsed <= 30 ? 20 : elapsed <= 60 ? 10 : 0, 20]);
    if (kpiRate !== null) parts.push([Math.min(100, kpiRate) * .2, 20]);
    if (Number.isFinite(unresolved)) parts.push([unresolved === 0 ? 10 : unresolved <= 2 ? 5 : 0, 10]);
    if (renewalDays !== null) parts.push([renewalDays > 90 ? 10 : renewalDays > 30 ? 5 : 0, 10]);
    const max = parts.reduce((sum, row) => sum + row[1], 0);
    if (max) score = Math.round(parts.reduce((sum, row) => sum + row[0], 0) / max * 100);
  }
  if (score >= 80) return { score, label: "良好", className: "cs-status-green", values, currentIndex };
  if (score >= 60) return { score, label: "注意", className: "cs-status-yellow", values, currentIndex };
  return { score, label: "リスク", className: "cs-status-red", values, currentIndex };
}

function getCsHealthActions(values, currentIndex) {
  if (currentIndex < 0) return ["次の訪問追加から支援計画の達成度を登録してください。"];
  const actions = [];
  if (currentIndex >= 0 && values["支援計画"] < 70) actions.push("Deployment：未導入範囲・未教育者を確認し、初期稼働条件を再整理する。");
  if (currentIndex >= 1 && values["定着"] < 70) actions.push("Adoption：利用ログを確認し、未活用機能・未利用部署への再教育を実施する。");
  if (currentIndex >= 2 && values["活用促進"] < 70) actions.push("Engagement：定例会・管理者面談を設定し、現場課題を改善アクションに落とす。");
  if (currentIndex >= 3 && values["成果創出"] < 70) actions.push("Outcome/ROI：成果指標と費用対効果の根拠を整理する。");
  if (currentIndex >= 4 && values["拡大"] < 70) actions.push("Expansion：更新・追加導入・他部署展開の提案条件を整理する。");
  if (currentIndex >= 5 && values["共創"] < 70) actions.push("Advocacy：事例化・紹介・共同プロジェクトの候補を整理する。");
  if (!actions.length) actions.push("全体状態は良好。更新・追加導入・他部署展開の提案タイミング。");
  return actions;
}

function createCsHealthSection(p) {
  const health = getCsHealth(p);
  const actions = getCsHealthActions(health.values, health.currentIndex);
  const healthModel = normalizeHealthModel(p.healthModel || p.systemType1);
  return `
    <div class="cs-health-section" data-health-id="${p.id}">
      <div class="cs-health-header">
        <span class="cs-health-title">ヘルススコア</span>
        <span class="cs-health-result ${health.className}"><strong>${health.score}</strong>${health.label}</span>
      </div>
      <div class="cs-health-settings">
        <label>モデル<select data-health-setting="model" onchange="updateCsHealthSettings('${p.id}')">
          ${["SBS","SBS-Lite","Connectハイブリット","Connectオンプレ"].map(value => `<option value="${value}"${healthModel === value ? " selected" : ""}>${value}</option>`).join("")}
        </select></label>
        <label>導入範囲<select data-health-setting="scale" onchange="updateCsHealthSettings('${p.id}')">
          <option value="all"${(p.healthScale || "all") === "all" ? " selected" : ""}>全床導入</option>
          <option value="partial"${p.healthScale === "partial" ? " selected" : ""}>部分導入</option>
        </select></label>
        <label>Outcome<select data-health-setting="outcomeType" onchange="updateCsHealthSettings('${p.id}')">
          <option value="labor"${(p.healthOutcomeType || "labor") === "labor" ? " selected" : ""}>労務削減</option>
          <option value="retention"${p.healthOutcomeType === "retention" ? " selected" : ""}>人材定着</option>
          <option value="efficiency"${p.healthOutcomeType === "efficiency" ? " selected" : ""}>業務効率</option>
          <option value="safety"${p.healthOutcomeType === "safety" ? " selected" : ""}>医療安全</option>
          <option value="quality"${p.healthOutcomeType === "quality" ? " selected" : ""}>質の改善</option>
        </select></label>
      </div>
      <div class="cs-health-scores">
        ${CS_HEALTH_PHASES.map((phase, index) => `<div class="cs-health-score-item${index > (health.currentIndex ?? -1) ? " is-future" : ""}"><span>${phase.english}</span><strong>${health.values[phase.key]}</strong></div>`).join("")}
      </div>
      <div class="cs-health-actions">
        <span>CSアクション</span>
        ${actions.map(action => `<p>${escapeHtml(action)}</p>`).join("")}
      </div>
    </div>`;
}

function getCsPhase(key) {
  return CS_PHASES.find(phase => phase.key === key) || CS_PHASES[0];
}

function getCurrentCsPhase(p) {
  const status = normalizeVisitStatus(getLatestVisit(p)?.status);
  return getCsPhase(status);
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

function createCsStateSelect(p) {
  const current = getCsState(p);
  return `<select class="cs-card-state-select" onchange="updateCsState('${p.id}', this.value)">
    ${CS_STATE_OPTIONS.map(s => `<option value="${escapeHtml(s)}"${s === current ? " selected" : ""}>${escapeHtml(s)}</option>`).join("")}
  </select>`;
}

// =============================================
// CSカード生成
// =============================================
function createCsCard(p) {
  const colorClass = getCsHealth(p).className;
  const lastVisit  = getLastVisitInfo(p);
  const showEos    = shouldShowEos(p);
  const visits     = p.visits || [];
  const duplicateBadge = isDuplicateCsHospital(p) ? `<span class="cs-duplicate-badge">重複</span>` : "";

  const products = getProductLabels(p);

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
          <span class="cs-visit-score">達成度 ${Number(v.score) || 0}</span>
          <button class="btn-cs-visit-edit" onclick="openVisitModal('${p.id}', ${realIdx})">編集</button>
          <button class="btn-cs-visit-delete" onclick="deleteVisit('${p.id}', ${realIdx})">削除</button>
          <span class="cs-visit-date">${dateStr}</span>
        </div>
        ${v.taskItem ? `<div class="cs-visit-task"><strong>${escapeHtml(v.taskItem)}</strong><span>${escapeHtml(v.taskContent || "")}</span></div>` : ""}
        ${v.freeText ? `<div class="cs-visit-text">${escapeHtml(v.freeText)}</div>` : ""}
      </div>`;
  }).join("");

  const startFmt = p.startDate
    ? new Date(p.startDate).toLocaleDateString("ja-JP", { year:"numeric", month:"2-digit", day:"2-digit" })
    : "未設定";

  return `
    <div class="cs-card ${colorClass}" data-id="${p.id}">
      ${showEos ? `<span class="eos-badge">EOS</span>` : ""}
      <div>
        <div class="cs-card-title">${escapeHtml(p.hospitalName)}${duplicateBadge}</div>
        <div class="cs-card-sub">
          <span class="cs-meta-tag">📅 ${startFmt}</span>
          ${p.csPerson ? `<span class="cs-meta-tag">👤 ${escapeHtml(p.csPerson)}</span>` : ""}
          ${p.ward ? `<span class="cs-meta-tag">🏥 ${escapeHtml(p.ward)}</span>` : ""}
        </div>
      </div>
      <div class="cs-card-state-row"><span class="cs-visits-label">状態</span>${createCsStateSelect(p)}</div>
      ${products.length ? `<div class="cs-products">${products.map(pr => `<span class="cs-product-badge">${pr}</span>`).join("")}</div>` : ""}
      ${p.memo ? `<div class="cs-card-memo">${escapeHtml(p.memo)}</div>` : ""}
      ${createCsHealthSection(p)}
      <div class="${lastVisit.cls} last-visit-indicator">${lastVisit.text}</div>
      ${visits.length
        ? `<div class="cs-visits-section">
             <span class="cs-visits-label">訪問履歴（${visits.length}件）${visits.length > 3 ? " ※直近3件" : ""}</span>
             ${visitHtml}
           </div>`
        : `<div class="last-visit-none last-visit-indicator">訪問記録がありません</div>`}
      <div class="cs-card-actions">
        <button class="btn-cs-next" onclick="openVisitModal('${p.id}')">次の訪問を追加</button>
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
    return matchName && matchPerson;
  });

  const pri = { "cs-status-red":0, "cs-status-orange":1, "cs-status-yellow":2, "cs-status-green":3 };
  filtered.sort((a, b) => (pri[getCsHealth(a).className] ?? 4) - (pri[getCsHealth(b).className] ?? 4));

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
  const health = getCsHealth(p);
  return `<tr>
    <td><span class="cs-list-state">${escapeHtml(getCsState(p))}</span></td>
    <td class="cs-list-hospital" onclick="openCsDetailModal('${p.id}')">${escapeHtml(p.hospitalName || "")}</td>
    <td>${escapeHtml(p.csPerson || "—")}</td>
    <td><span class="cs-list-status">${escapeHtml(getVisitStatusLabel(latest?.status))}</span></td>
    <td><span class="cs-list-health ${health.className}">${health.score}</span></td>
    <td><span class="cs-list-visit">${escapeHtml(latestDate)}</span></td>
    <td class="cs-list-memo">${escapeHtml(getLatestVisitMemo(p))}</td>
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
    return matchName && matchPerson;
  });

  const pri = { "cs-status-red":0, "cs-status-orange":1, "cs-status-yellow":2, "cs-status-green":3 };
  filtered.sort((a, b) => {
    const pa = pri[getCsHealth(a).className] ?? 4;
    const pb = pri[getCsHealth(b).className] ?? 4;
    if (pa !== pb) return pa - pb;
    return (a.startDate || "").localeCompare(b.startDate || "");
  });

  document.getElementById("csProjectCount").textContent = `${filtered.length} 件`;
  tbody.innerHTML = filtered.length
    ? filtered.map(createCsListRow).join("")
    : `<tr><td colspan="7" class="cs-list-loading">該当するCS案件がありません</td></tr>`;
  updateCsStats();
}

function renderCsView() {
  if (document.getElementById("csTableBody")) renderCsList();
  else renderCsProjects();
}

function updateCsStats() {
  const total = document.getElementById("csTotalStat");
  const green = document.getElementById("csGreenStat");
  const yellow = document.getElementById("csYellowStat");
  const orange = document.getElementById("csOrangeStat");
  const red = document.getElementById("csRedStat");
  if (total)  total.textContent  = allCsProjects.length;
  if (green)  green.textContent  = allCsProjects.filter(p => getCsHealth(p).className === "cs-status-green").length;
  if (yellow) yellow.textContent = allCsProjects.filter(p => getCsHealth(p).className === "cs-status-yellow").length;
  if (orange) orange.textContent = allCsProjects.filter(p => getCsHealth(p).className === "cs-status-orange").length;
  if (red) red.textContent = allCsProjects.filter(p => getCsHealth(p).className === "cs-status-red").length;
}

// =============================================
// Firestore リアルタイム同期
// =============================================
function initCs() {
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
  document.getElementById("csModalTitle").textContent = "CS案件 編集";
  document.getElementById("csEditId").value       = id;
  document.getElementById("csHospitalName").value = p.hospitalName || "";
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
  const data = {
    type:          "cs",
    hospitalName:  document.getElementById("csHospitalName").value.trim(),
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
  document.getElementById("visitTaskDetail").innerHTML = selected ? `
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
  document.getElementById("visitScore").value = 0;
  document.getElementById("visitScoreValue").textContent = "0";
  if (targetVisit) {
    document.getElementById("visitStatus").value = normalizeVisitStatus(targetVisit.status);
    updateVisitTaskOptions(targetVisit.taskItem || "");
    document.getElementById("visitStartDate").value = targetVisit.startDate || "";
    document.getElementById("visitEndDate").value = targetVisit.endDate || "";
    document.getElementById("visitFreeText").value = targetVisit.freeText || "";
    document.getElementById("visitScore").value = Number(targetVisit.score) || 0;
    document.getElementById("visitScoreValue").textContent = String(Number(targetVisit.score) || 0);
  } else {
    document.getElementById("visitStatus").value = normalizeVisitStatus(getLatestVisit(p)?.status || "支援計画");
    updateVisitTaskOptions();
  }
  document.getElementById("visitModal").classList.add("open");
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
    score:     Math.max(0, Math.min(100, Number(document.getElementById("visitScore").value) || 0)),
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

async function updateCsState(projectId, state) {
  try {
    await db.collection("cs_projects").doc(projectId).update({ state, taskStatus: state });
    showToast("状態を更新しました");
  } catch (err) {
    console.error(err);
    showToast("状態の更新に失敗しました", "error");
  }
}

async function updateCsHealthSettings(projectId) {
  const section = document.querySelector(`[data-health-id="${projectId}"]`);
  if (!section) return;
  const getSetting = key => section.querySelector(`[data-health-setting="${key}"]`)?.value || "";
  const data = {
    healthModel: getSetting("model"),
    healthScale: getSetting("scale"),
    healthOutcomeType: getSetting("outcomeType"),
    healthUpdatedAt: new Date().toISOString(),
  };
  const localProject = allCsProjects.find(project => project.id === projectId);
  if (localProject) Object.assign(localProject, data);
  renderCsView();
  try {
    await db.collection("cs_projects").doc(projectId).update(data);
    showToast("ヘルススコア設定を更新しました");
  } catch (err) {
    console.error(err);
    showToast("ヘルススコア設定の更新に失敗しました", "error");
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
        <tr><th>状態</th><td>${escapeHtml(getCsState(p))}</td></tr>
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
      state: getTableValue(row, indexes, ["状態"]) || "正常",
      taskStatus: getTableValue(row, indexes, ["状態"]) || "正常",
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
    state:           String(item.state        || "正常").trim(),
    taskStatus:      String(item.taskStatus   || item.state || "正常").trim(),
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
