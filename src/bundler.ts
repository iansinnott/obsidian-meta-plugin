import * as esbuild from "esbuild-wasm";
import { normalizePath } from "obsidian";
import path from "path";

/**
 * Interface for the subset of Vault adapter methods needed for bundling.
 */
export interface VaultAdapter {
  exists(filePath: string): Promise<boolean>;
  mkdir(dirPath: string): Promise<void>;
  read(filePath: string): Promise<string>;
  write(filePath: string, contents: string): Promise<void>;
  writeBinary(filePath: string, buffer: ArrayBuffer): Promise<void>;
  getBasePath(): string;
  getResourcePath(filePath: string): string;
}

/**
 * Options for the bundling process.
 */
export interface BundlerOptions {
  sourcemap?: boolean;
}

/**
 * Result of a bundle operation.
 */
export interface BundleResult {
  success: boolean;
  outputPath?: string;
  error?: any;
}

/**
 * Create a bundler instance that encapsulates esbuild initialization and bundle logic.
 * @param adapter VaultAdapter to read/write files in tests or runtime.
 * @param ensureDataDir Function to ensure and return a data directory path for caching.
 * @todo Just bundle this in. Don't want this to require net access
 *
 */
export function createBundler(
  adapter: VaultAdapter,
  ensureDataDir: (subDir?: string) => Promise<string>
) {
  let esbuildInitialized = false;

  /** Initialize esbuild-wasm with local caching or CDN fallback. */
  async function initialize(): Promise<void> {
    if (esbuildInitialized) return;

    try {
      // Prepare WASM cache directory
      const esbuildDir = await ensureDataDir("esbuild");
      const wasmPath = normalizePath(path.join(esbuildDir, "esbuild.wasm"));

      // Download WASM binary if missing
      if (!(await adapter.exists(wasmPath))) {
        const wasmURL = "https://unpkg.com/esbuild-wasm@0.25.2/esbuild.wasm";
        const response = await fetch(wasmURL);
        if (!response.ok) {
          throw new Error(`Failed to download esbuild.wasm: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        await adapter.writeBinary(wasmPath, arrayBuffer);
      }

      try {
        // Try initializing with local WASM file
        const wasmURL = adapter.getResourcePath(wasmPath);
        await esbuild.initialize({ wasmURL, worker: false });
        esbuildInitialized = true;
        console.log("esbuild initialized with local WASM file");
      } catch (localError) {
        console.warn(
          "Failed to initialize esbuild with local WASM file, falling back to CDN:",
          localError
        );
        // Fallback to CDN
        await esbuild.initialize({
          wasmURL: "https://unpkg.com/esbuild-wasm@0.25.2/esbuild.wasm",
          worker: false,
        });
        esbuildInitialized = true;
        console.log("esbuild initialized with CDN WASM file");
      }
    } catch (error) {
      console.error("Failed to initialize esbuild:", error);
      throw error;
    }
  }

  /**
   * Bundle a plugin project from source files.
   * @param entryPointPath The main entry point file path (relative to vault).
   * @param options Bundling options.
   */
  async function bundle(
    entryPointPath: string,
    options: BundlerOptions = { sourcemap: false }
  ): Promise<BundleResult> {
    if (!esbuildInitialized) {
      await initialize();
    }

    try {
      const vaultBasePath = adapter.getBasePath();
      let absoluteEntryPath: string;

      if (path.isAbsolute(entryPointPath)) {
        absoluteEntryPath = entryPointPath;
      } else {
        absoluteEntryPath = path.join(vaultBasePath, entryPointPath);
      }

      console.log(`[bundler] Absolute entry path: ${absoluteEntryPath}`);

      // Ensure entry point exists
      if (!(await adapter.exists(entryPointPath))) {
        throw new Error(`Entry point does not exist: ${entryPointPath}`);
      }

      // Check for manifest.json in same directory
      const outputDir = path.dirname(entryPointPath);
      const manifestPath = path.join(outputDir, "manifest.json");
      if (!(await adapter.exists(manifestPath))) {
        throw new Error("manifest.json not found in plugin directory");
      }

      console.log(`[bundler] Starting bundling for entry point: ${entryPointPath}`);

      // Create a filesystem plugin for esbuild
      const obsidianFsPlugin: esbuild.Plugin = {
        name: "obsidian-fs",
        setup: (build: esbuild.PluginBuild) => {
          const resolvedPaths = new Map<string, string>();
          resolvedPaths.set(entryPointPath, absoluteEntryPath);

          // Resolve imports
          build.onResolve({ filter: /.*/ }, (args) => {
            console.log(`[esbuild] Resolving: ${args.path} from ${args.importer}`);

            if (!args.path.startsWith(".") && !path.isAbsolute(args.path)) {
              return { path: args.path, external: true };
            }

            let resolvedPath: string;
            if (path.isAbsolute(args.path)) {
              resolvedPath = args.path;
            } else if (args.importer) {
              const importerDir = path.dirname(resolvedPaths.get(args.importer) || args.importer);
              resolvedPath = path.join(importerDir, args.path);
            } else {
              resolvedPath = path.join(vaultBasePath, args.path);
            }

            resolvedPaths.set(args.path, resolvedPath);
            return { path: resolvedPath, namespace: "obsidian-fs" };
          });

          // Load files from disk
          build.onLoad(
            { filter: /.*/, namespace: "obsidian-fs" },
            async (args: esbuild.OnLoadArgs) => {
              try {
                console.log(`[esbuild] Loading: ${args.path}`);
                const vaultRelativePath = args.path.startsWith(vaultBasePath)
                  ? args.path.slice(vaultBasePath.length + 1)
                  : args.path;
                let filePath = args.path;
                let vaultPath = vaultRelativePath;

                // Direct file
                if (await adapter.exists(vaultPath)) {
                  const contents = await adapter.read(vaultPath);
                  const ext = path.extname(filePath).slice(1).toLowerCase();
                  const loader =
                    ext === "tsx"
                      ? "tsx"
                      : ext === "jsx"
                      ? "jsx"
                      : ext === "js"
                      ? "js"
                      : ext === "json"
                      ? "json"
                      : "ts";

                  return { contents, loader: loader as esbuild.Loader };
                }

                // Try extensions
                if (!path.extname(filePath)) {
                  const extensions = [".ts", ".tsx", ".js", ".jsx", ".json"];
                  for (const ext of extensions) {
                    const pathWithExt = vaultPath + ext;
                    if (await adapter.exists(pathWithExt)) {
                      const contents = await adapter.read(pathWithExt);
                      const loaderExt = ext.slice(1).toLowerCase();
                      const loader =
                        loaderExt === "tsx"
                          ? "tsx"
                          : loaderExt === "jsx"
                          ? "jsx"
                          : loaderExt === "js"
                          ? "js"
                          : loaderExt === "json"
                          ? "json"
                          : "ts";
                      return { contents, loader: loader as esbuild.Loader };
                    }
                  }

                  // Try index files
                  for (const ext of extensions) {
                    const indexPath = path.join(vaultPath, `index${ext}`);
                    if (await adapter.exists(indexPath)) {
                      const contents = await adapter.read(indexPath);
                      const loaderExt = ext.slice(1).toLowerCase();
                      const loader =
                        loaderExt === "tsx"
                          ? "tsx"
                          : loaderExt === "jsx"
                          ? "jsx"
                          : loaderExt === "js"
                          ? "js"
                          : loaderExt === "json"
                          ? "json"
                          : "ts";
                      return { contents, loader: loader as esbuild.Loader };
                    }
                  }
                }

                return { errors: [{ text: `File not found: ${vaultRelativePath}` }] };
              } catch (error) {
                return { errors: [{ text: (error as Error).message }] };
              }
            }
          );
        },
      };

      // Perform the build
      const result = await esbuild.build({
        entryPoints: [absoluteEntryPath],
        bundle: true,
        write: false,
        format: "cjs",
        platform: "browser",
        target: "es2018",
        plugins: [obsidianFsPlugin],
        minify: false,
        sourcemap: options.sourcemap,
        treeShaking: true,
        logLevel: "info",
      });

      if (result.outputFiles && result.outputFiles.length > 0) {
        const bundledCode = result.outputFiles[0].text;
        const mainJsPath = path.join(path.dirname(entryPointPath), "main.js");
        await adapter.write(mainJsPath, bundledCode);
        return { success: true, outputPath: mainJsPath };
      }

      throw new Error("No output generated from esbuild");
    } catch (error) {
      console.error("Bundle failed:", error);
      return { success: false, error };
    }
  }

  return { initialize, bundle, stop: () => esbuild.stop() };
}
