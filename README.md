# New Tab Dashboard

A Manifest V3 browser extension that replaces the default new tab page with a fast, local-only productivity dashboard built with vanilla JavaScript, HTML, and CSS.

## Features

- Custom new tab override
- Default search engine search via `chrome.search`
- Current time and date
- Add, edit, and delete quick links
- Add, edit, autosave, and delete sticky notes
- Add, complete, delete, and clear completed to-dos
- Light, dark, and system theme modes
- Comfortable and compact layout density
- Solid, gradient, and HTTPS custom image backgrounds
- Widget enable/disable controls and widget ordering
- Options page for dashboard content and customization
- Import/export of all local dashboard data as JSON
- Keyboard-friendly controls, validation, empty states, and accessible labels
- Local persistence using `chrome.storage.local`

## File Structure

```text
.
├── manifest.json
├── README.md
├── PRD-TRD.txt
├── amo-metadata.json
├── package-lock.json
├── package.json
├── assets
│   └── icon.svg
├── pages
│   ├── newtab.html
│   └── options.html
├── scripts
│   └── validate.mjs
├── src
│   ├── css
│   │   └── styles.css
│   └── js
│       ├── constants.js
│       ├── newtab.js
│       ├── options.js
│       ├── storage.js
│       ├── theme.js
│       ├── utils.js
│       └── widgets
│           ├── clockWidget.js
│           ├── notesWidget.js
│           ├── quickLinksWidget.js
│           ├── searchWidget.js
│           ├── shared.js
│           └── todosWidget.js
└── tests
    └── storage.test.mjs
```

## Installation

1. Open Chrome or another Chromium-based browser.
2. Go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select this project folder: `New Tab Dashboard`.
6. Open a new tab.

## Options

Open the extension options page from the dashboard **Options** button, or from `chrome://extensions` by selecting **Details** then **Extension options**.

The options page manages:

- Theme, layout density, and background
- Widget visibility and order
- Quick links
- Sticky notes
- To-dos
- JSON import/export
- Full local reset

## Permissions

This extension requests only:

- `storage`: saves dashboard settings and content locally with `chrome.storage.local`
- `search`: submits dashboard searches to the browser default search engine

There is no backend, login, analytics, tracking, or external API dependency.

## Firefox Add-ons

This project is prepared for Mozilla Add-ons with:

- A Firefox extension ID in `browser_specific_settings.gecko.id`
- `data_collection_permissions.required: ["none"]`
- AMO listing metadata in `amo-metadata.json`
- Development scripts for `web-ext`

Run:

```bash
npm run firefox:lint
npm run firefox:build
```

The build artifact is written to `web-ext-artifacts/`. To publish directly to AMO with `web-ext`, set `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` from the AMO credentials page, then run:

```bash
npm run firefox:sign
```

## Data Model

All extension data is stored under one local key named `newTabDashboardData`:

```json
{
  "version": 1,
  "settings": {
    "theme": "system",
    "layout": "comfortable",
    "backgroundMode": "gradient",
    "backgroundColor": "#f7f3ea",
    "backgroundGradient": "clearMorning",
    "backgroundImageUrl": "",
    "widgetsOrder": ["clock", "search", "quickLinks", "notes", "todos"],
    "showClock": true,
    "showSearch": true,
    "showQuickLinks": true,
    "showNotes": true,
    "showTodos": true
  },
  "quickLinks": [],
  "notes": [],
  "todos": []
}
```

## Development Notes

- The code uses ES modules and no build step.
- The UI and storage layers are separated.
- Widgets are modular renderers under `src/js/widgets`.
- There is no production mock data; new installs start empty and show clean empty states.
- Run `npm run check` for manifest/reference/syntax validation.
- Run `npm test` for storage and data-normalization tests.
