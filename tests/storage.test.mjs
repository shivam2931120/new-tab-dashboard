import assert from "node:assert/strict";
import {
  addQuickLink,
  addTodo,
  importState,
  loadState,
  normalizeState,
  resetState,
  updateSettings
} from "../src/js/storage.js";
import { normalizeImageUrlInput, normalizeUrlInput, openDefaultSearch } from "../src/js/utils.js";

const memoryStorage = new Map();

globalThis.localStorage = {
  getItem(key) {
    return memoryStorage.get(key) ?? null;
  },
  setItem(key, value) {
    memoryStorage.set(key, String(value));
  },
  removeItem(key) {
    memoryStorage.delete(key);
  }
};

await test("normalizeState fills safe defaults", () => {
  const state = normalizeState(null);
  assert.equal(state.version, 1);
  assert.equal(state.settings.theme, "system");
  assert.deepEqual(state.settings.widgetsOrder, ["clock", "search", "quickLinks", "notes", "todos"]);
  assert.deepEqual(state.quickLinks, []);
});

await test("URL normalization accepts hostnames and rejects unsafe schemes", () => {
  assert.equal(normalizeUrlInput("example.com"), "https://example.com/");
  assert.throws(() => normalizeUrlInput("javascript:alert(1)"), /Only http and https/);
  assert.throws(() => normalizeImageUrlInput("http://example.com/bg.jpg"), /HTTPS/);
});

await test("importState rejects unrelated JSON", async () => {
  await assert.rejects(() => importState({ hello: "world" }), /dashboard data/);
});

await test("storage actions persist normalized data", async () => {
  memoryStorage.clear();
  await resetState();
  await addQuickLink({ title: "Example", url: "example.com" });
  await addTodo({ text: "Review dashboard" });
  const state = await loadState();

  assert.equal(state.quickLinks.length, 1);
  assert.equal(state.quickLinks[0].url, "https://example.com/");
  assert.equal(state.todos.length, 1);
  assert.equal(state.todos[0].done, false);
});

await test("queued writes do not overwrite rapid updates", async () => {
  memoryStorage.clear();
  await resetState();
  await Promise.all([
    addTodo({ text: "One" }),
    addTodo({ text: "Two" }),
    updateSettings({ theme: "dark" })
  ]);

  const state = await loadState();
  assert.equal(state.todos.length, 2);
  assert.equal(state.settings.theme, "dark");
});

await test("search uses Firefox browser.search when Chrome query is unavailable", async () => {
  let searched = null;
  globalThis.chrome = {};
  globalThis.browser = {
    search: {
      async search(payload) {
        searched = payload;
      }
    }
  };

  await openDefaultSearch("dashboard");
  assert.deepEqual(searched, {
    query: "dashboard",
    disposition: "CURRENT_TAB"
  });
  delete globalThis.chrome;
  delete globalThis.browser;
});

console.log("Tests passed.");

async function test(name, run) {
  try {
    await run();
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}
