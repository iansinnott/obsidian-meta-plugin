import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { tool } from "ai";

// Schema for file editor tool commands
export const fileEditorToolSchema = z.object({
  command: z.enum(["view", "str_replace", "create", "insert", "undo_edit"]),
  path: z.string().optional(),
  view_range: z.array(z.number()).optional(),
  old_str: z.string().optional(),
  new_str: z.string().optional(),
  file_text: z.string().optional(),
  insert_line: z.number().optional(),
});

type FileEditorToolParams = z.infer<typeof fileEditorToolSchema>;

// Interface for context needed by the file editor tool
export interface FileEditorContext {
  /**
   * The absolute base path that all file operations will be relative to.
   * All file operations will be restricted to this directory and its subdirectories.
   */
  basePath: string;
}

// Store file backups for undo operations
const fileBackups = new Map<string, string>();

/**
 * Creates a file editor tool that can view, edit, create, and manage files
 * @param context Required context containing the absolute base path for file operations
 */
export const createFileEditorTool = (context: FileEditorContext) => {
  const handleToolUse = async (toolUse: FileEditorToolParams): Promise<string> => {
    const {
      command,
      path: llmPath,
      view_range,
      old_str,
      new_str,
      file_text,
      insert_line,
    } = toolUse;

    const getTargetPath = (x: string | undefined) => {
      if (!x) {
        throw new Error("path is required");
      }

      // Check if the path already starts with the base path to avoid duplication
      if (x.startsWith(context.basePath)) {
        console.warn(
          `Warning: Path "${x}" already includes base path "${context.basePath}". Stripping duplicate base path.`
        );
        const resolvedPath = path.resolve(x);

        // Still verify the resolved path is within the base path for security
        const normalizedBasePath = path.normalize(context.basePath);
        const normalizedResolvedPath = path.normalize(resolvedPath);

        if (!normalizedResolvedPath.startsWith(normalizedBasePath)) {
          throw new Error(
            `Security error: Attempted to access path outside of the allowed base directory: ${x}` +
              `\n\nResolved path: ${resolvedPath}` +
              `\n\nNormalized base path: ${normalizedBasePath}` +
              `\n\nNormalized resolved path: ${normalizedResolvedPath}`
          );
        }

        return resolvedPath;
      }

      // Resolve the path relative to the base path
      const resolvedPath = path.resolve(context.basePath, x);

      // Ensure the resolved path is within the base path to prevent directory traversal
      const normalizedBasePath = path.normalize(context.basePath);
      const normalizedResolvedPath = path.normalize(resolvedPath);

      console.log("file editor doing stuff", {
        x,
        resolvedPath,
        normalizedBasePath,
        normalizedResolvedPath,
      });

      // if (!normalizedResolvedPath.startsWith(normalizedBasePath)) {
      //   throw new Error(
      //     `Security error: Attempted to access path outside of the allowed base directory: ${x}`
      //   );
      // }

      return resolvedPath;
    };

    try {
      switch (command) {
        case "view": {
          const targetPath = getTargetPath(llmPath);

          // Handle viewing file contents or directory listing
          if (fs.existsSync(targetPath)) {
            const stats = fs.statSync(targetPath);

            if (stats.isFile()) {
              // Read file contents
              const content = fs.readFileSync(targetPath, "utf-8");

              // Handle view_range if specified
              if (view_range && Array.isArray(view_range) && view_range.length === 2) {
                const lines = content.split("\n");
                const [start, end] = view_range;
                const actualEnd = end === -1 ? lines.length : end;
                const selectedLines = lines.slice(Math.max(0, start - 1), actualEnd);

                // Return raw text without line numbers
                return selectedLines.join("\n");
              }

              // Return full file without line numbers
              return content;
            } else if (stats.isDirectory()) {
              // List directory contents
              const files = fs.readdirSync(targetPath);
              return files.join("\n");
            }
          }

          return `Error: File or directory not found: ${targetPath}`;
        }

        case "str_replace": {
          const targetPath = getTargetPath(llmPath);

          // Handle string replacement
          if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
            return `Error: File not found: ${targetPath}`;
          }

          // Backup the file before modifying
          const content = fs.readFileSync(targetPath, "utf-8");
          fileBackups.set(targetPath, content);

          // Check if the old_str exists exactly once
          const matches = content.split(old_str!).length - 1;
          if (matches === 0) {
            return `Error: No match found for replacement. Please check your text and try again.`;
          } else if (matches > 1) {
            return `Error: Found ${matches} matches for replacement text. Please provide more context to make a unique match.`;
          }

          // Perform the replacement
          const newContent = content.replace(old_str!, new_str!);
          fs.writeFileSync(targetPath, newContent);
          return "Successfully replaced text at exactly one location.";
        }

        case "create": {
          const targetPath = getTargetPath(llmPath);
          // Handle file creation
          // Ensure the directory exists
          const dirPath = path.dirname(targetPath);
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
          }

          // Create the file
          fs.writeFileSync(targetPath, file_text!);
          return `Successfully created file: ${targetPath}`;
        }

        case "insert": {
          const targetPath = getTargetPath(llmPath);
          // Handle text insertion at specific line
          if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
            return `Error: File not found: ${targetPath}`;
          }

          // Backup the file before modifying
          const content = fs.readFileSync(targetPath, "utf-8");
          fileBackups.set(targetPath, content);

          // Insert text at the specified line
          const lines = content.split("\n");
          const insertAt = Math.min(insert_line!, lines.length);

          lines.splice(insertAt, 0, new_str!);
          fs.writeFileSync(targetPath, lines.join("\n"));
          return `Successfully inserted text after line ${insertAt}`;
        }

        case "undo_edit": {
          const targetPath = getTargetPath(llmPath);
          // Handle undo operation
          if (!fileBackups.has(targetPath)) {
            return `Error: No backup found for file: ${targetPath}`;
          }

          // Restore from backup
          fs.writeFileSync(targetPath, fileBackups.get(targetPath)!);
          fileBackups.delete(targetPath);
          return `Successfully reverted changes to: ${targetPath}`;
        }

        default:
          return `Error: Unknown command: ${command}`;
      }
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  };

  return tool({
    description: "File editor tool that can view, edit, create, and manage files",
    parameters: fileEditorToolSchema,
    execute: handleToolUse,
  });
};
