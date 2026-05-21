import { createElement, setFieldError } from "../utils.js";
import { createEmptyState, createErrorMessage, createWidgetShell } from "./shared.js";

export function renderTodosWidget({
  state,
  onAdd,
  onToggle,
  onDelete,
  onClearCompleted,
  onNotify
}) {
  const completedCount = state.todos.filter((todo) => todo.done).length;
  const clearButton = createElement("button", {
    className: "button button-small button-ghost",
    text: "Clear done",
    attrs: {
      type: "button",
      disabled: completedCount === 0
    }
  });
  const { section, body } = createWidgetShell("todos", "To-dos", "", [clearButton]);
  const inputId = "new-todo-text";
  const error = createErrorMessage("todo-error");
  const input = createElement("input", {
    attrs: {
      id: inputId,
      type: "text",
      maxlength: "220",
      autocomplete: "off",
      placeholder: "Add a task",
      "aria-describedby": "todo-error"
    }
  });
  const addButton = createElement("button", {
    className: "button button-primary",
    text: "Add",
    attrs: { type: "submit" }
  });
  const form = createElement("form", {
    className: "todo-form",
    children: [
      createElement("label", {
        className: "sr-only",
        text: "New to-do",
        attrs: { for: inputId }
      }),
      input,
      addButton
    ]
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    addButton.disabled = true;
    try {
      setFieldError(error);
      await onAdd({ text: input.value });
      input.value = "";
      onNotify("To-do added.");
    } catch (errorMessage) {
      setFieldError(error, errorMessage.message);
      input.focus();
    } finally {
      addButton.disabled = false;
    }
  });

  clearButton.addEventListener("click", async () => {
    try {
      await onClearCompleted();
      onNotify("Completed to-dos cleared.");
    } catch (errorMessage) {
      onNotify(errorMessage.message, "danger");
    }
  });

  const list = createElement("ul", {
    className: "todo-list"
  });

  if (!state.todos.length) {
    list.append(
      createElement("li", {
        children: [
          createEmptyState("No to-dos yet", "Add the next useful action and check it off here.")
        ]
      })
    );
  }

  state.todos.forEach((todo) => {
    const checkboxId = `todo-${todo.id}`;
    const checkbox = createElement("input", {
      attrs: {
        id: checkboxId,
        type: "checkbox"
      }
    });
    checkbox.checked = todo.done;

    const deleteButton = createElement("button", {
      className: "icon-button danger",
      text: "Delete",
      attrs: {
        type: "button",
        "aria-label": `Delete ${todo.text}`
      }
    });
    const item = createElement("li", {
      className: todo.done ? "todo-item is-done" : "todo-item",
      children: [
        checkbox,
        createElement("label", {
          text: todo.text,
          attrs: { for: checkboxId }
        }),
        deleteButton
      ]
    });

    checkbox.addEventListener("change", async () => {
      try {
        await onToggle(todo.id, checkbox.checked);
        onNotify(checkbox.checked ? "To-do completed." : "To-do reopened.");
      } catch (errorMessage) {
        checkbox.checked = todo.done;
        onNotify(errorMessage.message, "danger");
      }
    });
    deleteButton.addEventListener("click", async () => {
      try {
        await onDelete(todo.id);
        onNotify("To-do deleted.");
      } catch (errorMessage) {
        onNotify(errorMessage.message, "danger");
      }
    });

    list.append(item);
  });

  body.append(form, error, list);

  return {
    element: section,
    cleanup: () => {}
  };
}
