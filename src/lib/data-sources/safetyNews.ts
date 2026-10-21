export async function getSafetyNews(
  title: string,
  topic: string,
  label: string,
  from: string,
  url: string,
  category: string,
  summary: string,
  city: string,
  medium: string,
) {
  const response = await fetch(
    `https://api.perigon.io/v1/articles/all?from=${from}&url=${url}&title=${title}&label=${label}&category=${category}&topic=${topic}&city=${city}&negativeSentimentFrom=0.7&medium=${medium}&summary=${summary}&apiKey=${process.env.PERIGON_API_KEY}`,
  );
  const data = await response.json();
  console.log(data);
  return data;
}

type ProcessedArticle = {
  title: string;
  summary: string;
  topics: string[];
  sentiment: number;
  url: string;
  publishedDate: string;
};

function toSentimentScore(s: any): number {
  if (typeof s === "number") return s;
  if (s && typeof s === "object") {
    return (Number(s.positive) || 0) - (Number(s.negative) || 0);
  }
  return 0;
}

export async function getProcessedArticles(
  city: string,
): Promise<ProcessedArticle[]> {
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const response = await getSafetyNews(
    "",
    "",
    "",
    from,
    "",
    "",
    "",
    city,
    "Article",
  );
  const rawArticles: any[] = response?.articles ?? [];

  return rawArticles.map((article: any) => ({
    title: article.title ?? "",
    summary: article.description ?? "",
    topics: article.topics ?? [],
    sentiment: toSentimentScore(article.sentiment),
    url: article.url,
    publishedDate: article.pubDate,
  }));
}

export const politicalTopicKeywords = new Set([
  "government",
  "taliban",
  "regime",
  "policy",
  "sanctions",
  "human rights",
  "election",
  "protest",
  "coup",
  "unrest",
  "military",
  "conflict",
  "insurgency",
  "war",
  "diplomatic",
  "ban",
  "law",
  "rights",
  "repression",
  "authorities",
  "state",
  "minister",
  "president",
  "parliament",
]);

export const disasterKeywords = new Set([
  "earthquake",
  "flood",
  "flooding",
  "hurricane",
  "typhoon",
  "cyclone",
  "wildfire",
  "eruption",
  "volcano",
  "tsunami",
  "landslide",
  "drought",
  "evacuation",
  "evacuate",
  "casualties",
  "state of emergency",
  "damage",
  "storm",
  "disaster",
  "displaced",
]);

export const healthTopicKeywords = new Set([
  "outbreak",
  "epidemic",
  "pandemic",
  "virus",
  "disease",
  "hospital",
  "malnutrition",
  "hunger",
  "famine",
  "starvation",
  "mortality",
  "illness",
  "contamination",
  "vaccine",
  "healthcare",
  "medical",
  "infection",
  "sanitation",
  "water crisis",
  "food insecurity",
  "child mortality",
]);

export const crimeKeywords = new Set([
  "robbery",
  "theft",
  "mugging",
  "assault",
  "kidnapping",
  "scam",
  "pickpocket",
  "burglary",
  "shooting",
  "stabbing",
  "gang",
  "trafficking",
  "warning",
  "spike in crime",
  "attack",
  "unsafe",
  "murder",
  "harassment",
]);

export function getSentCount(articles: ProcessedArticle[]) {
  const keyWordCounts: Record<string, number[]> = {
    Political: [],
    "Natural Disaster": [],
    Health: [],
    Crime: [],
  };
  const articleMatches: Record<string, number> = {
    Political: 0,
    "Natural Disaster": 0,
    Health: 0,
    Crime: 0,
  };

  for (const article of articles) {
    const combinedText = article.title + " " + article.summary;
    const words = combinedText.split(" ");

    let politicalCount = 0;
    for (const word of words) {
      if (politicalTopicKeywords.has(word)) politicalCount++;
    }
    if (politicalCount >= 1) {
      keyWordCounts["Political"].push(politicalCount);
      articleMatches["Political"]++;
    }

    let healthCount = 0;
    for (const word of words) {
      if (healthTopicKeywords.has(word)) healthCount++;
    }
    if (healthCount >= 1) {
      keyWordCounts["Health"].push(healthCount);
      articleMatches["Health"]++;
    }

    let disasterCount = 0;
    for (const word of words) {
      if (disasterKeywords.has(word)) disasterCount++;
    }
    if (disasterCount >= 1) {
      keyWordCounts["Natural Disaster"].push(disasterCount);
      articleMatches["Natural Disaster"]++;
    }

    let crimeCount = 0;
    for (const word of words) {
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

export function colourMatch(
  articleMatches: Record<string, number>,
  keyWordCounts: Record<string, number[]>,
  avgSentiment: Record<string, number>,
): Record<string, Rating> {
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

    if (matches >= 3 && avgIntensity >= 2 && sentiment <= -0.3) {
      ratings[category] = "red";
    } else if (matches >= 1 && (avgIntensity >= 1 || sentiment <= -0.3)) {
      ratings[category] = "amber";
    } else {
      ratings[category] = "green";
    }
  }

  return ratings;
}

export function getAverageSentiment(
  articles: ProcessedArticle[],
): Record<string, number> {
  const sentimentSums: Record<string, number> = {
    Political: 0,
    "Natural Disaster": 0,
    Health: 0,
    Crime: 0,
  };
  const sentimentCounts: Record<string, number> = {
    Political: 0,
    "Natural Disaster": 0,
    Health: 0,
    Crime: 0,
  };

  for (const article of articles) {
    const words = (article.title + " " + article.summary).split(" ");

    const hasPoliticalKeyword = words.some((word) =>
      politicalTopicKeywords.has(word),
    );
    if (hasPoliticalKeyword) {
      sentimentSums["Political"] += article.sentiment;
      sentimentCounts["Political"]++;
    }

    const hasHealthKeyword = words.some((word) =>
      healthTopicKeywords.has(word),
    );
    if (hasHealthKeyword) {
      sentimentSums["Health"] += article.sentiment;
      sentimentCounts["Health"]++;
    }

    const hasDisasterKeyword = words.some((word) => disasterKeywords.has(word));
    if (hasDisasterKeyword) {
      sentimentSums["Natural Disaster"] += article.sentiment;
      sentimentCounts["Natural Disaster"]++;
    }

    const hasCrimeKeyword = words.some((word) => crimeKeywords.has(word));
    if (hasCrimeKeyword) {
      sentimentSums["Crime"] += article.sentiment;
      sentimentCounts["Crime"]++;
    }
  }

  const avgSentiment: Record<string, number> = {};
  for (const category in sentimentSums) {
    avgSentiment[category] =
      sentimentCounts[category] > 0
        ? sentimentSums[category] / sentimentCounts[category]
        : 0;
  }

  return avgSentiment;
}
