const STORAGE_KEYS = Object.freeze({
  mappingPresets: "projectCommitReporter.mappingPresets.v1",
  optionFilters: "projectCommitReporter.optionFilters.v1"
});

const QUERY_PARAM_NAMES = Object.freeze({
  projectCode: "projectCode",
  processType: "processType",
  page: "page"
});

const PAGE_IDS = Object.freeze({
  review: "review",
  filters: "filters",
  commits: "commits",
  config: "config"
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
  activityLog: { entries: [], runningCount: 0 },
  activityTerminalOpen: false,
  activityTerminalTimer: null,
  mappingPresets: loadMappingPresets(),
  optionFilters: loadOptionFilters(),
  optionFilterDraft: null,
  config: null,
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
  sidebarSqlStatus: document.querySelector("#sidebarSqlStatus"),
  sidebarSqlDetail: document.querySelector("#sidebarSqlDetail"),
  headerRepoRoot: document.querySelector("#headerRepoRoot"),
  currentUserInitial: document.querySelector("#currentUserInitial"),
  currentUserName: document.querySelector("#currentUserName"),
  activityTerminalButton: document.querySelector("#activityTerminalButton"),
  activityTerminalBadge: document.querySelector("#activityTerminalBadge"),
  activityTerminal: document.querySelector("#activityTerminal"),
  closeActivityTerminalButton: document.querySelector("#closeActivityTerminalButton"),
  refreshActivityTerminalButton: document.querySelector("#refreshActivityTerminalButton"),
  activityTerminalList: document.querySelector("#activityTerminalList"),
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
  optionFilterSummary: document.querySelector("#optionFilterSummary"),
  projectOptionFilterButton: document.querySelector("#projectOptionFilterButton"),
  projectOptionFilterText: document.querySelector("#projectOptionFilterText"),
  projectOptionFilterMenu: document.querySelector("#projectOptionFilterMenu"),
  projectOptionFilterSearch: document.querySelector("#projectOptionFilterSearch"),
  projectOptionFilterList: document.querySelector("#projectOptionFilterList"),
  processOptionFilterButton: document.querySelector("#processOptionFilterButton"),
  processOptionFilterText: document.querySelector("#processOptionFilterText"),
  processOptionFilterMenu: document.querySelector("#processOptionFilterMenu"),
  processOptionFilterSearch: document.querySelector("#processOptionFilterSearch"),
  processOptionFilterList: document.querySelector("#processOptionFilterList"),
  selectAllProjectOptionsButton: document.querySelector("#selectAllProjectOptionsButton"),
  clearProjectOptionsButton: document.querySelector("#clearProjectOptionsButton"),
  selectAllProcessOptionsButton: document.querySelector("#selectAllProcessOptionsButton"),
  clearProcessOptionsButton: document.querySelector("#clearProcessOptionsButton"),
  saveOptionFiltersButton: document.querySelector("#saveOptionFiltersButton"),
  resetOptionFiltersButton: document.querySelector("#resetOptionFiltersButton"),
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
  detailSummary: document.querySelector("#detailSummary"),
  configSummaryRepoRoot: document.querySelector("#configSummaryRepoRoot"),
  configSummaryAuthor: document.querySelector("#configSummaryAuthor"),
  configSummarySchedule: document.querySelector("#configSummarySchedule"),
  configSummaryLookback: document.querySelector("#configSummaryLookback"),
  configSummaryUsers: document.querySelector("#configSummaryUsers"),
  configModal: document.querySelector("#configModal"),
  openConfigModalButton: document.querySelector("#openConfigModalButton"),
  closeConfigModalButton: document.querySelector("#closeConfigModalButton"),
  cancelConfigButton: document.querySelector("#cancelConfigButton"),
  configRepoRootInput: document.querySelector("#configRepoRootInput"),
  configGitAuthorNameInput: document.querySelector("#configGitAuthorNameInput"),
  configGitAuthorEmailInput: document.querySelector("#configGitAuthorEmailInput"),
  configScanLookbackDaysInput: document.querySelector("#configScanLookbackDaysInput"),
  configScheduleMinutesInput: document.querySelector("#configScheduleMinutesInput"),
  configPrincipalUserInput: document.querySelector("#configPrincipalUserInput"),
  configAuditUserInput: document.querySelector("#configAuditUserInput"),
  saveConfigButton: document.querySelector("#saveConfigButton"),
  applyScheduleButton: document.querySelector("#applyScheduleButton"),
  saveAndApplyScheduleButton: document.querySelector("#saveAndApplyScheduleButton"),
  reloadConfigButton: document.querySelector("#reloadConfigButton"),
  configMessage: document.querySelector("#configMessage"),
  configSqlStatus: document.querySelector("#configSqlStatus"),
  configProtectedPath: document.querySelector("#configProtectedPath"),
  configRuntimePath: document.querySelector("#configRuntimePath"),
  principalUserDefaultText: document.querySelector("#principalUserDefaultText"),
  auditUserDefaultText: document.querySelector("#auditUserDefaultText")
};

bindEvents();
init();

function bindEvents() {
  elements.scanButton.addEventListener("click", scanNow);
  elements.activityTerminalButton.addEventListener("click", toggleActivityTerminal);
  elements.closeActivityTerminalButton.addEventListener("click", closeActivityTerminal);
  elements.refreshActivityTerminalButton.addEventListener("click", loadActivityLog);
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
  elements.projectOptionFilterButton.addEventListener("click", () => toggleOptionFilterMenu("project"));
  elements.processOptionFilterButton.addEventListener("click", () => toggleOptionFilterMenu("process"));
  elements.projectOptionFilterSearch.addEventListener("input", renderOptionFilterControls);
  elements.processOptionFilterSearch.addEventListener("input", renderOptionFilterControls);
  elements.selectAllProjectOptionsButton.addEventListener("click", () => setAllOptionDraftKeys("project", true));
  elements.clearProjectOptionsButton.addEventListener("click", () => setAllOptionDraftKeys("project", false));
  elements.selectAllProcessOptionsButton.addEventListener("click", () => setAllOptionDraftKeys("process", true));
  elements.clearProcessOptionsButton.addEventListener("click", () => setAllOptionDraftKeys("process", false));
  elements.saveOptionFiltersButton.addEventListener("click", () => saveOptionFilters());
  elements.resetOptionFiltersButton.addEventListener("click", resetOptionFilters);
  document.addEventListener("click", closeOptionFilterMenusOnOutsideClick);
  elements.saveMappingButton.addEventListener("click", saveMappingPreset);
  elements.openConfigModalButton.addEventListener("click", openConfigModal);
  elements.closeConfigModalButton.addEventListener("click", closeConfigModal);
  elements.cancelConfigButton.addEventListener("click", closeConfigModal);
  elements.configModal.addEventListener("click", event => {
    if (event.target === elements.configModal) {
      closeConfigModal();
    }
  });
  window.addEventListener("keydown", event => {
    if (event.key === "Escape" && !elements.configModal.hidden) {
      closeConfigModal();
    }
    if (event.key === "Escape" && state.activityTerminalOpen) {
      closeActivityTerminal();
    }
  });
  elements.saveConfigButton.addEventListener("click", saveConfig);
  elements.applyScheduleButton.addEventListener("click", applyScheduledTask);
  elements.saveAndApplyScheduleButton.addEventListener("click", applyScheduledTask);
  elements.reloadConfigButton.addEventListener("click", loadConfig);

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
  state.optionFilterDraft = cloneOptionFilters(state.optionFilters);
  await loadOptions();
  hydrateFilterControls();
  hydrateManualReportForm();
  renderMappingPresetControls();
  await refreshCandidates();
  await loadScanStatus();
  await loadConfig();
  await loadActivityLog();
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
  await loadActivityLog();
  try {
    const result = await fetchJson("/api/scan", { method: "POST" });
    elements.statusText.textContent = `掃描完成：新增 ${result.added} 筆，既有 ${result.existing} 筆`;
    state.scanStatus = result.scanStatus;
    renderScanStatus();
    await refreshCandidates();
  } catch (error) {
    elements.statusText.textContent = `掃描失敗：${error.message}`;
  } finally {
    elements.scanButton.disabled = false;
    await loadActivityLog();
  }
}

function toggleActivityTerminal() {
  if (state.activityTerminalOpen) {
    closeActivityTerminal();
    return;
  }

  openActivityTerminal();
}

async function openActivityTerminal() {
  state.activityTerminalOpen = true;
  elements.activityTerminal.hidden = false;
  elements.activityTerminal.setAttribute("aria-hidden", "false");
  elements.activityTerminalButton.setAttribute("aria-expanded", "true");
  await loadActivityLog();
  state.activityTerminalTimer = window.setInterval(loadActivityLog, 1500);
}

function closeActivityTerminal() {
  state.activityTerminalOpen = false;
  elements.activityTerminal.hidden = true;
  elements.activityTerminal.setAttribute("aria-hidden", "true");
  elements.activityTerminalButton.setAttribute("aria-expanded", "false");
  if (state.activityTerminalTimer) {
    window.clearInterval(state.activityTerminalTimer);
    state.activityTerminalTimer = null;
  }
}

async function loadActivityLog() {
  try {
    state.activityLog = await fetchJson("/api/activity-log?take=160");
    renderActivityTerminal();
  } catch (error) {
    state.activityLog = {
      entries: [{
        id: 0,
        timestamp: new Date().toISOString(),
        level: "Error",
        source: "ui",
        message: `活動紀錄載入失敗：${error.message}`,
        isRunning: false
      }],
      runningCount: 0
    };
    renderActivityTerminal();
  }
}

function renderActivityTerminal() {
  const runningCount = state.activityLog?.runningCount ?? 0;
  elements.activityTerminalBadge.hidden = runningCount === 0;
  elements.activityTerminalBadge.textContent = String(runningCount);
  elements.activityTerminalButton.classList.toggle("is-running", runningCount > 0);

  const entries = state.activityLog?.entries || [];
  elements.activityTerminalList.replaceChildren();
  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "activity-terminal-empty";
    empty.textContent = "尚未有後台活動";
    elements.activityTerminalList.append(empty);
    return;
  }

  for (const entry of entries) {
    elements.activityTerminalList.append(createActivityLogItem(entry));
  }

  elements.activityTerminalList.scrollTop = elements.activityTerminalList.scrollHeight;
}

function createActivityLogItem(entry) {
  const item = document.createElement("article");
  item.className = `activity-log-item ${normalizeActivityLevel(entry.level)}${entry.isRunning ? " is-running" : ""}`;

  const meta = document.createElement("div");
  meta.className = "activity-log-meta";

  const time = document.createElement("time");
  time.textContent = formatActivityTime(entry.timestamp);
  meta.append(time);

  const source = document.createElement("span");
  source.textContent = entry.source || "system";
  meta.append(source);

  if (entry.exitCode !== null && entry.exitCode !== undefined) {
    const exitCode = document.createElement("span");
    exitCode.textContent = `exit ${entry.exitCode}`;
    meta.append(exitCode);
  }

  const message = document.createElement("strong");
  message.className = "activity-log-message";
  message.textContent = entry.message || "-";

  item.append(meta, message);

  if (entry.command) {
    const command = document.createElement("code");
    command.className = "activity-log-command";
    command.textContent = `$ ${entry.command}`;
    item.append(command);
  }

  if (entry.output) {
    const output = document.createElement("pre");
    output.className = "activity-log-output";
    output.textContent = entry.output;
    item.append(output);
  }

  if (entry.error) {
    const error = document.createElement("pre");
    error.className = "activity-log-output error";
    error.textContent = entry.error;
    item.append(error);
  }

  return item;
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
    elements.statusText.textContent = `目前 ${state.mappingPresets.length} 組預設對應`;
    renderOptionFilterControls();
    renderMappingPresetControls();
  }

  if (state.currentPage === PAGE_IDS.commits) {
    renderCommitListPage();
  }

  if (state.currentPage === PAGE_IDS.config) {
    renderConfigPage();
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
  const candidates = state.candidates.filter(candidate => normalizeStatus(candidate.status) === "Pending");
  elements.statusText.textContent = `目前 ${candidates.length} 筆待確認`;

  if (candidates.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "目前沒有待確認 commit";
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
  const selectedProject = elements.manualProjectSelect.value;
  const selectedProcess = elements.manualProcessSelect.value;
  fillSelect(elements.manualProjectSelect, getProjectEntryOptions(selectedProject), selectedProject);
  fillSelect(elements.manualProcessSelect, getProcessEntryOptions(selectedProcess), selectedProcess);

  if (!elements.manualWorkDate.value) {
    elements.manualWorkDate.value = formatDateInput(new Date());
  }
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

    setMessage(elements.manualReportMessage, "已寫入手動日報", "success");
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
  fillSelect(projectSelect, getProjectEntryOptions(projectCode), projectCode);
  fillSelect(processSelect, getProcessEntryOptions(processType), processType);
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
      setMessage(message, "已寫入", "success");
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
      fillSelect(projectSelect, getProjectEntryOptions(updatedSelection.projectCode), updatedSelection.projectCode);
      fillSelect(processSelect, getProcessEntryOptions(updatedSelection.processType), updatedSelection.processType);
      projectSelect.value = updatedSelection.projectCode;
      processSelect.value = updatedSelection.processType;
      summary.value = updated.summary;
      renderAutoMappingNote(autoMappingNote, updated, updatedAutoMappingPreset);
      setMessage(message, "已重新產生", "success");
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
      setMessage(message, "已翻譯成繁體中文", "success");
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
  elements.statusText.textContent = `Commit 清單 ${commits.length} 筆`;

  if (commits.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "empty-cell";
    cell.textContent = "目前沒有符合條件的 commit";
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
  const label = statusLabel(status);
  cell.className = "commit-status-cell";
  pill.className = "status-pill compact";
  pill.classList.toggle("approved", status === "Approved");
  pill.classList.toggle("skipped", status === "Skipped");
  pill.textContent = label;
  pill.title = label;
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

async function loadConfig() {
  try {
    state.config = await fetchJson("/api/config");
    hydrateConfigForm();
    renderShellConfig();
    renderConfigPage();
  } catch (error) {
    renderShellConfig();
    setMessage(elements.configMessage, `設定載入失敗：${error.message}`, "error");
  }
}

function hydrateConfigForm() {
  if (!state.config) {
    return;
  }

  const defaults = state.config.defaults || {};
  elements.configRepoRootInput.value = state.config.repoRoot || "";
  elements.configGitAuthorNameInput.value = state.config.gitAuthorName || "";
  elements.configGitAuthorEmailInput.value = state.config.gitAuthorEmail || "";
  elements.configScanLookbackDaysInput.value = state.config.scanLookbackDays ?? 0;
  elements.configScheduleMinutesInput.value = state.config.scheduleMinutes ?? 5;
  elements.configPrincipalUserInput.value = state.config.principalUser || "";
  elements.configAuditUserInput.value = state.config.auditUser || "";
  elements.configRepoRootInput.placeholder = defaults.repoRoot || "Git repository 根目錄";
  elements.configGitAuthorNameInput.placeholder = defaults.gitAuthorName || "Git author name";
  elements.configGitAuthorEmailInput.placeholder = defaults.gitAuthorEmail || "andy@example.com";
  elements.configPrincipalUserInput.placeholder = defaults.principalUser || "負責人";
  elements.configAuditUserInput.placeholder = defaults.auditUser || "審計使用者";
  elements.commitAuthorFilter.placeholder = `例如：${state.config.gitAuthorName || defaults.gitAuthorName || "作者名稱"}`;
  elements.principalUserDefaultText.textContent = defaults.principalUser || "未設定";
  elements.auditUserDefaultText.textContent = defaults.auditUser || "未設定";
}

function renderShellConfig() {
  const config = state.config;
  const defaults = config?.defaults || {};
  const repoRoot = config?.repoRoot || defaults.repoRoot || "尚未載入掃描根目錄";
  const userName = config?.principalUser || defaults.principalUser || config?.gitAuthorName || defaults.gitAuthorName || "未設定";
  const initial = Array.from(userName.trim()).find(character => character.trim()) || "-";

  elements.headerRepoRoot.textContent = repoRoot;
  elements.headerRepoRoot.title = repoRoot;
  elements.currentUserName.textContent = userName;
  elements.currentUserInitial.textContent = initial.toUpperCase();

  if (!config) {
    elements.sidebarSqlStatus.textContent = "載入中";
    elements.sidebarSqlDetail.textContent = "確認連線設定中";
    return;
  }

  elements.sidebarSqlStatus.textContent = config.sqlConnectionConfigured ? "已設定" : "未設定";
  elements.sidebarSqlDetail.textContent = config.sqlConnectionConfigured
    ? "人工確認後寫入"
    : "請設定 SQL 連線";
}

function renderConfigPage() {
  if (!state.config) {
    elements.statusText.textContent = "設定載入中";
    elements.configSqlStatus.textContent = "載入中";
    renderShellConfig();
    return;
  }

  renderShellConfig();
  elements.statusText.textContent = `目前掃描 ${state.config.repoRoot}，每 ${state.config.scheduleMinutes} 分鐘排程`;
  elements.configSummaryRepoRoot.textContent = state.config.repoRoot || "-";
  elements.configSummaryAuthor.textContent = `${state.config.gitAuthorName || "-"} / ${state.config.gitAuthorEmail || "未設定 Email"}`;
  elements.configSummarySchedule.textContent = `每 ${state.config.scheduleMinutes} 分鐘`;
  elements.configSummaryLookback.textContent = `${state.config.scanLookbackDays} 天`;
  elements.configSummaryUsers.textContent = `${state.config.principalUser || "-"} / ${state.config.auditUser || "-"}`;
  elements.configSqlStatus.textContent = state.config.sqlConnectionConfigured ? "已設定" : "未設定";
  elements.configSqlStatus.classList.toggle("is-ok", Boolean(state.config.sqlConnectionConfigured));
  elements.configSqlStatus.classList.toggle("is-warning", !state.config.sqlConnectionConfigured);
  elements.configProtectedPath.textContent = state.config.protectedConnectionStringPath || "-";
  elements.configRuntimePath.textContent = state.config.runtimeConfigPath || "-";
}

function openConfigModal() {
  hydrateConfigForm();
  setMessage(elements.configMessage, "", "");
  elements.configModal.hidden = false;
  elements.configModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  elements.configRepoRootInput.focus();
}

function closeConfigModal() {
  elements.configModal.hidden = true;
  elements.configModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

async function saveConfig() {
  setMessage(elements.configMessage, "保存設定中...", "");
  elements.saveConfigButton.disabled = true;
  try {
    state.config = await fetchJson("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(readConfigForm())
    });
    hydrateConfigForm();
    renderConfigPage();
    setMessage(elements.configMessage, "設定已保存，下一次掃描會套用", "success");
    closeConfigModal();
  } catch (error) {
    setMessage(elements.configMessage, `保存失敗：${error.message}`, "error");
  } finally {
    elements.saveConfigButton.disabled = false;
  }
}

async function applyScheduledTask() {
  setMessage(elements.configMessage, "保存設定並套用排程中...", "");
  elements.applyScheduleButton.disabled = true;
  elements.saveAndApplyScheduleButton.disabled = true;
  try {
    state.config = await fetchJson("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(readConfigForm())
    });
    hydrateConfigForm();
    renderConfigPage();

    const scheduleMinutes = state.config.scheduleMinutes;
    const result = await fetchJson("/api/config/scheduled-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleMinutes })
    });
    setMessage(elements.configMessage, result.message || `排程已改為每 ${result.scheduleMinutes} 分鐘掃描`, "success");
    closeConfigModal();
  } catch (error) {
    setMessage(elements.configMessage, `套用排程失敗：${error.message}`, "error");
  } finally {
    elements.applyScheduleButton.disabled = false;
    elements.saveAndApplyScheduleButton.disabled = false;
  }
}

function readConfigForm() {
  return {
    repoRoot: elements.configRepoRootInput.value.trim(),
    gitAuthorName: elements.configGitAuthorNameInput.value.trim(),
    gitAuthorEmail: elements.configGitAuthorEmailInput.value.trim(),
    scanLookbackDays: Number.parseInt(elements.configScanLookbackDaysInput.value, 10) || 0,
    scheduleMinutes: Number.parseInt(elements.configScheduleMinutesInput.value, 10) || 0,
    principalUser: elements.configPrincipalUserInput.value.trim(),
    auditUser: elements.configAuditUserInput.value.trim()
  };
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
  const selectedProject = elements.mappingProjectSelect.value;
  const selectedProcess = elements.mappingProcessSelect.value;
  renderOptionFilterControls();
  fillSelect(elements.mappingProjectSelect, getProjectEntryOptions(selectedProject), selectedProject);
  fillSelect(elements.mappingProcessSelect, getProcessEntryOptions(selectedProcess), selectedProcess);
  fillSelect(elements.commitProjectFilter, [], "", "全部專案");
}

function renderMappingPresetControls() {
  hydrateMappingSelects();
  renderMappingTable();
  updateDashboardMetrics();
}

function hydrateMappingSelects() {
  const selectedProject = elements.mappingProjectSelect.value;
  const selectedProcess = elements.mappingProcessSelect.value;
  fillSelect(elements.mappingProjectSelect, getProjectEntryOptions(selectedProject), selectedProject);
  fillSelect(elements.mappingProcessSelect, getProcessEntryOptions(selectedProcess), selectedProcess);
}

function renderMappingTable() {
  elements.mappingTableBody.replaceChildren();

  if (state.mappingPresets.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "empty-cell";
    cell.textContent = "尚未建立預設對應";
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
  apply.textContent = "加入常用";
  apply.addEventListener("click", () => {
    addOptionFilterKeys(preset.projectKey, preset.processKey);
    activateTab(TAB_IDS.quickFilter);
  });

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
  cell.append(apply, remove);
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

function renderOptionFilterControls() {
  if (!state.optionFilterDraft) {
    state.optionFilterDraft = cloneOptionFilters(state.optionFilters);
  }

  renderCheckboxOptionList("project");
  renderCheckboxOptionList("process");
  updateOptionFilterSummary();
}

function renderCheckboxOptionList(kind) {
  const config = optionFilterConfig(kind);
  const selectedKeys = new Set(state.optionFilterDraft[config.stateKey]);
  const keyword = config.search.value.trim().toLowerCase();
  const options = keyword
    ? config.options.filter(option => optionMatchesKeyword(option, keyword))
    : config.options;

  config.list.replaceChildren();

  if (options.length === 0) {
    const empty = document.createElement("div");
    empty.className = "checkbox-option-empty";
    empty.textContent = "沒有符合的選項";
    config.list.append(empty);
    return;
  }

  for (const option of options) {
    const key = getOptionKey(option);
    const text = getOptionDisplay(option);
    const item = document.createElement("label");
    item.className = "checkbox-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = key;
    checkbox.checked = selectedKeys.has(key);
    checkbox.addEventListener("change", () => {
      updateOptionFilterDraft(kind, key, checkbox.checked);
    });

    const label = document.createElement("span");
    label.textContent = `${text} (${key})`;

    item.append(checkbox, label);
    config.list.append(item);
  }
}

function toggleOptionFilterMenu(kind) {
  const config = optionFilterConfig(kind);
  const willOpen = config.menu.hidden;

  closeOptionFilterMenus();

  if (willOpen) {
    config.menu.hidden = false;
    config.button.setAttribute("aria-expanded", "true");
    config.search.focus();
  }
}

function closeOptionFilterMenusOnOutsideClick(event) {
  if (event.target.closest(".checkbox-dropdown")) {
    return;
  }

  closeOptionFilterMenus();
}

function closeOptionFilterMenus() {
  for (const kind of ["project", "process"]) {
    const config = optionFilterConfig(kind);
    config.menu.hidden = true;
    config.button.setAttribute("aria-expanded", "false");
  }
}

function updateOptionFilterDraft(kind, key, checked) {
  const config = optionFilterConfig(kind);
  const keys = new Set(state.optionFilterDraft[config.stateKey]);

  if (checked) {
    keys.add(key);
  } else {
    keys.delete(key);
  }

  state.optionFilterDraft[config.stateKey] = [...keys];
  updateOptionFilterSummary();
}

function setAllOptionDraftKeys(kind, shouldSelect) {
  const config = optionFilterConfig(kind);
  state.optionFilterDraft[config.stateKey] = shouldSelect
    ? config.options.map(getOptionKey).filter(Boolean)
    : [];
  renderOptionFilterControls();
}

function addOptionFilterKeys(projectKey, processKey) {
  state.optionFilterDraft = cloneOptionFilters(state.optionFilters);

  if (projectKey) {
    state.optionFilterDraft.projectCodes = [...new Set([...state.optionFilterDraft.projectCodes, projectKey])];
  }

  if (processKey) {
    state.optionFilterDraft.processTypes = [...new Set([...state.optionFilterDraft.processTypes, processKey])];
  }

  saveOptionFilters("已加入常用選項");
}

function saveOptionFilters(message = "已保存常用選項") {
  state.optionFilters = normalizeOptionFilters(state.optionFilterDraft);
  state.optionFilterDraft = cloneOptionFilters(state.optionFilters);
  persistOptionFilters();
  closeOptionFilterMenus();
  renderOptionFilterControls();
  refreshEntryOptionControls();
  elements.statusText.textContent = message;
}

function resetOptionFilters() {
  state.optionFilterDraft = { projectCodes: [], processTypes: [] };
  saveOptionFilters("已恢復顯示全部選項");
}

function refreshEntryOptionControls() {
  hydrateManualReportForm();
  hydrateMappingSelects();
  renderReviewPage();
  renderCommitListPage();
  renderActiveFilterBadge();
}

function updateOptionFilterSummary() {
  const projectCount = state.optionFilterDraft.projectCodes.length;
  const processCount = state.optionFilterDraft.processTypes.length;

  elements.projectOptionFilterText.textContent = projectCount > 0
    ? `已選 ${projectCount} 個專案`
    : "全部專案";
  elements.processOptionFilterText.textContent = processCount > 0
    ? `已選 ${processCount} 個流程`
    : "全部流程";

  elements.optionFilterSummary.textContent = projectCount === 0 && processCount === 0
    ? "顯示全部選項"
    : `PROJECT_CODE ${projectCount || "全部"} / PROCESS_TYPE ${processCount || "全部"}`;
}

function optionFilterConfig(kind) {
  if (kind === "project") {
    return {
      stateKey: "projectCodes",
      options: state.projects,
      button: elements.projectOptionFilterButton,
      text: elements.projectOptionFilterText,
      menu: elements.projectOptionFilterMenu,
      search: elements.projectOptionFilterSearch,
      list: elements.projectOptionFilterList
    };
  }

  return {
    stateKey: "processTypes",
    options: state.processTypes,
    button: elements.processOptionFilterButton,
    text: elements.processOptionFilterText,
    menu: elements.processOptionFilterMenu,
    search: elements.processOptionFilterSearch,
    list: elements.processOptionFilterList
  };
}

function optionMatchesKeyword(option, keyword) {
  return `${getOptionKey(option)} ${getOptionDisplay(option)}`.toLowerCase().includes(keyword);
}

function getProjectEntryOptions(selectedValue = "") {
  return getFilteredEntryOptions(state.projects, state.optionFilters.projectCodes, selectedValue);
}

function getProcessEntryOptions(selectedValue = "") {
  return getFilteredEntryOptions(state.processTypes, state.optionFilters.processTypes, selectedValue);
}

function getFilteredEntryOptions(options, allowedKeys, selectedValue) {
  const visible = allowedKeys.length > 0
    ? options.filter(option => allowedKeys.includes(getOptionKey(option)))
    : [...options];

  if (selectedValue && !visible.some(option => getOptionKey(option) === selectedValue)) {
    const selectedOption = options.find(option => getOptionKey(option) === selectedValue);
    visible.push(selectedOption ?? { key: selectedValue, value: selectedValue });
  }

  return visible;
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
    elements.statusText.textContent = "請輸入專案名稱，並選擇 PROJECT_CODE 與 PROCESS_TYPE";
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
  const projectCount = state.optionFilters.projectCodes.length;
  const processCount = state.optionFilters.processTypes.length;

  if (projectCount === 0 && processCount === 0) {
    elements.activeFilterBadge.textContent = "常用下拉：顯示全部";
    elements.activeFilterBadge.classList.remove("is-active");
    return;
  }

  elements.activeFilterBadge.textContent = `常用下拉：PROJECT_CODE ${projectCount || "全部"} / PROCESS_TYPE ${processCount || "全部"}`;
  elements.activeFilterBadge.classList.add("is-active");
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
    node.value = getOptionKey(option);
    node.textContent = getOptionDisplay(option);
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

  const option = options.find(item => getOptionKey(item) === key);
  return option ? getOptionDisplay(option) : key;
}

function getOptionKey(option) {
  return option?.key || option?.code || "";
}

function getOptionDisplay(option) {
  return option?.value || option?.name || option?.display || getOptionKey(option);
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

function loadOptionFilters() {
  try {
    return normalizeOptionFilters(JSON.parse(localStorage.getItem(STORAGE_KEYS.optionFilters) || "{}"));
  } catch {
    return { projectCodes: [], processTypes: [] };
  }
}

function persistOptionFilters() {
  localStorage.setItem(STORAGE_KEYS.optionFilters, JSON.stringify(state.optionFilters));
}

function normalizeOptionFilters(value) {
  return {
    projectCodes: normalizeStringArray(value?.projectCodes),
    processTypes: normalizeStringArray(value?.processTypes)
  };
}

function cloneOptionFilters(value) {
  const normalized = normalizeOptionFilters(value);
  return {
    projectCodes: [...normalized.projectCodes],
    processTypes: [...normalized.processTypes]
  };
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map(item => String(item ?? "").trim()).filter(Boolean))];
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

function normalizeActivityLevel(level) {
  return String(level || "Info").toLowerCase();
}

function formatActivityTime(value) {
  if (!value) {
    return "--:--:--";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
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
