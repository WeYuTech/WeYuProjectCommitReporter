(() => {
  const rootSelector = "[data-tour-page]";
  const stepSelector = "[data-tour-step]";
  const storagePrefix = "projectCommitReporter.guidedTour";
  const version = "v1";
  let activeTour = null;

  const getStepNumber = element => Number.parseInt(element?.dataset?.tourStep || "", 10);
  const hasValidStep = element => Number.isInteger(getStepNumber(element)) && getStepNumber(element) > 0;
  const byStep = (a, b) => getStepNumber(a) - getStepNumber(b);
  const getPageId = root => root?.dataset?.tourPage?.trim();
  const storageKey = pageId => `${storagePrefix}:${pageId}:${version}:completed`;
  const hasForcedTour = () => new URLSearchParams(window.location.search).get("tour") === "1";

  const isVisible = element => {
    if (!element || element.closest("[hidden]")) {
      return false;
    }

    const style = window.getComputedStyle(element);
    return style.display !== "none"
      && style.visibility !== "hidden"
      && element.getClientRects().length > 0;
  };

  const getSteps = root => Array.from(root.querySelectorAll(stepSelector))
    .filter(hasValidStep)
    .filter(isVisible)
    .sort(byStep);

  const ensureUi = () => {
    let host = document.querySelector("[data-tour-host]");
    if (host) {
      return host;
    }

    host = document.createElement("div");
    host.dataset.tourHost = "true";
    host.innerHTML = `
      <div class="guided-tour-backdrop guided-tour-backdrop-top"></div>
      <div class="guided-tour-backdrop guided-tour-backdrop-right"></div>
      <div class="guided-tour-backdrop guided-tour-backdrop-bottom"></div>
      <div class="guided-tour-backdrop guided-tour-backdrop-left"></div>
      <article class="guided-tour-card" role="dialog" aria-modal="true" aria-live="polite">
        <button class="guided-tour-close" type="button" data-tour-close aria-label="關閉教學"></button>
        <div class="guided-tour-progress" data-tour-progress></div>
        <h2 data-tour-title></h2>
        <p data-tour-content></p>
        <div class="guided-tour-actions">
          <button class="secondary" type="button" data-tour-prev>上一步</button>
          <button class="primary" type="button" data-tour-next>下一步</button>
          <button class="secondary" type="button" data-tour-close>關閉</button>
        </div>
      </article>`;
    host.hidden = true;
    document.body.append(host);

    host.addEventListener("click", event => {
      if (event.target.closest("[data-tour-close]")) {
        activeTour?.finish(false);
      } else if (event.target.closest("[data-tour-prev]")) {
        activeTour?.previous();
      } else if (event.target.closest("[data-tour-next]")) {
        activeTour?.next();
      }
    });

    return host;
  };

  const placeBackdrops = (host, target) => {
    const rect = target.getBoundingClientRect();
    const padding = 10;
    const top = Math.max(0, rect.top - padding);
    const left = Math.max(0, rect.left - padding);
    const right = Math.min(window.innerWidth, rect.right + padding);
    const bottom = Math.min(window.innerHeight, rect.bottom + padding);
    const middleHeight = Math.max(0, bottom - top);

    host.querySelector(".guided-tour-backdrop-top").style.cssText =
      `left:0;top:0;width:100vw;height:${top}px;`;
    host.querySelector(".guided-tour-backdrop-bottom").style.cssText =
      `left:0;top:${bottom}px;width:100vw;height:${Math.max(0, window.innerHeight - bottom)}px;`;
    host.querySelector(".guided-tour-backdrop-left").style.cssText =
      `left:0;top:${top}px;width:${left}px;height:${middleHeight}px;`;
    host.querySelector(".guided-tour-backdrop-right").style.cssText =
      `left:${right}px;top:${top}px;width:${Math.max(0, window.innerWidth - right)}px;height:${middleHeight}px;`;
  };

  const placeCard = (card, target, placement) => {
    const rect = target.getBoundingClientRect();
    const margin = 16;
    const cardRect = card.getBoundingClientRect();
    const preferred = placement || "auto";
    const canRight = rect.right + margin + cardRect.width < window.innerWidth;
    const canLeft = rect.left - margin - cardRect.width > 0;
    const canBottom = rect.bottom + margin + cardRect.height < window.innerHeight;
    const canTop = rect.top - margin - cardRect.height > 0;
    const resolved = preferred === "auto"
      ? (canRight ? "right" : canLeft ? "left" : canBottom ? "bottom" : canTop ? "top" : "bottom")
      : preferred;

    let top = rect.bottom + margin;
    let left = Math.min(Math.max(margin, rect.left), window.innerWidth - cardRect.width - margin);

    if (resolved === "right") {
      top = Math.min(Math.max(margin, rect.top), window.innerHeight - cardRect.height - margin);
      left = rect.right + margin;
    } else if (resolved === "left") {
      top = Math.min(Math.max(margin, rect.top), window.innerHeight - cardRect.height - margin);
      left = rect.left - cardRect.width - margin;
    } else if (resolved === "top") {
      top = rect.top - cardRect.height - margin;
    }

    if (window.innerWidth < 760) {
      top = window.innerHeight - cardRect.height - margin;
      left = margin;
    }

    card.style.top = `${Math.max(margin, top)}px`;
    card.style.left = `${Math.max(margin, Math.min(left, window.innerWidth - cardRect.width - margin))}px`;
  };

  const createTourForSteps = (pageId, steps, options = {}) => {
    if (!pageId || steps.length === 0) {
      return null;
    }

    const host = ensureUi();
    const card = host.querySelector(".guided-tour-card");
    const title = host.querySelector("[data-tour-title]");
    const content = host.querySelector("[data-tour-content]");
    const progress = host.querySelector("[data-tour-progress]");
    const prev = host.querySelector("[data-tour-prev]");
    const next = host.querySelector("[data-tour-next]");
    let index = 0;
    let target = null;

    const clearTarget = () => {
      target?.classList.remove("guided-tour-target");
      target = null;
    };

    const updatePosition = () => {
      if (!target || host.hidden) {
        return;
      }

      placeBackdrops(host, target);
      placeCard(card, target, target.dataset.tourPlacement);
    };

    const render = (shouldScroll = true) => {
      clearTarget();
      target = steps[index];

      if (shouldScroll) {
        target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      }

      window.setTimeout(() => {
        if (!target || activeTour?.pageId !== pageId) {
          return;
        }

        title.textContent = target.dataset.tourTitle || "操作說明";
        content.textContent = target.dataset.tourContent || "";
        progress.textContent = `${index + 1} / ${steps.length}`;
        prev.disabled = index === 0;
        next.textContent = index === steps.length - 1 ? "完成" : "下一步";
        card.style.top = "-9999px";
        card.style.left = "-9999px";
        host.hidden = false;
        document.body.classList.add("guided-tour-active");
        target.classList.add("guided-tour-target");
        updatePosition();
        next.focus({ preventScroll: true });
      }, shouldScroll ? 140 : 0);
    };

    const finish = completed => {
      clearTarget();
      host.hidden = true;
      document.body.classList.remove("guided-tour-active");
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("keydown", onKeydown);
      if (completed) {
        localStorage.setItem(storageKey(pageId), "true");
      }
      activeTour = null;
    };

    const nextStep = () => {
      if (index >= steps.length - 1) {
        finish(true);
        return;
      }

      index += 1;
      render();
    };

    const previous = () => {
      if (index <= 0) {
        return;
      }

      index -= 1;
      render();
    };

    function onKeydown(event) {
      if (event.key === "Escape") {
        finish(false);
      } else if (event.key === "ArrowRight") {
        nextStep();
      } else if (event.key === "ArrowLeft") {
        previous();
      }
    }

    activeTour?.finish(false);
    activeTour = { pageId, next: nextStep, previous, finish };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("keydown", onKeydown);
    if (options.startIndex) {
      index = Math.min(options.startIndex, steps.length - 1);
    }
    render();
    return activeTour;
  };

  const createTour = (root, options = {}) => createTourForSteps(getPageId(root), getSteps(root), options);

  const currentRoot = () => Array.from(document.querySelectorAll(rootSelector))
    .find(root => getPageId(root) && getSteps(root).length > 0);

  const initializeRoot = (root, options = {}) => {
    const pageId = getPageId(root);
    if (!pageId || getSteps(root).length === 0) {
      return false;
    }

    const completed = localStorage.getItem(storageKey(pageId)) === "true";
    if (options.force || hasForcedTour() || (!completed && root.dataset.tourAuto === "first")) {
      createTour(root, options);
    }
    return true;
  };

  const bindStartButtons = () => {
    document.querySelectorAll("[data-tour-start]").forEach(button => {
      button.addEventListener("click", () => {
        const root = currentRoot();
        if (root) {
          createTour(root, { force: true });
        }
      });
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    bindStartButtons();
    window.setTimeout(() => {
      const root = currentRoot();
      if (root) {
        initializeRoot(root);
      }
    }, 350);
  });

  window.GuidedTour = {
    start(pageId, options = {}) {
      const root = Array.from(document.querySelectorAll(rootSelector))
        .find(item => getPageId(item) === pageId);
      return root ? createTour(root, { ...options, force: true }) : null;
    },
    reset(pageId) {
      localStorage.removeItem(storageKey(pageId));
    }
  };
})();
