export type SeverityLevel = 'High' | 'Medium' | 'Low';
export type FeasibilityLevel = 'Easy' | 'Medium' | 'Hard';

/**
 * Supported User Roles / Designations for InSightAI:
 * - HR
 * - Manager
 * - Executive
 */
export type UserRole =
  | 'HR'
  | 'Manager'
  | 'Executive'
  | 'Retail'
  | 'Finance'
  | 'Operations';
export interface ActionItem {
  text: string;
  feasibility?: FeasibilityLevel;
}

export interface Insight {
  id: number;
  role?: UserRole;
  severity: SeverityLevel;
  title: string;
  metric: string;
  change: string;
  trend: 'up' | 'down';
  region: string;
  summary: string;
  cause: string;
  recommendations: (string | ActionItem)[];
  actionFeasibilities?: FeasibilityLevel[];
  timestamp?: string;
  category?: string;
  impactScore?: number;
}

export interface HRUser {
  id: string;
  name: string;
  email: string;
  // ============================================================
  // 📍 STORED USER ROLE (Used for role-based insights & chatbot)
  // ============================================================
  role: UserRole;
  department: string;
  initials: string;
}

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  relatedInsightTitle?: string;
  suggestedQuestions?: string[];
}

export interface DetailedRecommendation {
  action: string;
  reason: string;
  expectedOutcome: string;
}

export interface DetailedInsightKnowledge {
  insightId: number;
  role: UserRole;
  title: string;
  overview: string;
  historicalTrend: string;
  affectedPopulation: string;
  keyFindings: string[];
  contributingFactors: string[];
  businessImpact: string;
  riskIfIgnored: string;
  recommendedActionsDetailed: DetailedRecommendation[];
  evidence: string[];
  confidence: 'High' | 'Medium' | 'Low';
  dataFreshness: string;
}

export interface InsightApiResponse {
  success: boolean;
  count: number;
  lastUpdated: string;
  data: Insight[];
}

