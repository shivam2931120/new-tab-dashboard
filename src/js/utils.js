export function createElement(tag, options = {}) {
  const element = document.createElement(tag);

  if (options.className) {
    element.className = options.className;
  }

  if (options.text !== undefined) {
    element.textContent = options.text;
  }

  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      if (value === false || value === null || value === undefined) {
        return;
      }
      if (value === true) {
        element.setAttribute(key, "");
        return;
      }
      element.setAttribute(key, String(value));
    });
  }

  if (options.children) {
    element.append(...options.children.filter(Boolean));
  }

  return element;
}

export function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function generateId() {
  if (globalThis.crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function normalizeText(value, maxLength = 400) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function normalizeUrlInput(value) {
  const raw = normalizeText(value, 2048);
  if (!raw) {
    throw new Error("Enter a URL.");
  }

  const candidate = /^[a-z][a-z\d+\-.]*:/i.test(raw) ? raw : `https://${raw}`;
  let url;

  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  return url.href;
}

export function normalizeImageUrlInput(value) {
  const raw = normalizeText(value, 2048);
  if (!raw) {
    return "";
  }

  const url = new URL(normalizeUrlInput(raw));
  if (url.protocol !== "https:") {
    throw new Error("Background images must use HTTPS.");
  }

  return url.href;
}

export function toHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function getInitial(value) {
  const text = normalizeText(value, 40);
  return text ? text.charAt(0).toUpperCase() : "?";
}

export function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(date);
}

export function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function debounce(callback, delay = 350) {
  let timeoutId;

  const debounced = (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), delay);
  };

  debounced.cancel = () => {
    clearTimeout(timeoutId);
  };

  return debounced;
}

export function showToast(message, tone = "neutral") {
  const toast = document.getElementById("toast");
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add("is-visible");

  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2800);
}

export function setFieldError(errorElement, message = "") {
  if (!errorElement) {
    return;
  }

  errorElement.textContent = message;
  errorElement.hidden = !message;
}

export async function openDefaultSearch(query) {
  const text = normalizeText(query, 600);
  if (!text) {
    throw new Error("Enter a search term.");
  }

  if (globalThis.chrome?.search?.query) {
    const result = chrome.search.query({ text, disposition: "CURRENT_TAB" });
    if (result && typeof result.then === "function") {
      await result;
    }
    return;
  }

  globalThis.location.assign(`https://www.google.com/search?q=${encodeURIComponent(text)}`);
}

export function verifyImageUrl(url, timeoutMs = 6000) {
  if (!url || typeof Image !== "function") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("The background image did not load in time."));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timeoutId);
      image.onload = null;
      image.onerror = null;
    }

    image.onload = () => {
      cleanup();
      resolve();
    };
    image.onerror = () => {
      cleanup();
      reject(new Error("The background image could not be loaded."));
    };
    image.referrerPolicy = "no-referrer";
    image.src = url;
  });
}

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = createElement("a", {
    attrs: {
      href: url,
      download: filename
    }
  });

  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(new Error("Could not read the selected file.")));
    reader.readAsText(file);
  });
}

export function moveItem(array, fromIndex, toIndex) {
  const next = [...array];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function isEditableElement(target) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(target.tagName))
  );
}

export function areJsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
