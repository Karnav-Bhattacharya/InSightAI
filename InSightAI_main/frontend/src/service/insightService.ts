import { Insight, InsightApiResponse, UserRole } from "../types";

import roleBasedInsights from "../data/role_based_insights.json";


/**
 * Convert a JSON card into the frontend Insight interface
 */
function normalizeInsight(
  card: any,
  frontendRole: UserRole
): Insight {
  return {
    id: Number(
      String(card.id || "0").replace(/\D/g, "")
    ) || Math.floor(Math.random() * 100000),

    role: frontendRole,

    severity:
      card.severity === "High" ||
      card.severity === "Medium" ||
      card.severity === "Low"
        ? card.severity
        : "Medium",

    title: card.title || "Business Insight",

    metric: card.metric || "Business Metric",

    change: card.change || "0%",

    trend:
      card.trend === "down"
        ? "down"
        : "up",

    region: card.region || "Unknown",

    /**
     * WHAT HAPPENED
     */
    summary:
      card.whatHappened ||
      card.summary ||
      "No summary available.",

    /**
     * ROOT CAUSE
     */
    cause:
      card.rootCause ||
      card.cause ||
      "Root cause is under investigation.",

    /**
     * RECOMMENDATIONS
     */
    recommendations: Array.isArray(card.recommendations)
      ? card.recommendations.map((item: any) => {

          // Recommendation is already text
          if (typeof item === "string") {
            return item;
          }

          // Recommendation is an object
          return {
            text:
              item.text ||
              item.action ||
              "Recommended action",

            feasibility:
              item.feasibility === "Easy"
                ? "Easy"
                : item.feasibility === "Hard"
                  ? "Hard"
                  : "Medium",
          };
        })
      : [],

    category:
      card.category ||
      "General",

    timestamp:
      card.timestamp ||
      new Date().toISOString(),

    impactScore:
      typeof card.impactScore === "number"
        ? card.impactScore
        : undefined,
  };
}


/**
 * Fetch role-specific insights from local JSON
 */
export async function fetchInsights(
  role: UserRole = "HR"
): Promise<Insight[]> {

  console.log(
    "Loading insights for role:",
    role
  );


  /**
   * JSON contains:
   *
   * metadata
   * shared_insights
   * HR
   * Manager
   * Executive
   * Retail
   * Finance
   * Operations
   *
   * We safely access only the selected role.
   */
  const jsonData =
    roleBasedInsights as unknown as Record<string, unknown>;


  const roleData =
    jsonData[role];


  /**
   * Ensure cards are always an array
   */
  const cards: any[] =
    Array.isArray(roleData)
      ? roleData
      : [];


  console.log(
    `Found ${cards.length} cards for ${role}`,
    cards
  );


  /**
   * Convert JSON cards to frontend Insight format
   */
  return cards.map((card) =>
    normalizeInsight(card, role)
  );
}


/**
 * InSightAI Insight Service
 */
export const insightService = {


  /**
   * Get latest role-specific insights
   */
  async getLatestInsights(
    role: UserRole = "HR"
  ): Promise<Insight[]> {

    return fetchInsights(role);
  },


  /**
   * Refresh role-specific insights
   */
  async refreshInsights(
    role: UserRole = "HR"
  ): Promise<Insight[]> {

    return fetchInsights(role);
  },


  /**
   * Return data in API response format
   */
  async getInsightsApiResponse(
    role: UserRole = "HR"
  ): Promise<InsightApiResponse> {

    const data =
      await this.getLatestInsights(role);


    return {
      success: true,

      count: data.length,

      lastUpdated:
        new Date().toISOString(),

      data,
    };
  },
};