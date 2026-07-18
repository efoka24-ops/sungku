import { execSync } from "child_process";
import * as path from "path";

// Seed the demo campaigns before the E2E suite so visitor/contributor tests
// have data, regardless of the current DB state.
export default async function globalSetup() {
  const apiDir = path.resolve(__dirname, "..", "..", "api");
  try {
    execSync("npm run seed", { cwd: apiDir, stdio: "inherit" });
  } catch (e) {
    console.warn("global-setup: seed failed (continuing):", (e as Error).message);
  }
}
