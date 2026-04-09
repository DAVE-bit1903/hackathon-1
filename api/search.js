const axios = require("axios");
const { GoogleGenAI } = require("@google/genai");

// 🔑 API Keys (use Vercel Environment Variables in production)
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "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";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyApQo_Z6uImKKb82wk15tAoH4I1knBTv7E";
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query = req.body.query;
  const mode = req.body.mode || 'quick';

  console.log(`Query received: ${query} (Mode: ${mode})`);

  try {
    if (mode === 'deep') {
      const prompt = `You are an expert academic researcher. Generate a meticulous deep research paper on the topic: "${query}".
The paper MUST strictly follow this exact 10-point academic format using Markdown:
1. Title Page (Include Mock Data: Title, Author, Institution, Course, Instructor, Date)
2. Abstract (A brief summary 150-250 words including purpose, methods, results, and conclusion)
3. Introduction (Introduces the topic, provides background information, states thesis statement)
4. Literature Review (Reviews previous research, identifies gaps)
5. Methodology (Research design, data collection methods, tools/materials)
6. Results / Findings (Presents data and findings)
7. Discussion (Interprets the results, connects to thesis)
8. Conclusion (Summarizes key points, restates thesis, suggests future research)
9. References / Bibliography (Several mock references in APA style)
10. Appendices (Optional mock extra material/surveys)

Your entire response should only be the finalized markdown text for the paper. Do NOT include conversational filler before or after the paper.`;

      // Retry logic for Gemini rate limits
      let response = null;
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
          });
          break;
        } catch (err) {
          if (err.status === 429 && attempt < maxRetries) {
            const waitSec = Math.min(attempt * 20, 60);
            console.log(`⏳ Rate limited. Waiting ${waitSec}s before retry ${attempt + 1}/${maxRetries}...`);
            await new Promise(r => setTimeout(r, waitSec * 1000));
          } else {
            throw err;
          }
        }
      }

      res.json({
        answer: response.text,
        results: [{ title: "Deep Research Mode (Generated via Gemini 2.0 Flash)", url: "#" }]
      });

    } else {
      const response = await axios.post(
        "https://api.tavily.com/search",
        {
          api_key: TAVILY_API_KEY,
          query: query,
          search_depth: "advanced",
          include_answer: true
        }
      );

      res.json(response.data);
    }

  } catch (error) {
    if (mode === 'deep') {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Gemini research failed" });
    } else {
      console.error("Tavily Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Tavily request failed" });
    }
  }
};
