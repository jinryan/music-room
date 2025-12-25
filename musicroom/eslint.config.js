import tseslint from "typescript-eslint";

export default [
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/**", "eslint.config.js"],
  },
  {
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
    rules: {
      // opinionated but sane defaults
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
];
