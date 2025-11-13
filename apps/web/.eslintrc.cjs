const hasNextPlugin = (() => {
  try {
    require.resolve("@next/eslint-plugin-next");
    return true;
  } catch {
    return false;
  }
})();

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module"
  },
  plugins: [
    ...(hasNextPlugin ? ["@next/next"] : []),
    "@typescript-eslint",
    "import"
  ],
  extends: [
    ...(hasNextPlugin ? ["plugin:@next/next/core-web-vitals"] : []),
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier"
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
    ],
    "import/order": [
      "error",
      {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index", "object", "type"],
        pathGroups: [
          {
            pattern: "react",
            group: "external",
            position: "before"
          }
        ],
        pathGroupsExcludedImportTypes: ["react"],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true }
      }
    ],
    "import/no-unresolved": "off",
    "max-lines-per-file": ["warn", { max: 400, skipBlankLines: true, skipComments: true }]
  }
};
