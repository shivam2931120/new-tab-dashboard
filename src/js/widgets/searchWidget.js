import { createElement, openDefaultSearch, setFieldError } from "../utils.js";
import { createErrorMessage, createWidgetShell } from "./shared.js";

export function renderSearchWidget() {
  const { section, body } = createWidgetShell(
    "search",
    "Search",
    "Use your browser default search engine"
  );
  const inputId = "dashboard-search";
  const error = createErrorMessage("search-error");
  const input = createElement("input", {
    className: "search-input",
    attrs: {
      id: inputId,
      type: "search",
      name: "q",
      placeholder: "Search the web",
      autocomplete: "off",
      spellcheck: "false",
      "aria-describedby": "search-error",
      "aria-keyshortcuts": "/ Control+K"
    }
  });

  const form = createElement("form", {
    className: "search-form",
    children: [
      createElement("label", {
        className: "sr-only",
        text: "Search query",
        attrs: { for: inputId }
      }),
      input,
      createElement("button", {
        className: "button button-primary search-submit",
        text: "Search",
        attrs: { type: "submit" }
      })
    ]
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setFieldError(error);
      await openDefaultSearch(input.value);
    } catch (errorMessage) {
      setFieldError(error, errorMessage.message);
      input.focus();
    }
  });

  body.append(form, error);

  return {
    element: section,
    searchInput: input,
    cleanup: () => {}
  };
}
