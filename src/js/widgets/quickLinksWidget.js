import {
  createElement,
  getInitial,
  setFieldError,
  toHostname
} from "../utils.js";
import { createEmptyState, createErrorMessage, createWidgetShell } from "./shared.js";

export function renderQuickLinksWidget({ state, onAdd, onUpdate, onDelete, onNotify }) {
  let editingId = null;

  const addButton = createElement("button", {
    className: "button button-small button-ghost",
    text: "Add",
    attrs: { type: "button" }
  });
  const { section, body } = createWidgetShell("quickLinks", "Quick links", "", [addButton]);
  const panel = createElement("div", {
    className: "inline-panel",
    attrs: { hidden: true }
  });
  const formTitleId = "quick-link-title";
  const formUrlId = "quick-link-url";
  const titleInput = createElement("input", {
    attrs: {
      id: formTitleId,
      type: "text",
      maxlength: "80",
      autocomplete: "off",
      required: true
    }
  });
  const urlInput = createElement("input", {
    attrs: {
      id: formUrlId,
      type: "text",
      inputmode: "url",
      autocomplete: "url",
      required: true,
      placeholder: "https://example.com"
    }
  });
  const error = createErrorMessage("quick-link-error");
  const submitButton = createElement("button", {
    className: "button button-primary",
    text: "Save link",
    attrs: { type: "submit" }
  });
  const cancelButton = createElement("button", {
    className: "button button-ghost",
    text: "Cancel",
    attrs: { type: "button" }
  });
  const form = createElement("form", {
    className: "stacked-form",
    children: [
      createElement("label", {
        text: "Title",
        attrs: { for: formTitleId }
      }),
      titleInput,
      createElement("label", {
        text: "URL",
        attrs: { for: formUrlId }
      }),
      urlInput,
      error,
      createElement("div", {
        className: "button-row",
        children: [submitButton, cancelButton]
      })
    ]
  });
  panel.append(form);

  function openForm(link = null) {
    editingId = link?.id || null;
    titleInput.value = link?.title || "";
    urlInput.value = link?.url || "";
    submitButton.textContent = editingId ? "Update link" : "Save link";
    setFieldError(error);
    panel.hidden = false;
    titleInput.focus();
  }

  function closeForm() {
    editingId = null;
    form.reset();
    panel.hidden = true;
    setFieldError(error);
  }

  addButton.addEventListener("click", () => openForm());
  cancelButton.addEventListener("click", closeForm);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    try {
      const payload = {
        title: titleInput.value,
        url: urlInput.value
      };
      if (editingId) {
        await onUpdate(editingId, payload);
        onNotify("Quick link updated.");
      } else {
        await onAdd(payload);
        onNotify("Quick link added.");
      }
      closeForm();
    } catch (errorMessage) {
      setFieldError(error, errorMessage.message);
    } finally {
      submitButton.disabled = false;
    }
  });

  const list = createElement("div", {
    className: "quick-link-grid"
  });

  if (!state.quickLinks.length) {
    list.append(
      createEmptyState(
        "No quick links yet",
        "Add links you open often and they will stay pinned here."
      )
    );
  }

  state.quickLinks.forEach((link) => {
    const editButton = createElement("button", {
      className: "icon-button",
      text: "Edit",
      attrs: {
        type: "button",
        "aria-label": `Edit ${link.title}`
      }
    });
    const deleteButton = createElement("button", {
      className: "icon-button danger",
      text: "Delete",
      attrs: {
        type: "button",
        "aria-label": `Delete ${link.title}`
      }
    });
    const linkCard = createElement("article", {
      className: "quick-link-card",
      children: [
        createElement("a", {
          className: "quick-link-anchor",
          attrs: {
            href: link.url
          },
          children: [
            createElement("span", {
              className: "quick-link-icon",
              text: getInitial(link.title)
            }),
            createElement("span", {
              className: "quick-link-copy",
              children: [
                createElement("strong", {
                  text: link.title
                }),
                createElement("small", {
                  text: toHostname(link.url)
                })
              ]
            })
          ]
        }),
        createElement("div", {
          className: "card-actions",
          children: [editButton, deleteButton]
        })
      ]
    });

    editButton.addEventListener("click", () => openForm(link));
    deleteButton.addEventListener("click", async () => {
      try {
        await onDelete(link.id);
        onNotify("Quick link deleted.");
      } catch (errorMessage) {
        onNotify(errorMessage.message, "danger");
      }
    });

    list.append(linkCard);
  });

  body.append(panel, list);

  return {
    element: section,
    cleanup: () => {}
  };
}
