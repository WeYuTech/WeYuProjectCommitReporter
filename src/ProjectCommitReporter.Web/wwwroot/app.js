const STORAGE_KEYS = Object.freeze({
  mappingPresets: "projectCommitReporter.mappingPresets.v1"
});

const QUERY_PARAM_NAMES = Object.freeze({
  projectCode: "projectCode",
  processType: "processType",
  page: "page"
});

const PAGE_IDS = Object.freeze({
  review: "review",
  filters: "filters",
  commits: "commits"
});

const TAB_IDS = Object.freeze({
  quickFilter: "quickFilter",
  mappingSettings: "mappingSettings"
});

const REPORT_TAB_IDS = Object.freeze({
  git: "git",
  manual: "manual"
});

const state = {
  projects: [],
  processTypes: [],
  candidates: [],
  scanStatus: null,
  mappingPresets: loadMappingPresets(),
  activeFilter: readFilterFromUrl(),
  currentPage: readPageFromUrl(),
  commitFilters: {
    status: "",
    projectCode: "",
    author: "",
    keyword: "",
    dateFrom: "",
    dateTo: ""
  },
  selectedCommitId: ""
};

const elements = {
  navItems: [...document.querySelectorAll(".nav-item[data-page]")],
  pages: [...document.querySelectorAll(".app-page[data-page]")],
  statusText: document.querySelector("#statusText"),
  scanButton: document.querySelector("#scanButton"),
  template: document.querySelector("#candidateTemplate"),
  activeFilterBadge: document.querySelector("#activeFilterBadge"),
  pendingMetric: document.querySelector("#pendingMetric"),
  approvedMetric: document.querySelector("#approvedMetric"),
  skippedMetric: document.querySelector("#skippedMetric"),
  mappingMetric: document.querySelector("#mappingMetric"),
  candidateList: document.querySelector("#candidateList"),
  reportGitTab: document.querySelector("#reportGitTab"),
  reportManualTab: document.querySelector("#reportManualTab"),
  reportGitPanel: document.querySelector("#reportGitPanel"),
  reportManualPanel: document.querySelector("#reportManualPanel"),
  manualWorkDate: document.querySelector("#manualWorkDate"),
  manualProjectSelect: document.querySelector("#manualProjectSelect"),
  manualProcessSelect: document.querySelector("#manualProcessSelect"),
  manualSummary: document.querySelector("#manualSummary"),
  submitManualReportButton: document.querySelector("#submitManualReportButton"),
  clearManualReportButton: document.querySelector("#clearManualReportButton"),
  manualReportMessage: document.querySelector("#manualReportMessage"),
  lastScanTime: document.querySelector("#lastScanTime"),
  scanStatusSummary: document.querySelector("#scanStatusSummary"),
  scanRepoStatusList: document.querySelector("#scanRepoStatusList"),
  quickFilterTab: document.querySelector("#quickFilterTab"),
  mappingSettingsTab: document.querySelector("#mappingSettingsTab"),
  quickFilterPanel: document.querySelector("#quickFilterPanel"),
  mappingSettingsPanel: document.querySelector("#mappingSettingsPanel"),
  quickMappingSelect: document.querySelector("#quickMappingSelect"),
  quickProjectSelect: document.querySelector("#quickProjectSelect"),
  quickProcessSelect: document.querySelector("#quickProcessSelect"),
  openFilteredPageButton: document.querySelector("#openFilteredPageButton"),
  clearFilterButton: document.querySelector("#clearFilterButton"),
  mappingNameInput: document.querySelector("#mappingNameInput"),
  mappingProjectSelect: document.querySelector("#mappingProjectSelect"),
  mappingProcessSelect: document.querySelector("#mappingProcessSelect"),
  saveMappingButton: document.querySelector("#saveMappingButton"),
  mappingTableBody: document.querySelector("#mappingTableBody"),
  commitStatusFilter: document.querySelector("#commitStatusFilter"),
  commitProjectFilter: document.querySelector("#commitProjectFilter"),
  commitAuthorFilter: document.querySelector("#commitAuthorFilter"),
  commitKeywordFilter: document.querySelector("#commitKeywordFilter"),
  commitDateFromFilter: document.querySelector("#commitDateFromFilter"),
  commitDateToFilter: document.querySelector("#commitDateToFilter"),
  commitTableBody: document.querySelector("#commitTableBody"),
  detailRepoName: document.querySelector("#detailRepoName"),
  detailMeta: document.querySelector("#detailMeta"),
  detailStatus: document.querySelector("#detailStatus"),
  detailBranch: document.querySelector("#detailBranch"),
  detailSha: document.querySelector("#detailSha"),
  detailAuthor: document.querySelector("#detailAuthor"),
  detailSubject: document.querySelector("#detailSubject"),
  detailSummary: document.querySelector("#detailSummary")
};

bindEvents();
init();

function bindEvents() {
  elements.scanButton.addEventListener("click", scanNow);
  elements.navItems.forEach(item => {
    item.addEventListener("click", () => setCurrentPage(item.dataset.page));
  });
  window.addEventListener("popstate", () => {
    state.currentPage = readPageFromUrl();
    state.activeFilter = readFilterFromUrl();
    renderApp();
  });

  elements.reportGitTab.addEventListener("click", () => activateReportTab(REPORT_TAB_IDS.git));
  elements.reportManualTab.addEventListener("click", () => activateReportTab(REPORT_TAB_IDS.manual));
  elements.submitManualReportButton.addEventListener("click", submitManualReport);
  elements.clearManualReportButton.addEventListener("click", clearManualReportForm);

  elements.quickFilterTab.addEventListener("click", () => activateTab(TAB_IDS.quickFilter));
  elements.mappingSettingsTab.addEventListener("click", () => activateTab(TAB_IDS.mappingSettings));
  elements.quickMappingSelect.addEventListener("change", applySelectedMappingToQuickFilter);
  elements.openFilteredPageButton.addEventListener("click", openFilteredReviewPage);
  elements.clearFilterButton.addEventListener("click", clearPreFilter);
  elements.saveMappingButton.addEventListener("click", saveMappingPreset);

  [
    elements.commitStatusFilter,
    elements.commitProjectFilter,
    elements.commitAuthorFilter,
    elements.commitKeywordFilter,
    elements.commitDateFromFilter,
    elements.commitDateToFilter
  ].forEach(input => input.addEventListener("input", updateCommitFilters));
}

async function init() {
  await loadOptions();
  hydrateFilterControls();
  hydrateManualReportForm();
  renderMappingPresetControls();
  await refreshCandidates();
  await loadScanStatus();
  renderApp();
}

async function loadOptions() {
  try {
    const [projects, processTypes] = await Promise.all([
      fetchJson("/api/options/projects"),
      fetchJson("/api/options/process-types")
    ]);
    state.projects = projects;
    state.processTypes = processTypes;
  } catch (error) {
    elements.statusText.textContent = `選項載入失敗：${error.message}`;
  }
}

async function refreshCandidates() {
  state.candidates = await fetchJson("/api/candidates");
  updateDashboardMetrics();
  renderReviewPage();
  renderCommitListPage();
}

async function scanNow() {
  elements.scanButton.disabled = true;
  elements.statusText.textContent = "正在掃描 Git commits...";
  try {
    const result = await fetchJson("/api/scan", { method: "POST" });
    elements.statusText.textContent = `掃描完成：新增 ${result.added} 筆，既有 ${result.existing} 筆。`;
    state.scanStatus = result.scanStatus;
    renderScanStatus();
    await refreshCandidates();
  } catch (error) {
    elements.statusText.textContent = `掃描失敗：${error.message}`;
  } finally {
    elements.scanButton.disabled = false;
  }
}

function renderApp() {
  renderNavigation();
  renderPages();
  renderActiveFilterBadge();
  updateDashboardMetrics();

  if (state.currentPage === PAGE_IDS.review) {
    renderReviewPage();
  }

  if (state.currentPage === PAGE_IDS.filters) {
    elements.statusText.textContent = `目前 ${state.mappingPresets.length} 組預設對應。`;
    renderMappingPresetControls();
  }

  if (state.currentPage === PAGE_IDS.commits) {
    renderCommitListPage();
  }
}

function renderNavigation() {
  elements.navItems.forEach(item => {
    item.classList.toggle("is-active", item.dataset.page === state.currentPage);
  });
}

function renderPages() {
  elements.pages.forEach(page => {
    page.classList.toggle("is-active", page.dataset.page === state.currentPage);
  });
}

function setCurrentPage(pageId, replace = false) {
  if (!Object.values(PAGE_IDS).includes(pageId)) {
    pageId = PAGE_IDS.review;
  }

  state.currentPage = pageId;
  const url = new URL(window.location.href);
  url.searchParams.set(QUERY_PARAM_NAMES.page, pageId);

  if (replace) {
    window.history.replaceState({}, "", url);
  } else {
    window.history.pushState({}, "", url);
  }

  renderApp();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function renderReviewPage() {
  elements.candidateList.replaceChildren();
  const candidates = applyPreFilter(state.candidates.filter(candidate => normalizeStatus(candidate.status) === "Pending"));
  const filterText = hasActiveFilter() ? `，篩選後 ${candidates.length} 筆` : "";
  elements.statusText.textContent = `目前 ${candidates.length} 筆待確認${filterText}。`;

  if (candidates.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = hasActiveFilter()
      ? "目前沒有符合 PROJECT_CODE / PROCESS_TYPE 的待確認 commit。"
      : "目前沒有待確認 commit。";
    elements.candidateList.append(empty);
    return;
  }

  for (const candidate of candidates) {
    elements.candidateList.append(createCandidateCard(candidate));
  }
}

function activateReportTab(tabId) {
  const isGit = tabId === REPORT_TAB_IDS.git;
  elements.reportGitTab.classList.toggle("is-active", isGit);
  elements.reportGitTab.setAttribute("aria-selected", String(isGit));
  elements.reportGitPanel.classList.toggle("is-active", isGit);

  elements.reportManualTab.classList.toggle("is-active", !isGit);
  elements.reportManualTab.setAttribute("aria-selected", String(!isGit));
  elements.reportManualPanel.classList.toggle("is-active", !isGit);
}

function hydrateManualReportForm() {
  fillSelect(elements.manualProjectSelect, state.projects, "");
  fillSelect(elements.manualProcessSelect, state.processTypes, "");
  elements.manualWorkDate.value = formatDateInput(new Date());
}

async function submitManualReport() {
  setMessage(elements.manualReportMessage, "寫入中...", "");
  elements.submitManualReportButton.disabled = true;
  try {
    await fetchJson("/api/manual-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectCode: elements.manualProjectSelect.value,
        processType: elements.manualProcessSelect.value,
        summary: elements.manualSummary.value,
        workDate: elements.manualWorkDate.value
      })
    });

    setMessage(elements.manualReportMessage, "已寫入手動日報。", "success");
    clearManualReportForm({ keepMessage: true });
    await refreshCandidates();
  } catch (error) {
    setMessage(elements.manualReportMessage, `寫入失敗：${error.message}`, "error");
  } finally {
    elements.submitManualReportButton.disabled = false;
  }
}

function clearManualReportForm(options = {}) {
  elements.manualProjectSelect.value = "";
  elements.manualProcessSelect.value = "";
  elements.manualSummary.value = "";
  elements.manualWorkDate.value = formatDateInput(new Date());
  if (!options.keepMessage) {
    setMessage(elements.manualReportMessage, "", "");
  }
}

function createCandidateCard(candidate) {
  const node = elements.template.content.cloneNode(true);
  const article = node.querySelector(".candidate");
  const projectSelect = node.querySelector(".project");
  const processSelect = node.querySelector(".process");
  const summary = node.querySelector(".summary");
  const message = node.querySelector(".message");
  const statusPill = node.querySelector(".status-pill");
  const autoMappingNote = node.querySelector(".auto-mapping-note");

  node.querySelector(".repo").textContent = candidate.repositoryName;
  node.querySelector(".branch").textContent = candidate.branch;
  node.querySelector(".sha").textContent = candidate.shortSha;
  node.querySelector(".time").textContent = new Date(candidate.commitTime).toLocaleString();
  node.querySelector(".subject").textContent = candidate.subject;

  const candidateStatus = normalizeStatus(candidate.status);
  statusPill.textContent = statusLabel(candidateStatus);
  statusPill.classList.toggle("approved", candidateStatus === "Approved");
  statusPill.classList.toggle("skipped", candidateStatus === "Skipped");

  const autoMappingPreset = findCandidateMappingPreset(candidate);
  const { projectCode, processType } = getEffectiveCandidateSelection(candidate, autoMappingPreset);
  fillSelect(projectSelect, state.projects, projectCode);
  fillSelect(processSelect, state.processTypes, processType);
  renderAutoMappingNote(autoMappingNote, candidate, autoMappingPreset);
  summary.value = candidate.summary ?? "";

  const isPending = candidateStatus === "Pending";
  article.querySelectorAll("button, select, textarea").forEach(input => {
    input.disabled = !isPending;
  });

  node.querySelector(".approve").addEventListener("click", async () => {
    setMessage(message, "寫入中...", "");
    try {
      await fetchJson(`/api/candidates/${candidate.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectCode: projectSelect.value,
          processType: processSelect.value,
          summary: summary.value
        })
      });
      setMessage(message, "已寫入。", "success");
      await refreshCandidates();
    } catch (error) {
      setMessage(message, `寫入失敗：${error.message}`, "error");
    }
  });

  node.querySelector(".regenerate").addEventListener("click", async () => {
    setMessage(message, "重新產生中...", "");
    try {
      const updated = await fetchJson(`/api/candidates/${candidate.id}/regenerate`, { method: "POST" });
      const updatedAutoMappingPreset = findCandidateMappingPreset(updated);
      const updatedSelection = getEffectiveCandidateSelection(updated, updatedAutoMappingPreset);
      projectSelect.value = updatedSelection.projectCode;
      processSelect.value = updatedSelection.processType;
      summary.value = updated.summary;
      renderAutoMappingNote(autoMappingNote, updated, updatedAutoMappingPreset);
      setMessage(message, "已重新產生。", "success");
    } catch (error) {
      setMessage(message, `重新產生失敗：${error.message}`, "error");
    }
  });

  node.querySelector(".translate").addEventListener("click", async () => {
    setMessage(message, "翻譯中...", "");
    try {
      const translated = await fetchJson("/api/summary/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: summary.value })
      });
      summary.value = translated.summary;
      setMessage(message, "已翻譯成繁體中文。", "success");
    } catch (error) {
      setMessage(message, `翻譯失敗：${error.message}`, "error");
    }
  });

  node.querySelector(".skip").addEventListener("click", async () => {
    setMessage(message, "略過中...", "");
    try {
      await fetchJson(`/api/candidates/${candidate.id}/skip`, { method: "POST" });
      await refreshCandidates();
    } catch (error) {
      setMessage(message, `略過失敗：${error.message}`, "error");
    }
  });

  return node;
}

function renderCommitListPage() {
  elements.commitTableBody.replaceChildren();
  fillCommitProjectFilter();
  const commits = getFilteredCommits();
  elements.statusText.textContent = `Commit 清單 ${commits.length} 筆。`;

  if (commits.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "empty-cell";
    cell.textContent = "目前沒有符合條件的 commit。";
    row.append(cell);
    elements.commitTableBody.append(row);
    renderCommitDetail(null);
    return;
  }

  if (!state.selectedCommitId || !commits.some(commit => commit.id === state.selectedCommitId)) {
    state.selectedCommitId = commits[0].id;
  }

  for (const commit of commits) {
    const row = document.createElement("tr");
    row.classList.toggle("is-selected", commit.id === state.selectedCommitId);
    row.append(
      commitStatusCell(commit),
      tableCell(commit.repositoryName),
      commitSubjectCell(commit),
      tableCell(new Date(commit.commitTime).toLocaleString()),
      tableCell(commit.authorName),
      commitActionCell(commit)
    );
    elements.commitTableBody.append(row);
  }

  renderCommitDetail(commits.find(commit => commit.id === state.selectedCommitId) ?? commits[0]);
}

function getFilteredCommits() {
  return state.candidates.filter(candidate => {
    const status = normalizeStatus(candidate.status);
    const { projectCode } = getEffectiveCandidateSelection(candidate);
    const commitDate = new Date(candidate.commitTime);
    const keyword = state.commitFilters.keyword.trim().toLowerCase();
    const text = `${candidate.repositoryName} ${candidate.branch} ${candidate.sha} ${candidate.subject} ${candidate.summary}`.toLowerCase();

    const statusMatches = !state.commitFilters.status || status === state.commitFilters.status;
    const projectMatches = !state.commitFilters.projectCode || projectCode === state.commitFilters.projectCode;
    const authorMatches = !state.commitFilters.author || candidate.authorName.toLowerCase().includes(state.commitFilters.author.toLowerCase());
    const keywordMatches = !keyword || text.includes(keyword);
    const dateFromMatches = !state.commitFilters.dateFrom || commitDate >= new Date(`${state.commitFilters.dateFrom}T00:00:00`);
    const dateToMatches = !state.commitFilters.dateTo || commitDate <= new Date(`${state.commitFilters.dateTo}T23:59:59`);

    return statusMatches && projectMatches && authorMatches && keywordMatches && dateFromMatches && dateToMatches;
  });
}

function commitStatusCell(commit) {
  const cell = document.createElement("td");
  const pill = document.createElement("span");
  const status = normalizeStatus(commit.status);
  pill.className = "status-pill compact";
  pill.classList.toggle("approved", status === "Approved");
  pill.classList.toggle("skipped", status === "Skipped");
  pill.textContent = statusLabel(status);
  cell.append(pill);
  return cell;
}

function commitSubjectCell(commit) {
  const cell = document.createElement("td");
  const strong = document.createElement("strong");
  const small = document.createElement("small");
  strong.textContent = commit.subject;
  small.textContent = commit.shortSha;
  cell.className = "commit-subject-cell";
  cell.append(strong, small);
  return cell;
}

function commitActionCell(commit) {
  const cell = document.createElement("td");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "micro";
  button.textContent = "查看";
  button.addEventListener("click", () => {
    state.selectedCommitId = commit.id;
    renderCommitListPage();
  });
  cell.append(button);
  return cell;
}

function renderCommitDetail(commit) {
  if (!commit) {
    elements.detailRepoName.textContent = "尚未選取";
    elements.detailMeta.textContent = "從清單選一筆 commit 查看詳情";
    elements.detailStatus.textContent = "-";
    elements.detailBranch.textContent = "-";
    elements.detailSha.textContent = "-";
    elements.detailAuthor.textContent = "-";
    elements.detailSubject.textContent = "-";
    elements.detailSummary.textContent = "-";
    return;
  }

  elements.detailRepoName.textContent = commit.repositoryName;
  elements.detailMeta.textContent = `${new Date(commit.commitTime).toLocaleString()} · ${commit.shortSha}`;
  elements.detailStatus.textContent = statusLabel(normalizeStatus(commit.status));
  elements.detailBranch.textContent = commit.branch;
  elements.detailSha.textContent = commit.sha;
  elements.detailAuthor.textContent = `${commit.authorName} <${commit.authorEmail}>`;
  elements.detailSubject.textContent = commit.subject;
  elements.detailSummary.textContent = commit.summary || "-";
}

function updateCommitFilters() {
  state.commitFilters.status = elements.commitStatusFilter.value;
  state.commitFilters.projectCode = elements.commitProjectFilter.value;
  state.commitFilters.author = elements.commitAuthorFilter.value.trim();
  state.commitFilters.keyword = elements.commitKeywordFilter.value.trim();
  state.commitFilters.dateFrom = elements.commitDateFromFilter.value;
  state.commitFilters.dateTo = elements.commitDateToFilter.value;
  renderCommitListPage();
}

function fillCommitProjectFilter() {
  const currentValue = elements.commitProjectFilter.value || state.commitFilters.projectCode;
  const projectCodes = [...new Set(state.candidates.map(candidate => getEffectiveCandidateSelection(candidate).projectCode).filter(Boolean))];
  const options = state.projects.filter(project => projectCodes.includes(project.key || project.code));
  fillSelect(elements.commitProjectFilter, options, currentValue, "全部專案");
  state.commitFilters.projectCode = elements.commitProjectFilter.value;
}

async function loadScanStatus() {
  try {
    state.scanStatus = await fetchJson("/api/scan-status");
    renderScanStatus();
  } catch (error) {
    elements.scanStatusSummary.textContent = `掃描狀態載入失敗：${error.message}`;
  }
}

function renderScanStatus() {
  elements.scanRepoStatusList.replaceChildren();

  if (!state.scanStatus) {
    elements.lastScanTime.textContent = "尚未掃描";
    elements.scanStatusSummary.textContent = "等待排程或手動掃描";
    return;
  }

  elements.lastScanTime.textContent = new Date(state.scanStatus.lastScanAt).toLocaleString();
  elements.scanStatusSummary.textContent = `成功 ${state.scanStatus.successCount} 個，失敗 ${state.scanStatus.failureCount} 個，共 ${state.scanStatus.repositoryCount} 個 repo`;

  const failed = (state.scanStatus.repositories || []).filter(repo => !repo.fetchSucceeded);
  const displayRepos = failed.length > 0 ? failed : (state.scanStatus.repositories || []).slice(0, 4);

  for (const repo of displayRepos) {
    const item = document.createElement("div");
    item.className = `scan-repo ${repo.fetchSucceeded ? "ok" : "fail"}`;
    const title = document.createElement("strong");
    title.textContent = repo.repositoryName;
    const detail = document.createElement("small");
    detail.textContent = repo.fetchSucceeded
      ? `${repo.scanRef || "HEAD"}，${repo.commitCount} 筆`
      : repo.errorMessage || "git fetch failed";
    item.append(title, detail);
    elements.scanRepoStatusList.append(item);
  }
}

function updateDashboardMetrics() {
  const counts = {
    Pending: 0,
    Approved: 0,
    Skipped: 0
  };

  for (const candidate of state.candidates) {
    counts[normalizeStatus(candidate.status)] += 1;
  }

  elements.pendingMetric.textContent = counts.Pending;
  elements.approvedMetric.textContent = counts.Approved;
  elements.skippedMetric.textContent = counts.Skipped;
  elements.mappingMetric.textContent = state.mappingPresets.length;
}

function hydrateFilterControls() {
  fillSelect(elements.quickProjectSelect, state.projects, state.activeFilter.projectCode);
  fillSelect(elements.quickProcessSelect, state.processTypes, state.activeFilter.processType);
  fillSelect(elements.mappingProjectSelect, state.projects, "");
  fillSelect(elements.mappingProcessSelect, state.processTypes, "");
  fillSelect(elements.commitProjectFilter, [], "", "全部專案");
}

function renderMappingPresetControls() {
  renderQuickMappingSelect();
  renderMappingTable();
  updateDashboardMetrics();
}

function renderQuickMappingSelect() {
  elements.quickMappingSelect.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "請選擇對應名稱";
  elements.quickMappingSelect.append(placeholder);

  for (const preset of state.mappingPresets) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    elements.quickMappingSelect.append(option);
  }
}

function renderMappingTable() {
  elements.mappingTableBody.replaceChildren();

  if (state.mappingPresets.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "empty-cell";
    cell.textContent = "尚未建立預設對應。";
    row.append(cell);
    elements.mappingTableBody.append(row);
    return;
  }

  for (const preset of state.mappingPresets) {
    const row = document.createElement("tr");
    row.append(
      tableCell(preset.name),
      tableCell(`${preset.projectValue} (${preset.projectKey})`),
      tableCell(`${preset.processValue} (${preset.processKey})`),
      actionCell(preset)
    );
    elements.mappingTableBody.append(row);
  }
}

function tableCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function actionCell(preset) {
  const cell = document.createElement("td");
  const apply = document.createElement("button");
  apply.type = "button";
  apply.className = "micro";
  apply.textContent = "套用";
  apply.addEventListener("click", () => {
    elements.quickProjectSelect.value = preset.projectKey;
    elements.quickProcessSelect.value = preset.processKey;
    activateTab(TAB_IDS.quickFilter);
  });

  const open = document.createElement("button");
  open.type = "button";
  open.className = "micro";
  open.textContent = "套用到日報";
  open.addEventListener("click", () => navigateWithFilter(preset.projectKey, preset.processKey, PAGE_IDS.review));

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "micro danger-lite";
  remove.textContent = "刪除";
  remove.addEventListener("click", () => {
    state.mappingPresets = state.mappingPresets.filter(item => item.id !== preset.id);
    persistMappingPresets();
    renderMappingPresetControls();
    renderReviewPage();
    renderCommitListPage();
  });

  cell.className = "table-actions";
  cell.append(apply, open, remove);
  return cell;
}

function activateTab(tabId) {
  const isQuick = tabId === TAB_IDS.quickFilter;
  elements.quickFilterTab.classList.toggle("is-active", isQuick);
  elements.quickFilterTab.setAttribute("aria-selected", String(isQuick));
  elements.quickFilterPanel.classList.toggle("is-active", isQuick);
  elements.mappingSettingsTab.classList.toggle("is-active", !isQuick);
  elements.mappingSettingsTab.setAttribute("aria-selected", String(!isQuick));
  elements.mappingSettingsPanel.classList.toggle("is-active", !isQuick);
}

function applySelectedMappingToQuickFilter() {
  const preset = state.mappingPresets.find(item => item.id === elements.quickMappingSelect.value);
  if (!preset) {
    return;
  }

  elements.quickProjectSelect.value = preset.projectKey;
  elements.quickProcessSelect.value = preset.processKey;
}

function openFilteredReviewPage() {
  navigateWithFilter(elements.quickProjectSelect.value, elements.quickProcessSelect.value, PAGE_IDS.review);
}

function clearPreFilter() {
  state.activeFilter = { projectCode: "", processType: "" };
  elements.quickProjectSelect.value = "";
  elements.quickProcessSelect.value = "";
  const url = new URL(window.location.href);
  url.searchParams.delete(QUERY_PARAM_NAMES.projectCode);
  url.searchParams.delete(QUERY_PARAM_NAMES.processType);
  window.history.pushState({}, "", url);
  renderApp();
}

function navigateWithFilter(projectCode, processType, pageId) {
  const url = new URL(window.location.href);
  url.searchParams.delete(QUERY_PARAM_NAMES.projectCode);
  url.searchParams.delete(QUERY_PARAM_NAMES.processType);
  url.searchParams.set(QUERY_PARAM_NAMES.page, pageId);

  if (projectCode) {
    url.searchParams.set(QUERY_PARAM_NAMES.projectCode, projectCode);
  }

  if (processType) {
    url.searchParams.set(QUERY_PARAM_NAMES.processType, processType);
  }

  state.activeFilter = { projectCode, processType };
  state.currentPage = pageId;
  window.history.pushState({}, "", url);
  renderApp();
}

function saveMappingPreset() {
  const name = elements.mappingNameInput.value.trim();
  const project = selectedOption(elements.mappingProjectSelect);
  const process = selectedOption(elements.mappingProcessSelect);

  if (!name || !project || !process) {
    elements.statusText.textContent = "請輸入專案名稱，並選擇 PROJECT_CODE 與 PROCESS_TYPE。";
    return;
  }

  const id = normalizePresetId(name);
  const preset = {
    id,
    name,
    projectKey: project.key,
    projectValue: project.value,
    processKey: process.key,
    processValue: process.value
  };

  const existingIndex = state.mappingPresets.findIndex(item => item.id === id);
  if (existingIndex >= 0) {
    state.mappingPresets[existingIndex] = preset;
  } else {
    state.mappingPresets.push(preset);
  }

  persistMappingPresets();
  elements.mappingNameInput.value = "";
  renderMappingPresetControls();
  renderReviewPage();
  renderCommitListPage();
  elements.statusText.textContent = `已儲存對應：${name}`;
}

function applyPreFilter(candidates) {
  return candidates.filter(candidate => {
    const { projectCode, processType } = getEffectiveCandidateSelection(candidate);
    const projectMatches = !state.activeFilter.projectCode || projectCode === state.activeFilter.projectCode;
    const processMatches = !state.activeFilter.processType || processType === state.activeFilter.processType;
    return projectMatches && processMatches;
  });
}

function renderActiveFilterBadge() {
  if (!hasActiveFilter()) {
    elements.activeFilterBadge.textContent = "未套用預先篩選";
    elements.activeFilterBadge.classList.remove("is-active");
    return;
  }

  const projectText = getOptionText(state.projects, state.activeFilter.projectCode);
  const processText = getOptionText(state.processTypes, state.activeFilter.processType);
  elements.activeFilterBadge.textContent = `已篩選：${projectText || "全部專案"} / ${processText || "全部流程"}`;
  elements.activeFilterBadge.classList.add("is-active");
}

function hasActiveFilter() {
  return Boolean(state.activeFilter.projectCode || state.activeFilter.processType);
}

function readFilterFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    projectCode: params.get(QUERY_PARAM_NAMES.projectCode) || "",
    processType: params.get(QUERY_PARAM_NAMES.processType) || ""
  };
}

function readPageFromUrl() {
  const page = new URLSearchParams(window.location.search).get(QUERY_PARAM_NAMES.page);
  return Object.values(PAGE_IDS).includes(page) ? page : PAGE_IDS.review;
}

function fillSelect(select, options, selectedValue, placeholderText = "請選擇") {
  select.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = placeholderText;
  select.append(placeholder);

  for (const option of options) {
    const node = document.createElement("option");
    node.value = option.key || option.code;
    node.textContent = option.value || option.name || option.display;
    select.append(node);
  }

  select.value = selectedValue ?? "";
}

function selectedOption(select) {
  if (!select.value) {
    return null;
  }

  return {
    key: select.value,
    value: select.options[select.selectedIndex]?.textContent ?? select.value
  };
}

function getEffectiveCandidateSelection(candidate, preset = findCandidateMappingPreset(candidate)) {
  return {
    projectCode: candidate.approvedProjectCode || preset?.projectKey || candidate.suggestedProjectCode || "",
    processType: candidate.approvedProcessType || preset?.processKey || candidate.suggestedProcessType || ""
  };
}

function findCandidateMappingPreset(candidate) {
  const candidateNames = getCandidateMappingNames(candidate);
  if (candidateNames.length === 0 || state.mappingPresets.length === 0) {
    return null;
  }

  return state.mappingPresets.find(preset => {
    const presetName = normalizeProjectMappingName(preset.name);
    return candidateNames.includes(presetName);
  }) ?? null;
}

function getCandidateMappingNames(candidate) {
  const names = [
    candidate.repositoryName,
    getPathLeaf(candidate.repositoryPath),
    extractBracketedName(candidate.summary)
  ];

  return [...new Set(
    names
      .map(normalizeProjectMappingName)
      .filter(Boolean)
  )];
}

function getPathLeaf(path) {
  if (!path) {
    return "";
  }

  return path.split(/[\\/]/).filter(Boolean).pop() ?? "";
}

function extractBracketedName(summary) {
  const match = /^\s*\[([^\]]+)\]/.exec(summary ?? "");
  return match?.[1] ?? "";
}

function normalizeProjectMappingName(name) {
  return (name ?? "")
    .trim()
    .replace(/^\[+/, "")
    .replace(/\]+$/, "")
    .trim()
    .toLowerCase();
}

function renderAutoMappingNote(element, candidate, preset) {
  const hasApprovedSelection = Boolean(candidate.approvedProjectCode || candidate.approvedProcessType);
  if (!preset || hasApprovedSelection) {
    element.hidden = true;
    element.textContent = "";
    return;
  }

  element.hidden = false;
  element.textContent = `已依專案名稱自動套用：${preset.name}`;
}

function getOptionText(options, key) {
  if (!key) {
    return "";
  }

  const option = options.find(item => (item.key || item.code) === key);
  return option?.value || option?.name || option?.display || key;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizePresetId(name) {
  return normalizeProjectMappingName(name);
}

function loadMappingPresets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.mappingPresets) || "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }

    const presetsById = new Map();
    for (const preset of parsed) {
      const id = normalizePresetId(preset.name || preset.id || "");
      if (!id || !preset.projectKey || !preset.processKey) {
        continue;
      }

      presetsById.set(id, { ...preset, id });
    }

    return [...presetsById.values()];
  } catch {
    return [];
  }
}

function persistMappingPresets() {
  localStorage.setItem(STORAGE_KEYS.mappingPresets, JSON.stringify(state.mappingPresets));
}

function statusLabel(status) {
  switch (status) {
    case "Approved":
      return "已寫入";
    case "Skipped":
      return "已略過";
    default:
      return "待確認";
  }
}

function normalizeStatus(status) {
  if (status === 1) {
    return "Approved";
  }

  if (status === 2) {
    return "Skipped";
  }

  return status || "Pending";
}

function setMessage(element, text, className) {
  element.textContent = text;
  element.className = `message ${className}`.trim();
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.error ?? response.statusText);
  }

  return payload;
}
