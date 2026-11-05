import { colors } from "@/theme";
import { Ionicons } from "@expo/vector-icons";

type IconName = keyof typeof Ionicons.glyphMap;

export type RiskLevel = "low" | "moderate" | "high" | "unknown";

export function riskLevel(rating: unknown): RiskLevel {
  const r = String(rating ?? "").toLowerCase();
  if (/amber|yellow|orange|moderate|medium/.test(r)) return "moderate";
  if (/red|high/.test(r)) return "high";
  if (/green|low/.test(r)) return "low";
  return "unknown";
}

export const RISK_COLOR: Record<RiskLevel, string> = {
  low: colors.riskLow,
  moderate: colors.riskModerate,
  high: colors.riskHigh,
  unknown: colors.textFaint,
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low risk",
  moderate: "Moderate",
  high: "High risk",
  unknown: "No data",
};

export function prettyCategory(category: string) {
  const s = String(category).replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function categoryIcon(category: string): IconName {
  const c = String(category).toLowerCase();
  if (c.includes("polit")) return "flag-outline";
  if (c.includes("disaster") || c.includes("natural")) return "thunderstorm-outline";
  if (c.includes("health")) return "medkit-outline";
  if (c.includes("crime")) return "shield-outline";
  return "alert-circle-outline";
}

// Open-Meteo WMO weather codes
export function weatherIcon(code?: number | null): IconName {
  if (code === undefined || code === null) return "partly-sunny-outline";
  if (code === 0) return "sunny-outline";
  if (code <= 3) return "partly-sunny-outline";
  if (code === 45 || code === 48) return "cloud-outline";
  if (code >= 51 && code <= 67) return "rainy-outline";
  if (code >= 71 && code <= 77) return "snow-outline";
  if (code >= 80 && code <= 82) return "rainy-outline";
  if (code >= 95) return "thunderstorm-outline";
  return "cloud-outline";
}