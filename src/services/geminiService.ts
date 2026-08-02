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
    summary: "The Nigerian Federal Government has reiterated its commitment to developing grassroots sports through an expanded partnership with Poland.",
    url: "https://nigerianobservernews.com/2026/06/fg-seeks-grassroots-sports-growth-through-poland-partnership/",
    date: "2026-06-05"
  },
  {
    title: "Lagos' Rising Football Stars set for thrilling JOF U-13 semi-final showdown",
    summary: "The 7th edition of the JOF U-13 Football Tournament has brought together youth teams across Lagos State.",
    url: "https://www.sunnewsonline.com/lagos-rising-football-stars-set-for-thrilling-jof-u-13-semi-final-showdown/",
    date: "2026-06-05"
  }
];

export async function getLatestSportsNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch("/api/ai/sports-news", { method: "POST" });
    if (!res.ok) return FALLBACK_NEWS;
    const data = await res.json();
    if (data.news && Array.isArray(data.news) && data.news.length > 0) {
      return data.news.map((item: any) => ({
        title: item.title || "Latest Sports News Update",
        summary: item.excerpt || item.summary || "No description available.",
        url: item.url || "#",
        date: item.date || new Date().toISOString().split('T')[0]
      }));
    }
    return FALLBACK_NEWS;
  } catch (error) {
    return FALLBACK_NEWS;
  }
}
