import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "MAT DAW Split Pro", targetOS: "macOS El Capitan 10.11.6+" });
  });

  // Gemini AI endpoint for smart audio & sheet music harmonic analysis
  app.post("/api/gemini/analyze-sheet-music", async (req, res) => {
    try {
      const { stemName, notes, bpm, keySignature } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({ error: "GEMINI_API_KEY process env is missing" });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const prompt = `Analyze this music stem "${stemName}" with Key: ${keySignature || 'C Major'}, BPM: ${bpm || 120}.
Notes detected: ${JSON.stringify(notes.slice(0, 20))}...
Provide a short professional musical breakdown including:
1. Primary scale & harmonic function
2. Suggested performance tips for musicians
3. Musical notation style recommendations for MusicXML export`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });

      res.json({ analysis: response.text });
    } catch (err: any) {
      console.error("Gemini API error:", err);
      res.status(500).json({ error: err?.message || "Failed to analyze sheet music with Gemini" });
    }
  });

  // CycloneDX SBOM Endpoint
  app.get("/api/sbom", (_req, res) => {
    const sbom = {
      bomFormat: "CycloneDX",
      specVersion: "1.5",
      serialNumber: "urn:uuid:7f3b890a-5c21-4d32-9a81-matdawsplitpro",
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        component: {
          type: "application",
          name: "MAT DAW Split Pro",
          version: "1.0.0-pro",
          description: "macOS Native DAW & AI Stem Separator with Sheet Music Transcription",
          licenses: [{ license: { id: "MIT" } }]
        }
      },
      components: [
        { name: "Demucs v4 (Hybrid Transformer)", version: "4.0.1", license: "MIT (Code) / CC-BY-NC-4.0 (Weights)", type: "machine-learning-model" },
        { name: "HTDemucs-6s", version: "1.0.0", license: "MIT", type: "machine-learning-model" },
        { name: "MDX-Net Vocals", version: "2.1.0", license: "MIT", type: "machine-learning-model" },
        { name: "Python Embedded Runtime", version: "3.9.18", license: "PSF", type: "operating-system-env" },
        { name: "FFmpeg static build", version: "6.1.1", license: "LGPL-2.1-or-later", type: "library" },
        { name: "AVAudioEngine", version: "System Framework", license: "Apple Inc.", type: "framework" }
      ]
    };
    res.json(sbom);
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MAT DAW Split Pro server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
