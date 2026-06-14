'use strict';

const DASHBOARD_DEFAULTS = {
  version: 1,
  currentPhase: "支援計画",
  dataSources: {
    automaticFields: ["loginCount","activeUsers","usageDays","usedFeatures","alertCount","dataViews","dashboardViews","connectedDevices","inquiryCount","unresolvedIssues","visits","renewalDate"],
    manualFields: ["kpiTarget","kpiCurrent","monthlySavedHours","hourlyLaborCost","renewalProbability","caseStudy","visitAcceptance","speakingSupport","memo"],
  },
  csActivity: { lastVisitDate:"", visitCount:"", regularMeetingCount:"", inquiryCount:"", unresolvedIssues:"", trainingCount:"", lastContactDate:"", nextContactDate:"" },
  usage: { targetUsers:"", activeUsers:"", loginCount:"", usageDays:"", usedFeatures:"", totalFeatures:"", connectedDevices:"", installedDevices:"", alertCount:"", dataViews:"", dashboardViews:"", roles:[] },
  kpi: { type:"", target:"", current:"", patrolReduction:"", nightVisitReduction:"", workHoursReduction:"", alertResponseRate:"", sleepDataUsageRate:"" },
  roi: { contractAmount:"", monthlySavedHours:"", hourlyLaborCost:"" },
  renewal: { renewalDate:"", probability:"", hasAdditionalProposal:"", proposalCount:"", otherWardExpansion:"", otherFacilityExpansion:"", upperPlanProposal:"", additionalLicenseProposal:"" },
  advocacy: { caseStudy:"", visitAcceptance:"", userGroupParticipation:"", speakingSupport:"", referralRecord:"", jointProject:"", referenceCustomer:"" },
};

const WORK_REDUCTION_DEFAULTS = {
  systemType: "",
  sbs: {
    bedExitReductionCountPerDay: 0, bedExitMinutesPerCount: 2,
    patientStatusCheckReductionCountPerDay: 0, patientStatusCheckMinutesPerCount: 1,
    nurseCallStatusCheckReductionCountPerDay: 0, nurseCallStatusCheckMinutesPerCount: 1,
    vitalTranscriptionReductionCountPerDay: 0, vitalTranscriptionMinutesPerCount: 0.5,
    roomRoundReductionCountPerDay: 0, roomRoundMinutesPerCount: 3,
  },
  connect: {
    nightRoundReductionCountPerDay: 0, nightRoundMinutesPerCount: 3,
    statusCheckReductionCountPerDay: 0, statusCheckMinutesPerCount: 2,
    handoverReductionMinutesPerDay: 0, recordSharingReductionMinutesPerDay: 0,
  },
};

const YES_NO = [["","-"],["yes","あり"],["no","なし"]];
const AVAILABILITY = [["","-"],["yes","可"],["no","不可"],["review","要確認"]];
const DASHBOARD_FIELDS = {
  csActivity: [
    ["lastVisitDate","最終訪問日","date"],["visitCount","訪問回数","number"],["regularMeetingCount","定例会回数","number"],
    ["inquiryCount","問い合わせ件数","number"],["unresolvedIssues","未解決課題数","number"],["trainingCount","教育実施回数","number"],
    ["lastContactDate","最終対応日","date"],["nextContactDate","次回対応予定日","date"],
  ],
  usage: [
    ["targetUsers","対象ユーザー数","number"],["activeUsers","アクティブユーザー数","number"],["loginCount","ログイン回数","number"],
    ["usedFeatures","利用機能数","number"],["totalFeatures","全機能数","number"],
    ["connectedDevices","端末接続台数","number"],["installedDevices","導入台数","number"],["alertCount","アラート件数","number"],
    ["dataViews","データ閲覧回数","number"],["dashboardViews","ダッシュボード閲覧回数","number"],
  ],
  kpi: [
    ["type","KPI種別","text"],["target","KPI目標値","number"],["current","KPI現在値","number"],
    ["patrolReduction","巡視削減率","number"],["nightVisitReduction","夜間訪室削減率","number"],["workHoursReduction","業務削減時間","number"],
    ["alertResponseRate","アラート対応率","number"],["sleepDataUsageRate","睡眠データ活用率","number"],
  ],
  roi: [["contractAmount","契約金額","number"],["monthlySavedHours","月間削減時間","number"],["hourlyLaborCost","人件費単価","number"]],
  renewal: [
    ["renewalDate","契約更新日","date"],["probability","更新確度","select",[["","-"],["A","A"],["B","B"],["C","C"],["D","D"]]],
    ["hasAdditionalProposal","追加提案有無","select",YES_NO],["proposalCount","提案中案件数","number"],
    ["otherWardExpansion","他病棟展開有無","select",YES_NO],["otherFacilityExpansion","他施設展開有無","select",YES_NO],
    ["upperPlanProposal","上位プラン提案有無","select",YES_NO],["additionalLicenseProposal","追加ライセンス提案有無","select",YES_NO],
  ],
  advocacy: [
    ["caseStudy","事例化可否","select",AVAILABILITY],["visitAcceptance","見学受入可否","select",AVAILABILITY],
    ["userGroupParticipation","ユーザー会参加有無","select",YES_NO],["speakingSupport","講演協力可否","select",AVAILABILITY],
    ["referralRecord","紹介実績有無","select",YES_NO],["jointProject","共同プロジェクト有無","select",YES_NO],
    ["referenceCustomer","リファレンス顧客化","select",AVAILABILITY],
  ],
};

const CATEGORY_META = {
  basic: ["基本情報", "既存案件情報"], csActivity: ["CS活動", "訪問・対応状況"], usage: ["利用状況", "システム活用状況"],
  kpi: ["成果・KPI", "成果指標"], roi: ["ROI", "費用対効果"], renewal: ["更新・拡大", "契約更新と提案"],
  advocacy: ["共創・事例化", "顧客協力・事例化"], visits: ["訪問履歴", "複数件の追加・編集・削除"],
};

let dashboardProject = null;
let dashboardDocRef = null;
let dashboardEditingCategory = "";
let dashboardVisitEditIndex = -1;
let dashboardUnsubscribe = null;
let migrationRunning = false;

function blank(value) { return value === undefined || value === null || value === ""; }
function shown(value, suffix = "") { return blank(value) ? "-" : `${value}${suffix}`; }
function numberValue(value) { if(blank(value)) return null; const n = Number(value); return Number.isFinite(n) ? n : null; }
function percent(n) { return n === null ? "-" : `${Math.round(n)}%`; }
function ratio(a, b) { const x=numberValue(a), y=numberValue(b); return x===null || y===null || y===0 ? null : x/y*100; }
function calendarDate(value) { if (!value) return null; const d=new Date(value); if(Number.isNaN(d.getTime())) return null; return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
function daysBetween(from, to = new Date()) { const start=calendarDate(from), end=calendarDate(to); return !start||!end?null:Math.floor((end-start)/86400000); }
function daysUntil(date) { const end=calendarDate(date), today=calendarDate(new Date()); return !end?null:Math.ceil((end-today)/86400000); }
function operatingDays(date){const days=daysBetween(date);return days===null?null:Math.max(0,days);}
function previousDate(date){const d=calendarDate(date);if(!d)return "";d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function mergedDashboard(raw = {}) {
  const merged = { ...DASHBOARD_DEFAULTS, ...raw };
  Object.keys(DASHBOARD_DEFAULTS).forEach(key => {
    if (typeof DASHBOARD_DEFAULTS[key] === "object" && !Array.isArray(DASHBOARD_DEFAULTS[key])) merged[key] = { ...DASHBOARD_DEFAULTS[key], ...(raw[key] || {}) };
  });
  return merged;
}
function mergedWorkReduction(raw={}) { return {...WORK_REDUCTION_DEFAULTS,...raw,sbs:{...WORK_REDUCTION_DEFAULTS.sbs,...(raw.sbs||{})},connect:{...WORK_REDUCTION_DEFAULTS.connect,...(raw.connect||{})}}; }
function safeWorkNumber(value){const n=Number(value);return Number.isFinite(n)?n:0;}
function calculateWorkReductionMinutesPerDay(raw){
  const work=mergedWorkReduction(raw);
  if(work.systemType==="SBS") { const x=work.sbs; return safeWorkNumber(x.bedExitReductionCountPerDay)*safeWorkNumber(x.bedExitMinutesPerCount)+safeWorkNumber(x.patientStatusCheckReductionCountPerDay)*safeWorkNumber(x.patientStatusCheckMinutesPerCount)+safeWorkNumber(x.nurseCallStatusCheckReductionCountPerDay)*safeWorkNumber(x.nurseCallStatusCheckMinutesPerCount)+safeWorkNumber(x.vitalTranscriptionReductionCountPerDay)*safeWorkNumber(x.vitalTranscriptionMinutesPerCount)+safeWorkNumber(x.roomRoundReductionCountPerDay)*safeWorkNumber(x.roomRoundMinutesPerCount); }
  if(work.systemType==="Connect") { const x=work.connect; return safeWorkNumber(x.nightRoundReductionCountPerDay)*safeWorkNumber(x.nightRoundMinutesPerCount)+safeWorkNumber(x.statusCheckReductionCountPerDay)*safeWorkNumber(x.statusCheckMinutesPerCount)+safeWorkNumber(x.handoverReductionMinutesPerDay)+safeWorkNumber(x.recordSharingReductionMinutesPerDay); }
  return null;
}
function calculateWorkReductionSummary(raw){const minutesPerDay=calculateWorkReductionMinutesPerDay(raw);if(minutesPerDay===null)return {minutesPerDay:null,hoursPerDay:null,hoursPerMonth:null,hoursPerYear:null};const hoursPerDay=minutesPerDay/60;return {minutesPerDay,hoursPerDay,hoursPerMonth:hoursPerDay*30,hoursPerYear:hoursPerDay*365};}

function getDashboardData(project) { return mergedDashboard(project.csDashboard || {}); }
function latestVisitDate(project) {
  const dates=(project.visits||[]).map(v=>v.endDate||v.startDate).filter(Boolean).sort();
  return dates.at(-1) || "";
}
function dashboardCalculations(project) {
  const data=getDashboardData(project), usage=data.usage, kpi=data.kpi, roi=data.roi, renewal=data.renewal, activity=data.csActivity;
  const workReduction=mergedWorkReduction(project.workReduction||{}),workSummary=calculateWorkReductionSummary(workReduction);
  usage.usageDays=operatingDays(project.startDate);
  const activeRate=ratio(usage.activeUsers,usage.targetUsers), featureRate=ratio(usage.usedFeatures,usage.totalFeatures), connectionRate=ratio(usage.connectedDevices,usage.installedDevices);
  const availableUsage=[activeRate,featureRate,connectionRate].filter(v=>v!==null);
  const systemUsage=availableUsage.length ? availableUsage.reduce((a,b)=>a+b,0)/availableUsage.length : null;
  const kpiRate=ratio(kpi.current,kpi.target);
  const manualMonthlyHours=numberValue(roi.monthlySavedHours),effectiveMonthlyHours=manualMonthlyHours!==null?manualMonthlyHours:workSummary.hoursPerMonth;
  const monthlySaved=(effectiveMonthlyHours!==null && numberValue(roi.hourlyLaborCost)!==null) ? effectiveMonthlyHours*numberValue(roi.hourlyLaborCost) : null;
  const annualSaved=monthlySaved===null?null:monthlySaved*12, roiRate=ratio(annualSaved,roi.contractAmount);
  const payback=(monthlySaved && numberValue(roi.contractAmount)!==null)?numberValue(roi.contractAmount)/monthlySaved:null;
  const historyLatest=latestVisitDate(project);
  const newestVisit=historyLatest || activity.lastVisitDate;
  const newestContact=historyLatest || activity.lastContactDate;
  const latestVisitEntry=[...(project.visits||[])].sort((a,b)=>(b.endDate||b.startDate||"").localeCompare(a.endDate||a.startDate||""))[0];
  const nextContact=latestVisitEntry?.dashboardVisit?.nextDate || activity.nextContactDate || "";
  const visitElapsed=daysBetween(newestVisit), renewalDays=daysUntil(project.supportEndDate), unresolved=numberValue(activity.unresolvedIssues);
  const parts=[], missing=[];
  if(systemUsage===null) missing.push("利用状況"); else parts.push({score:Math.min(100,systemUsage)*.4,max:40});
  if(visitElapsed===null) missing.push("最終訪問日"); else parts.push({score:visitElapsed<=30?20:visitElapsed<=60?10:0,max:20});
  if(kpiRate===null) missing.push("KPI"); else parts.push({score:Math.min(100,kpiRate)*.2,max:20});
  if(unresolved===null) missing.push("未解決課題数"); else parts.push({score:unresolved===0?10:unresolved<=2?5:0,max:10});
  if(renewalDays===null) missing.push("契約更新日"); else parts.push({score:renewalDays>90?10:renewalDays>30?5:0,max:10});
  const health=getCsHealth(project).score;
  return {activeRate,featureRate,connectionRate,systemUsage,kpiRate,monthlySaved,annualSaved,roiRate,payback,newestVisit,newestContact,nextContact,visitElapsed,renewalDays,unresolved,health,missing,workReduction,workSummary,effectiveMonthlyHours,monthlyHoursSource:manualMonthlyHours!==null?"手入力":workSummary.hoursPerMonth!==null?"業務削減時間から自動算出":"-"};
}

function riskClass(value, caution, risk, reverse=false) {
  if(value===null) return "is-empty";
  if(reverse) return value<=risk?"is-risk":value<=caution?"is-caution":"is-good";
  return value<risk?"is-risk":value<caution?"is-caution":"is-good";
}
function badge(label, cls="") { return `<span class="dashboard-risk-badge ${cls}">${label}</span>`; }
function displaySelect(value, options) { return options.find(row=>row[0]===value)?.[1] || "-"; }
function rowsHtml(rows) { return `<dl class="dashboard-data-list">${rows.map(([k,v])=>`<div><dt>${escapeHtml(String(k))}</dt><dd>${escapeHtml(String(v))}</dd></div>`).join("")}</dl>`; }

function basicRows(p) {
  return [["院名",shown(p.hospitalName)],["導入病棟名",shown(p.ward)],["稼働開始日",shown(p.startDate)],["サポートエンド",shown(p.supportEndDate)],
    ["担当営業",shown(p.salesPerson)],["担当CS",shown(p.csPerson)],["SOL PM",shown(p.solPm)],["システム種類",shown(getSystemLabels(p).join(" / "))],
    ["導入製品",shown(getProductLabels(p).join(" / "))],["病床移動運用",shown(p.moveOp)],["病床番号変更担当",shown(p.bedNumStaff)],
    ["床頭台移動担当",shown(p.bedMoveStaff)],["状態",shown(getCsState(p))],["メモ",shown(p.memo)]];
}
function categoryRows(category,p,c) {
  const d=getDashboardData(p), x=d[category];
  if(category==="csActivity") return [["最終訪問日",shown(c.newestVisit)],["経過日数",shown(c.visitElapsed,"日")],["訪問回数",shown((p.visits||[]).length||x.visitCount||0)],
    ["定例会回数",shown(x.regularMeetingCount)],["問い合わせ件数",shown(x.inquiryCount)],["未解決課題数",shown(x.unresolvedIssues)],
    ["教育実施回数",shown(x.trainingCount)],["最終対応日",shown(c.newestContact)],["次回対応予定日",shown(c.nextContact)]];
  if(category==="usage") return [["システム利用率",percent(c.systemUsage)],["アクティブ率",percent(c.activeRate)],["機能活用率",percent(c.featureRate)],
    ["端末接続率",percent(c.connectionRate)],["対象ユーザー数",shown(x.targetUsers)],["アクティブユーザー数",shown(x.activeUsers)],["ログイン回数",shown(x.loginCount)],
    ["利用日数",shown(operatingDays(p.startDate),"日")],["アラート件数",shown(x.alertCount)],["データ閲覧回数",shown(x.dataViews)],["ダッシュボード閲覧回数",shown(x.dashboardViews)]];
  if(category==="kpi") return [["KPI種別",shown(x.type)],["KPI目標値",shown(x.target)],["KPI現在値",shown(x.current)],["KPI達成率",percent(c.kpiRate)],
    ["巡視削減率",shown(x.patrolReduction,"%")],["夜間訪室削減率",shown(x.nightVisitReduction,"%")],["業務削減時間",shown(x.workHoursReduction,"時間")],
    ["アラート対応率",shown(x.alertResponseRate,"%")],["睡眠データ活用率",shown(x.sleepDataUsageRate,"%")]];
  if(category==="roi") return [["契約金額",shown(x.contractAmount,"円")],["月間削減時間",shown(c.effectiveMonthlyHours===null?"":c.effectiveMonthlyHours.toFixed(1),"時間")],["算出元",c.monthlyHoursSource],["人件費単価",shown(x.hourlyLaborCost,"円")],
    ["月間削減額",shown(c.monthlySaved===null?"":Math.round(c.monthlySaved),"円")],["年間削減額",shown(c.annualSaved===null?"":Math.round(c.annualSaved),"円")],
    ["ROI",percent(c.roiRate)],["投資回収月数",shown(c.payback===null?"":c.payback.toFixed(1),"か月")]];
  if(category==="renewal") return [["契約更新日",shown(x.renewalDate)],["更新までの残日数",shown(c.renewalDays,"日")],["更新確度",shown(x.probability)],
    ["追加提案有無",displaySelect(x.hasAdditionalProposal,YES_NO)],["提案中案件数",shown(x.proposalCount)],["他病棟展開有無",displaySelect(x.otherWardExpansion,YES_NO)],
    ["他施設展開有無",displaySelect(x.otherFacilityExpansion,YES_NO)],["上位プラン提案有無",displaySelect(x.upperPlanProposal,YES_NO)],["追加ライセンス提案有無",displaySelect(x.additionalLicenseProposal,YES_NO)]];
  if(category==="advocacy") return DASHBOARD_FIELDS.advocacy.map(([key,label,,options])=>[label,displaySelect(x[key],options)]);
  return [];
}

function categoryRisk(category,c) {
  if(category==="basic") return badge("登録情報","is-empty");
  if(category==="csActivity") return c.visitElapsed===null?badge("-","is-empty"):c.visitElapsed>=60?badge("未訪問リスク","is-risk"):c.visitElapsed>=30?badge("要フォロー","is-caution"):c.unresolved>=3?badge("課題注意","is-caution"):badge("良好","is-good");
  if(category==="usage") return badge(c.systemUsage===null?"未算出":c.systemUsage<50?"リスク":c.systemUsage<70?"注意":"良好",riskClass(c.systemUsage,70,50));
  if(category==="kpi") return badge(c.kpiRate===null?"未算出":c.kpiRate<50?"リスク":c.kpiRate<80?"注意":"良好",riskClass(c.kpiRate,80,50));
  if(category==="roi") return badge(c.roiRate===null?"未算出":c.roiRate<100?"要確認":"回収見込",c.roiRate===null?"is-empty":c.roiRate<100?"is-caution":"is-good");
  if(category==="renewal") return badge(c.renewalDays===null?"-":c.renewalDays<=30?"更新リスク":c.renewalDays<=90?"更新注意":"余裕あり",riskClass(c.renewalDays,90,30,true));
  if(category==="advocacy") return badge("共創候補","is-empty");
  if(category==="visits") return badge(c.newestVisit?"履歴あり":"未登録",c.newestVisit?"is-good":"is-empty");
  return badge("確認","is-empty");
}

function renderSummary(p,c) {
  const healthCls=c.health>=80?"health-good":c.health>=60?"health-caution":"health-critical";
  const data=getDashboardData(p), phase=data.currentPhase;
  const renewalLabel=c.health>=80?"高":c.health>=60?"中":"低";
  const dailySaved=c.workSummary.hoursPerDay===null?"-":c.workSummary.hoursPerDay.toFixed(1);
  const items=[
    ["ヘルススコア",`${c.health}`,c.health<60?"重大リスク":c.health<80?"要フォロー":"良好",healthCls,"summary-health"],
    ["現在フェーズ",getVisitStatusLabel(phase),c.missing.length?"入力状況を確認":"進行中","","summary-phase"],
    ["訪問 / 対応",`${p.visits?.length||0}`,"累計記録数","","summary-visits"],
    ["稼働期間",shown(daysBetween(p.startDate)),"日","","summary-duration"],
    ["更新まで",shown(c.renewalDays),"日","","summary-renewal"],
    ["最終訪問から",shown(c.visitElapsed),"日経過","","summary-lastvisit"],
    ["更新確度",renewalLabel,"","","summary-probability"],
    ["平均削減時間",dailySaved,"時間 / 日","","summary-saving"],
    ["総合利用率",c.systemUsage===null?"-":`${Math.round(c.systemUsage)}`,"%","","summary-usage"]
  ];
  document.getElementById("dashboardSummary").innerHTML=items.map(([l,v,s,cls,size])=>`<div class="dashboard-summary-item ${cls} ${size}"><span>${l}</span><strong>${escapeHtml(String(v))}</strong><em>${escapeHtml(String(s))}</em></div>`).join("");
}
function renderPhasePanel(p) {
  document.getElementById("dashboardPhasePanel").innerHTML="";
}
function renderVisitsCard(p) {
  const visits=(p.visits||[]).map((visit,index)=>({visit,index})).sort((a,b)=>(b.visit.endDate||b.visit.startDate||"").localeCompare(a.visit.endDate||a.visit.startDate||""));
  return `<div class="dashboard-visit-summary"><strong>${visits.length}</strong><span>累計記録数</span></div>${visits.slice(0,5).map(({visit})=>`<div class="dashboard-visit-row"><time>${escapeHtml(visit.endDate||visit.startDate||"-")}</time><div><strong>${escapeHtml(getVisitStatusLabel(visit.status))}</strong><span>${escapeHtml(visit.taskItem||visit.freeText||"-")}</span></div></div>`).join("")||'<p class="dashboard-empty">訪問記録がありません</p>'}`;
}
function dashboardPanel(category,title,subtitle,body,c) {
  return `<article class="dashboard-category-card panel-${category}"><div class="dashboard-card-head"><div><h2>${title}</h2><p>${subtitle}</p></div><div>${categoryRisk(category,c)}<button onclick="openDashboardModal('${category}')">Input</button></div></div>${body}</article>`;
}
function renderPhaseScores(p) {
  const values=getCsHealth(p).values||{};
  return `<article class="dashboard-category-card panel-phase-score"><div class="dashboard-card-head"><div><h2>フェーズスコア</h2><p>登録タスク達成度の平均</p></div><button onclick="openDashboardModal('phase')">Input</button></div><div class="dashboard-phase-bars">${CS_HEALTH_PHASES.map(phase=>{
    const score=Math.max(0,Math.min(100,Number(values[phase.key])||0));
    return `<div class="dashboard-phase-bar"><div><strong>${phase.label}</strong><small>${phase.english}</small></div><span><i style="width:${score}%"></i></span><b>${Math.round(score)}</b></div>`;
  }).join("")}</div></article>`;
}
function renderTrendPanel(p,c) {
  const visits=[...(p.visits||[])].sort((a,b)=>(a.endDate||a.startDate||"").localeCompare(b.endDate||b.startDate||"")).slice(-10);
  const points=visits.length?visits.map((visit,index)=>({label:(visit.endDate||visit.startDate||"").slice(5),score:Math.max(0,Math.min(100,Number(visit.score)||0)),health:getCsHealth({...p,csDashboard:null,visits:visits.slice(0,index+1)}).score||0})):[{label:"現在",score:0,health:c.health}];
  const width=620,height=250,pad=34,step=points.length>1?(width-pad*2)/(points.length-1):0;
  const coords=key=>points.map((point,index)=>`${pad+index*step},${height-pad-(point[key]/100)*(height-pad*2)}`).join(" ");
  return `<article class="dashboard-category-card panel-trend"><div class="dashboard-card-head"><div><h2>稼働 / 進捗傾向</h2><p>訪問時スコアとヘルス推移</p></div><div class="dashboard-chart-legend"><span class="is-health">ヘルス</span><span class="is-visit">訪問</span></div></div><svg class="dashboard-trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="稼働進捗傾向">${[0,25,50,75,100].map(v=>`<line x1="${pad}" y1="${height-pad-(v/100)*(height-pad*2)}" x2="${width-pad}" y2="${height-pad-(v/100)*(height-pad*2)}" class="trend-grid"/><text x="4" y="${height-pad-(v/100)*(height-pad*2)+4}">${v}</text>`).join("")}<polyline points="${coords("health")}" class="trend-line trend-health"/><polyline points="${coords("score")}" class="trend-line trend-visit"/>${points.map((point,index)=>`<g><circle cx="${pad+index*step}" cy="${height-pad-(point.health/100)*(height-pad*2)}" r="4" class="trend-dot health-dot"/><circle cx="${pad+index*step}" cy="${height-pad-(point.score/100)*(height-pad*2)}" r="4" class="trend-dot visit-dot"/><text x="${pad+index*step}" y="${height-8}" text-anchor="middle">${escapeHtml(point.label||"-")}</text></g>`).join("")}</svg></article>`;
}
function workReductionValue(value){return value===null?"未算出":Number(value).toFixed(1);}
function renderWorkReductionPanel(c){const s=c.workSummary,w=c.workReduction;return `<article class="dashboard-category-card panel-work-reduction"><div class="dashboard-card-head"><div><h2>業務平均削減時間 / 日</h2><p>SBS / Connect 業務削減効果</p></div><button onclick="openDashboardModal('workReduction')">Input</button></div><div class="work-reduction-hero"><span>選択システム</span><strong>${escapeHtml(w.systemType||"未選択")}</strong><b>${s.minutesPerDay===null?"未算出":`${s.minutesPerDay.toFixed(1)} 分`}</b></div><dl class="work-reduction-summary"><div><dt>1日（時間）</dt><dd>${s.hoursPerDay===null?"未算出":`${s.hoursPerDay.toFixed(1)} 時間`}</dd></div><div><dt>月間削減時間</dt><dd>${s.hoursPerMonth===null?"未算出":`${s.hoursPerMonth.toFixed(1)} 時間`}</dd></div><div><dt>年間削減時間</dt><dd>${s.hoursPerYear===null?"未算出":`${s.hoursPerYear.toFixed(1)} 時間`}</dd></div></dl></article>`;}
function renderRolePanel(p,c) {
  const data=getDashboardData(p).usage;
  const palette=["#e87878","#74a9e8","#f1d568","#efa049","#a36cda","#55b8a6","#dc77b2","#7d8dd6"];
  const roles=(Array.isArray(data.roles)?data.roles:[]).filter(role=>role?.name).map((role,index)=>({name:role.name,count:Math.max(0,numberValue(role.count)||0),color:palette[index%palette.length]}));
  const total=roles.reduce((sum,role)=>sum+role.count,0);
  let cursor=0;
  const segments=roles.map(role=>{const start=cursor;cursor+=total?role.count/total*100:0;return `${role.color} ${start}% ${cursor}%`;});
  const donutBackground=total?`conic-gradient(${segments.join(",")})`:"#ececef";
  return `<article class="dashboard-category-card panel-role"><div class="dashboard-card-head"><div><h2>利用者役職比率</h2></div><button onclick="openDashboardModal('usage')">Input</button></div><div class="dashboard-donut-wrap"><div class="dashboard-donut" style="background:${donutBackground}"><div><span>総利用者数</span><strong>${total||"-"}</strong></div></div><div class="dashboard-donut-legend">${roles.map(role=>`<p><i style="background:${role.color}"></i>${escapeHtml(role.name)}<strong>${role.count}</strong></p>`).join("")||'<p>-</p>'}</div></div></article>`;
}
function renderUsagePanel(p,c) {
  const data=getDashboardData(p).usage;
  const rows=[["システム利用率",c.systemUsage],["アクティブ率",c.activeRate],["機能活用率",c.featureRate],["端末接続率",c.connectionRate],["ログイン回数",numberValue(data.loginCount)],["利用日数",operatingDays(p.startDate)],["データ閲覧数",numberValue(data.dataViews)]];
  return `<article class="dashboard-category-card panel-usage"><div class="dashboard-card-head"><div><h2>利用状況</h2><p>システム活用状況</p></div><div>${categoryRisk("usage",c)}<button onclick="openDashboardModal('usage')">Input</button></div></div><div class="dashboard-usage-bars">${rows.map(([label,value],index)=>{const normalized=index<4?Math.max(0,Math.min(100,value||0)):Math.min(100,(value||0));return `<div><span>${label}</span><b><i style="width:${normalized}%"></i></b><strong>${index<4?percent(value):shown(value)}</strong></div>`;}).join("")}</div></article>`;
}
function renderCategories(p,c) {
  document.getElementById("dashboardCategoryGrid").innerHTML=[
    dashboardPanel("basic","基本情報","既存案件情報",rowsHtml(basicRows(p)),c),
    dashboardPanel("csActivity","CS活動","訪問・対応状況",rowsHtml(categoryRows("csActivity",p,c)),c),
    renderPhaseScores(p),
    renderTrendPanel(p,c),
    renderWorkReductionPanel(c),
    `<article class="dashboard-category-card panel-visits"><div class="dashboard-card-head"><div><h2>訪問履歴</h2><p>最新5件を表示</p></div><button onclick="openDashboardModal('visits')">Input</button></div>${renderVisitsCard(p)}</article>`,
    dashboardPanel("advocacy","共創・事例化","顧客協力・事例化",rowsHtml(categoryRows("advocacy",p,c)),c),
    renderRolePanel(p,c),
    renderUsagePanel(p,c)
  ].join("");
}
function renderDashboard(p) { const c=dashboardCalculations(p); document.getElementById("dashboardHospitalName").textContent=p.hospitalName||"CSダッシュボード"; renderSummary(p,c); renderPhasePanel(p); renderCategories(p,c); }

function inputHtml(field,value) {
  const [key,label,type,options]=field, safe=escapeHtml(String(value??""));
  if(type==="select") return `<div class="form-group"><label class="form-label">${label}</label><select class="form-select" name="${key}">${options.map(([v,t])=>`<option value="${v}"${String(value??"")===v?" selected":""}>${t}</option>`).join("")}</select></div>`;
  return `<div class="form-group"><label class="form-label">${label}</label><input class="form-input" name="${key}" type="${type}" value="${safe}"${type==="number"?' min="0" step="any"':''}></div>`;
}
function roleInputRow(role={name:"",count:""}) {
  return `<div class="dashboard-role-input-row"><input class="form-input" name="roleName" type="text" value="${escapeHtml(role.name||"")}" placeholder="役職名"><input class="form-input" name="roleCount" type="number" min="0" step="1" value="${escapeHtml(String(role.count??""))}" placeholder="人数"><button type="button" onclick="removeDashboardRole(this)" aria-label="役職を削除">削除</button></div>`;
}
function usageForm(data) {
  const fields=`<div class="form-group"><label class="form-label">利用日数</label><input class="form-input" type="text" value="${shown(operatingDays(dashboardProject?.startDate),"日")}" readonly></div>`+DASHBOARD_FIELDS.usage.map(field=>inputHtml(field,data[field[0]])).join("");
  const roles=Array.isArray(data.roles)&&data.roles.length?data.roles:[{name:"",count:""}];
  return `${fields}<div class="dashboard-role-editor"><div class="dashboard-role-editor-head"><div><strong>利用者役職</strong><span>役職名と人数を自由に追加できます</span></div><button type="button" onclick="addDashboardRole()">＋ 追加</button></div><div id="dashboardRoleRows">${roles.map(roleInputRow).join("")}</div></div>`;
}
const WORK_REDUCTION_FIELDS={
  SBS:[["bedExitReductionCountPerDay","離床確認削減回数 / 日"],["bedExitMinutesPerCount","離床確認 1回あたり削減時間（分）"],["patientStatusCheckReductionCountPerDay","患者状態確認削減回数 / 日"],["patientStatusCheckMinutesPerCount","患者状態確認 1回あたり削減時間（分）"],["nurseCallStatusCheckReductionCountPerDay","ナースコール後の状況確認削減回数 / 日"],["nurseCallStatusCheckMinutesPerCount","ナースコール後の状況確認 1回あたり削減時間（分）"],["vitalTranscriptionReductionCountPerDay","バイタル転記削減回数 / 日"],["vitalTranscriptionMinutesPerCount","バイタル転記 1回あたり削減時間（分）"],["roomRoundReductionCountPerDay","病室巡視削減回数 / 日"],["roomRoundMinutesPerCount","病室巡視 1回あたり削減時間（分）"]],
  Connect:[["nightRoundReductionCountPerDay","夜間巡視削減回数 / 日"],["nightRoundMinutesPerCount","夜間巡視 1回あたり削減時間（分）"],["statusCheckReductionCountPerDay","状況確認削減回数 / 日"],["statusCheckMinutesPerCount","状況確認 1回あたり削減時間（分）"],["handoverReductionMinutesPerDay","申し送り削減時間 / 日（分）"],["recordSharingReductionMinutesPerDay","記録・情報共有削減時間 / 日（分）"]],
};
function workReductionFieldsHtml(systemType,work){if(!systemType)return '<p class="dashboard-empty">システムを選択してください</p>';const data=systemType==="SBS"?work.sbs:work.connect;return WORK_REDUCTION_FIELDS[systemType].map(([key,label])=>inputHtml([key,label,"number"],data[key])).join("");}
function workReductionForm(raw){const work=mergedWorkReduction(raw);return `<div class="form-group dashboard-work-system"><label class="form-label">システム選択</label><select class="form-select" name="systemType" onchange="changeWorkReductionSystem(this.value)"><option value=""${!work.systemType?" selected":""}>未選択</option><option value="SBS"${work.systemType==="SBS"?" selected":""}>SBS</option><option value="Connect"${work.systemType==="Connect"?" selected":""}>Connect</option></select></div><div id="workReductionFields" class="work-reduction-fields">${workReductionFieldsHtml(work.systemType,work)}</div>`;}
function changeWorkReductionSystem(systemType){const work=mergedWorkReduction(dashboardProject.workReduction||{}),target=document.getElementById("workReductionFields");if(target)target.innerHTML=workReductionFieldsHtml(systemType,work);}
function csActivityForm(data){
  const latest=latestVisitDate(dashboardProject),count=(dashboardProject?.visits||[]).length;
  const dateInput=(key,label)=>`<div class="form-group"><label class="form-label">${label}</label><input class="form-input" name="${key}" type="date" value="${escapeHtml(data[key]||"")}"${latest?` max="${previousDate(latest)}"`:""}><small class="dashboard-form-note">訪問履歴の最終日 ${latest||"-"} より過去のみ補足登録できます</small></div>`;
  const others=DASHBOARD_FIELDS.csActivity.filter(([key])=>!["lastVisitDate","lastContactDate","visitCount"].includes(key)).map(field=>inputHtml(field,data[field[0]])).join("");
  return `<div class="form-group"><label class="form-label">訪問回数</label><input class="form-input" type="text" value="${count}件" readonly></div>${dateInput("lastVisitDate","最終訪問日（補足）")}${dateInput("lastContactDate","最終対応日（補足）")}${others}`;
}
function addDashboardRole(){document.getElementById("dashboardRoleRows")?.insertAdjacentHTML("beforeend",roleInputRow());}
function removeDashboardRole(button){const rows=document.querySelectorAll(".dashboard-role-input-row");if(rows.length>1)button.closest(".dashboard-role-input-row")?.remove();else{const row=button.closest(".dashboard-role-input-row");row.querySelector('[name="roleName"]').value="";row.querySelector('[name="roleCount"]').value="";}}
function basicForm(p) {
  const states=[["","-"],["準備中","準備中"],["稼働中","稼働中"],["停止中","停止中"],["解約","解約"],["要注意","要注意"]];
  const fields=[["hospitalName","院名","text"],["ward","導入病棟名","text"],["startDate","稼働開始日","date"],["supportEndDate","サポートエンド","date"],
    ["salesPerson","担当営業","text"],["csPerson","担当CS","text"],["solPm","SOL PM","text"],["systemType1","システム種類","select",[["","-"],["SBS","SBS"],["SBS-Lite","SBS-Lite"],["Connectハイブリット","Connectハイブリット"],["Connectオンプレ","Connectオンプレ"]]],
    ["moveOp","病床移動運用","text"],["bedNumStaff","病床番号変更担当","text"],["bedMoveStaff","床頭台移動担当","text"],["state","状態","select",states]];
  return fields.map(f=>inputHtml(f,p[f[0]])).join("")+`<div class="form-group"><label class="form-label">導入製品</label><div class="dashboard-check-grid">${[["hasBedside","BS端末"],["hasBedNavi","ベッドナビ"],["hasNemiri","眠りSCAN"],["hasRisha","離床CATCH"],["hasVital","バイタル連携"],["hasEhr","EHR連携"],["hasNurse","NC情報連携"],["hasNcNotify","NC通知連携"]].map(([k,l])=>`<label><input type="checkbox" name="${k}"${p[k]?" checked":""}>${l}</label>`).join("")}</div></div><div class="form-group"><label class="form-label">メモ</label><textarea class="form-textarea" name="memo" rows="4">${escapeHtml(p.memo||"")}</textarea></div>`;
}
function visitsForm(p) {
  const visits=(p.visits||[]).map((visit,index)=>({visit,index})).sort((a,b)=>(b.visit.endDate||b.visit.startDate||"").localeCompare(a.visit.endDate||a.visit.startDate||""));
  return `<div class="dashboard-visit-editor-list">${visits.map(({visit,index})=>`<div><span>${escapeHtml(visit.endDate||visit.startDate||"-")} / ${escapeHtml(getVisitStatusLabel(visit.status))}<small>${escapeHtml(visit.taskItem||visit.freeText||"-")}</small></span><button type="button" onclick="openDashboardVisitEditor(${index})">Edit</button><button type="button" class="danger" onclick="deleteDashboardVisit(${index})">削除</button></div>`).join("")||'<p class="dashboard-empty">訪問履歴はありません</p>'}</div>`;
}
function visitEditorForm(p) {
  const visit=(p.visits||[])[dashboardVisitEditIndex];
  if(!visit) return '<p class="dashboard-empty">編集する訪問履歴が見つかりません</p>';
  const status=normalizeVisitStatus(visit.status),phase=getCsPhase(status),selectedTask=phase.items.find(item=>item.item===visit.taskItem)||phase.items[0];
  return `<div class="dashboard-editor-back"><button type="button" onclick="showDashboardVisitList()">← 全履歴へ戻る</button></div><input type="hidden" name="visitIndex" value="${dashboardVisitEditIndex}"><div class="form-group"><label class="form-label">フェーズ / CSステータス</label><select class="form-select" name="visitStatus" onchange="updateDashboardVisitTasks(this.value)">${CS_HEALTH_PHASES.map(row=>`<option value="${row.key}"${row.key===status?" selected":""}>${row.label} / ${row.english}</option>`).join("")}</select></div><div class="form-group"><label class="form-label">項目</label><select class="form-select" id="dashboardVisitTask" name="taskItem" onchange="updateDashboardVisitTaskDetail()">${phase.items.map(item=>`<option value="${escapeHtml(item.item)}"${item.item===selectedTask?.item?" selected":""}>${escapeHtml(item.item)}</option>`).join("")}</select></div><div id="dashboardVisitTaskDetail" class="visit-task-detail"></div><div class="form-group dashboard-score-field"><label class="form-label">達成度 <strong id="dashboardVisitScoreValue">${Number(visit.score)||0}</strong></label><input class="visit-score-range" name="score" type="range" min="0" max="100" value="${Number(visit.score)||0}" oninput="document.getElementById('dashboardVisitScoreValue').textContent=this.value"><div class="visit-score-scale"><span>0</span><span>100</span></div></div>${inputHtml(["startDate","訪問日 / 対応日（開始）","date"],visit.startDate||"")}${inputHtml(["endDate","訪問日 / 対応日（終了）","date"],visit.endDate||visit.startDate||"")}<div class="form-group"><label class="form-label">フリー入力</label><textarea class="form-textarea" name="freeText" rows="4">${escapeHtml(visit.freeText||"")}</textarea></div>`;
}
function dashboardSaveButton(){return document.querySelector("#dashboardEditForm .modal-footer .btn-primary");}
function showDashboardVisitList(){dashboardVisitEditIndex=-1;document.getElementById("dashboardModalTitle").textContent="訪問履歴 Input";document.getElementById("dashboardModalBody").innerHTML=visitsForm(dashboardProject);const button=dashboardSaveButton();if(button)button.style.display="none";}
function openDashboardVisitEditor(index){dashboardVisitEditIndex=index;dashboardEditingCategory="visits";document.getElementById("dashboardModalTitle").textContent="訪問履歴 Edit";document.getElementById("dashboardModalBody").innerHTML=visitEditorForm(dashboardProject);document.getElementById("dashboardEditModal").classList.add("open");const button=dashboardSaveButton();if(button)button.style.display="";updateDashboardVisitTaskDetail();}
function updateDashboardVisitTasks(status){const select=document.getElementById("dashboardVisitTask"),phase=getCsPhase(normalizeVisitStatus(status));if(!select)return;select.innerHTML=phase.items.map(item=>`<option value="${escapeHtml(item.item)}">${escapeHtml(item.item)}</option>`).join("");updateDashboardVisitTaskDetail();}
function updateDashboardVisitTaskDetail(){const status=document.querySelector('[name="visitStatus"]')?.value,task=document.getElementById("dashboardVisitTask")?.value,phase=getCsPhase(normalizeVisitStatus(status)),item=phase.items.find(row=>row.item===task)||phase.items[0],target=document.getElementById("dashboardVisitTaskDetail");if(target)target.innerHTML=`<div><span>内容</span><strong>${escapeHtml(item?.content||"-")}</strong></div><div><span>効果・結果</span><p>${escapeHtml(item?.effect||"-")}</p></div>`;}
function openDashboardModal(category) {
  dashboardEditingCategory=category; dashboardVisitEditIndex=-1;
  const title=category==="phase"?"現在フェーズ":category==="workReduction"?"業務削減時間":CATEGORY_META[category][0];
  document.getElementById("dashboardModalTitle").textContent=category==="workReduction"?"業務削減時間を入力・編集":`${title} Input`;
  const data=getDashboardData(dashboardProject);
  let html="";
  if(category==="basic") html=basicForm(dashboardProject);
  else if(category==="phase") html=inputHtml(["currentPhase","現在フェーズ","select",CS_HEALTH_PHASES.map(p=>[p.key,`${p.label} / ${p.english}`])],data.currentPhase);
  else if(category==="visits") html=visitsForm(dashboardProject);
  else if(category==="usage") html=usageForm(data.usage);
  else if(category==="csActivity") html=csActivityForm(data.csActivity);
  else if(category==="workReduction") html=workReductionForm(dashboardProject.workReduction||{});
  else html=DASHBOARD_FIELDS[category].map(f=>inputHtml(f,data[category][f[0]])).join("");
  document.getElementById("dashboardModalBody").innerHTML=html;
  document.getElementById("dashboardEditModal").classList.add("open");
  const saveButton=dashboardSaveButton();
  if(saveButton)saveButton.style.display=category==="visits"?"none":"";
}
function closeDashboardModal(){ document.getElementById("dashboardEditModal").classList.remove("open"); const button=dashboardSaveButton();if(button)button.style.display="";dashboardEditingCategory=""; dashboardVisitEditIndex=-1; }
function formObject(form){ const fd=new FormData(form), out={}; for(const [k,v] of fd.entries()) out[k]=v; return out; }
async function saveDashboardForm(event) {
  event.preventDefault(); const form=event.currentTarget, values=formObject(form), category=dashboardEditingCategory;
  try {
    if(category==="basic") {
      ["hasBedside","hasBedNavi","hasNemiri","hasRisha","hasVital","hasEhr","hasNurse","hasNcNotify"].forEach(k=>values[k]=form.elements[k]?.checked||false);
      if(!values.hospitalName.trim()) throw new Error("院名は必須です");
      await dashboardDocRef.set(values,{merge:true});
    } else if(category==="phase") await dashboardDocRef.set({csDashboard:{...getDashboardData(dashboardProject),currentPhase:values.currentPhase}},{merge:true});
    else if(category==="visits") await saveDashboardVisit(values);
    else if(category==="workReduction") {
      const current=mergedWorkReduction(dashboardProject.workReduction||{}),systemType=values.systemType||"",section=systemType==="SBS"?"sbs":"connect";
      if(systemType) WORK_REDUCTION_FIELDS[systemType].forEach(([key])=>current[section][key]=safeWorkNumber(values[key]));
      current.systemType=systemType;
      await dashboardDocRef.set({workReduction:current},{merge:true});
    }
    else {
      const data=getDashboardData(dashboardProject);
      if(category==="usage") {
        const fd=new FormData(form),names=fd.getAll("roleName"),counts=fd.getAll("roleCount");
        delete values.roleName; delete values.roleCount;
        values.roles=names.map((name,index)=>({name:String(name).trim(),count:Math.max(0,Number(counts[index])||0)})).filter(role=>role.name);
        values.usageDays=operatingDays(dashboardProject.startDate);
      }
      if(category==="csActivity") {
        const latest=latestVisitDate(dashboardProject);
        if(latest&&values.lastVisitDate&&values.lastVisitDate>=latest) throw new Error(`最終訪問日は ${latest} より過去を指定してください`);
        if(latest&&values.lastContactDate&&values.lastContactDate>=latest) throw new Error(`最終対応日は ${latest} より過去を指定してください`);
        values.visitCount=(dashboardProject.visits||[]).length;
      }
      data[category]={...data[category],...values}; data.version=DASHBOARD_DEFAULTS.version; data.updatedAt=new Date().toISOString();
      await dashboardDocRef.set({csDashboard:data},{merge:true});
    }
    closeDashboardModal(); showToast("保存しました");
  } catch(error){ console.error(error); showToast(error.message||"保存に失敗しました","error"); }
}
async function saveDashboardVisit(values){
  if(dashboardVisitEditIndex<0) throw new Error("編集する訪問履歴を選択してください");
  if(!values.startDate&&!values.endDate) throw new Error("訪問日 / 対応日を入力してください");
  const visits=[...(dashboardProject.visits||[])],current=visits[dashboardVisitEditIndex];
  if(!current) throw new Error("訪問履歴が見つかりません");
  const phase=getCsPhase(normalizeVisitStatus(values.visitStatus)),task=phase.items.find(item=>item.item===values.taskItem)||phase.items[0];
  visits[dashboardVisitEditIndex]={...current,status:values.visitStatus,taskItem:task?.item||values.taskItem||"",taskContent:task?.content||"",taskEffect:task?.effect||"",score:Math.max(0,Math.min(100,Number(values.score)||0)),startDate:values.startDate||values.endDate,endDate:values.endDate||values.startDate,freeText:values.freeText||"",updatedAt:new Date().toISOString()};
  await dashboardDocRef.update({visits});
}
async function deleteDashboardVisit(index){if(!window.confirm("この訪問履歴を削除しますか？"))return;const visits=[...(dashboardProject.visits||[])];if(index<0||index>=visits.length)return;visits.splice(index,1);try{await dashboardDocRef.update({visits});dashboardProject={...dashboardProject,visits};showDashboardVisitList();showToast("削除しました");}catch(e){console.error(e);showToast("削除に失敗しました","error");}}
function hasMissingDashboardFields(current, defaults) {
  if (!current || typeof current !== "object") return true;
  return Object.keys(defaults).some(key => {
    if (!(key in current)) return true;
    const value = defaults[key];
    return value && typeof value === "object" && !Array.isArray(value)
      ? hasMissingDashboardFields(current[key], value)
      : false;
  });
}
async function migrateDashboard(snapshot){
  const project=snapshot.data(), merged=mergedDashboard(project.csDashboard||{});
  const mergedWork=mergedWorkReduction(project.workReduction||{});
  const calculatedUsageDays=operatingDays(project.startDate);
  const calculatedVisitCount=(project.visits||[]).length;
  merged.usage.usageDays=calculatedUsageDays;
  merged.csActivity.visitCount=calculatedVisitCount;
  if (!merged.usage.roles?.length) {
    const legacyRoles=[["医師",merged.usage.doctorUsers],["看護師",merged.usage.nurseUsers],["補助者",merged.usage.assistantUsers],["PT",merged.usage.ptUsers]]
      .filter(([,count])=>numberValue(count)>0).map(([name,count])=>({name,count:Number(count)}));
    if(legacyRoles.length) merged.usage.roles=legacyRoles;
  }
  if (!project.csDashboard?.currentPhase && project.visits?.length) {
    const migratedPhase = normalizeHealthPhase(project.visits.at(-1).status);
    if (CS_HEALTH_PHASES.some(phase => phase.key === migratedPhase)) merged.currentPhase = migratedPhase;
  }
  const needs=hasMissingDashboardFields(project.csDashboard,DASHBOARD_DEFAULTS)
    || numberValue(project.csDashboard?.usage?.usageDays)!==calculatedUsageDays
    || numberValue(project.csDashboard?.csActivity?.visitCount)!==calculatedVisitCount;
  const needsWork=hasMissingDashboardFields(project.workReduction,WORK_REDUCTION_DEFAULTS);
  if((!needs&&!needsWork) || migrationRunning) return;
  migrationRunning=true;
  try{await snapshot.ref.set({csDashboard:merged,workReduction:mergedWork},{merge:true});}finally{migrationRunning=false;}
}
function initCsDashboard(){
  const id=new URLSearchParams(location.search).get("id"); if(!id){document.getElementById("dashboardHospitalName").textContent="案件が指定されていません";return;}
  dashboardDocRef=db.collection("cs_projects").doc(id);
  dashboardUnsubscribe=dashboardDocRef.onSnapshot(async snapshot=>{
    if(!snapshot.exists){document.getElementById("dashboardHospitalName").textContent="案件が見つかりません";return;}
    await migrateDashboard(snapshot); dashboardProject={id:snapshot.id,...snapshot.data(),csDashboard:mergedDashboard(snapshot.data().csDashboard||{})}; renderDashboard(dashboardProject);
  },error=>{console.error(error);showToast("データ取得に失敗しました","error");});
}
document.addEventListener("DOMContentLoaded",()=>{
  document.getElementById("dashboardEditForm").addEventListener("submit",saveDashboardForm);
  document.getElementById("dashboardEditModal").addEventListener("click",e=>{if(e.target.id==="dashboardEditModal")closeDashboardModal();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDashboardModal();});
  initCsDashboard();
});
window.addEventListener("beforeunload",()=>dashboardUnsubscribe?.());
