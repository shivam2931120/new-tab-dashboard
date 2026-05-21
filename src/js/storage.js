import {
  BACKGROUND_GRADIENTS,
  BACKGROUND_MODES,
  DEFAULT_SETTINGS,
  DEFAULT_STATE,
  LAYOUTS,
  STORAGE_KEY,
  STORAGE_VERSION,
  THEMES,
  WIDGET_VISIBILITY_KEYS,
  WIDGETS
} from "./constants.js";
import {
  generateId,
  normalizeImageUrlInput,
  normalizeText,
  normalizeUrlInput,
  nowIso
} from "./utils.js";

const fallbackKey = `fallback:${STORAGE_KEY}`;
let writeQueue = Promise.resolve();

function hasChromeStorage() {
  return Boolean(globalThis.chrome?.storage?.local);
}

function getFromChrome(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (result) => {
      const error = chrome.runtime?.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(result);
    });
  });
}

function setInChrome(value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(value, () => {
      const error = chrome.runtime?.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}

async function readRawState() {
  if (hasChromeStorage()) {
    const result = await getFromChrome(STORAGE_KEY);
    return result[STORAGE_KEY];
  }

  const raw = globalThis.localStorage?.getItem(fallbackKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeRawState(state) {
  if (hasChromeStorage()) {
    await setInChrome({ [STORAGE_KEY]: state });
    return;
  }

  globalThis.localStorage?.setItem(fallbackKey, JSON.stringify(state));
}

export async function loadState() {
  const rawState = await readRawState();
  const normalized = normalizeState(rawState);

  if (!rawState || JSON.stringify(rawState) !== JSON.stringify(normalized)) {
    await writeRawState(normalized);
  }

  return normalized;
}

export async function saveState(state) {
  return enqueueWrite(() => persistState(state));
}

async function persistState(state) {
  const normalized = normalizeState(state);
  await writeRawState(normalized);
  return normalized;
}

export async function updateState(updater) {
  return enqueueWrite(async () => {
    const current = normalizeState(await readRawState());
    const draft =
      typeof structuredClone === "function"
        ? structuredClone(current)
        : JSON.parse(JSON.stringify(current));
    const result = await updater(draft);
    return persistState(result || draft);
  });
}

function enqueueWrite(task) {
  const operation = writeQueue.then(task, task);
  writeQueue = operation.catch(() => {});
  return operation;
}

export async function updateSettings(patch) {
  return updateState((state) => {
    state.settings = normalizeSettings({
      ...state.settings,
      ...patch
    });
    return state;
  });
}

export async function setWidgetVisibility(widgetId, visible) {
  const key = WIDGET_VISIBILITY_KEYS[widgetId];
  if (!key) {
    throw new Error("Unknown widget.");
  }
  return updateSettings({ [key]: Boolean(visible) });
}

export async function setWidgetOrder(order) {
  return updateSettings({ widgetsOrder: order });
}

export async function addQuickLink(input) {
  const title = normalizeText(input.title, 80);
  if (!title) {
    throw new Error("Enter a link title.");
  }

  const url = normalizeUrlInput(input.url);
  const createdAt = nowIso();

  return updateState((state) => {
    state.quickLinks.push({
      id: generateId(),
      title,
      url,
      icon: null,
      createdAt
    });
    return state;
  });
}

export async function updateQuickLink(id, input) {
  const title = normalizeText(input.title, 80);
  if (!title) {
    throw new Error("Enter a link title.");
  }

  const url = normalizeUrlInput(input.url);

  return updateState((state) => {
    const link = state.quickLinks.find((item) => item.id === id);
    if (!link) {
      throw new Error("Quick link not found.");
    }
    link.title = title;
    link.url = url;
    return state;
  });
}

export async function deleteQuickLink(id) {
  return updateState((state) => {
    state.quickLinks = state.quickLinks.filter((link) => link.id !== id);
    return state;
  });
}

export async function addNote(input) {
  const text = normalizeText(input.text, 4000);
  if (!text) {
    throw new Error("Enter note text.");
  }

  const createdAt = nowIso();

  return updateState((state) => {
    state.notes.unshift({
      id: generateId(),
      text,
      createdAt,
      updatedAt: createdAt
    });
    return state;
  });
}

export async function updateNote(id, input) {
  const text = normalizeText(input.text, 4000);
  if (!text) {
    throw new Error("Note cannot be empty.");
  }

  return updateState((state) => {
    const note = state.notes.find((item) => item.id === id);
    if (!note) {
      throw new Error("Note not found.");
    }
    note.text = text;
    note.updatedAt = nowIso();
    return state;
  });
}

export async function deleteNote(id) {
  return updateState((state) => {
    state.notes = state.notes.filter((note) => note.id !== id);
    return state;
  });
}

export async function addTodo(input) {
  const text = normalizeText(input.text, 220);
  if (!text) {
    throw new Error("Enter a to-do.");
  }

  return updateState((state) => {
    state.todos.unshift({
      id: generateId(),
      text,
      done: false,
      createdAt: nowIso()
    });
    return state;
  });
}

export async function toggleTodo(id, done) {
  return updateState((state) => {
    const todo = state.todos.find((item) => item.id === id);
    if (!todo) {
      throw new Error("To-do not found.");
    }
    todo.done = Boolean(done);
    return state;
  });
}

export async function deleteTodo(id) {
  return updateState((state) => {
    state.todos = state.todos.filter((todo) => todo.id !== id);
    return state;
  });
}

export async function clearCompletedTodos() {
  return updateState((state) => {
    state.todos = state.todos.filter((todo) => !todo.done);
    return state;
  });
}

export async function importState(input) {
  const candidate = input?.settings ? input : input?.[STORAGE_KEY] || input?.data;
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Import file does not contain dashboard data.");
  }

  const hasDashboardData =
    "settings" in candidate || "quickLinks" in candidate || "notes" in candidate || "todos" in candidate;
  if (!hasDashboardData) {
    throw new Error("Import file does not contain dashboard data.");
  }

  const normalized = normalizeState(candidate);
  return saveState(normalized);
}

export async function resetState() {
  return saveState(DEFAULT_STATE);
}

export function subscribeToState(callback) {
  if (!globalThis.chrome?.storage?.onChanged) {
    return () => {};
  }

  const listener = (changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) {
      return;
    }
    callback(normalizeState(changes[STORAGE_KEY].newValue));
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

export function normalizeState(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  return {
    version: STORAGE_VERSION,
    settings: normalizeSettings(source.settings || source.dashboardSettings || {}),
    quickLinks: normalizeQuickLinks(source.quickLinks),
    notes: normalizeNotes(source.notes),
    todos: normalizeTodos(source.todos)
  };
}

export function normalizeSettings(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const settings = {
    ...DEFAULT_SETTINGS,
    ...source
  };

  settings.theme = THEMES.includes(settings.theme) ? settings.theme : DEFAULT_SETTINGS.theme;
  settings.layout = LAYOUTS.includes(settings.layout) ? settings.layout : DEFAULT_SETTINGS.layout;
  settings.backgroundMode = BACKGROUND_MODES.includes(settings.backgroundMode)
    ? settings.backgroundMode
    : DEFAULT_SETTINGS.backgroundMode;
  settings.backgroundColor = /^#[0-9a-f]{6}$/i.test(settings.backgroundColor)
    ? settings.backgroundColor
    : DEFAULT_SETTINGS.backgroundColor;
  settings.backgroundGradient = BACKGROUND_GRADIENTS[settings.backgroundGradient]
    ? settings.backgroundGradient
    : DEFAULT_SETTINGS.backgroundGradient;

  try {
    settings.backgroundImageUrl = normalizeImageUrlInput(settings.backgroundImageUrl);
  } catch {
    settings.backgroundImageUrl = "";
  }

  settings.widgetsOrder = normalizeWidgetOrder(settings.widgetsOrder);
  Object.values(WIDGET_VISIBILITY_KEYS).forEach((key) => {
    settings[key] = typeof settings[key] === "boolean" ? settings[key] : DEFAULT_SETTINGS[key];
  });

  return settings;
}

export function normalizeWidgetOrder(order) {
  const knownIds = WIDGETS.map((widget) => widget.id);
  const uniqueIds = [];

  if (Array.isArray(order)) {
    order.forEach((id) => {
      if (knownIds.includes(id) && !uniqueIds.includes(id)) {
        uniqueIds.push(id);
      }
    });
  }

  knownIds.forEach((id) => {
    if (!uniqueIds.includes(id)) {
      uniqueIds.push(id);
    }
  });

  return uniqueIds;
}

export function isWidgetVisible(settings, widgetId) {
  const key = WIDGET_VISIBILITY_KEYS[widgetId];
  return key ? settings[key] !== false : false;
}

function normalizeQuickLinks(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      try {
        const title = normalizeText(item.title, 80);
        const url = normalizeUrlInput(item.url);
        if (!title || !url) {
          return null;
        }

        return {
          id: normalizeText(item.id, 80) || generateId(),
          title,
          url,
          icon: item.icon ? normalizeText(item.icon, 120) : null,
          createdAt: normalizeDate(item.createdAt)
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function normalizeNotes(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      const text = normalizeText(item.text, 4000);
      if (!text) {
        return null;
      }

      const createdAt = normalizeDate(item.createdAt);
      return {
        id: normalizeText(item.id, 80) || generateId(),
        text,
        createdAt,
        updatedAt: normalizeDate(item.updatedAt || createdAt)
      };
    })
    .filter(Boolean);
}

function normalizeTodos(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      const text = normalizeText(item.text, 220);
      if (!text) {
        return null;
      }

      return {
        id: normalizeText(item.id, 80) || generateId(),
        text,
        done: Boolean(item.done),
        createdAt: normalizeDate(item.createdAt)
      };
    })
    .filter(Boolean);
}

function normalizeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? nowIso() : date.toISOString();
}
