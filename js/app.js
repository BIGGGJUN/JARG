(function () {
  const PROGRESS_KEY = "arg-progress-v1";
  const CLEAR_RATE_KEY = "arg-clear-rate-v1";
  const lobby = {
    id: 0,
    name: "lobby",
    answer: "start",
    content: '<h1 class="lobby-title">ARG</h1>',
  };

  const ending = {
    id: 13,
    name: "end",
    content: '<h1 class="end-title">END</h1>',
  };

  const problems = (window.ARG_PROBLEMS || []).sort((a, b) => a.id - b.id);
  const counter = document.getElementById("counter");
  const problemName = document.getElementById("problemName");
  const centerpiece = document.getElementById("centerpiece");
  const form = document.getElementById("answerForm");
  const input = document.getElementById("answerInput");
  const helpButton = document.getElementById("helpButton");
  const helpPanel = document.getElementById("helpPanel");
  const clearRateText = document.getElementById("clearRateText");

  let currentIndex = -1;
  let currentView = "stage";
  let maxReachedIndex = loadProgress();
  let activeCleanup = null;

  function normalize(value) {
    return value.trim().toLowerCase();
  }

  function loadProgress() {
    const rawProgress = window.localStorage.getItem(PROGRESS_KEY);
    if (rawProgress === null) {
      return -1;
    }

    const saved = Number(rawProgress);
    if (Number.isInteger(saved)) {
      return Math.min(Math.max(saved, -1), problems.length);
    }

    return -1;
  }

  function getClearStats() {
    const cleared = Math.min(Math.max(maxReachedIndex, 0), problems.length);
    const total = problems.length;
    const rate = total > 0 ? Math.round((cleared / total) * 100) : 0;

    return { cleared, total, rate };
  }

  function saveProgress() {
    const stats = getClearStats();
    window.localStorage.setItem(PROGRESS_KEY, String(maxReachedIndex));
    window.localStorage.setItem(CLEAR_RATE_KEY, String(stats.rate));
  }

  function updateClearRateText() {
    const stats = getClearStats();
    clearRateText.textContent = `clear ${stats.cleared}/${stats.total} (${stats.rate}%)`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getCurrentStage() {
    if (currentIndex === -1) {
      return lobby;
    }

    return problems[currentIndex] || ending;
  }

  function focusInput() {
    input.value = "";
    input.classList.remove("is-wrong");
    input.focus();
  }

  function cleanupStage() {
    if (typeof activeCleanup === "function") {
      activeCleanup();
    }

    activeCleanup = null;
  }

  function setHelpOpen(isOpen) {
    updateClearRateText();
    helpPanel.hidden = !isOpen;
    helpButton.setAttribute("aria-expanded", String(isOpen));
  }

  function syncHelpState() {
    helpButton.hidden = false;
    updateClearRateText();
  }

  function renderStage() {
    cleanupStage();
    currentView = "stage";
    const stage = getCurrentStage();
    counter.textContent = `#${stage.id}`;
    problemName.textContent = stage.name;
    centerpiece.innerHTML = stage.content || "";

    if (typeof stage.onRender === "function") {
      activeCleanup = stage.onRender({
        centerpiece,
        input,
        storage: window.localStorage,
      });
    }

    form.hidden = false;
    syncHelpState();
    focusInput();
  }

  function renderList() {
    cleanupStage();
    currentView = "list";
    counter.textContent = "#list";
    problemName.textContent = "problem list";
    form.hidden = false;
    updateClearRateText();
    centerpiece.innerHTML = `
      <div class="problem-list-wrap">
        <p class="problem-list-progress">${escapeHtml(clearRateText.textContent)}</p>
        <ol class="problem-list">
          ${problems
            .map((problem, index) => {
              const reached = index <= maxReachedIndex;
              const active = currentIndex === index;
              const className = [
                "problem-list-item",
                reached ? "is-open" : "is-locked",
                active ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ");
              const number = String(problem.id).padStart(2, "0");
              const label = reached ? escapeHtml(problem.name) : "locked";

              return `
                <li class="${className}">
                  <span>#${number}</span>
                  <span>${label}</span>
                </li>
              `;
            })
            .join("")}
        </ol>
      </div>
    `;
    syncHelpState();
    focusInput();
  }

  function advance() {
    currentIndex += 1;
    maxReachedIndex = Math.max(maxReachedIndex, currentIndex);
    saveProgress();
    renderStage();
  }

  function markWrong() {
    input.classList.remove("is-wrong");
    window.requestAnimationFrame(() => input.classList.add("is-wrong"));
  }

  function goToProblem(id) {
    if (id === 0) {
      currentIndex = -1;
      renderStage();
      return true;
    }

    const targetIndex = id - 1;
    if (targetIndex < 0 || targetIndex >= problems.length) {
      return false;
    }

    if (targetIndex > maxReachedIndex) {
      return false;
    }

    currentIndex = targetIndex;
    renderStage();
    return true;
  }

  function goToLobby() {
    currentIndex = -1;
    renderStage();
  }

  function resetProgress() {
    if (typeof window.localStorage.removeItem === "function") {
      window.localStorage.removeItem("arg-problem-03-start");
    }

    maxReachedIndex = -1;
    saveProgress();
    goToLobby();
    setHelpOpen(false);
  }

  function handleCommand(value) {
    const command = normalize(value);

    if (command === "#list") {
      renderList();
      return true;
    }

    if (command === "#lobby") {
      goToLobby();
      return true;
    }

    if (command === "#reset") {
      resetProgress();
      return true;
    }

    const problemCommand = command.match(/^#\s*(\d+)$/);
    if (problemCommand) {
      return goToProblem(Number(problemCommand[1]));
    }

    return false;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (handleCommand(input.value)) {
      return;
    }

    if (currentView === "list") {
      markWrong();
      return;
    }

    const stage = getCurrentStage();
    if (
      typeof stage.onSubmit === "function" &&
      stage.onSubmit({
        value: input.value,
        centerpiece,
        input,
        storage: window.localStorage,
      })
    ) {
      focusInput();
      return;
    }

    if (normalize(input.value) === normalize(stage.answer)) {
      advance();
      return;
    }

    markWrong();
  });

  helpButton.addEventListener("click", () => {
    setHelpOpen(helpPanel.hidden);
    input.focus();
  });

  setHelpOpen(false);
  saveProgress();
  renderStage();
})();
