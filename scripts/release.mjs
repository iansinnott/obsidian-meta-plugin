#!/usr/bin/env node
/**
 * Automates the release process for the plugin.
 * - Prompts the user for the new version number (defaults to next patch).
 * - Updates the version in `package.json`.
 * - Runs the build, version, tag, and dist scripts in sequence.
 */
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import readline from "readline/promises";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function runCommand(command) {
  console.log(`\\nRunning: ${command}`);
  try {
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    console.error(`\\nError executing command: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

async function main() {
  const packageJsonPath = path.resolve(process.cwd(), "package.json");
  let packageJsonContent;
  let currentVersion;

  try {
    packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);
    currentVersion = packageJson.version;
  } catch (error) {
    console.error("Error reading or parsing package.json:", error);
    process.exit(1);
  }

  console.log(`Current version: ${currentVersion}`);

  const versionParts = currentVersion.split(".");
  const defaultPatch = `${versionParts[0]}.${versionParts[1]}.${parseInt(versionParts[2], 10) + 1}`;

  const newVersion =
    (await rl.question(`Enter new version (default: ${defaultPatch}): `)) || defaultPatch;

  // Basic version format validation
  if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
    console.error(
      `Invalid version format: ${newVersion}. Please use semantic versioning (e.g., 1.2.3).`
    );
    rl.close();
    process.exit(1);
  }

  console.log(`Updating package.json to version ${newVersion}...`);
  const updatedPackageJson = JSON.parse(packageJsonContent);
  updatedPackageJson.version = newVersion;

  try {
    await fs.writeFile(packageJsonPath, JSON.stringify(updatedPackageJson, null, 2) + "\n");
    console.log("package.json updated successfully.");
  } catch (error) {
    console.error("Error writing package.json:", error);
    process.exit(1);
  }

  // Run the release steps
  await runCommand("bun run build");
  await runCommand("bun run version"); // This likely reads the new version from package.json
  await runCommand("bun run tag"); // This reads from manifest.json, which 'version' updates
  await runCommand("bun run dist");

  console.log(`\\nRelease process completed for version ${newVersion}.`);
  rl.close();
}

main().catch((error) => {
  console.error("An unexpected error occurred:", error);
  rl.close();
  process.exit(1);
});
