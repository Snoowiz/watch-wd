import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  date: string;
}

const FALLBACK_NEWS: NewsItem[] = [
  {
    title: "Gombe Emir's Cup ranks high among leading grassroots competitions in Northern Nigeria",
    summary: "The annual grassroots football tournament is designed to promote youth development, community engagement, and discover the next generation of football stars.",
    url: "https://sports247.ng/gombe-emirs-cup-ranks-high-among-leading-grassroots-competitions-in-northern-nigeria-organisers/",
    date: "2026-06-06"
  },
  {
    title: "FG seeks grassroots sports growth through Poland partnership",
    summary: "The Nigerian Federal Government has reiterated its commitment to developing grassroots sports through an expanded partnership with Poland. The initiative aims to enhance sports diplomacy, youth talent discovery, and infrastructure development across local communities.",
    url: "https://nigerianobservernews.com/2026/06/fg-seeks-grassroots-sports-growth-through-poland-partnership/",
    date: "2026-06-05"
  },
  {
    title: "Lagos' Rising Football Stars set for thrilling JOF U-13 semi-final showdown",
    summary: "The 7th edition of the JOF U-13 Football Tournament, organized by the Lagos State Grassroots Football Association, has reached its semi-final stage. The grassroots competition has brought together 64 youth teams from across Lagos State to showcase and nurture emerging football talents.",
    url: "https://www.sunnewsonline.com/lagos-rising-football-stars-set-for-thrilling-jof-u-13-semi-final-showdown/",
    date: "2026-06-05"
  }
];

export async function getLatestSportsNews(): Promise<NewsItem[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Search for and get the latest 3 real sports news headlines and brief summaries related to grassroots or global sports. For each item, provide a real title, real summary, a real source URL, and the date.",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "The headline of the sports news item."
              },
              summary: {
                type: Type.STRING,
                description: "A short, engaging (1-2 sentences) summary of the news item."
              },
              url: {
                type: Type.STRING,
                description: "The source URL of the news article found during search."
              },
              date: {
                type: Type.STRING,
                description: "The date of the news item (YYYY-MM-DD format)."
              }
            },
            required: ["title", "summary", "url", "date"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      return FALLBACK_NEWS;
    }
    
    // Clean potential markdown wraps if the model returned them despite responseMimeType
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.substring(7);
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.substring(3);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    }
    cleanedText = cleanedText.trim();

    try {
      const parsed = JSON.parse(cleanedText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => ({
          title: item.title || "Latest Sports News Update",
          summary: item.summary || "No description available.",
          url: item.url || "#",
          date: item.date || new Date().toISOString().split('T')[0]
        }));
      }
    } catch (parseError) {
      console.warn("JSON parsing of Gemini response failed, using fallback news. Error:", parseError, "Raw output:", text);
    }
    
    return FALLBACK_NEWS;
  } catch (error) {
    console.warn("Error in getLatestSportsNews (falling back to cached news):", error);
    return FALLBACK_NEWS;
  }
}
