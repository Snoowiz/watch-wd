import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

export function createAIRouter(authenticate: any) {
  const router = Router();

  router.post('/sports-news', async (req: Request, res: Response) => {
    // Feature flag check
    const isEnabled = process.env.FEATURE_AI_NEWS === 'true';
    if (!isEnabled) {
      return res.json({ news: [], message: "AI Sports News feature is currently disabled." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key is not configured on the server." });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Generate 5 latest trending sports news headlines and brief summaries focusing on football/soccer. Output strictly JSON array with fields: id, title, excerpt, category, date, readTime.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const news = JSON.parse(jsonMatch[0]);
        return res.json({ news });
      }

      return res.json({ news: [] });
    } catch (err: any) {
      console.error("[AI ROUTE ERROR]", err);
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}
