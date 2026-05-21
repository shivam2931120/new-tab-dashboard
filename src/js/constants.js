export const STORAGE_KEY = "newTabDashboardData";
export const STORAGE_VERSION = 1;

export const WIDGETS = [
  { id: "clock", label: "Clock", description: "Current time and date" },
  { id: "search", label: "Search", description: "Default search engine launcher" },
  { id: "quickLinks", label: "Quick links", description: "Pinned shortcuts" },
  { id: "notes", label: "Sticky notes", description: "Local notes" },
  { id: "todos", label: "To-dos", description: "Action list" }
];

export const WIDGET_VISIBILITY_KEYS = {
  clock: "showClock",
  search: "showSearch",
  quickLinks: "showQuickLinks",
  notes: "showNotes",
  todos: "showTodos"
};

export const DEFAULT_SETTINGS = {
  theme: "system",
  layout: "comfortable",
  backgroundMode: "gradient",
  backgroundColor: "#f7f3ea",
  backgroundGradient: "clearMorning",
  backgroundImageUrl: "",
  widgetsOrder: WIDGETS.map((widget) => widget.id),
  showClock: true,
  showSearch: true,
  showQuickLinks: true,
  showNotes: true,
  showTodos: true
};

export const DEFAULT_STATE = {
  version: STORAGE_VERSION,
  settings: DEFAULT_SETTINGS,
  quickLinks: [],
  notes: [],
  todos: []
};

export const THEMES = ["light", "dark", "system"];
export const LAYOUTS = ["comfortable", "compact"];
export const BACKGROUND_MODES = ["solid", "gradient", "image"];

export const BACKGROUND_GRADIENTS = {
  clearMorning:
    "radial-gradient(circle at top left, rgba(57, 196, 174, 0.30), transparent 34%), radial-gradient(circle at top right, rgba(245, 180, 82, 0.26), transparent 30%), linear-gradient(135deg, #fbfaf6 0%, #e9f4ef 42%, #f7ead6 100%)",
  paperDesk:
    "radial-gradient(circle at 20% 15%, rgba(110, 188, 148, 0.24), transparent 28%), radial-gradient(circle at 90% 10%, rgba(218, 145, 86, 0.20), transparent 24%), linear-gradient(135deg, #f7f1e7 0%, #edf1e8 52%, #efe8dc 100%)",
  duskFocus:
    "radial-gradient(circle at top left, rgba(65, 214, 195, 0.22), transparent 30%), radial-gradient(circle at bottom right, rgba(234, 150, 82, 0.20), transparent 34%), linear-gradient(135deg, #151513 0%, #20201f 48%, #2a211c 100%)",
  grove:
    "radial-gradient(circle at 85% 10%, rgba(234, 185, 94, 0.26), transparent 26%), radial-gradient(circle at 15% 15%, rgba(69, 179, 148, 0.28), transparent 30%), linear-gradient(135deg, #eef5ec 0%, #dfe8d7 48%, #f4ead7 100%)"
};
