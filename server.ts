import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

// Set up larger limits for body checking because base64 image payloads can be somewhat large
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Lazy initializer for Google Gemini API Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is missing inside workspace secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API Route for Image-based merchandise analysis
app.post("/api/gemini/analyze-image", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image payload provided." });
    }

    // Parse image string to extract format and base64 bytes
    let mimeType = "image/jpeg";
    let base64Data = "";
    
    if (image.includes(";base64,")) {
      const parts = image.split(";base64,");
      const mimeMatch = parts[0].match(/data:(.*)/);
      if (mimeMatch) {
         mimeType = mimeMatch[1];
      }
      base64Data = parts[1];
    } else {
      base64Data = image;
    }

    // Initialize client dynamically
    const ai = getGeminiClient();

    // Setup input parts
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: "Analyze this product picture. Identify what kind of retail item or product it is. Match it to one of these store categories: 'Electronics', 'Apparel & Fashion', 'Home & Kitchen', 'Beauty & Personal Care', 'Automotive', 'Toys & Hobbies'. Generate a short search query (2-3 words) to locate similar products, a list of descriptive tags like style or color, and a brief description.",
    };

    // Ask Gemini using structured JSON output schema
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: "A short search query (2-3 words) describing the item in the picture (e.g., 'wireless headphones', 'ceramic coffee mug'). Include color, material or style if it stands out.",
            },
            category: {
              type: Type.STRING,
              description: "Must be exactly one of: 'Electronics', 'Apparel & Fashion', 'Home & Kitchen', 'Beauty & Personal Care', 'Automotive', 'Toys & Hobbies'. Choose whichever is closest.",
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3-5 descriptive tags representing the item's main characteristics.",
            },
            description: {
              type: Type.STRING,
              description: "A very brief 1-sentence summary of what's detected in the product visual.",
            },
          },
          required: ["query", "category", "tags", "description"],
        },
      },
    });

    const parsedResponse = JSON.parse(response.text || "{}");
    return res.json(parsedResponse);
  } catch (error: any) {
    console.error("Gemini Image Analyzer backend threw an error:", error);
    return res.status(500).json({
      error: error.message || "An internal error occurred during custom visual analysis.",
      isMissingKey: !process.env.GEMINI_API_KEY,
    });
  }
});

// Configure Vite middleware or Static built folder routing
async function assembleServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static frontend assets built inside /dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express Multi-Role Server running at http://0.0.0.0:${PORT}`);
  });
}

assembleServer();
