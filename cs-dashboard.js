'use strict';

function dashboardText(value) {
  return value === undefined || value === null || value === "" ? "-" : String(value);
}

function dashboardMonthsSince(dateText) {
  if (!dateText) return 0;
  const start = new Date(dateText);
  const now = new Date();
  return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth());
}

function renderDashboardDetails(project) {
  const products = getProductLabels(project).join(" / ") || "-";
  const systems = getSystemLabels(project).join(" / ") || "-";
  const rows = [
    ["院名", project.hospitalName],
    ["導入病棟名", project.ward],
    ["稼働開始日", project.startDate],
    ["サポートエンド", project.supportEndDate],
    ["担当営業", project.salesPerson],
    ["担当CS", project.csPerson],
    ["SOL PM", project.solPm],
    ["システム種類", systems],
    ["導入製品", products],
    ["病床移動運用", project.moveOp],
    ["病床番号変更担当", project.bedNumStaff],
    ["床頭台移動担当", project.bedMoveStaff],
    ["状態", getCsState(project)],
    ["メモ", project.memo],
  ];
  document.getElementById("dashboardDetailTable").innerHTML = rows.map(([label, value]) =>
    `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(dashboardText(value))}</td></tr>`
  ).join("");
}

function renderDashboardSummary(project) {
  const health = getCsHealth(project);
  const visits = project.visits || [];
  const latest = getLatestVisit(project);
  const phase = latest ? getVisitStatusLabel(latest.status) : "未開始";
  const healthClass = health.score >= 85 ? "health-good" : health.score >= 70 ? "health-caution" : health.score >= 50 ? "health-risk" : "health-critical";
  document.getElementById("dashboardSummary").innerHTML = `
    <div class="dashboard-summary-item ${healthClass}"><span>ヘルススコア</span><strong>${health.score}</strong><em>${health.label}</em></div>
    <div class="dashboard-summary-item"><span>現在フェーズ</span><strong style="font-size:14px;line-height:1.3">${escapeHtml(phase)}</strong><em>${latest?.taskItem ? escapeHtml(latest.taskItem) : "タスク未登録"}</em></div>
    <div class="dashboard-summary-item"><span>訪問 / 対応</span><strong>${visits.length}</strong><em>累計記録数</em></div>
    <div class="dashboard-summary-item"><span>稼働期間</span><strong>${dashboardMonthsSince(project.startDate)}</strong><em>か月</em></div>`;
}

function renderDashboardPhaseScores(project) {
  const health = getCsHealth(project);
  document.getElementById("dashboardPhaseScores").innerHTML = CS_HEALTH_PHASES.map((phase, index) => `
    <div class="dashboard-phase-row">
      <div class="dashboard-phase-name"><strong>${escapeHtml(phase.label)}</strong><small>${escapeHtml(phase.english)}</small></div>
      <div class="dashboard-progress-track"><div class="dashboard-progress-fill" style="width:${health.values[phase.key]}%;opacity:${index > health.currentIndex ? .28 : 1}"></div></div>
      <div class="dashboard-phase-value">${health.values[phase.key]}</div>
    </div>`).join("");
}

function renderDashboardTrend(project) {
  const visits = project.visits || [];
  const points = visits.map((visit, index) => getCsHealth({ ...project, visits: visits.slice(0, index + 1) }).score);
  const chartPoints = points.length ? points : [0];
  const width = 620, height = 180, pad = 24;
  const coords = chartPoints.map((score, index) => {
    const x = chartPoints.length === 1 ? width / 2 : pad + index * (width - pad * 2) / (chartPoints.length - 1);
    const y = height - pad - score * (height - pad * 2) / 100;
    return [x, y];
  });
  const line = coords.map(pair => pair.join(",")).join(" ");
  const area = `${pad},${height-pad} ${line} ${coords.at(-1)[0]},${height-pad}`;
  const latest = getLatestVisit(project);
  document.getElementById("dashboardTrend").innerHTML = `
    <div class="dashboard-trend-metrics">
      <div class="dashboard-trend-metric"><span>最新スコア</span><strong>${getCsHealth(project).score}</strong></div>
      <div class="dashboard-trend-metric"><span>最新対応日</span><strong style="font-size:11px">${escapeHtml(getLatestVisitDateText(project))}</strong></div>
      <div class="dashboard-trend-metric"><span>最新達成度</span><strong>${Number(latest?.score) || 0}</strong></div>
    </div>
    <svg class="dashboard-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="ヘルススコア推移">
      ${[0,25,50,75,100].map(value => { const y = height-pad-value*(height-pad*2)/100; return `<line class="dashboard-chart-grid" x1="${pad}" y1="${y}" x2="${width-pad}" y2="${y}"/>`; }).join("")}
      <polygon class="dashboard-chart-area" points="${area}"/>
      <polyline class="dashboard-chart-line" points="${line}"/>
      ${coords.map(([x,y]) => `<circle class="dashboard-chart-point" cx="${x}" cy="${y}" r="4"/>`).join("")}
    </svg>`;
}

function renderDashboardVisits(project) {
  const visits = [...(project.visits || [])].reverse();
  document.getElementById("dashboardVisitCount").textContent = `${visits.length}件`;
  document.getElementById("dashboardVisits").innerHTML = visits.length ? `
    <table class="dashboard-visit-table"><thead><tr><th>ステータス</th><th>フェーズ項目</th><th>達成度</th><th>期間</th><th>内容 / メモ</th></tr></thead><tbody>
    ${visits.map(visit => `<tr>
      <td>${escapeHtml(getVisitStatusLabel(visit.status))}</td>
      <td><strong>${escapeHtml(visit.taskItem || "-")}</strong><br>${escapeHtml(visit.taskContent || "")}</td>
      <td>${Number(visit.score) || 0}</td>
      <td>${escapeHtml(visit.startDate || "-")}${visit.endDate && visit.endDate !== visit.startDate ? `<br>${escapeHtml(visit.endDate)}` : ""}</td>
      <td>${escapeHtml(visit.taskEffect || "")}${visit.freeText ? `<br>${escapeHtml(visit.freeText)}` : ""}</td>
    </tr>`).join("")}</tbody></table>` : `<div class="dashboard-empty">訪問記録がありません</div>`;
}

async function initCsDashboard() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    document.getElementById("dashboardHospitalName").textContent = "案件が指定されていません";
    return;
  }
  try {
    const snapshot = await db.collection("cs_projects").doc(id).get();
    if (!snapshot.exists) throw new Error("案件が見つかりません");
    const project = { id: snapshot.id, ...snapshot.data() };
    document.title = `${project.hospitalName || "CS"} | CSダッシュボード`;
    document.getElementById("dashboardHospitalName").textContent = project.hospitalName || "CSダッシュボード";
    renderDashboardDetails(project);
    renderDashboardSummary(project);
    renderDashboardPhaseScores(project);
    renderDashboardTrend(project);
    renderDashboardVisits(project);
  } catch (error) {
    console.error(error);
    document.getElementById("dashboardHospitalName").textContent = error.message;
    document.getElementById("dashboardSummary").innerHTML = `<div class="dashboard-empty">データを読み込めませんでした</div>`;
  }
}

document.addEventListener("DOMContentLoaded", initCsDashboard);
