import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { backendSelection } from "./resolve-releases.mjs";

export function productionDeployArguments(argv) {
  if (argv.length !== 1) {
    throw new Error(
      "usage: npm run deploy:production -- backend-YYYY-MM-DD.N",
    );
  }
  const { tag } = backendSelection({ BACKEND_RELEASE_TAG: argv[0] });
  return [
    "deploy",
    "--prod",
    "--yes",
    "--build-env",
    `DEPLOY_BACKEND_RELEASE_TAG=${tag}`,
  ];
}

export async function deployProduction({
  argv = process.argv.slice(2),
  spawnImpl = spawn,
} = {}) {
  const child = spawnImpl("vercel", productionDeployArguments(argv), {
    stdio: "inherit",
  });
  await new Promise((resolvePromise, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolvePromise();
      else {
        reject(
          new Error(
            signal
              ? `Vercel deployment stopped by signal ${signal}`
              : `Vercel deployment failed with exit code ${code}`,
          ),
        );
      }
    });
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  deployProduction().catch((error) => {
    console.error(`[deploy:production] ${error.message}`);
    process.exitCode = 1;
  });
}
