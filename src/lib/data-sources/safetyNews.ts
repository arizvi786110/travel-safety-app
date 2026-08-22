//ONLY CALLED WHEN USER WANTS THE INFO FOR 'NOW' FILTER

export async function getSafetyNews(title:string, topic:string, label:string, from:string, url:string, category:string, summary:string, city: string, medium: string){
    const response= await fetch(`https://api.perigon.io/v1/articles/all?from=${from}&url=${url}&title=${title}&label=${label}&category=${category}&topic=${topic}&city=${city}&negativeSentimentFrom=0.7&medium=${medium}&summary=${summary}&apiKey=${process.env.PERIGON_API_KEY}`)
    const data = await response.json()
    console.log(data)
    return data
}

type ProcessedArticle = {
  title: string;
  summary: string;
  topic: string;
  sentiment: number;
  url: string;
  publishedDate: string;
}

export async function getProcessedArticles(city: string): Promise<ProcessedArticle[]> {
    const response = await getSafetyNews("", "", "", "2026-07-01", "", "", "", city, "Article")
    const rawArticles = response.articles 

    const processedArticles: ProcessedArticle[] = rawArticles.map((article: any) => ({
        title: article.title,
        summary: article.description,
        topic: article.topic,
        sentiment: article.sentiment,
        url: article.url,
        publishedDate: article.pubDate,
    }))

    return processedArticles
}

export const politicalKeywords = new Set([
  "coup", "unrest", "martial law", "state of emergency", "protest",
  "riot", "uprising", "insurgency", "civil war", "conflict",
  "military", "curfew", "clashes", "violence", "crackdown",
  "sanctions", "election fraud", "instability", "regime", "militia"
]);

export const disasterKeywords = new Set([
  "earthquake", "flood", "flooding", "hurricane", "typhoon",
  "cyclone", "wildfire", "eruption", "volcano", "tsunami",
  "landslide", "drought", "evacuation", "evacuate", "casualties",
  "state of emergency", "damage", "storm", "disaster", "displaced"
]);

export const healthKeywords = new Set([
  "outbreak", "epidemic", "pandemic", "virus", "disease",
  "quarantine", "infection", "contamination", "cholera", "malaria",
  "dengue", "measles", "vaccine shortage", "hospital", "contagious",
  "health warning", "sanitation", "waterborne"
]);

export const crimeKeywords = new Set([
  "robbery", "theft", "mugging", "assault", "kidnapping",
  "scam", "pickpocket", "burglary", "shooting", "stabbing",
  "gang", "trafficking", "warning", "spike in crime", "attack",
  "unsafe", "murder", "harassment"
]);

export function getSentCount(articles: ProcessedArticle[]){
    const keyWordCounts: Record<string, number[]> = {
        Political: [],
        "Natural Disaster": [],
        Health: [],
        Crime: [],
    }
    const articleMatches: Record<string, number> = {
        Political: 0,
        "Natural Disaster": 0,
        Health: 0,
        Crime: 0,
    };

    for (const article of articles){
        const combinedText = article.title + " " + article.summary
        const words = combinedText.split(" ")

        // Political and Health: trust Perigon's own topic tag
        if (article.topic == "Politics"){
            let totalKeywordCount = 0;
            for (const word of words){
                if (politicalKeywords.has(word)) totalKeywordCount++;
            }
            keyWordCounts["Political"].push(totalKeywordCount);
            if (totalKeywordCount >= 1) articleMatches["Political"]++;
        }
        else if (article.topic == "Health"){
            let totalKeywordCount = 0;
            for (const word of words){
                if (healthKeywords.has(word)) totalKeywordCount++;
            }
            keyWordCounts["Health"].push(totalKeywordCount);
            if (totalKeywordCount >= 1) articleMatches["Health"]++;
        }
        let disasterCount = 0;
        for (const word of words){
            if (disasterKeywords.has(word)) disasterCount++;
        }
        if (disasterCount >= 1) {
            keyWordCounts["Natural Disaster"].push(disasterCount);
            articleMatches["Natural Disaster"]++;
        }

        let crimeCount = 0;
        for (const word of words){
            if (crimeKeywords.has(word)) crimeCount++;
        }
        if (crimeCount >= 1) {
            keyWordCounts["Crime"].push(crimeCount);
            articleMatches["Crime"]++;
        }
    }
    return { articleMatches, keyWordCounts };
}

type Rating = "green" | "amber" | "red";

export function colourMatch(articleMatches: Record<string, number>, keyWordCounts: Record<string, number[]>, avgSentiment: Record<string, number>): Record<string, Rating> {
  const ratings: Record<string, Rating> = {};

  const categories = ["Political", "Natural Disaster", "Health", "Crime"];

  for (const category of categories) {
    const matches = articleMatches[category];
    const counts = keyWordCounts[category];
    const sentiment = avgSentiment[category];

    if (matches === 0) {
      ratings[category] = "green";
      continue;
    }

    const totalKeywords = counts.reduce((sum, n) => sum + n, 0);
    const avgIntensity = totalKeywords / matches;

    if (matches >= 3 && avgIntensity >= 2 && sentiment <= -0.5) {
      ratings[category] = "red";
    } else if (matches >= 1 && (avgIntensity >= 1 || sentiment <= -0.3)) {
      ratings[category] = "amber";
    } else {
      ratings[category] = "green";
    }
  }

  return ratings;
}