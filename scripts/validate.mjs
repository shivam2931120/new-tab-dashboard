import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "manifest.json",
  "pages/newtab.html",
  "pages/options.html",
  "src/css/styles.css",
  "src/js/constants.js",
  "src/js/storage.js",
  "src/js/theme.js",
  "src/js/utils.js",
  "src/js/newtab.js",
  "src/js/options.js"
];

for (const file of requiredFiles) {
  assert(existsSync(path.join(root, file)), `Missing required file: ${file}`);
}

const manifest = JSON.parse(await fs.readFile(path.join(root, "manifest.json"), "utf8"));
assert(manifest.manifest_version === 3, "Manifest must use version 3.");
assert(manifest.chrome_url_overrides?.newtab === "pages/newtab.html", "Manifest must override the new tab page.");
assert(manifest.options_page === "pages/options.html", "Manifest must declare the options page.");
assert(Array.isArray(manifest.permissions), "Manifest permissions must be an array.");
assert(manifest.permissions.includes("storage"), "Manifest must include storage permission.");
assert(manifest.permissions.includes("search"), "Manifest must include search permission.");

await validateHtmlReferences("pages/newtab.html");
await validateHtmlReferences("pages/options.html");
await validateModuleGraph("src/js/newtab.js", new Set());
await validateModuleGraph("src/js/options.js", new Set());

const jsFiles = await listFiles(path.join(root, "src/js"), ".js");
for (const file of jsFiles) {
  runNodeCheck(file);
}

console.log("Validation passed.");

async function validateHtmlReferences(relativeFile) {
  const absoluteFile = path.join(root, relativeFile);
  const html = await fs.readFile(absoluteFile, "utf8");
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);

  for (const ref of refs) {
    if (ref.startsWith("#") || ref.startsWith("http") || ref === "./newtab.html" || ref === "./options.html") {
      continue;
    }

    const resolved = path.normalize(path.join(path.dirname(absoluteFile), ref));
    assert(existsSync(resolved), `${relativeFile} references missing file: ${ref}`);
  }
}

async function validateModuleGraph(relativeFile, visited) {
  const absoluteFile = path.join(root, relativeFile);
  if (visited.has(absoluteFile)) {
    return;
  }
  visited.add(absoluteFile);

  const source = await fs.readFile(absoluteFile, "utf8");
  const imports = [...source.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]);

  for (const specifier of imports) {
    if (!specifier.startsWith(".")) {
      continue;
    }

    const resolved = path.normalize(path.join(path.dirname(absoluteFile), specifier));
    assert(existsSync(resolved), `${relativeFile} imports missing module: ${specifier}`);
    await validateModuleGraph(path.relative(root, resolved), visited);
  }
}

async function listFiles(directory, extension) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return listFiles(absolutePath, extension);
      }
      return absolutePath.endsWith(extension) ? [absolutePath] : [];
    })
  );

  return files.flat();
}

function runNodeCheck(file) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: root,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    throw new Error(`Syntax check failed for ${path.relative(root, file)}\n${result.stderr || result.stdout}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
