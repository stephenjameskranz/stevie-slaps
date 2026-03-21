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
        require: "readonly",
        module: "readonly",
        process: "readonly",
        console: "readonly",
        fetch: "readonly",
        __dirname: "readonly",
      },
    },
  },
];
