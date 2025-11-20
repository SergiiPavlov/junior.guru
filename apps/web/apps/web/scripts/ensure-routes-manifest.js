const fs = require("node:fs");
const path = require("node:path");

const manifestPath = path.join(__dirname, "..", ".next", "routes-manifest.json");
const baseDir = path.dirname(manifestPath);

const defaultManifest = {
  version: 5,
  pages404: true,
  basePath: "",
  redirects: [],
  rewrites: {
    beforeFiles: [],
    afterFiles: [],
    fallback: []
  },
  headers: [],
  dynamicRoutes: [],
  staticRoutes: [],
  dataRoutes: [],
  rscRoutes: [],
  i18n: null
};

if (!fs.existsSync(manifestPath)) {
  fs.mkdirSync(baseDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(defaultManifest, null, 2));
  console.log("Created stub .next/routes-manifest.json");
}
