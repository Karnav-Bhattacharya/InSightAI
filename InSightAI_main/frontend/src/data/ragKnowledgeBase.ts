import roleBasedInsights from './role_based_insights.json';
import { UserRole } from '../types';

export interface DetailedInsightKnowledge {
  insightId: number;
  role: UserRole;

  title: string;
  metric: string;
  change: string;
  trend: string;
  region: string;
  category: string;

  whatHappened: string;
  rootCause: string;

  businessImpact: string;
  riskIfIgnored: string;

  keyFindings: string[];
  contributingFactors: string[];

  recommendations: {
    action: string;
    feasibility?: string;
    why?: string;
    nextStep?: string;
  }[];
}

type RawInsight = any;


/**
 * Convert insight ID safely.
 */
function getNumericId(id: unknown): number {
  return (
    Number(String(id ?? '0').replace(/\D/g, '')) || 0
  );
}


/**
 * Convert recommendation into a standard format.
 */
function normalizeRecommendations(
  recommendations: any[]
) {
  if (!Array.isArray(recommendations)) return [];

  return recommendations.map((item) => {

    if (typeof item === 'string') {
      return {
        action: item
      };
    }

    return {
      action:
        item.action ||
        item.text ||
        'Recommended action',

      feasibility: item.feasibility,

      why: item.why,

      nextStep: item.nextStep
    };

  });
}


/**
 * Create detailed RAG knowledge directly from one dashboard card.
 *
 * IMPORTANT:
 * This means chatbot information stays synced with
 * role_based_insights.json.
 */
function createKnowledge(
  card: RawInsight,
  role: UserRole
): DetailedInsightKnowledge {

  const ragContext = card.ragContext || {};

  return {

    insightId: getNumericId(card.id),

    role,

    title:
      card.title || 'Business Insight',

    metric:
      card.metric || 'Business Metric',

    change:
      card.change || 'N/A',

    trend:
      card.trend || 'N/A',

    region:
      card.region || 'N/A',

    category:
      card.category || 'General',


    // CARD INFORMATION

    whatHappened:
      card.whatHappened ||
      card.summary ||
      'No information available.',

    rootCause:
      card.rootCause ||
      card.cause ||
      'Root cause is under investigation.',


    // DETAILED RAG INFORMATION

    businessImpact:
      ragContext.businessImpact ||
      'The issue may affect operational and business performance.',

    riskIfIgnored:
      ragContext.riskIfIgnored ||
      'The issue may increase in severity if corrective action is delayed.',

    keyFindings:
      Array.isArray(ragContext.keyFindings)
        ? ragContext.keyFindings
        : [],

    contributingFactors:
      Array.isArray(ragContext.contributingFactors)
        ? ragContext.contributingFactors
        : [],


    // RECOMMENDED ACTIONS

    recommendations:
      normalizeRecommendations(
        card.recommendations || []
      )
  };
}


/**
 * Build RAG knowledge dynamically from role_based_insights.json.
 */
function buildKnowledgeBase(): DetailedInsightKnowledge[] {

  const knowledge: DetailedInsightKnowledge[] = [];

  const data =
    roleBasedInsights as unknown as Record<
      string,
      RawInsight[]
    >;

  const roles: UserRole[] = [
    'HR',
    'Manager',
    'Executive'
  ];

  roles.forEach((role) => {

    const cards = data[role];

    if (!Array.isArray(cards)) return;

    cards.forEach((card) => {

      knowledge.push(
        createKnowledge(card, role)
      );

    });

  });

  return knowledge;
}


/**
 * Complete RAG knowledge base.
 *
 * Automatically generated from:
 *
 * role_based_insights.json
 */
export const RAG_KNOWLEDGE_BASE =
  buildKnowledgeBase();


/**
 * Get knowledge for a particular insight card.
 */
export function getDetailedKnowledgeByInsightId(
  insightId: number
): DetailedInsightKnowledge | undefined {

  return RAG_KNOWLEDGE_BASE.find(
    item => item.insightId === insightId
  );
}


/**
 * Get ONLY knowledge belonging to the logged-in role.
 */
export function getDetailedKnowledgeByRole(
  role: UserRole
): DetailedInsightKnowledge[] {

  return RAG_KNOWLEDGE_BASE.filter(
    item => item.role === role
  );
}