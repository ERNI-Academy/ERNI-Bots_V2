import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // eslint-plugin-react-hooks v7 (bundled with eslint-config-next 16.4) flags the
      // fetch-on-mount pattern `useEffect(() => { load(); }, [load])` because load()
      // sets loading state synchronously. Kept as a warning (not an error) until the
      // data fetching is migrated to a data library / Suspense; fixing it per-page
      // would change loading behavior.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Deployment bundles / generated output (not source)
    "deploy/**",
    "test-deploy/**",
  ]),
]);

export default eslintConfig;
