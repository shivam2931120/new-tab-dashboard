import { createElement } from "../utils.js";

export function createWidgetShell(id, title, subtitle = "", actions = []) {
  const headingId = `${id}-heading`;
  const body = createElement("div", {
    className: "widget-body"
  });
  const actionBar = createElement("div", {
    className: "widget-actions",
    children: actions
  });

  const header = createElement("header", {
    className: "widget-header",
    children: [
      createElement("div", {
        children: [
          createElement("h2", {
            text: title,
            attrs: {
              id: headingId
            }
          }),
          subtitle
            ? createElement("p", {
                className: "widget-subtitle",
                text: subtitle
              })
            : null
        ]
      }),
      actionBar
    ]
  });

  const section = createElement("section", {
    className: `widget widget-${id}`,
    attrs: {
      "data-widget": id,
      "aria-labelledby": headingId
    },
    children: [header, body]
  });

  return { section, body, actionBar };
}

export function createEmptyState(title, detail) {
  return createElement("div", {
    className: "empty-state",
    children: [
      createElement("strong", {
        text: title
      }),
      createElement("p", {
        text: detail
      })
    ]
  });
}

export function createErrorMessage(id) {
  return createElement("p", {
    className: "field-error",
    attrs: {
      id,
      hidden: true
    }
  });
}
