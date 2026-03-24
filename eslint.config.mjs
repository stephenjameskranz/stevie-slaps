import globals from "globals";

export default [
  {
    files: ["build.js", "ci-test.js"],
    rules: {
      "no-undef": "error",
      "no-unused-vars": "warn",
      "no-unreachable": "error",
      "eqeqeq": "warn",
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        fetch: "readonly",
      },
    },
  },
  {
    files: ["app.js"],
    rules: {
      "no-undef": "error",
      "no-unused-vars": "warn",
      "no-unreachable": "error",
      "eqeqeq": "warn",
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        slapData: "readonly",
        fieldStats: "readonly",
      },
    },
  },
];
