import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import JSZip from "jszip";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API to export the project as ZIP
  app.get("/api/export-project", async (req, res) => {
    try {
      const zip = new JSZip();
      const rootDir = __dirname;

      async function addFilesToZip(currentDir: string, zipFolder: JSZip) {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          
          // Skip node_modules, .git, dist, etc.
          if (
            entry.name === "node_modules" ||
            entry.name === ".git" ||
            entry.name === "dist" ||
            entry.name === ".next" ||
            entry.name === ".cache"
          ) {
            continue;
          }

          if (entry.isDirectory()) {
            const folder = zipFolder.folder(entry.name);
            if (folder) {
              await addFilesToZip(fullPath, folder);
            }
          } else {
            const content = await fs.readFile(fullPath);
            zipFolder.file(entry.name, content);
          }
        }
      }

      await addFilesToZip(rootDir, zip);

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=overtime-calculator-project.zip");
      res.send(zipBuffer);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Failed to export project" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
