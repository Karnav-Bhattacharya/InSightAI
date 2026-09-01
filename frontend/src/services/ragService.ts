import { Insight, UserRole, ChatMessage, DetailedInsightKnowledge } from '../types';
import { 
  RAG_KNOWLEDGE_BASE, 
  getDetailedKnowledgeByInsightId, 
  getDetailedKnowledgeByRole 
} from '../data/ragKnowledgeBase';

// ============================================================
// STATIC PROTOTYPE CONVERSATION CONTEXT & RAG RETRIEVAL
// ============================================================
//
// This service simulates contextual RAG retrieval with session memory.
// It maintains conversational state (such as `currentInsight`) across
// multi-turn dialogues so pronouns ("this", "it", "they") and follow-up
// inquiries ("Why did this happen?", "What should we do?") correctly
// resolve to the active business context.
//
// CURRENT PROTOTYPE FLOW:
//
// User Question
//       ↓
// Check for explicit Insight match in active role knowledge
//       ↓
// If found → Update session `currentInsight` → Retrieve Detailed Knowledge
//       ↓
// If not found → Use active session `currentInsight` (if available)
//       ↓
// If neither → Fallback to helpful guidance message
//       ↓
// Format natural, ChatGPT-like answer using rich knowledge base attributes
//
//
// FUTURE PRODUCTION ARCHITECTURE:
//
// User Question + Conversation History
//       ↓
// FastAPI Backend (/api/chat)
//       ↓
// Embedding Generation + Contextual Query Rewriter
//       ↓
// Vector Database Hybrid Search (Milvus / Pinecone / Chroma)
//       ↓
// LLM Prompt Synthesis (Gemini / Claude / GPT)
//       ↓
// Real-time Streaming Contextual Answer
//
// ============================================================

export interface RagResponse {
  answer: string;
  matchedInsight?: Insight;
  matchedKnowledge?: DetailedInsightKnowledge;
  suggestedQuestions?: string[];
  updatedContextInsightId?: number | null;
}

/**
 * Searches the active role's insights and knowledge base for the most relevant record matching the query.
 */
function findRelevantInsightInRole(
  query: string, 
  userRole: UserRole, 
  insights: Insight[]
): { insight: Insight; knowledge: DetailedInsightKnowledge } | null {
  const normalizedQuery = query.toLowerCase().trim();
  const roleKnowledge = getDetailedKnowledgeByRole(userRole);

  let bestMatch: { insight: Insight; knowledge: DetailedInsightKnowledge } | null = null;
  let highestScore = 0;

  insights.forEach((insight) => {
    // Only search insights matching the current user's role
    const knowledge = roleKnowledge.find((k) => k.insightId === insight.id);
    if (!knowledge) return;

    let score = 0;

    const titleLower = insight.title.toLowerCase();
    const metricLower = insight.metric.toLowerCase();
    const regionLower = insight.region.toLowerCase();
    const categoryLower = (insight.category || '').toLowerCase();
    const affectedLower = knowledge.affectedPopulation.toLowerCase();

    // Exact phrase matches in primary identifiers
    if (normalizedQuery.includes(titleLower)) score += 25;
    if (normalizedQuery.includes(metricLower)) score += 15;
    if (normalizedQuery.includes(regionLower)) score += 12;
    if (categoryLower && normalizedQuery.includes(categoryLower)) score += 8;
    if (normalizedQuery.includes(affectedLower)) score += 8;

    // Word matches for title tokens
    const titleWords = titleLower.split(/\s+/);
    titleWords.forEach((word) => {
      if (word.length > 3 && normalizedQuery.includes(word)) score += 4;
    });

    // Word matches for metric tokens
    const metricWords = metricLower.split(/\s+/);
    metricWords.forEach((word) => {
      if (word.length > 3 && normalizedQuery.includes(word)) score += 3;
    });

    // Match keywords from key findings & contributing factors
    knowledge.keyFindings.forEach((finding) => {
      const words = finding.toLowerCase().split(/\s+/);
      words.forEach((w) => {
        if (w.length > 4 && normalizedQuery.includes(w)) score += 1;
      });
    });

    if (score > highestScore) {
      highestScore = score;
      bestMatch = { insight, knowledge };
    }
  });

  // Threshold to avoid false positive triggers
  return highestScore >= 4 ? bestMatch : null;
}

/**
 * Checks if the user's message is a follow-up query relying on conversational context (e.g., "this", "it", "what to do").
 */
function isFollowUpQuestion(query: string): boolean {
  const q = query.toLowerCase().trim();
  return (
    /^(why\s+(did\s+)?(this|that|it)\s+happen|why\s+(this|that|it)|what\s+caused\s+(this|that|it)|what\s+are\s+the\s+causes|tell\s+me\s+why)/i.test(q) ||
    /^(what\s+should\s+we\s+do|what\s+to\s+do|how\s+(can\s+we|do\s+we|to)\s+(fix|solve|address|mitigate|resolve)\s+(this|it|that)|what\s+are\s+the\s+actions|what\s+actions|action\s+plan|recommendations|next\s+steps)/i.test(q) ||
    /^(who\s+is\s+affected|which\s+(team|department|region|group)\s+is\s+affected|affected\s+population|where\s+is\s+this)/i.test(q) ||
    /^(what\s+is\s+the\s+(risk|impact|business\s+impact)|what\s+happens\s+if\s+(we\s+ignore|ignored|nothing\s+is\s+done)|risk\s+if\s+ignored)/i.test(q) ||
    /^(what\s+is\s+the\s+evidence|show\s+(me\s+)?evidence|data\s+sources|findings|key\s+findings|historical\s+trend)/i.test(q) ||
    /^(tell\s+me\s+more|give\s+me\s+more\s+details|explain\s+further|elaborate|more\s+info|more\s+details)/i.test(q) ||
    /^(how\s+confident\s+are\s+we|confidence\s+level|data\s+freshness)/i.test(q)
  );
}

/**
 * Synthesizes natural, conversational, ChatGPT-like responses from the detailed knowledge base.
 */
function generateContextualAnswer(
  query: string,
  insight: Insight,
  knowledge: DetailedInsightKnowledge
): { answer: string; suggestedQuestions: string[] } {
  const q = query.toLowerCase().trim();

  const isWhyIntent = /(why|cause|reason|factor|driver|behind|source|trigger|happened)/i.test(q);
  const isActionIntent = /(what\s+should|action|recommend|next\s+step|fix|solve|mitigate|address|plan|how\s+to|what\s+to\s+do)/i.test(q);
  const isImpactOrRiskIntent = /(impact|risk|consequence|ignore|happen\s+if|business\s+impact|cost)/i.test(q);
  const isWhoOrWhereIntent = /(who|where|population|team|department|region|location|group)/i.test(q);
  const isTrendOrEvidenceIntent = /(trend|history|historical|evidence|source|data|survey|finding)/i.test(q);

  const trendArrow = insight.trend === 'down' ? '↓' : '↑';

  // 1. Root Cause / Contributing Factors Focus ("Why did this happen?")
  if (isWhyIntent && !isActionIntent) {
    const factorsList = knowledge.contributingFactors.map((f) => `• **${f}**`).join('\n');
    const findingsList = knowledge.keyFindings.slice(0, 2).map((k) => `• ${k}`).join('\n');

    return {
      answer: `### Why did this happen? (${insight.title})\n\nThe **${trendArrow} ${insight.change}** change in **${insight.metric}** (${insight.region}) is primarily driven by the following contributing factors:\n\n${factorsList}\n\n**Key Findings & Signals:**\n${findingsList}\n\n**Historical Trajectory:**\n${knowledge.historicalTrend}\n\nWould you like me to walk through the recommended actions to resolve this?`,
      suggestedQuestions: [
        `What should we do?`,
        `What is the business risk if ignored?`,
        `Who is affected?`
      ]
    };
  }

  // 2. Recommendations & Action Plan Focus ("What should we do?")
  if (isActionIntent) {
    const detailedActionsFormatted = knowledge.recommendedActionsDetailed
      .map(
        (rec, index) =>
          `**${index + 1}. ${rec.action}**\n   • *Why:* ${rec.reason}\n   • *Expected Outcome:* ${rec.expectedOutcome}`
      )
      .join('\n\n');

    return {
      answer: `### Recommended Action Plan: ${insight.title}\n\nTo address this update and restore target metrics, here is the structured remediation plan:\n\n${detailedActionsFormatted}\n\n**Target Resolution Goal:** Mitigate operational drag across ${knowledge.affectedPopulation} with verified ${knowledge.confidence} confidence telemetry (${knowledge.dataFreshness}).`,
      suggestedQuestions: [
        `Why did this happen?`,
        `What is the risk if ignored?`,
        `Show evidence and findings`
      ]
    };
  }

  // 3. Risk & Business Impact Focus
  if (isImpactOrRiskIntent) {
    return {
      answer: `### Business Impact & Risk Analysis: ${insight.title}\n\n**Immediate Business Impact:**\n${knowledge.businessImpact}\n\n**Risk If Ignored:**\n${knowledge.riskIfIgnored}\n\n**Affected Scope:**\n${knowledge.affectedPopulation}\n\nAddressing this early will prevent compounded downstream costs and timeline slippage.`,
      suggestedQuestions: [
        `What should we do?`,
        `Why did this happen?`,
        `What is the historical trend?`
      ]
    };
  }

  // 4. Affected Population / Scope Focus
  if (isWhoOrWhereIntent) {
    return {
      answer: `### Affected Scope: ${insight.title}\n\n• **Directly Impacted Area:** ${knowledge.affectedPopulation}\n• **Region / Unit:** ${insight.region}\n• **Metric Movement:** ${insight.metric} shifted by **${trendArrow} ${insight.change}**\n• **Priority Level:** ${insight.severity} Priority\n\n**Context Overview:**\n${knowledge.overview}`,
      suggestedQuestions: [
        `Why did this happen?`,
        `What should we do?`,
        `Show the risk if ignored`
      ]
    };
  }

  // 5. Evidence & Historical Trend Focus
  if (isTrendOrEvidenceIntent) {
    const evidenceList = knowledge.evidence.map((e) => `• ${e}`).join('\n');
    const findingsList = knowledge.keyFindings.map((f) => `• ${f}`).join('\n');

    return {
      answer: `### Evidence & Historical Trend: ${insight.title}\n\n**Historical Trend:**\n${knowledge.historicalTrend}\n\n**Key Telemetry Findings:**\n${findingsList}\n\n**Evidence Sources:**\n${evidenceList}\n\n• **Data Freshness:** ${knowledge.dataFreshness}\n• **Analysis Confidence:** ${knowledge.confidence}`,
      suggestedQuestions: [
        `Why did this happen?`,
        `What should we do?`,
        `What is the business impact?`
      ]
    };
  }

  // 6. Default: Comprehensive Natural Overview (when user asks "Tell me more about X" or general questions)
  const findingsSummary = knowledge.keyFindings.map((f) => `• ${f}`).join('\n');
  const topActions = knowledge.recommendedActionsDetailed
    .map((a, i) => `**${i + 1}. ${a.action}** — *${a.expectedOutcome}*`)
    .join('\n');

  return {
    answer: `### Detailed Intelligence: ${insight.title}\n\n${knowledge.overview}\n\n**Historical Trajectory:**\n${knowledge.historicalTrend}\n\n**Affected Scope:**\n${knowledge.affectedPopulation}\n\n**Key Findings:**\n${findingsSummary}\n\n**Strategic & Operational Impact:**\n${knowledge.businessImpact}\n\n**Recommended Next Steps:**\n${topActions}\n\n*(Confidence: ${knowledge.confidence} • ${knowledge.dataFreshness})*`,
    suggestedQuestions: [
      `Why did this happen?`,
      `What should we do?`,
      `What is the risk if ignored?`
    ]
  };
}

/**
 * Main chatbot entry point with conversation context tracking.
 *
 * @param query The user's prompt or question
 * @param userRole The role of the logged in user (HR | Manager | Executive)
 * @param activeInsights The list of dashboard insights for this role
 * @param currentInsightId Optional session context tracking the most recently discussed insight ID
 */
export async function askInsightChatbot(
  query: string,
  userRole: UserRole,
  activeInsights: Insight[],
  currentInsightId?: number | null
): Promise<RagResponse> {
  // Simulate natural assistant latency
  await new Promise((resolve) => setTimeout(resolve, 380));

  const normalizedQuery = query.toLowerCase().trim();

  // 1. Handle Greetings
  const isGreeting = /^(hi|hello|hey|greetings|good\s(morning|afternoon|evening))/i.test(normalizedQuery);
  if (isGreeting && normalizedQuery.length < 25) {
    const sampleTitles = activeInsights.slice(0, 3).map((i) => `"${i.title}"`).join(', ');
    return {
      answer: `Hello! I am your **InSightAI Assistant** for **${userRole}**. I have full access to your detailed operational knowledge base and live dashboard metrics.\n\nTry asking about: ${sampleTitles}, or ask for a summary of all updates.`,
      suggestedQuestions: activeInsights.slice(0, 3).map((i) => `Tell me more about ${i.title}`),
      updatedContextInsightId: currentInsightId || null
    };
  }

  // 2. Handle List / Summary of all updates
  const isListRequest = /all\s+(updates|insights)|summary|overview|what\s+(do\s+i\s+have|insights|updates)|list/i.test(normalizedQuery);
  if (isListRequest && !isFollowUpQuestion(normalizedQuery)) {
    const listSummary = activeInsights
      .map(
        (i, idx) =>
          `**${idx + 1}. ${i.title}** (${i.region})\n• Metric: ${i.metric} (${i.change})\n• Category: ${i.category || 'General'}\n• Priority: ${i.severity}`
      )
      .join('\n\n');

    return {
      answer: `Here is a summary of the **${activeInsights.length} current updates** available for your **${userRole}** dashboard:\n\n${listSummary}\n\nAsk me about any specific update (e.g. *"Tell me more about ${activeInsights[0]?.title || 'the first item'}"*) to explore root causes, risks, and action plans.`,
      suggestedQuestions: activeInsights.slice(0, 3).map((i) => `Tell me more about ${i.title}`),
      updatedContextInsightId: null
    };
  }

  // 3. STEP A: Check if the user query explicitly identifies a new insight within the user's role
  const explicitMatch = findRelevantInsightInRole(query, userRole, activeInsights);

  if (explicitMatch) {
    // We identified a specific insight -> set it as the new active conversation context
    const generated = generateContextualAnswer(query, explicitMatch.insight, explicitMatch.knowledge);
    return {
      answer: generated.answer,
      matchedInsight: explicitMatch.insight,
      matchedKnowledge: explicitMatch.knowledge,
      suggestedQuestions: generated.suggestedQuestions,
      updatedContextInsightId: explicitMatch.insight.id
    };
  }

  // 4. STEP B: If no new insight was identified, check for active `currentInsight` conversation context
  if (currentInsightId) {
    const contextInsight = activeInsights.find((i) => i.id === currentInsightId && i.role === userRole);
    const contextKnowledge = getDetailedKnowledgeByInsightId(currentInsightId);

    if (contextInsight && contextKnowledge && contextKnowledge.role === userRole) {
      // Contextual continuation of the previous topic
      const generated = generateContextualAnswer(query, contextInsight, contextKnowledge);
      return {
        answer: generated.answer,
        matchedInsight: contextInsight,
        matchedKnowledge: contextKnowledge,
        suggestedQuestions: generated.suggestedQuestions,
        updatedContextInsightId: contextInsight.id // Retain context
      };
    }
  }

  // 5. STEP C: No relevant insight identified and no valid conversation context
  return {
    answer: "I don't currently have enough information about that in the available insights. Please ask me about one of the updates shown on your dashboard.",
    suggestedQuestions: activeInsights.slice(0, 3).map((i) => `Tell me more about ${i.title}`),
    updatedContextInsightId: null
  };
}

/**
 * Returns initial welcoming conversation for the chatbot based on current user role.
 */
export function getInitialChatMessages(userRole: UserRole, insights: Insight[]): ChatMessage[] {
  const sampleTopics = insights.slice(0, 3).map((i) => i.title);

  return [
    {
      id: 'welcome_1',
      sender: 'ai',
      text: `Hello! I am your **InSightAI Assistant**. I am connected to the detailed **${userRole} Knowledge Base**.\n\nYou can ask about specific dashboard updates, investigate why they happened, review evidence, or ask what actions we should take.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedQuestions: sampleTopics.map((t) => `Tell me more about ${t}`)
    }
  ];
}
