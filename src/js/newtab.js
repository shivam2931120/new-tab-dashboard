import { WIDGETS } from "./constants.js";
import {
  addNote,
  addQuickLink,
  addTodo,
  clearCompletedTodos,
  deleteNote,
  deleteQuickLink,
  deleteTodo,
  isWidgetVisible,
  loadState,
  subscribeToState,
  toggleTodo,
  updateNote,
  updateQuickLink,
  updateSettings
} from "./storage.js";
import {
  applyAppearance,
  getNextLayout,
  getNextTheme,
  subscribeToSystemTheme
} from "./theme.js";
import {
  areJsonEqual,
  clearElement,
  createElement,
  isEditableElement,
  showToast
} from "./utils.js";
import { renderClockWidget } from "./widgets/clockWidget.js";
import { renderNotesWidget } from "./widgets/notesWidget.js";
import { renderQuickLinksWidget } from "./widgets/quickLinksWidget.js";
import { renderSearchWidget } from "./widgets/searchWidget.js";
import { renderTodosWidget } from "./widgets/todosWidget.js";

const widgetRenderers = {
  clock: renderClockWidget,
  search: renderSearchWidget,
  quickLinks: renderQuickLinksWidget,
  notes: renderNotesWidget,
  todos: renderTodosWidget
};

const dashboard = document.getElementById("dashboard-widgets");
const themeToggle = document.getElementById("theme-toggle");
const layoutToggle = document.getElementById("layout-toggle");

let state;
let cleanupCallbacks = [];
let searchInput = null;

async function init() {
  try {
    state = await loadState();
    applyAppearance(state.settings);
    renderDashboard();
    bindChromeControls();
    subscribeToState((nextState) => {
      const shouldRender = !areJsonEqual(nextState, state);
      state = nextState;
      applyAppearance(state.settings);
      updateChromeControlLabels();
      if (shouldRender) {
        renderDashboard();
      }
    });
    subscribeToSystemTheme(() => {
      if (state?.settings.theme === "system") {
        applyAppearance(state.settings);
      }
    });
  } catch (error) {
    dashboard.textContent = `Could not load dashboard: ${error.message}`;
  }
}

function renderDashboard() {
  cleanupCallbacks.forEach((cleanup) => cleanup());
  cleanupCallbacks = [];
  searchInput = null;
  clearElement(dashboard);

  const visibleWidgets = state.settings.widgetsOrder.filter((widgetId) =>
    isWidgetVisible(state.settings, widgetId)
  );

  if (!visibleWidgets.length) {
    dashboard.append(
      createElement("section", {
        className: "widget widget-empty-dashboard",
        children: [
          createElement("div", {
            className: "empty-state",
            children: [
              createElement("strong", { text: "No widgets are enabled" }),
              createElement("p", {
                text: "Open Options to turn widgets back on or reorder your dashboard."
              })
            ]
          })
        ]
      })
    );
    return;
  }

  visibleWidgets.forEach((widgetId) => {
    const renderer = widgetRenderers[widgetId];
    if (!renderer) {
      return;
    }

    const widget = renderer(getWidgetContext(widgetId));
    dashboard.append(widget.element);
    if (widget.cleanup) {
      cleanupCallbacks.push(widget.cleanup);
    }
    if (widget.searchInput) {
      searchInput = widget.searchInput;
    }
  });
}

function getWidgetContext(widgetId) {
  const context = {
    state,
    onNotify: showToast
  };

  if (widgetId === "quickLinks") {
    return {
      ...context,
      onAdd: persistAndRender(addQuickLink),
      onUpdate: persistAndRender(updateQuickLink),
      onDelete: persistAndRender(deleteQuickLink)
    };
  }

  if (widgetId === "notes") {
    return {
      ...context,
      onAdd: persistAndRender(addNote),
      onUpdate: persistOnly(updateNote),
      onDelete: persistAndRender(deleteNote)
    };
  }

  if (widgetId === "todos") {
    return {
      ...context,
      onAdd: persistAndRender(addTodo),
      onToggle: persistAndRender(toggleTodo),
      onDelete: persistAndRender(deleteTodo),
      onClearCompleted: persistAndRender(clearCompletedTodos)
    };
  }

  return context;
}

function persistAndRender(action) {
  return async (...args) => {
    state = await action(...args);
    applyAppearance(state.settings);
    renderDashboard();
    return state;
  };
}

function persistOnly(action) {
  return async (...args) => {
    state = await action(...args);
    return state;
  };
}

function bindChromeControls() {
  themeToggle.addEventListener("click", async () => {
    if (await saveDashboardSettings({ theme: getNextTheme(state.settings.theme) })) {
      showToast(`Theme set to ${state.settings.theme}.`);
    }
  });

  layoutToggle.addEventListener("click", async () => {
    if (await saveDashboardSettings({ layout: getNextLayout(state.settings.layout) })) {
      showToast(`Layout set to ${state.settings.layout}.`);
    }
  });

  document.addEventListener("keydown", (event) => {
    const searchWidgetEnabled =
      state?.settings &&
      state.settings.widgetsOrder.includes("search") &&
      isWidgetVisible(state.settings, "search");
    const shortcutPressed =
      event.key === "/" || (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey));

    if (!searchInput || !searchWidgetEnabled || !shortcutPressed || isEditableElement(event.target)) {
      return;
    }

    event.preventDefault();
    searchInput.focus();
  });

  updateChromeControlLabels();
  themeToggle.title = "Cycle theme preference";
  layoutToggle.title = "Toggle layout density";
}

async function saveDashboardSettings(patch) {
  try {
    state = await updateSettings(patch);
    applyAppearance(state.settings);
    updateChromeControlLabels();
    return true;
  } catch (error) {
    showToast(error.message, "danger");
    return false;
  }
}

function updateChromeControlLabels() {
  themeToggle.textContent = `Theme: ${state.settings.theme}`;
  layoutToggle.textContent = `Layout: ${state.settings.layout}`;
}

window.addEventListener("beforeunload", () => {
  cleanupCallbacks.forEach((cleanup) => cleanup());
});

if (!WIDGETS.length) {
  dashboard.textContent = "No widgets are configured.";
} else {
  init();
}
