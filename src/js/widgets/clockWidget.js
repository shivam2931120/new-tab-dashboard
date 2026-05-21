import { formatDate, formatTime } from "../utils.js";
import { createWidgetShell } from "./shared.js";

export function renderClockWidget() {
  const { section, body } = createWidgetShell("clock", "Now");
  const time = document.createElement("time");
  const date = document.createElement("p");

  time.className = "clock-time";
  date.className = "clock-date";

  body.classList.add("clock-body");
  body.append(time, date);

  function updateClock() {
    const current = new Date();
    time.dateTime = current.toISOString();
    time.textContent = formatTime(current);
    date.textContent = formatDate(current);
  }

  updateClock();
  const intervalId = setInterval(updateClock, 1000);

  return {
    element: section,
    cleanup: () => clearInterval(intervalId)
  };
}
