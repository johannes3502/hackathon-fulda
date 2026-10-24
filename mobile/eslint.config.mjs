import { defineConfig } from "eslint/config";
import expo from "eslint-config-expo/flat.js";
export default defineConfig([
  expo,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@react-navigation/*"],
              message:
                "SDK 57 navigation hooks must come from expo-router/react-navigation to use the correct context.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { __dirname: "readonly" },
    },
  },
  { ignores: ["ios/**", "android/**", "dist/**"] },
]);
