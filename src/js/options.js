import {
  BACKGROUND_GRADIENTS,
  BACKGROUND_MODES,
  LAYOUTS,
  THEMES,
  WIDGETS
} from "./constants.js";
import {
  addNote,
  addQuickLink,
  addTodo,
  clearCompletedTodos,
  deleteNote,
  deleteQuickLink,
  deleteTodo,
  importState,
  isWidgetVisible,
  loadState,
  resetState,
  setWidgetOrder,
  setWidgetVisibility,
  subscribeToState,
  toggleTodo,
  updateNote,
  updateQuickLink,
  updateSettings
} from "./storage.js";
import { applyAppearance, subscribeToSystemTheme } from "./theme.js";
import {
  areJsonEqual,
  clearElement,
  createElement,
  downloadJson,
  moveItem,
  readFileAsText,
  normalizeImageUrlInput,
  setFieldError,
  showToast,
  toHostname,
  verifyImageUrl
} from "./utils.js";

const root = document.getElementById("settings-root");
let state;

async function init() {
  try {
    state = await loadState();
    renderOptions();
    subscribeToState((nextState) => {
      const shouldRender = !areJsonEqual(nextState, state);
      state = nextState;
      applyAppearance(state.settings);
      if (shouldRender) {
        renderOptions();
      }
    });
    subscribeToSystemTheme(() => {
      if (state?.settings.theme === "system") {
        applyAppearance(state.settings);
      }
    });
  } catch (error) {
    root.textContent = `Could not load options: ${error.message}`;
  }
}

function renderOptions() {
  applyAppearance(state.settings);
  clearElement(root);
  root.append(
    renderPageHeader(),
    renderAppearanceSection(),
    renderWidgetsSection(),
    renderQuickLinksSection(),
    renderNotesSection(),
    renderTodosSection(),
    renderDataSection()
  );
}

function renderPageHeader() {
  return createElement("section", {
    className: "settings-hero",
    children: [
      createElement("div", {
        children: [
          createElement("p", {
            className: "eyebrow",
            text: "Settings"
          }),
          createElement("h1", {
            text: "Customize your dashboard"
          }),
          createElement("p", {
            className: "settings-intro",
            text: "Manage appearance, widgets, quick links, notes, to-dos, and local data."
          })
        ]
      })
    ]
  });
}

function renderAppearanceSection() {
  const themeSelect = createSelect("theme", THEMES, state.settings.theme, {
    light: "Light",
    dark: "Dark",
    system: "System"
  });
  const layoutSelect = createSelect("layout", LAYOUTS, state.settings.layout, {
    comfortable: "Comfortable",
    compact: "Compact"
  });
  const modeSelect = createSelect("background-mode", BACKGROUND_MODES, state.settings.backgroundMode, {
    solid: "Solid",
    gradient: "Gradient",
    image: "Image URL"
  });
  const colorInput = createElement("input", {
    attrs: {
      id: "background-color",
      type: "color",
      value: state.settings.backgroundColor
    }
  });
  const gradientSelect = createSelect(
    "background-gradient",
    Object.keys(BACKGROUND_GRADIENTS),
    state.settings.backgroundGradient,
    {
      clearMorning: "Clear morning",
      paperDesk: "Paper desk",
      duskFocus: "Dusk focus",
      grove: "Grove"
    }
  );
  const imageInput = createElement("input", {
    attrs: {
      id: "background-image",
      type: "text",
      inputmode: "url",
      placeholder: "https://example.com/background.jpg",
      value: state.settings.backgroundImageUrl
    }
  });
  const imageError = createElement("p", {
    className: "field-error",
    attrs: {
      id: "background-image-error",
      hidden: true
    }
  });
  const imageSave = createElement("button", {
    className: "button button-primary",
    text: "Save image",
    attrs: {
      type: "button"
    }
  });

  themeSelect.addEventListener("change", () =>
    saveSettings({ theme: themeSelect.value }, { rerender: false })
  );
  layoutSelect.addEventListener("change", () =>
    saveSettings({ layout: layoutSelect.value }, { rerender: false })
  );
  modeSelect.addEventListener("change", () => {
    if (modeSelect.value === "image" && !imageInput.value.trim()) {
      setFieldError(imageError, "Enter and save an HTTPS image URL first.");
      modeSelect.value = state.settings.backgroundMode;
      imageInput.focus();
      return;
    }

    setFieldError(imageError);
    saveSettings({ backgroundMode: modeSelect.value }, { rerender: false });
  });
  colorInput.addEventListener("change", () =>
    saveSettings({ backgroundColor: colorInput.value }, { rerender: false })
  );
  gradientSelect.addEventListener("change", () => {
    modeSelect.value = "gradient";
    saveSettings(
      { backgroundGradient: gradientSelect.value, backgroundMode: "gradient" },
      { rerender: false }
    );
  });
  imageSave.addEventListener("click", async () => {
    try {
      setFieldError(imageError);
      imageSave.disabled = true;
      const backgroundImageUrl = normalizeImageUrlInput(imageInput.value);
      await verifyImageUrl(backgroundImageUrl);
      modeSelect.value = backgroundImageUrl ? "image" : "gradient";
      const saved = await saveSettings(
        {
          backgroundImageUrl,
          backgroundMode: backgroundImageUrl ? "image" : "gradient"
        },
        { rerender: false, message: "Background image saved." }
      );
      if (!saved) {
        setFieldError(imageError, "Could not save background image.");
      }
    } catch (error) {
      setFieldError(imageError, error.message);
    } finally {
      imageSave.disabled = false;
    }
  });

  return createSettingsSection("Appearance", "Theme, density, and dashboard background.", [
    createField("Theme", "theme", themeSelect),
    createField("Layout density", "layout", layoutSelect),
    createField("Background mode", "background-mode", modeSelect),
    createField("Solid color", "background-color", colorInput),
    createField("Gradient", "background-gradient", gradientSelect),
    createField("Image URL", "background-image", imageInput, imageError),
    createElement("div", {
      className: "settings-actions",
      children: [imageSave]
    })
  ]);
}

function renderWidgetsSection() {
  const rows = state.settings.widgetsOrder.map((widgetId, index) => {
    const widget = WIDGETS.find((item) => item.id === widgetId);
    const checkboxId = `widget-visible-${widgetId}`;
    const checkbox = createElement("input", {
      attrs: {
        id: checkboxId,
        type: "checkbox"
      }
    });
    checkbox.checked = isWidgetVisible(state.settings, widgetId);
    checkbox.addEventListener("change", async () => {
      state = await setWidgetVisibility(widgetId, checkbox.checked);
      showToast(`${widget.label} ${checkbox.checked ? "enabled" : "disabled"}.`);
      renderOptions();
    });

    const upButton = createElement("button", {
      className: "button button-small button-ghost",
      text: "Up",
      attrs: {
        type: "button",
        disabled: index === 0
      }
    });
    const downButton = createElement("button", {
      className: "button button-small button-ghost",
      text: "Down",
      attrs: {
        type: "button",
        disabled: index === state.settings.widgetsOrder.length - 1
      }
    });

    upButton.addEventListener("click", () => moveWidget(index, index - 1));
    downButton.addEventListener("click", () => moveWidget(index, index + 1));

    return createElement("li", {
      className: "settings-row widget-order-row",
      children: [
        checkbox,
        createElement("label", {
          className: "settings-row-main",
          attrs: { for: checkboxId },
          children: [
            createElement("strong", { text: widget.label }),
            createElement("small", { text: widget.description })
          ]
        }),
        createElement("div", {
          className: "button-row",
          children: [upButton, downButton]
        })
      ]
    });
  });

  return createSettingsSection("Widgets", "Enable widgets and choose their dashboard order.", [
    createElement("ul", {
      className: "settings-list",
      children: rows
    })
  ]);
}

function renderQuickLinksSection() {
  const title = createElement("input", {
    attrs: {
      id: "new-link-title",
      type: "text",
      maxlength: "80",
      autocomplete: "off",
      required: true
    }
  });
  const url = createElement("input", {
    attrs: {
      id: "new-link-url",
      type: "text",
      inputmode: "url",
      autocomplete: "url",
      placeholder: "https://example.com",
      required: true
    }
  });
  const error = createElement("p", {
    className: "field-error",
    attrs: { hidden: true }
  });
  const form = createElement("form", {
    className: "settings-form-grid",
    children: [
      createField("Title", "new-link-title", title),
      createField("URL", "new-link-url", url),
      error,
      createElement("button", {
        className: "button button-primary",
        text: "Add link",
        attrs: { type: "submit" }
      })
    ]
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setFieldError(error);
      state = await addQuickLink({ title: title.value, url: url.value });
      showToast("Quick link added.");
      renderOptions();
    } catch (errorMessage) {
      setFieldError(error, errorMessage.message);
    }
  });

  const list = state.quickLinks.length
    ? createElement("ul", {
        className: "settings-list",
        children: state.quickLinks.map(renderQuickLinkRow)
      })
    : createEmptySettingsState("No quick links yet.");

  return createSettingsSection("Quick Links", "Create and maintain pinned shortcuts.", [form, list]);
}

function renderQuickLinkRow(link) {
  const titleId = `link-title-${link.id}`;
  const urlId = `link-url-${link.id}`;
  const title = createElement("input", {
    attrs: {
      id: titleId,
      type: "text",
      maxlength: "80",
      value: link.title
    }
  });
  const url = createElement("input", {
    attrs: {
      id: urlId,
      type: "text",
      inputmode: "url",
      value: link.url
    }
  });
  const error = createElement("p", {
    className: "field-error",
    attrs: { hidden: true }
  });
  const save = createElement("button", {
    className: "button button-small button-primary",
    text: "Save",
    attrs: { type: "button" }
  });
  const remove = createElement("button", {
    className: "button button-small button-danger",
    text: "Delete",
    attrs: { type: "button" }
  });

  save.addEventListener("click", async () => {
    try {
      setFieldError(error);
      state = await updateQuickLink(link.id, { title: title.value, url: url.value });
      showToast("Quick link saved.");
      renderOptions();
    } catch (errorMessage) {
      setFieldError(error, errorMessage.message);
    }
  });
  remove.addEventListener("click", async () => {
    state = await deleteQuickLink(link.id);
    showToast("Quick link deleted.");
    renderOptions();
  });

  return createElement("li", {
    className: "settings-row settings-row-grid",
    children: [
      createElement("div", {
        className: "settings-row-main",
        children: [
          createElement("strong", { text: link.title }),
          createElement("small", { text: toHostname(link.url) })
        ]
      }),
      createField("Title", titleId, title),
      createField("URL", urlId, url),
      error,
      createElement("div", {
        className: "button-row",
        children: [save, remove]
      })
    ]
  });
}

function renderNotesSection() {
  const textarea = createElement("textarea", {
    attrs: {
      id: "new-note",
      rows: "3",
      maxlength: "4000",
      placeholder: "Write a note"
    }
  });
  const error = createElement("p", {
    className: "field-error",
    attrs: { hidden: true }
  });
  const form = createElement("form", {
    className: "stacked-form",
    children: [
      createField("New note", "new-note", textarea),
      error,
      createElement("button", {
        className: "button button-primary",
        text: "Add note",
        attrs: { type: "submit" }
      })
    ]
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setFieldError(error);
      state = await addNote({ text: textarea.value });
      showToast("Note added.");
      renderOptions();
    } catch (errorMessage) {
      setFieldError(error, errorMessage.message);
    }
  });

  const list = state.notes.length
    ? createElement("ul", {
        className: "settings-list",
        children: state.notes.map(renderNoteRow)
      })
    : createEmptySettingsState("No notes yet.");

  return createSettingsSection("Sticky Notes", "Add, edit, and delete local notes.", [form, list]);
}

function renderNoteRow(note) {
  const textareaId = `note-text-${note.id}`;
  const textarea = createElement("textarea", {
    text: note.text,
    attrs: {
      id: textareaId,
      rows: "4",
      maxlength: "4000"
    }
  });
  const error = createElement("p", {
    className: "field-error",
    attrs: { hidden: true }
  });
  const save = createElement("button", {
    className: "button button-small button-primary",
    text: "Save",
    attrs: { type: "button" }
  });
  const remove = createElement("button", {
    className: "button button-small button-danger",
    text: "Delete",
    attrs: { type: "button" }
  });

  save.addEventListener("click", async () => {
    try {
      setFieldError(error);
      state = await updateNote(note.id, { text: textarea.value });
      showToast("Note saved.");
      renderOptions();
    } catch (errorMessage) {
      setFieldError(error, errorMessage.message);
    }
  });
  remove.addEventListener("click", async () => {
    state = await deleteNote(note.id);
    showToast("Note deleted.");
    renderOptions();
  });

  return createElement("li", {
    className: "settings-row settings-row-grid",
    children: [
      createField("Note text", textareaId, textarea),
      error,
      createElement("div", {
        className: "button-row",
        children: [save, remove]
      })
    ]
  });
}

function renderTodosSection() {
  const input = createElement("input", {
    attrs: {
      id: "new-todo",
      type: "text",
      maxlength: "220",
      autocomplete: "off",
      placeholder: "Add a task"
    }
  });
  const error = createElement("p", {
    className: "field-error",
    attrs: { hidden: true }
  });
  const form = createElement("form", {
    className: "settings-form-grid",
    children: [
      createField("New to-do", "new-todo", input),
      error,
      createElement("button", {
        className: "button button-primary",
        text: "Add to-do",
        attrs: { type: "submit" }
      })
    ]
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setFieldError(error);
      state = await addTodo({ text: input.value });
      showToast("To-do added.");
      renderOptions();
    } catch (errorMessage) {
      setFieldError(error, errorMessage.message);
    }
  });

  const clearButton = createElement("button", {
    className: "button button-ghost",
    text: "Clear completed",
    attrs: {
      type: "button",
      disabled: state.todos.every((todo) => !todo.done)
    }
  });
  clearButton.addEventListener("click", async () => {
    state = await clearCompletedTodos();
    showToast("Completed to-dos cleared.");
    renderOptions();
  });

  const list = state.todos.length
    ? createElement("ul", {
        className: "settings-list",
        children: state.todos.map(renderTodoRow)
      })
    : createEmptySettingsState("No to-dos yet.");

  return createSettingsSection("To-dos", "Track tasks locally.", [form, clearButton, list]);
}

function renderTodoRow(todo) {
  const checkboxId = `option-todo-${todo.id}`;
  const checkbox = createElement("input", {
    attrs: {
      id: checkboxId,
      type: "checkbox"
    }
  });
  checkbox.checked = todo.done;

  const remove = createElement("button", {
    className: "button button-small button-danger",
    text: "Delete",
    attrs: { type: "button" }
  });

  checkbox.addEventListener("change", async () => {
    state = await toggleTodo(todo.id, checkbox.checked);
    showToast(checkbox.checked ? "To-do completed." : "To-do reopened.");
    renderOptions();
  });
  remove.addEventListener("click", async () => {
    state = await deleteTodo(todo.id);
    showToast("To-do deleted.");
    renderOptions();
  });

  return createElement("li", {
    className: todo.done ? "settings-row todo-option-row is-done" : "settings-row todo-option-row",
    children: [
      checkbox,
      createElement("label", {
        className: "settings-row-main",
        text: todo.text,
        attrs: { for: checkboxId }
      }),
      remove
    ]
  });
}

function renderDataSection() {
  const exportButton = createElement("button", {
    className: "button button-primary",
    text: "Export JSON",
    attrs: { type: "button" }
  });
  const importInput = createElement("input", {
    className: "sr-only",
    attrs: {
      id: "import-file",
      type: "file",
      accept: "application/json,.json"
    }
  });
  const importButton = createElement("button", {
    className: "button button-ghost",
    text: "Import JSON",
    attrs: { type: "button" }
  });
  const resetButton = createElement("button", {
    className: "button button-danger",
    text: "Reset dashboard",
    attrs: { type: "button" }
  });

  exportButton.addEventListener("click", () => {
    downloadJson(state, `new-tab-dashboard-${new Date().toISOString().slice(0, 10)}.json`);
    showToast("Dashboard data exported.");
  });
  importButton.addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await readFileAsText(file);
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("Import file must be valid JSON.");
      }
      state = await importState(parsed);
      showToast("Dashboard data imported.");
      renderOptions();
    } catch (error) {
      showToast(error.message || "Import failed.", "danger");
    } finally {
      importInput.value = "";
    }
  });
  resetButton.addEventListener("click", async () => {
    if (!confirm("Reset all dashboard settings and content? This cannot be undone.")) {
      return;
    }
    state = await resetState();
    showToast("Dashboard reset.");
    renderOptions();
  });

  return createSettingsSection("Data", "Import, export, or reset local dashboard data.", [
    createElement("div", {
      className: "settings-actions",
      children: [exportButton, importButton, resetButton, importInput]
    })
  ]);
}

async function saveSettings(patch, options = {}) {
  const { rerender = true, message = "Settings saved." } = options;

  try {
    state = await updateSettings(patch);
    applyAppearance(state.settings);
    if (message) {
      showToast(message);
    }
    if (rerender) {
      renderOptions();
    }
    return true;
  } catch (error) {
    showToast(error.message || "Could not save settings.", "danger");
    return false;
  }
}

async function moveWidget(fromIndex, toIndex) {
  state = await setWidgetOrder(moveItem(state.settings.widgetsOrder, fromIndex, toIndex));
  showToast("Widget order saved.");
  renderOptions();
}

function createSettingsSection(title, subtitle, children) {
  return createElement("section", {
    className: "settings-section",
    children: [
      createElement("header", {
        className: "settings-section-header",
        children: [
          createElement("h2", { text: title }),
          createElement("p", { text: subtitle })
        ]
      }),
      createElement("div", {
        className: "settings-section-body",
        children
      })
    ]
  });
}

function createField(labelText, inputId, control, help = null) {
  return createElement("div", {
    className: "field",
    children: [
      createElement("label", {
        text: labelText,
        attrs: { for: inputId }
      }),
      control,
      help
    ]
  });
}

function createSelect(id, values, selectedValue, labels = {}) {
  const select = createElement("select", {
    attrs: { id }
  });

  values.forEach((value) => {
    const option = createElement("option", {
      text: labels[value] || value,
      attrs: { value }
    });
    option.selected = selectedValue === value;
    select.append(option);
  });

  return select;
}

function createEmptySettingsState(message) {
  return createElement("p", {
    className: "settings-empty",
    text: message
  });
}

init();
