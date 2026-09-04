import {
  Insight,
  UserRole,
  ChatMessage,
  DetailedInsightKnowledge,
} from "../types";

import {
  getDetailedKnowledgeByInsightId,
  getDetailedKnowledgeByRole,
} from "../data/ragKnowledgeBase";

export interface RagResponse {
  answer: string;
  matchedInsight?: Insight;
  matchedKnowledge?: DetailedInsightKnowledge;
  suggestedQuestions?: string[];
  updatedContextInsightId?: number | null;
}


/* ============================================================
   FIND RELEVANT CARD FOR THE USER'S ROLE
============================================================ */

function findRelevantInsightInRole(
  query: string,
  userRole: UserRole,
  insights: Insight[],
): {
  insight: Insight;
  knowledge: DetailedInsightKnowledge;
} | null {

  const normalizedQuery = query.toLowerCase().trim();

  const roleKnowledge =
    getDetailedKnowledgeByRole(userRole);

  let bestMatch: {
    insight: Insight;
    knowledge: DetailedInsightKnowledge;
  } | null = null;

  let highestScore = 0;

  insights.forEach((insight) => {

    const knowledge = roleKnowledge.find(
      (item) => item.insightId === insight.id
    );

    if (!knowledge) return;

    let score = 0;

    const titleWords =
      insight.title.toLowerCase().split(/\s+/);

    const metricWords =
      insight.metric.toLowerCase().split(/\s+/);


    // Exact title

    if (
      normalizedQuery.includes(
        insight.title.toLowerCase()
      )
    ) {
      score += 30;
    }


    // Title words

    titleWords.forEach((word) => {

      if (
        word.length > 3 &&
        normalizedQuery.includes(word)
      ) {
        score += 5;
      }

    });


    // Metric words

    metricWords.forEach((word) => {

      if (
        word.length > 3 &&
        normalizedQuery.includes(word)
      ) {
        score += 3;
      }

    });


    // Region

    if (
      insight.region &&
      normalizedQuery.includes(
        insight.region.toLowerCase()
      )
    ) {
      score += 10;
    }


    // Category

    if (
      insight.category &&
      normalizedQuery.includes(
        insight.category.toLowerCase()
      )
    ) {
      score += 6;
    }


    // Key findings

    knowledge.keyFindings.forEach((finding) => {

      finding
        .toLowerCase()
        .split(/\s+/)
        .forEach((word) => {

          if (
            word.length > 4 &&
            normalizedQuery.includes(word)
          ) {
            score += 1;
          }

        });

    });


    if (score > highestScore) {

      highestScore = score;

      bestMatch = {
        insight,
        knowledge,
      };

    }

  });


  return highestScore >= 4
    ? bestMatch
    : null;
}


/* ============================================================
   CHECK FOLLOW-UP QUESTIONS
============================================================ */

function isFollowUpQuestion(
  query: string
): boolean {

  const q =
    query.toLowerCase().trim();

  return /why|cause|reason|what happened|what should|action|recommend|risk|impact|who is affected|tell me more|more details|evidence|findings|next step|fix|solve/i.test(
    q
  );
}


/* ============================================================
   GENERATE LOCAL DUMMY RAG ANSWER
============================================================ */

function generateContextualAnswer(
  query: string,
  insight: Insight,
  knowledge: DetailedInsightKnowledge,
): {
  answer: string;
  suggestedQuestions: string[];
} {

  const q =
    query.toLowerCase().trim();


  const isWhyIntent =
    /why|cause|reason|factor|driver|happened/i.test(q);


  const isActionIntent =
    /what should|action|recommend|next step|fix|solve|address|plan|what to do/i.test(
      q
    );


  const isImpactIntent =
    /impact|risk|ignore|consequence/i.test(q);


  const isAffectedIntent =
    /who|affected|region|team|department|group/i.test(
      q
    );


  const isEvidenceIntent =
    /evidence|finding|data|trend|history/i.test(
      q
    );


  /* ============================
     WHY DID THIS HAPPEN
  ============================ */

  if (isWhyIntent) {

    const factors =
      knowledge.contributingFactors.length > 0
        ? knowledge.contributingFactors
            .map(
              (factor) => `• ${factor}`
            )
            .join("\n")
        : "• No additional contributing factors are available.";


    return {

      answer:
        `### Why did this happen?\n\n` +

        `**${insight.title}**\n\n` +

        `**Root Cause:**\n${knowledge.rootCause}\n\n` +

        `**Contributing Factors:**\n${factors}`,

      suggestedQuestions: [
        "What should we do?",
        "What is the business impact?",
        "What happens if we ignore this?",
      ],

    };

  }


  /* ============================
     ACTIONS
  ============================ */

  if (isActionIntent) {

    const actions =
      knowledge.recommendations.length > 0
        ? knowledge.recommendations
            .map(
              (item, index) =>
                `${index + 1}. **${item.action}**` +
                (item.why
                  ? `\n   Why: ${item.why}`
                  : "") +
                (item.nextStep
                  ? `\n   Next step: ${item.nextStep}`
                  : "")
            )
            .join("\n\n")
        : "No specific recommendations are currently available.";


    return {

      answer:
        `### Recommended Actions\n\n` +

        `For **${insight.title}**, the recommended actions are:\n\n` +

        actions,

      suggestedQuestions: [
        "Why did this happen?",
        "Who is affected?",
        "What is the risk if ignored?",
      ],

    };

  }


  /* ============================
     BUSINESS IMPACT / RISK
  ============================ */

  if (isImpactIntent) {

    return {

      answer:
        `### Business Impact & Risk\n\n` +

        `**Business Impact:**\n` +
        `${knowledge.businessImpact}\n\n` +

        `**Risk if Ignored:**\n` +
        `${knowledge.riskIfIgnored}`,

      suggestedQuestions: [
        "What should we do?",
        "Why did this happen?",
        "Who is affected?",
      ],

    };

  }


  /* ============================
     WHO IS AFFECTED
  ============================ */

  if (isAffectedIntent) {

    return {

      answer:
        `### Affected Area\n\n` +

        `**Affected Population:**\n` +
        `${knowledge.affectedPopulation}\n\n` +

        `**Region:** ${insight.region}\n` +
        `**Metric:** ${insight.metric}\n` +
        `**Change:** ${insight.change}`,

      suggestedQuestions: [
        "Why did this happen?",
        "What should we do?",
        "What is the impact?",
      ],

    };

  }


  /* ============================
     FINDINGS / EVIDENCE
  ============================ */

  if (isEvidenceIntent) {

    const findings =
      knowledge.keyFindings.length > 0
        ? knowledge.keyFindings
            .map(
              (item) => `• ${item}`
            )
            .join("\n")
        : "No additional findings are available.";


    return {

      answer:
        `### Key Findings\n\n` +

        findings,

      suggestedQuestions: [
        "Why did this happen?",
        "What should we do?",
        "What is the business impact?",
      ],

    };

  }


  /* ============================
     DEFAULT DETAILED ANSWER
  ============================ */

  const findings =
    knowledge.keyFindings.length > 0
      ? knowledge.keyFindings
          .slice(0, 5)
          .map(
            (item) => `• ${item}`
          )
          .join("\n")
      : "No additional findings available.";


  const actions =
    knowledge.recommendations.length > 0
      ? knowledge.recommendations
          .slice(0, 3)
          .map(
            (item, index) =>
              `${index + 1}. ${item.action}`
          )
          .join("\n")
      : "No recommendations available.";


  return {

    answer:
      `### ${insight.title}\n\n` +

      `**What Happened:**\n` +
      `${knowledge.whatHappened}\n\n` +

      `**Root Cause:**\n` +
      `${knowledge.rootCause}\n\n` +

      `**Key Findings:**\n` +
      `${findings}\n\n` +

      `**Business Impact:**\n` +
      `${knowledge.businessImpact}\n\n` +

      `**Recommended Actions:**\n` +
      `${actions}`,

    suggestedQuestions: [
      "Why did this happen?",
      "What should we do?",
      "What is the risk if ignored?",
    ],

  };

}


/* ============================================================
   MAIN DUMMY CHATBOT FUNCTION
============================================================ */

export async function askInsightChatbot(
  query: string,
  userRole: UserRole,
  activeInsights: Insight[],
  currentInsightId?: number | null,
): Promise<RagResponse> {


  // Small delay so chatbot feels natural

  await new Promise(
    (resolve) => setTimeout(resolve, 400)
  );


  const normalizedQuery =
    query.toLowerCase().trim();


  /* ============================
     GREETING
  ============================ */

  if (
    /^(hi|hello|hey|good morning|good afternoon|good evening)/i.test(
      normalizedQuery
    )
  ) {

    return {

      answer:
        `Hello! 👋 I am your **InSightAI Assistant** for **${userRole}**.\n\n` +

        `You can ask me about any insight currently available on your dashboard.`,

      suggestedQuestions:
        activeInsights
          .slice(0, 3)
          .map(
            (insight) =>
              `Tell me more about ${insight.title}`
          ),

      updatedContextInsightId:
        currentInsightId || null,

    };

  }


  /* ============================
     SUMMARY OF CARDS
  ============================ */

  if (
    /summary|all insights|all updates|show insights|list insights/i.test(
      normalizedQuery
    )
  ) {

    const summary =
      activeInsights
        .map(
          (insight, index) =>
            `**${index + 1}. ${insight.title}**\n` +
            `• ${insight.metric}: ${insight.change}\n` +
            `• Priority: ${insight.severity}`
        )
        .join("\n\n");


    return {

      answer:
        `### Your Current ${userRole} Insights\n\n` +
        summary,

      suggestedQuestions:
        activeInsights
          .slice(0, 3)
          .map(
            (insight) =>
              `Tell me more about ${insight.title}`
          ),

      updatedContextInsightId: null,

    };

  }


  /* ============================
     FIND EXPLICIT CARD
  ============================ */

  const explicitMatch =
    findRelevantInsightInRole(
      query,
      userRole,
      activeInsights
    );


  if (explicitMatch) {

    const generated =
      generateContextualAnswer(
        query,
        explicitMatch.insight,
        explicitMatch.knowledge
      );


    return {

      answer:
        generated.answer,

      matchedInsight:
        explicitMatch.insight,

      matchedKnowledge:
        explicitMatch.knowledge,

      suggestedQuestions:
        generated.suggestedQuestions,

      updatedContextInsightId:
        explicitMatch.insight.id,

    };

  }


  /* ============================
     FOLLOW-UP TO CURRENT CARD
  ============================ */

  if (
    currentInsightId &&
    isFollowUpQuestion(query)
  ) {

    const insight =
      activeInsights.find(
        (item) =>
          item.id === currentInsightId
      );


    const knowledge =
      getDetailedKnowledgeByInsightId(
        currentInsightId
      );


    if (insight && knowledge) {

      const generated =
        generateContextualAnswer(
          query,
          insight,
          knowledge
        );


      return {

        answer:
          generated.answer,

        matchedInsight:
          insight,

        matchedKnowledge:
          knowledge,

        suggestedQuestions:
          generated.suggestedQuestions,

        updatedContextInsightId:
          currentInsightId,

      };

    }

  }


  /* ============================
     FALLBACK
  ============================ */

  return {

    answer:
      `I can help you explore your **${userRole} insights**. ` +
      `Try asking about a specific card, for example:\n\n` +
      `"Tell me more about ${activeInsights[0]?.title || "this insight"}"\n\n` +
      `You can also ask **why it happened**, **what actions to take**, or **what the business impact is**.`,

    suggestedQuestions:
      activeInsights
        .slice(0, 3)
        .map(
          (insight) =>
            `Tell me more about ${insight.title}`
        ),

    updatedContextInsightId:
      currentInsightId || null,

  };

}


/* ============================================================
   INITIAL CHAT MESSAGE
============================================================ */

export function getInitialChatMessages(
  userRole: UserRole,
  insights: Insight[],
): ChatMessage[] {

  const sampleTopics =
    insights
      .slice(0, 3)
      .map(
        (insight) => insight.title
      );


  return [

    {

      id: "welcome_1",

      sender: "ai",

      text:
        `Hello! I am your **InSightAI Assistant**. ` +
        `I can help you explore the current **${userRole} insights**.\n\n` +
        `Ask me why an issue happened, what actions are recommended, ` +
        `who is affected, or what the business impact could be.`,

      timestamp:
        new Date().toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        ),

      suggestedQuestions:
        sampleTopics.map(
          (topic) =>
            `Tell me more about ${topic}`
        ),

    },

  ];

}

// import {
//   Insight,
//   UserRole,
//   ChatMessage,
//   DetailedInsightKnowledge,
// } from "../types";
// import {
//   RAG_KNOWLEDGE_BASE,
//   getDetailedKnowledgeByInsightId,
//   getDetailedKnowledgeByRole,
// } from "../data/ragKnowledgeBase";

// // ============================================================
// // STATIC PROTOTYPE CONVERSATION CONTEXT & RAG RETRIEVAL
// // ============================================================
// //
// // This service simulates contextual RAG retrieval with session memory.
// // It maintains conversational state (such as `currentInsight`) across
// // multi-turn dialogues so pronouns ("this", "it", "they") and follow-up
// // inquiries ("Why did this happen?", "What should we do?") correctly
// // resolve to the active business context.
// //
// // CURRENT PROTOTYPE FLOW:
// //
// // User Question
// //       ↓
// // Check for explicit Insight match in active role knowledge
// //       ↓
// // If found → Update session `currentInsight` → Retrieve Detailed Knowledge
// //       ↓
// // If not found → Use active session `currentInsight` (if available)
// //       ↓
// // If neither → Fallback to helpful guidance message
// //       ↓
// // Format natural, ChatGPT-like answer using rich knowledge base attributes
// //
// //
// // FUTURE PRODUCTION ARCHITECTURE:
// //
// // User Question + Conversation History
// //       ↓
// // FastAPI Backend (/api/chat)
// //       ↓
// // Embedding Generation + Contextual Query Rewriter
// //       ↓
// // Vector Database Hybrid Search (Milvus / Pinecone / Chroma)
// //       ↓
// // LLM Prompt Synthesis (Gemini / Claude / GPT)
// //       ↓
// // Real-time Streaming Contextual Answer
// //
// // ============================================================

// export interface RagResponse {
//   answer: string;
//   matchedInsight?: Insight;
//   matchedKnowledge?: DetailedInsightKnowledge;
//   suggestedQuestions?: string[];
//   updatedContextInsightId?: number | null;
// }

// /**
//  * Searches the active role's insights and knowledge base for the most relevant record matching the query.
//  */
// function findRelevantInsightInRole(
//   query: string,
//   userRole: UserRole,
//   insights: Insight[],
// ): { insight: Insight; knowledge: DetailedInsightKnowledge } | null {
//   const normalizedQuery = query.toLowerCase().trim();
//   const roleKnowledge = getDetailedKnowledgeByRole(userRole);

//   let bestMatch: {
//     insight: Insight;
//     knowledge: DetailedInsightKnowledge;
//   } | null = null;
//   let highestScore = 0;

//   insights.forEach((insight) => {
//     // Only search insights matching the current user's role
//     const knowledge = roleKnowledge.find((k) => k.insightId === insight.id);
//     if (!knowledge) return;

//     let score = 0;

//     const titleLower = insight.title.toLowerCase();
//     const metricLower = insight.metric.toLowerCase();
//     const regionLower = insight.region.toLowerCase();
//     const categoryLower = (insight.category || "").toLowerCase();
//     const affectedLower = knowledge.affectedPopulation.toLowerCase();

//     // Exact phrase matches in primary identifiers
//     if (normalizedQuery.includes(titleLower)) score += 25;
//     if (normalizedQuery.includes(metricLower)) score += 15;
//     if (normalizedQuery.includes(regionLower)) score += 12;
//     if (categoryLower && normalizedQuery.includes(categoryLower)) score += 8;
//     if (normalizedQuery.includes(affectedLower)) score += 8;

//     // Word matches for title tokens
//     const titleWords = titleLower.split(/\s+/);
//     titleWords.forEach((word) => {
//       if (word.length > 3 && normalizedQuery.includes(word)) score += 4;
//     });

//     // Word matches for metric tokens
//     const metricWords = metricLower.split(/\s+/);
//     metricWords.forEach((word) => {
//       if (word.length > 3 && normalizedQuery.includes(word)) score += 3;
//     });

//     // Match keywords from key findings & contributing factors
//     knowledge.keyFindings.forEach((finding) => {
//       const words = finding.toLowerCase().split(/\s+/);
//       words.forEach((w) => {
//         if (w.length > 4 && normalizedQuery.includes(w)) score += 1;
//       });
//     });

//     if (score > highestScore) {
//       highestScore = score;
//       bestMatch = { insight, knowledge };
//     }
//   });

//   // Threshold to avoid false positive triggers
//   return highestScore >= 4 ? bestMatch : null;
// }

// /**
//  * Checks if the user's message is a follow-up query relying on conversational context (e.g., "this", "it", "what to do").
//  */
// function isFollowUpQuestion(query: string): boolean {
//   const q = query.toLowerCase().trim();
//   return (
//     /^(why\s+(did\s+)?(this|that|it)\s+happen|why\s+(this|that|it)|what\s+caused\s+(this|that|it)|what\s+are\s+the\s+causes|tell\s+me\s+why)/i.test(
//       q,
//     ) ||
//     /^(what\s+should\s+we\s+do|what\s+to\s+do|how\s+(can\s+we|do\s+we|to)\s+(fix|solve|address|mitigate|resolve)\s+(this|it|that)|what\s+are\s+the\s+actions|what\s+actions|action\s+plan|recommendations|next\s+steps)/i.test(
//       q,
//     ) ||
//     /^(who\s+is\s+affected|which\s+(team|department|region|group)\s+is\s+affected|affected\s+population|where\s+is\s+this)/i.test(
//       q,
//     ) ||
//     /^(what\s+is\s+the\s+(risk|impact|business\s+impact)|what\s+happens\s+if\s+(we\s+ignore|ignored|nothing\s+is\s+done)|risk\s+if\s+ignored)/i.test(
//       q,
//     ) ||
//     /^(what\s+is\s+the\s+evidence|show\s+(me\s+)?evidence|data\s+sources|findings|key\s+findings|historical\s+trend)/i.test(
//       q,
//     ) ||
//     /^(tell\s+me\s+more|give\s+me\s+more\s+details|explain\s+further|elaborate|more\s+info|more\s+details)/i.test(
//       q,
//     ) ||
//     /^(how\s+confident\s+are\s+we|confidence\s+level|data\s+freshness)/i.test(q)
//   );
// }

// /**
//  * Synthesizes natural, conversational, ChatGPT-like responses from the detailed knowledge base.
//  */
// function generateContextualAnswer(
//   query: string,
//   insight: Insight,
//   knowledge: DetailedInsightKnowledge,
// ): { answer: string; suggestedQuestions: string[] } {
//   const q = query.toLowerCase().trim();

//   const isWhyIntent =
//     /(why|cause|reason|factor|driver|behind|source|trigger|happened)/i.test(q);
//   const isActionIntent =
//     /(what\s+should|action|recommend|next\s+step|fix|solve|mitigate|address|plan|how\s+to|what\s+to\s+do)/i.test(
//       q,
//     );
//   const isImpactOrRiskIntent =
//     /(impact|risk|consequence|ignore|happen\s+if|business\s+impact|cost)/i.test(
//       q,
//     );
//   const isWhoOrWhereIntent =
//     /(who|where|population|team|department|region|location|group)/i.test(q);
//   const isTrendOrEvidenceIntent =
//     /(trend|history|historical|evidence|source|data|survey|finding)/i.test(q);

//   const trendArrow = insight.trend === "down" ? "↓" : "↑";

//   // 1. Root Cause / Contributing Factors Focus ("Why did this happen?")
//   if (isWhyIntent && !isActionIntent) {
//     const factorsList = knowledge.contributingFactors
//       .map((f) => `• **${f}**`)
//       .join("\n");
//     const findingsList = knowledge.keyFindings
//       .slice(0, 2)
//       .map((k) => `• ${k}`)
//       .join("\n");

//     return {
//       answer: `### Why did this happen? (${insight.title})\n\nThe **${trendArrow} ${insight.change}** change in **${insight.metric}** (${insight.region}) is primarily driven by the following contributing factors:\n\n${factorsList}\n\n**Key Findings & Signals:**\n${findingsList}\n\n**Historical Trajectory:**\n${knowledge.historicalTrend}\n\nWould you like me to walk through the recommended actions to resolve this?`,
//       suggestedQuestions: [
//         `What should we do?`,
//         `What is the business risk if ignored?`,
//         `Who is affected?`,
//       ],
//     };
//   }

//   // 2. Recommendations & Action Plan Focus ("What should we do?")
//   if (isActionIntent) {
//     const detailedActionsFormatted = knowledge.recommendedActionsDetailed
//       .map(
//         (rec, index) =>
//           `**${index + 1}. ${rec.action}**\n   • *Why:* ${rec.reason}\n   • *Expected Outcome:* ${rec.expectedOutcome}`,
//       )
//       .join("\n\n");

//     return {
//       answer: `### Recommended Action Plan: ${insight.title}\n\nTo address this update and restore target metrics, here is the structured remediation plan:\n\n${detailedActionsFormatted}\n\n**Target Resolution Goal:** Mitigate operational drag across ${knowledge.affectedPopulation} with verified ${knowledge.confidence} confidence telemetry (${knowledge.dataFreshness}).`,
//       suggestedQuestions: [
//         `Why did this happen?`,
//         `What is the risk if ignored?`,
//         `Show evidence and findings`,
//       ],
//     };
//   }

//   // 3. Risk & Business Impact Focus
//   if (isImpactOrRiskIntent) {
//     return {
//       answer: `### Business Impact & Risk Analysis: ${insight.title}\n\n**Immediate Business Impact:**\n${knowledge.businessImpact}\n\n**Risk If Ignored:**\n${knowledge.riskIfIgnored}\n\n**Affected Scope:**\n${knowledge.affectedPopulation}\n\nAddressing this early will prevent compounded downstream costs and timeline slippage.`,
//       suggestedQuestions: [
//         `What should we do?`,
//         `Why did this happen?`,
//         `What is the historical trend?`,
//       ],
//     };
//   }

//   // 4. Affected Population / Scope Focus
//   if (isWhoOrWhereIntent) {
//     return {
//       answer: `### Affected Scope: ${insight.title}\n\n• **Directly Impacted Area:** ${knowledge.affectedPopulation}\n• **Region / Unit:** ${insight.region}\n• **Metric Movement:** ${insight.metric} shifted by **${trendArrow} ${insight.change}**\n• **Priority Level:** ${insight.severity} Priority\n\n**Context Overview:**\n${knowledge.overview}`,
//       suggestedQuestions: [
//         `Why did this happen?`,
//         `What should we do?`,
//         `Show the risk if ignored`,
//       ],
//     };
//   }

//   // 5. Evidence & Historical Trend Focus
//   if (isTrendOrEvidenceIntent) {
//     const evidenceList = knowledge.evidence.map((e) => `• ${e}`).join("\n");
//     const findingsList = knowledge.keyFindings.map((f) => `• ${f}`).join("\n");

//     return {
//       answer: `### Evidence & Historical Trend: ${insight.title}\n\n**Historical Trend:**\n${knowledge.historicalTrend}\n\n**Key Telemetry Findings:**\n${findingsList}\n\n**Evidence Sources:**\n${evidenceList}\n\n• **Data Freshness:** ${knowledge.dataFreshness}\n• **Analysis Confidence:** ${knowledge.confidence}`,
//       suggestedQuestions: [
//         `Why did this happen?`,
//         `What should we do?`,
//         `What is the business impact?`,
//       ],
//     };
//   }

//   // 6. Default: Comprehensive Natural Overview (when user asks "Tell me more about X" or general questions)
//   const findingsSummary = knowledge.keyFindings.map((f) => `• ${f}`).join("\n");
//   const topActions = knowledge.recommendedActionsDetailed
//     .map((a, i) => `**${i + 1}. ${a.action}** — *${a.expectedOutcome}*`)
//     .join("\n");

//   return {
//     answer: `### Detailed Intelligence: ${insight.title}\n\n${knowledge.overview}\n\n**Historical Trajectory:**\n${knowledge.historicalTrend}\n\n**Affected Scope:**\n${knowledge.affectedPopulation}\n\n**Key Findings:**\n${findingsSummary}\n\n**Strategic & Operational Impact:**\n${knowledge.businessImpact}\n\n**Recommended Next Steps:**\n${topActions}\n\n*(Confidence: ${knowledge.confidence} • ${knowledge.dataFreshness})*`,
//     suggestedQuestions: [
//       `Why did this happen?`,
//       `What should we do?`,
//       `What is the risk if ignored?`,
//     ],
//   };
// }

// /**
//  * Main chatbot entry point with conversation context tracking.
//  *
//  * @param query The user's prompt or question
//  * @param userRole The role of the logged in user (HR | Manager | Executive)
//  * @param activeInsights The list of dashboard insights for this role
//  * @param currentInsightId Optional session context tracking the most recently discussed insight ID
//  */
// export async function askInsightChatbot(
//   query: string,
//   userRole: UserRole,
//   activeInsights: Insight[],
//   currentInsightId?: number | null,
// ): Promise<RagResponse> {
//   try {
//     // Send the user's question to the FastAPI RAG backend
//     const response = await fetch("http://127.0.0.1:8001/api/chat", {
//       method: "POST",

//       headers: {
//         "Content-Type": "application/json",
//       },

//       body: JSON.stringify({
//         message: query,
//       }),
//     });

//     // Check if the backend returned an error
//     if (!response.ok) {
//       throw new Error(`Chatbot API error: ${response.status}`);
//     }

//     // Get the answer returned by Ollama
//     const data = await response.json();

//     // Return the answer in the format expected by the frontend
//     return {
//       answer: data.answer,

//       suggestedQuestions: [
//         "What recommendations were made?",
//         "What caused this business event?",
//         "What evidence supports this?",
//       ],

//       updatedContextInsightId: currentInsightId || null,
//     };
//   } catch (error) {
//     console.error("Failed to connect to InSightAI chatbot:", error);

//     // Show this if the FastAPI backend is not running
//     return {
//       answer:
//         "I am unable to connect to the InSightAI RAG backend. Please make sure the FastAPI server is running on port 8000.",

//       suggestedQuestions: [],

//       updatedContextInsightId: currentInsightId || null,
//     };
//   }
// }

// // ============================================================
// // INITIAL CHAT MESSAGE
// // ============================================================

// export function getInitialChatMessages(
//   userRole: UserRole,
//   insights: Insight[],
// ): ChatMessage[] {
//   const sampleTopics = insights.slice(0, 3).map((i) => i.title);

//   return [
//     {
//       id: "welcome_1",

//       sender: "ai",

//       text:
//         `Hello! I am your **InSightAI Assistant**. ` +
//         `I am connected to the detailed **${userRole} Knowledge Base**.\n\n` +
//         `You can ask about specific dashboard updates, investigate why they happened, ` +
//         `review evidence, or ask what actions we should take.`,

//       timestamp: new Date().toLocaleTimeString([], {
//         hour: "2-digit",
//         minute: "2-digit",
//       }),

//       suggestedQuestions: sampleTopics.map(
//         (topic) => `Tell me more about ${topic}`,
//       ),
//     },
//   ];
// }
