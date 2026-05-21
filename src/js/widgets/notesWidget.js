import {
  createElement,
  debounce,
  formatDateTime,
  setFieldError
} from "../utils.js";
import { createEmptyState, createErrorMessage, createWidgetShell } from "./shared.js";

export function renderNotesWidget({ state, onAdd, onUpdate, onDelete, onNotify }) {
  const { section, body } = createWidgetShell("notes", "Sticky notes");
  const cleanupCallbacks = [];
  const noteInputId = "new-note-text";
  const error = createErrorMessage("note-error");
  const textarea = createElement("textarea", {
    className: "note-input",
    attrs: {
      id: noteInputId,
      rows: "3",
      maxlength: "4000",
      placeholder: "Write a note",
      "aria-describedby": "note-error"
    }
  });
  const addButton = createElement("button", {
    className: "button button-primary",
    text: "Add note",
    attrs: { type: "submit" }
  });
  const form = createElement("form", {
    className: "note-form",
    children: [
      createElement("label", {
        className: "sr-only",
        text: "New note",
        attrs: { for: noteInputId }
      }),
      textarea,
      error,
      createElement("div", {
        className: "button-row",
        children: [addButton]
      })
    ]
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    addButton.disabled = true;
    try {
      setFieldError(error);
      await onAdd({ text: textarea.value });
      textarea.value = "";
      onNotify("Note added.");
    } catch (errorMessage) {
      setFieldError(error, errorMessage.message);
      textarea.focus();
    } finally {
      addButton.disabled = false;
    }
  });

  const list = createElement("div", {
    className: "note-list"
  });

  if (!state.notes.length) {
    list.append(
      createEmptyState("No notes yet", "Capture thoughts, reminders, or context you need later.")
    );
  }

  state.notes.forEach((note) => {
    const noteError = createErrorMessage(`note-${note.id}-error`);
    const status = createElement("span", {
      className: "save-status",
      text: `Updated ${formatDateTime(note.updatedAt)}`
    });
    const noteTextarea = createElement("textarea", {
      className: "note-card-text",
      text: note.text,
      attrs: {
        rows: "5",
        maxlength: "4000",
        "aria-label": "Edit note",
        "aria-describedby": `note-${note.id}-error`
      }
    });
    const deleteButton = createElement("button", {
      className: "button button-small button-danger",
      text: "Delete",
      attrs: { type: "button" }
    });
    const saveNote = debounce(async () => {
      const text = noteTextarea.value.trim();
      if (!text) {
        setFieldError(noteError, "Note cannot be empty.");
        status.textContent = "Not saved";
        return;
      }

      try {
        setFieldError(noteError);
        await onUpdate(note.id, { text });
        status.textContent = "Saved";
      } catch (errorMessage) {
        setFieldError(noteError, errorMessage.message);
        status.textContent = "Not saved";
      }
    }, 450);

    noteTextarea.addEventListener("input", () => {
      status.textContent = "Saving...";
      saveNote();
    });
    deleteButton.addEventListener("click", async () => {
      saveNote.cancel();
      try {
        await onDelete(note.id);
        onNotify("Note deleted.");
      } catch (errorMessage) {
        onNotify(errorMessage.message, "danger");
      }
    });
    cleanupCallbacks.push(saveNote.cancel);

    list.append(
      createElement("article", {
        className: "note-card",
        children: [
          noteTextarea,
          noteError,
          createElement("footer", {
            className: "note-meta",
            children: [status, deleteButton]
          })
        ]
      })
    );
  });

  body.append(form, list);

  return {
    element: section,
    cleanup: () => cleanupCallbacks.forEach((cleanup) => cleanup())
  };
}
