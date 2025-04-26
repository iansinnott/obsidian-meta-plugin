import fs from "fs";
import { execSync } from "child_process";
import path from "path";

// Get the project root directory
const rootDir = path.resolve(process.cwd());

try {
  // Read the manifest.json file to get the version
  const manifestPath = path.join(rootDir, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const version = manifest.version;

  // Files to include in the zip
  const filesToZip = [
    "main.js",
    "styles.css",
    "manifest.json",
    "versions.json",
    "README.md",
    "LICENSE",
    "esbuild-0.25.2.wasm",
  ];

  // Create releases directory if it doesn't exist
  const releasesDir = path.join(rootDir, "releases");
  if (!fs.existsSync(releasesDir)) {
    fs.mkdirSync(releasesDir, { recursive: true });
    console.log("Created releases directory");
  }

  // Create zip command with output in releases directory
  const zipFileName = `vibesidian-${version}.zip`;
  const zipFilePath = path.join(releasesDir, zipFileName);
  const zipCommand = `zip -r "${zipFilePath}" ${filesToZip.join(" ")}`;

  // Execute the zip command
  console.log(`Creating distribution package: ${zipFilePath}`);
  execSync(zipCommand, { stdio: "inherit" });

  console.log(`\nDistribution package created successfully: ${zipFilePath}`);
} catch (error) {
  console.error("Error creating distribution package:", error);
  process.exit(1);
}
