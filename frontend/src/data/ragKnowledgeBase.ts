import { DetailedInsightKnowledge, UserRole } from '../types';

// ============================================================
// STATIC PROTOTYPE KNOWLEDGE BASE
// ============================================================
//
// This file simulates the detailed information that would
// normally exist in an enterprise Knowledge Base.
//
// CURRENT PROTOTYPE:
//
// Static Knowledge Base (ragKnowledgeBase.ts)
//          ↓
// Simulated Retrieval (by insightId / role)
//          ↓
// Chatbot Response / Contextual Expansion
//
//
// FUTURE PRODUCTION ARCHITECTURE:
//
// User Question
//          ↓
// FastAPI Backend
//          ↓
// RAG Retrieval Pipeline
//          ↓
// Vector Database / Enterprise Knowledge Base
//          ↓
// LLM (Contextual Synthesis)
//          ↓
// Contextual Answer
//
// ============================================================

export const RAG_KNOWLEDGE_BASE: DetailedInsightKnowledge[] = [
  // ============================================================
  // HR DETAILED KNOWLEDGE (IDs 1 - 5)
  // ============================================================
  {
    insightId: 1,
    role: 'HR',
    title: 'Employee Satisfaction Decline',
    overview:
      'Employee satisfaction has dropped by 18% over the trailing 60-day period across regional commercial teams, accompanied by a 42% spike in negative qualitative comments in anonymous monthly pulse surveys.',
    historicalTrend:
      'Satisfaction index held steady at 84% throughout Q1 and Q2, but began a sharp downturn in early Q3 (declining from 81% to 66%) corresponding with the launch of the accelerated regional sales quota cycle.',
    affectedPopulation:
      'Sales Department, specifically inside sales representatives and mid-market account executives across Tier-1 & Tier-2 regional branches.',
    keyFindings: [
      '68% of surveyed sales representatives reported working in excess of 52 hours per week to meet quota reporting overhead.',
      'Negative sentiment around manager empathy and clarity of communication increased from 12% to 37% quarter-over-quarter.',
      'Employee eNPS (Employee Net Promoter Score) dropped from +24 to -8 in the Western and Northern regional pods.',
      'Exit interview trends cite lack of recognition and erratic shift reassignments as primary dissatisfaction drivers.'
    ],
    contributingFactors: [
      'Uneven quota rebalancing following mid-year corporate revenue target revisions.',
      'Inconsistent manager communication protocols and infrequent 1-on-1 coaching cadences.',
      'Introduction of dual CRM logging requirements without sunsetting legacy data entry workflows.',
      'Limited career development discussions and delayed annual promotion calibrations.'
    ],
    businessImpact:
      'Direct risk of losing high-performing quota carriers, diminished client conversion rates, decreased team morale, and an estimated $340K potential replacement cost if voluntary turnover escalates.',
    riskIfIgnored:
      'Projected voluntary resignation of 12-15 senior account executives within 90 days, loss of institutional sales knowledge, pipeline stagnation, and severe team burnout.',
    recommendedActionsDetailed: [
      {
        action: 'Review workload distribution across regional sales teams',
        reason: 'Identify pods operating above sustainable 45-hour thresholds and redistribute territory pipeline loads evenly.',
        expectedOutcome: 'Reduce individual work fatigue by 25% and stabilize team burnout indicators within 30 days.'
      },
      {
        action: 'Conduct employee feedback sessions and pulse checks',
        reason: 'Create psychological safety for sales personnel to articulate micro-blockers directly to HR business partners.',
        expectedOutcome: 'Increase employee sentiment trust scores and establish immediate visibility into field grievances.'
      },
      {
        action: 'Work with department managers to streamline communication',
        reason: 'Standardize weekly team sync agendas, eliminate redundant ad-hoc meetings, and mandate bi-weekly career 1-on-1s.',
        expectedOutcome: 'Improve manager clarity ratings by 30% and align sales expectations across regional leadership.'
      }
    ],
    evidence: [
      'Q3 Anonymous Monthly Pulse Survey Data (n=340 respondents)',
      'Salesforce Activity Logs showing 31% increase in weekend pipeline edits',
      'HR Case Management Portal: 24 formal escalation tickets regarding managerial communication'
    ],
    confidence: 'High',
    dataFreshness: 'Updated 1 hour ago'
  },
  {
    insightId: 2,
    role: 'HR',
    title: 'Attrition Risk Increased',
    overview:
      'Predictive HR flight-risk models indicate an elevated departure vulnerability score of 78/100 among Senior Staff Software Engineers and Technical Team Leads within the Core Platform & Data Engineering divisions.',
    historicalTrend:
      'Attrition probability among technical leads remained low (4-6%) over the past 18 months, but surged to 14.2% over the last 45 days following aggressive headhunter activity and compressed delivery deadlines.',
    affectedPopulation:
      'Engineering Division — Core Backend Services, Infrastructure Reliability, and Data Platform squads (approx. 85 senior technical contributors).',
    keyFindings: [
      'LinkedIn outbound recruiter outreach acceptance among senior engineers rose by 54% over the last 60 days.',
      'Compensation benchmarking reveals a 16-22% base salary disparity compared to current tech market 75th-percentile bands.',
      'High incidence of continuous on-call pager duty alerts during the recent multi-region cloud migration sprint.',
      'Engineering engagement surveys note perceived lack of technical growth tracks versus management tracks.'
    ],
    contributingFactors: [
      'Outdated compensation bands that lagged behind recent tech industry market adjustments.',
      'Consecutive crunch periods without scheduled cooldown sprints or technical debt reduction intervals.',
      'High key-person dependency on 8 senior architects who hold critical architectural context without backup redundancy.'
    ],
    businessImpact:
      'Severe threat to product delivery timelines, critical system stability vulnerabilities, and replacement costs averaging 1.5x annual base salary per senior engineering vacancy.',
    riskIfIgnored:
      'Potential loss of 4-6 mission-critical system architects before Q4 release, resulting in delayed product launches and substantial institutional knowledge drain.',
    recommendedActionsDetailed: [
      {
        action: 'Authorize targeted retention equity refreshers for critical technical talent',
        reason: 'Close compensation gaps with competitive 4-year vesting equity grants for the top 15% core contributors.',
        expectedOutcome: 'Mitigate short-term flight risk and re-align long-term incentives with organizational enterprise value.'
      },
      {
        action: 'Establish cooldown sprint intervals between major releases',
        reason: 'Dedicate 1 sprint every quarter exclusively to technical debt remediation, refactoring, and learning days.',
        expectedOutcome: 'Reduce engineering fatigue metrics by 40% and improve code quality metrics.'
      },
      {
        action: 'Conduct 1-on-1 stay interviews with engineering team leads',
        reason: 'Proactively uncover individual career aspirations, project preferences, and retention drivers before resignations occur.',
        expectedOutcome: 'Identify actionable individualized retention agreements for 100% of at-risk team leads.'
      }
    ],
    evidence: [
      'InSightAI Flight Risk Predictive ML Model v3.2',
      'Radford Global Tech Compensation Benchmark Study 2024',
      'PagerDuty On-Call Incident Load Report (avg 18 pages/week per lead)'
    ],
    confidence: 'High',
    dataFreshness: 'Updated 2 hours ago'
  },
  {
    insightId: 3,
    role: 'HR',
    title: 'Absenteeism Increased',
    overview:
      'Unplanned employee absence rates across the Global Customer Support Hub rose by 22% over the last 6 weeks, exceeding the acceptable workforce operations tolerance band by 7.5 percentage points.',
    historicalTrend:
      'Absenteeism historically averaged 3.2% of scheduled agent hours; current rate has escalated to 5.4%, with Monday and Friday shifts experiencing up to 8.9% unplanned non-attendance.',
    affectedPopulation:
      'Customer Support Hub & Tier-1 Technical Support Teams (190 tier-1 and tier-2 contact center agents across 3 global shifts).',
    keyFindings: [
      'Average daily ticket resolution load per active agent increased from 38 to 56 tickets due to understaffed shifts.',
      '72% of unplanned absences were logged as acute physical or mental fatigue, migraines, and repetitive stress issues.',
      'Shift-swap rejection rates reached 41% due to restrictive workforce management scheduling rules.',
      'Customer CSAT correlation: days with >6% absenteeism had a 14-point drop in first-contact customer resolution.'
    ],
    contributingFactors: [
      'Consecutive weekend shifts assigned to junior agents without sufficient mandatory rest days.',
      'A 35% surge in customer ticket volume following the recent mobile app checkout release.',
      'Lack of automated routing for tier-1 repetitive FAQs, forcing agents to manually triage trivial status queries.'
    ],
    businessImpact:
      'Overtime budget overruns of $48K/month, increased wait times for premium enterprise customers, and compounding burnout among remaining active support staff.',
    riskIfIgnored:
      'Escalation into structural agent turnover (projected 25% churn in support staff), customer SLA breaches, and degradation of brand customer loyalty.',
    recommendedActionsDetailed: [
      {
        action: 'Rebalance shift scheduling to avoid consecutive weekend allocations',
        reason: 'Prevent agent burnout by capping consecutive working days at 4 and offering flexible 4x10 shift options.',
        expectedOutcome: 'Reduce Monday/Friday absenteeism spikes by 35% within 3 weeks.'
      },
      {
        action: 'Deploy automated AI triage to reduce routine manual ticket load',
        reason: 'Automate tier-1 order status and password reset requests to deflect 30% of incoming ticket volume.',
        expectedOutcome: 'Lower average tickets per agent from 56 down to 39, restoring sustainable cognitive load.'
      },
      {
        action: 'Promote employee assistance and mental wellness programs',
        reason: 'Offer on-demand telehealth counseling stipends, ergonomic workstation audits, and scheduled decompression breaks.',
        expectedOutcome: 'Improve agent wellness participation and cut stress-related sick leave claims by 20%.'
      }
    ],
    evidence: [
      'Kronos / ADP Time & Attendance Absence Log Q3',
      'Zendesk Agent Concurrency & Ticket Volume Dashboard',
      'Support Department Health & Wellness Committee Survey'
    ],
    confidence: 'High',
    dataFreshness: 'Updated 3 hours ago'
  },
  {
    insightId: 4,
    role: 'HR',
    title: 'Hiring Pipeline Delays',
    overview:
      'Average time-to-hire for critical technical roles (Data Engineering, Machine Learning, and Cloud Architecture) has expanded from a benchmark of 32 days to 41.8 days, stalling 14 open headcount slots.',
    historicalTrend:
      'Time-to-hire was on target at 30-33 days throughout Q1. Slower hiring manager resume reviews and expanded interview loops caused progressive delays throughout Q2 and Q3.',
    affectedPopulation:
      'North America Talent Acquisition Team & Technical Hiring Managers in R&D and Product Engineering.',
    keyFindings: [
      'Offer decline rate rose from 8% to 19% because candidate turnaround times exceeded 28 days, causing candidates to accept competing offers.',
      'Hiring managers averaged 4.6 business days to submit post-interview scorecard feedback (target SLA is 24-48 hours).',
      'Technical interview stages increased from 3 rounds to 5 separate interview panels without standardized rubrics.',
      'Recruiter capacity is constrained, with each technical recruiter managing an average of 18 concurrent open requisitions.'
    ],
    contributingFactors: [
      'Absence of an enforced SLA for scorecard submission after technical candidate onsite loops.',
      'Overly complex multi-stage interview funnels involving redundant evaluation criteria across panels.',
      'Passive candidate sourcing bottleneck in niche generative AI and distributed data engineering profiles.'
    ],
    businessImpact:
      'Delayed quarterly roadmap product milestones, increased reliance on expensive external contractor agencies ($85K monthly contractor markup), and lost hiring velocity.',
    riskIfIgnored:
      'Inability to staff core Q4 strategic initiatives, further recruiter burnout, and candidate market perception as a slow, bureaucratic employer.',
    recommendedActionsDetailed: [
      {
        action: 'Enforce a strict 48-hour hiring manager feedback SLA after panel rounds',
        reason: 'Prevent top-tier candidates from receiving competing offers while awaiting evaluation consolidation.',
        expectedOutcome: 'Compress candidate decision cycles by 5 business days and cut candidate drop-off by 40%.'
      },
      {
        action: 'Consolidate technical assessment stages into paired coding sessions',
        reason: 'Replace take-home projects and separate architecture interviews with a single calibrated 90-minute live working session.',
        expectedOutcome: 'Reduce total candidate time commitment by 3 hours and improve candidate Net Promoter Score.'
      },
      {
        action: 'Expand proactive talent pipelining through targeted technical outreach',
        reason: 'Utilize specialized talent intelligence tools and employee referral bounties for niche AI and data engineering roles.',
        expectedOutcome: 'Build an active warm candidate bench of 40 pre-vetted engineers to shorten sourcing cycles.'
      }
    ],
    evidence: [
      'Greenhouse Applicant Tracking System (ATS) Stage Duration Metrics',
      'Candidate Experience Post-Process Feedback Survey (3.4 / 5 rating on process speed)',
      'Quarterly Headcount Fulfillment Variance Report'
    ],
    confidence: 'Medium',
    dataFreshness: 'Updated 4 hours ago'
  },
  {
    insightId: 5,
    role: 'HR',
    title: 'Training Completion Improved',
    overview:
      'Mandatory corporate compliance, cybersecurity hygiene, and frontline manager leadership training completion rates reached 94.2% (+35% increase), setting an all-time organizational benchmark.',
    historicalTrend:
      'Completion rates languished between 58% and 64% in previous quarters due to monolithic 60-minute LMS video modules. Transition to 7-minute micro-learning modules triggered a rapid upward inflection.',
    affectedPopulation:
      'Global Workforce — All 1,450 full-time employees and contractor personnel across all international regional hubs.',
    keyFindings: [
      'Micro-learning format achieved a 98.4% module satisfaction score among frontline managers and technical staff.',
      'Automated Slack / Microsoft Teams reminder nudges reduced the manual HR follow-up overhead by 120 staff hours.',
      'Phishing simulation vulnerability tests dropped from 14.8% click rate to 2.1% following interactive training rollout.',
      'Leadership training participants reported feeling 45% more confident handling difficult performance conversations.'
    ],
    contributingFactors: [
      'Deconstruction of monolithic courses into 5 to 7 minute mobile-friendly interactive modules.',
      'Gamification and departmental completion leaderboards presented in monthly executive meetings.',
      'Inclusion of compliance training completion as a mandatory gating criteria for annual bonus eligibility.'
    ],
    businessImpact:
      'Substantially reduced regulatory compliance risk, enhanced cyber security resilience, and upgraded frontline managerial conflict resolution capabilities.',
    riskIfIgnored:
      'If momentum is lost, employee engagement with subsequent security and professional development initiatives may regress to historical low baselines.',
    recommendedActionsDetailed: [
      {
        action: 'Expand micro-learning modules to technical upskilling programs',
        reason: 'Leverage the validated 7-minute format for internal cloud certifications, AI tooling, and leadership mastery.',
        expectedOutcome: 'Accelerate internal promotions and cross-skilling across 300 technical contributors.'
      },
      {
        action: 'Recognize top-completing departments in company-wide all-hands',
        reason: 'Reinforce positive cultural norms and publicly reward managers who prioritize team growth and compliance.',
        expectedOutcome: 'Maintain sustained completion benchmarks above 90% in upcoming compliance cycles.'
      },
      {
        action: 'Incorporate training completion metrics into quarterly performance reviews',
        reason: 'Institutionalize learning as a core leadership competency across director and managerial evaluation scorecards.',
        expectedOutcome: 'Ensure permanent organizational adherence to safety, security, and DEI training standards.'
      }
    ],
    evidence: [
      'Cornerstone OnDemand LMS Analytics Report Q3',
      'Internal Cyber Security Phishing Simulation Audit Results',
      'Post-Training Participant Comprehension & Retention Test Scores (avg 91%)'
    ],
    confidence: 'High',
    dataFreshness: 'Updated 5 hours ago'
  },

  // ============================================================
  // MANAGER DETAILED KNOWLEDGE (IDs 11 - 15)
  // ============================================================
  {
    insightId: 11,
    role: 'Manager',
    title: 'Retail Revenue Drop',
    overview:
      'Regional retail merchandise revenue in the Maharashtra logistics territory experienced an 8% drop ($420K shortfall against target) driven primarily by localized delivery bottlenecks and order cancellations.',
    historicalTrend:
      'Territory revenue grew at 12% MoM in Q1 and Q2. In the past 3 weeks, daily fulfillment revenue dropped from $75K/day to $61K/day as dispatch delays accumulated.',
    affectedPopulation:
      'Maharashtra Fulfillment Hub, regional retail merchant partners, and 18,000 active retail end-customers in the Western zone.',
    keyFindings: [
      'Order fulfillment turnaround time increased from 1.8 days to 4.3 days across Tier-2 pincodes in the district.',
      'Customer cancellation rate prior to dispatch surged from 2.2% to 7.8% due to uncommunicated shipment delays.',
      'Primary regional 3PL courier partner failed to meet agreed 48-hour delivery SLAs on 28% of assigned consignments.',
      'Inventory stockout at the central Pune transshipment facility caused 450 backordered high-demand retail SKUs.'
    ],
    contributingFactors: [
      'Underperformance and capacity constraints of local secondary 3PL logistics provider during peak seasonal demand.',
      'Monsoon-related road transit disruptions without automated alternate routing triggers in the transport management system.',
      'Delayed shipment status tracking updates on merchant dashboards, eroding buyer trust.'
    ],
    businessImpact:
      'Immediate revenue loss of $420,000, margin compression from expedited re-shipments, and merchant churn risk to competing logistics platforms.',
    riskIfIgnored:
      'Projected customer lifetime value decline of $1.2M, merchant contract non-renewals, and brand reputation impairment in the strategic Western market.',
    recommendedActionsDetailed: [
      {
        action: 'Investigate regional logistics partners and fulfillment routing',
        reason: 'Audit 3PL partner SLA compliance and dynamically re-route 40% of parcel volume to higher-tier regional carriers.',
        expectedOutcome: 'Restore average delivery turnaround from 4.3 days back to 2.1 days within 10 days.'
      },
      {
        action: 'Prioritize delayed deliveries and unblock transit bottlenecks',
        reason: 'Deploy dedicated dispatch triage teams at the Pune transshipment hub to clear backlogged consignment queues.',
        expectedOutcome: 'Clear 100% of the 3,200 backlogged orders within 72 hours.'
      },
      {
        action: 'Notify affected customers proactively with status updates',
        reason: 'Trigger automated SMS/WhatsApp delivery tracking updates with goodwill compensation credits for delayed orders.',
        expectedOutcome: 'Reduce customer cancellation rates from 7.8% back below 2.5%.'
      }
    ],
    evidence: [
      'Maharashtra Regional Fulfillment Dispatch Log (Aug 1 - Aug 28)',
      '3PL Carrier SLA Adherence Report & Penalty Tracker',
      'Merchant Partner Escalation Tickets (48 active formal inquiries)'
    ],
    confidence: 'High',
    dataFreshness: 'Updated 20 mins ago'
  },
  {
    insightId: 12,
    role: 'Manager',
    title: 'Project Delivery Delays',
    overview:
      'Sprint milestone delivery velocity for the Mobile App Redesign Pod has fallen by 20%, resulting in an accumulated 9 business day slip against the scheduled Q3 public release launch date.',
    historicalTrend:
      'Velocity was stable at 88 story points per sprint across Sprints 1-4. In Sprints 5 and 6, completed velocity fell to 64 and 58 points respectively as technical blockers escalated.',
    affectedPopulation:
      'Mobile Engineering Pod (14 frontend iOS/Android developers, 4 QA engineers, and 2 product designers).',
    keyFindings: [
      '4 critical staging defects discovered in the checkout payment gateway integration remained unresolved for 8+ days.',
      'Product management introduced 3 unplanned feature scope modifications midway through Sprint 5 without point re-estimation.',
      'Automated end-to-end integration test suite failure rate reached 34%, forcing extensive manual QA regressions.',
      'Frontend engineers spent an estimated 28% of sprint capacity waiting for mock API contract finalization from backend squads.'
    ],
    contributingFactors: [
      'Scope creep and late requirement changes injected without adjusting target sprint delivery commitments.',
      'Flaky third-party payment gateway staging APIs causing false-positive CI/CD build breakages.',
      'Insufficient paired testing between mobile developers and backend API architects prior to staging deployments.'
    ],
    businessImpact:
      'Risk of missing the critical holiday retail promotional launch window, team overtime burnout, and $150K in scheduled marketing ad-spend misallocations.',
    riskIfIgnored:
      'Failure to launch the mobile app update on App Store / Play Store on time, forfeiting competitive market position and user acquisition targets.',
    recommendedActionsDetailed: [
      {
        action: 'Freeze scope requirements 10 days prior to target release dates',
        reason: 'Prevent mid-sprint scope drift and allow engineering to focus exclusively on stabilization and defect burn-down.',
        expectedOutcome: 'Eliminate scope volatility and guarantee predictability for the remaining sprint commitments.'
      },
      {
        action: 'Implement automated staging integration smoke tests',
        reason: 'Replace flaky tests with deterministic mocked API contracts to accelerate CI/CD build validation pipelines.',
        expectedOutcome: 'Reduce automated test run times from 45 minutes to 12 minutes and catch regression bugs instantly.'
      },
      {
        action: 'Conduct mid-sprint risk audits with product owners to flag blockers early',
        reason: 'Establish structured 15-minute risk triage syncs every Wednesday to escalate inter-pod dependencies.',
        expectedOutcome: 'Unblock blocked user stories within 24 hours rather than waiting for sprint review retrospectives.'
      }
    ],
    evidence: [
      'Jira Sprint Velocity & Burndown Charts (Sprints 1-6)',
      'GitHub Pull Request Cycle Time Metrics (avg time-to-merge: 3.8 days)',
      'CI/CD Pipeline Build Reliability Reports'
    ],
    confidence: 'High',
    dataFreshness: 'Updated 1 hour ago'
  },
  {
    insightId: 13,
    role: 'Manager',
    title: 'Increased Customer Complaints',
    overview:
      'Customer support escalations and formal complaints logged by enterprise accounts surged by 31% over the past 14 days, driven by longer ticket response times and recurring delivery tracking discrepancies.',
    historicalTrend:
      'Escalations averaged 28 tickets/week in Q1/Q2. During the recent two-week window, escalations jumped to 74 tickets/week, with 42% classified as Severity-1 customer impact.',
    affectedPopulation:
      'Enterprise Accounts Pod, Tier-2 Customer Escalation Specialists, and Tier-1 Enterprise Corporate Clients.',
    keyFindings: [
      'First-response time for high-value enterprise accounts increased from 18 minutes to 1 hour and 44 minutes.',
      '58% of complaints stemmed from discrepancies between real-time cargo shipment locations and portal dashboard tracking.',
      'Customer CSAT ratings dropped from 4.6/5.0 to 3.7/5.0 among tier-1 corporate logistics accounts.',
      '3 major enterprise accounts issued formal notices requesting executive remediation meetings regarding SLA breaches.'
    ],
    contributingFactors: [
      'Under-resourced weekend escalation coverage following recent customer support shift restructuring.',
      'API synchronization delays between legacy warehouse scanning hardware and cloud database webhooks.',
      'Lack of automated tiering to route VIP enterprise customer complaints directly to senior support specialists.'
    ],
    businessImpact:
      'Contract renewal vulnerability across 8 strategic accounts representing $2.8M in annual recurring contract revenue.',
    riskIfIgnored:
      'Customer churn of major tier-1 accounts, potential contractual penalty payouts for SLA non-compliance, and severe damage to client references.',
    recommendedActionsDetailed: [
      {
        action: 'Increase customer support capacity and deploy rapid response team',
        reason: 'Reassign 6 senior support engineers to form a dedicated enterprise SWAT triage team for high-value clients.',
        expectedOutcome: 'Restore enterprise first-response times to under 20 minutes within 48 hours.'
      },
      {
        action: 'Prioritize unresolved tickets and escalate recurring blockers',
        reason: 'Institute daily morning escalation reviews between support leads and engineering infrastructure owners.',
        expectedOutcome: 'Clear the existing backlog of 52 unresolved enterprise tickets within 5 business days.'
      },
      {
        action: 'Monitor response times daily and follow up proactively with clients',
        reason: 'Provide transparent twice-daily progress updates to affected client account managers until resolution.',
        expectedOutcome: 'Restore enterprise customer satisfaction scores back to >4.4/5.0.'
      }
    ],
    evidence: [
      'Salesforce Service Cloud Escalation Queue Metrics',
      'Enterprise Client Quarterly Business Review (QBR) Feedback Notes',
      'Net Promoter Score (NPS) Detractor Breakdown Report'
    ],
    confidence: 'High',
    dataFreshness: 'Updated 2 hours ago'
  },
  {
    insightId: 14,
    role: 'Manager',
    title: 'Team Productivity Decline',
    overview:
      'Engineering sprint velocity and story point completion across Product Engineering fell by 12% compared to baseline, accompanied by a 35% increase in developer hours spent in unplanned coordination meetings.',
    historicalTrend:
      'Productivity scores maintained a steady 92% throughput rate over the prior 4 sprints, but experienced a steady slide starting in mid-August as cross-team architectural dependencies compounded.',
    affectedPopulation:
      'Product Engineering & Core Architecture Pods (42 software engineers, 6 QA analysts, and 5 technical product managers).',
    keyFindings: [
      'Engineers reported spending an average of 14.5 hours per week in status, triage, and dependency sync meetings.',
      'Context switching between 3 concurrent high-priority initiatives reduced dedicated deep coding time to <3.2 hours/day.',
      'Pull request review turnaround time increased from 6 hours to 24.5 hours, causing open branches to age and conflict.',
      'Sprint backlog completion dropped from 94% of committed story points to 78%.'
    ],
    contributingFactors: [
      'Simultaneous pursuit of three major architectural initiatives without clear sequential prioritization.',
      'Fragmented communication channels and excessive ad-hoc Slack sync requests interrupting focus time.',
      'Blocked cross-pod dependencies on the core authentication and billing migration services.'
    ],
    businessImpact:
      'Slipped feature delivery dates for Q3 commercial roadmap, developer frustration, and reduced product release frequency.',
    riskIfIgnored:
      'Chronic engineering fatigue, missed quarterly product milestones, and an accumulated technical debt burden that will compound future development cycles.',
    recommendedActionsDetailed: [
      {
        action: 'Reprioritize current sprint tasks and postpone non-essential backlog items',
        reason: 'Ruthlessly deprioritize tier-3 "nice-to-have" backlog items and focus all squad effort on the top 2 strategic epics.',
        expectedOutcome: 'Reclaim 20% sprint capacity and guarantee delivery of core roadmap commitments.'
      },
      {
        action: 'Review team workload distribution and protect core development focus time',
        reason: 'Institute "No-Meeting Tuesdays and Thursdays" to guarantee 8 hours of uninterrupted deep work time for all engineers.',
        expectedOutcome: 'Increase weekly deep development hours by 45% and accelerate PR review velocities.'
      },
      {
        action: 'Resolve dependency bottlenecks by scheduling daily blocker standups',
        reason: 'Create a 15-minute cross-pod blocker resolution sync between squad leads to unblock inter-team dependencies.',
        expectedOutcome: 'Cut dependency wait times from 3.5 days down to under 12 hours.'
      }
    ],
    evidence: [
      'GitLab Developer Analytics (Commit Frequency, PR Lifespan, Code Review Times)',
      'Calendar Time-Audit Analysis (14.5 hrs/week in meetings per engineer)',
      'Sprint Retrospective Action Logs and Sentiment Surveys'
    ],
    confidence: 'Medium',
    dataFreshness: 'Updated 3 hours ago'
  },
  {
    insightId: 15,
    role: 'Manager',
    title: 'SLA Performance Decline',
    overview:
      'First-response service level agreement (SLA) adherence within the Client Services Team dropped to 84.1%, falling 10.9 percentage points below the contractual benchmark target of 95.0%.',
    historicalTrend:
      'SLA compliance hovered consistently between 96.2% and 97.5% for six consecutive months, but broke down over the last 10 days due to sudden chat inquiry volume spikes during European trading hours.',
    affectedPopulation:
      'Client Services Team (32 tier-1 account coordinators and 8 senior client services specialists).',
    keyFindings: [
      'Inbound client chat volume rose by 48% between 10:00 AM and 2:00 PM CET without corresponding agent staffing adjustments.',
      'Queue abandonment rate (clients disconnecting before receiving agent response) climbed from 1.4% to 5.8%.',
      'Average handle time (AHT) increased from 7.2 minutes to 11.4 minutes due to slow internal knowledge search systems.',
      '14 enterprise client accounts triggered automated SLA breach credit penalty notifications.'
    ],
    contributingFactors: [
      'Static agent shift scheduling that failed to account for European market opening traffic spikes.',
      'Absence of automated intelligent skill-based queue routing, resulting in simple queries queueing behind complex inquiries.',
      'Agents lacking quick-reference canned response macros for common billing and tariff inquiries.'
    ],
    businessImpact:
      'Incurred contractual penalty rebates totaling $22K and reduced customer confidence during critical contract renewal periods.',
    riskIfIgnored:
      'Potential client defaults, further penalty accruals of up to $80K/month, and severe brand reputational damage across European institutional clients.',
    recommendedActionsDetailed: [
      {
        action: 'Activate smart queue routing based on agent availability and expertise',
        reason: 'Implement automated skill-based triage to route quick billing queries to fast-path queues while reserving specialists for complex cases.',
        expectedOutcome: 'Reduce queue wait times by 40% and eliminate queue abandonment.'
      },
      {
        action: 'Integrate AI-assisted response suggestions to accelerate agent replies',
        reason: 'Deploy auto-suggested responses and verified knowledge macros directly inside the agent chat console.',
        expectedOutcome: 'Reduce Average Handle Time from 11.4 minutes down to 6.8 minutes.'
      },
      {
        action: 'Adjust agent coverage schedules to match peak incoming volume windows',
        reason: 'Realign 6 support agents from low-volume evening shifts to cover the 10:00 AM - 2:00 PM peak traffic surge.',
        expectedOutcome: 'Restore first-response SLA adherence to >96% within 5 business days.'
      }
    ],
    evidence: [
      'Five9 / Talkdesk Inbound Queue Performance Analytics',
      'Contractual SLA Compliance & Penalty Ledger Q3',
      'Client Services Hourly Inbound Traffic Distribution Matrix'
    ],
    confidence: 'High',
    dataFreshness: 'Updated 4 hours ago'
  },

  // ============================================================
  // EXECUTIVE / DIRECTOR DETAILED KNOWLEDGE (IDs 21 - 25)
  // ============================================================
  {
    insightId: 21,
    role: 'Executive',
    title: 'Quarterly Revenue Forecast Risk',
    overview:
      'Consolidated quarterly enterprise revenue projections are tracking at $18.2M versus the board-approved target of $20.1M (a -9.4% variance of $1.9M), driven by extended CFO procurement cycles and enterprise deal slippage.',
    historicalTrend:
      'Quarterly performance met or exceeded forecasts for four consecutive quarters (102-106% attainment). A sudden deceleration in enterprise deal closures during weeks 6-8 of the current quarter generated the current gap.',
    affectedPopulation:
      'Global Commercial Organization, Enterprise Sales Divisions, C-Suite Executive Committee, and Board of Directors.',
    keyFindings: [
      '7 high-value enterprise software deals (average ACV of $280K) slipped from current quarter closure into subsequent quarters.',
      'Enterprise sales cycle length expanded from 84 days to 112 days due to heightened client procurement scrutiny and multi-stakeholder sign-offs.',
      'Mid-market commercial segment grew at 18% YoY, partially offsetting enterprise softness but unable to fully bridge the $1.9M gap.',
      'Gross margin forecast compressed by 1.8% due to localized discounting concessions offered by sales reps attempting to close deals early.'
    ],
    contributingFactors: [
      'Macro-economic tightening causing enterprise clients to delay discretionary software and analytics capital expenditures.',
      'Rigid standard multi-year contract structures that failed to offer flexible phased rollout milestones for risk-averse buyers.',
      'Over-concentration of quarterly quota (58% of target) in the final two weeks of the fiscal quarter.'
    ],
    businessImpact:
      'Potential earnings miss against board guidance, pressure on company enterprise valuation, and reduced capital availability for planned Q4 strategic investments.',
    riskIfIgnored:
      'Institutional investor downgrade, reduction in next-year hiring plans, and compounding pipeline deficit carrying into the subsequent fiscal year.',
    recommendedActionsDetailed: [
      {
        action: 'Convene executive deal desk to structure flexible enterprise licensing terms',
        reason: 'Empower executive leadership to approve custom ramp-up contracts, phased billing, and milestone-gated pilots for the 7 stalled enterprise deals.',
        expectedOutcome: 'Recover $1.1M in closed-won ARR before quarter-end by removing procurement hurdles.'
      },
      {
        action: 'Accelerate mid-market expansion campaigns to compensate for enterprise pipeline delays',
        reason: 'Deploy targeted outbound sales cadences to high-velocity mid-market accounts with rapid <30-day closing cycles.',
        expectedOutcome: 'Generate an incremental $450K in mid-market ARR within 45 days.'
      },
      {
        action: 'Rebalance Q4 discretionary operational expenditure allocations',
        reason: 'Implement temporary non-essential travel and discretionary hiring freezes across corporate support functions.',
        expectedOutcome: 'Protect corporate EBITDA margins by preserving $600K in operating cash flow.'
      }
    ],
    evidence: [
      'Executive CRM Pipeline Waterfall & Probability Analysis (Clari / Salesforce)',
      'Corporate Finance FP&A Monthly Variance Report',
      'Board of Directors Q3 Strategy Deck & Guidance Forecast Models'
    ],
    confidence: 'High',
    dataFreshness: 'Updated 15 mins ago'
  },
  {
    insightId: 22,
    role: 'Executive',
    title: 'Regional Performance Gap',
    overview:
      'Commercial revenue growth across the APAC South geographic theater lagged strategic corporate projections by 11.2% ($860K under budget), representing the widest regional variance across all international operating zones.',
    historicalTrend:
      'APAC South delivered 24% YoY growth in FY23. Growth decelerated rapidly to 6.2% YoY in FY24 due to regulatory certification roadblocks and intense domestic competitor discounting.',
    affectedPopulation:
      'APAC South Regional Leadership, Commercial Operations, Legal & Regulatory Compliance, and Regional Sales Teams.',
    keyFindings: [
      'Commercial expansion into 3 Tier-1 markets (Singapore, Malaysia, Indonesia) stalled awaiting regional financial data privacy certifications.',
      'Enterprise localized product feature parity lags behind domestic competitors by approximately 4 months.',
      'Customer acquisition cost (CAC) in the region rose by 38% due to reliance on uncalibrated generic global digital marketing campaigns.',
      'Secondary Tier-2 regional hubs (Vietnam, Philippines) outperformed targets by 14%, showing untapped commercial upside.'
    ],
    contributingFactors: [
      'Delayed appointment of local regional compliance counsel to navigate country-specific data residency requirements.',
      'Centralized engineering prioritization that delayed localization of regional payment gateways and currency invoicing.',
      'Misallocation of regional marketing budget to saturated tier-1 markets rather than high-growth tier-2 urban centers.'
    ],
    businessImpact:
      'Depressed international revenue contribution, forfeiture of first-mover advantage in high-growth Southeast Asian logistics corridors, and increased regional overhead.',
    riskIfIgnored:
      'Permanent loss of regional enterprise market share to agile local competitors, stranding $4.5M in regional strategic market expansion capital.',
    recommendedActionsDetailed: [
      {
        action: 'Appoint dedicated regional compliance leadership to expedite product authorizations',
        reason: 'Embed senior local regulatory counsel in Singapore to resolve regional data residency and audit clearances.',
        expectedOutcome: 'Clear all pending financial security certifications within 60 days to unblock enterprise pipelines.'
      },
      {
        action: 'Accelerate regional language localization and local payment gateway integrations',
        reason: 'Prioritize regional checkout localization across top 3 Southeast Asian currencies in the upcoming engineering sprint.',
        expectedOutcome: 'Improve regional prospect conversion rates by 28% and eliminate purchasing friction.'
      },
      {
        action: 'Reallocate supplemental growth capital to high-performing tier-2 expansion hubs',
        reason: 'Shift 35% of underperforming Tier-1 marketing budgets into high-conversion Tier-2 logistics growth zones.',
        expectedOutcome: 'Capture an additional $550K in regional revenue from fast-growing mid-market logistics operators.'
      }
    ],
    evidence: [
      'Global Regional Revenue Breakdown Matrix Q3',
      'APAC Regional Competitor Market Share & Pricing Intelligence Briefing',
      'Regional Legal & Regulatory Compliance Clearance Audit'
    ],
    confidence: 'High',
    dataFreshness: 'Updated 1 hour ago'
  },
  {
    insightId: 23,
    role: 'Executive',
    title: 'Workforce Attrition Risk',
    overview:
      'Compound executive and senior technical flight risk within Core R&D and Systems Architecture rose to 16.8%, driven by competitor poaching and upcoming equity vesting cliffs across 22 senior directors and principal engineers.',
    historicalTrend:
      'Leadership retention remained exceptional at >96% for three years following the series funding round. The approach of the 4-year equity cliff in Q4 has created an acute retention vulnerability.',
    affectedPopulation:
      'C-Suite, VP of Engineering, VP of Product, 22 Principal Architects, Senior Directors, and Strategic IP Owners.',
    keyFindings: [
      '14 principal system architects will cross their 4-year full equity vesting cliff within the next 120 days.',
      '3 senior engineering directors received confirmed competitive C-level and partner offers from venture-backed competitors.',
      'Proprietary AI routing algorithms and core distributed data pipelines depend critically on 6 key technical inventors.',
      'Employee satisfaction with long-term wealth creation incentives dropped from 82% to 54% among director-level staff.'
    ],
    contributingFactors: [
      'Absence of an institutionalized C-level retention equity pool for post-vesting leadership contributors.',
      'Aggressive headhunting campaigns targeting company AI and cloud architecture talent with significant signing bonuses.',
      'Delayed executive succession planning for mission-critical core intellectual property domains.'
    ],
    businessImpact:
      'Catastrophic risk of intellectual property disruption, vulnerability to system outages, delayed product roadmaps, and severe negative signals to external investors and enterprise clients.',
    riskIfIgnored:
      'Departure of core technical founding talent, loss of proprietary algorithmic edge, multi-million dollar talent replacement expenses, and team destabilization.',
    recommendedActionsDetailed: [
      {
        action: 'Authorize executive equity refresher pool for top 5% core technical leaders',
        reason: 'Present the Board Compensation Committee with a tailored multi-year performance share unit (PSU) retention package.',
        expectedOutcome: 'Secure 100% 3-year retention commitments from all 22 key technical directors and architects.'
      },
      {
        action: 'Implement succession contingency plans for mission-critical engineering units',
        reason: 'Identify and groom internal deputy leads for every principal architect and critical intellectual property owner.',
        expectedOutcome: 'Eliminate single-point-of-failure key-person dependencies across core software systems.'
      },
      {
        action: 'Conduct quarterly C-suite talent review and leadership alignment retreats',
        reason: 'Align senior leadership on company strategic vision, executive autonomy, and upcoming liquidity opportunities.',
        expectedOutcome: 'Reinforce executive leadership cohesion and raise executive trust scores to >90%.'
      }
    ],
    evidence: [
      'Board of Directors Executive Compensation & Vesting Schedule Audit',
      'HR Talent Flight Risk Matrix & Market Intelligence Poaching Log',
      'Strategic IP Dependency & Code Authorship Risk Report'
    ],
    confidence: 'High',
    dataFreshness: 'Updated 2 hours ago'
  },
  {
    insightId: 24,
    role: 'Executive',
    title: 'Customer Retention Decline',
    overview:
      'Enterprise Net Revenue Retention (NRR) softened from 114.2% to 107.7% (-6.5% decline), with gross customer churn ticking up by 1.8 percentage points among Tier-1 accounts generating >$250K ACV.',
    historicalTrend:
      'NRR was consistently in the top-quartile SaaS benchmark (112-116%) over the past 24 months. Recent renewal softness across 12 legacy enterprise accounts created a visible downward drag.',
    affectedPopulation:
      'Chief Revenue Officer, Strategic Account Management, Customer Success Leadership, and Top 50 Enterprise Accounts.',
    keyFindings: [
      '4 major enterprise clients downgraded seat licenses or opted out of premium analytics add-ons during recent annual renewals.',
      'Competitor aggressive pricing packaging offering 30% first-year discounts targeted the top 20 accounts.',
      'Executive sponsor turnover at 6 client companies resulted in lost corporate alignment and reduced renewal momentum.',
      'Client health score metrics indicate that 8 additional accounts ($1.6M total ARR) show low software utilization patterns.'
    ],
    contributingFactors: [
      'Lack of formal executive sponsorship programs connecting company C-level leaders with client C-level executives.',
      'Delayed rollout of proactive customer success playbooks to flag low software feature adoption before renewal windows.',
      'Unbundled pricing structure that made premium analytics modules vulnerable to line-item procurement cuts.'
    ],
    businessImpact:
      'Potential $2.4M reduction in annual recurring revenue expansion, lowered customer lifetime value, and downward pressure on corporate valuation multiples.',
    riskIfIgnored:
      'Erosion of enterprise market leadership, accelerated client churn to aggressive competitors, and severe drag on overall top-line ARR growth.',
    recommendedActionsDetailed: [
      {
        action: 'Initiate C-level executive sponsorship program for top 50 strategic accounts',
        reason: 'Pair each C-suite executive (CEO, CTO, CRO, CFO) with 10 high-value enterprise accounts for quarterly strategic check-ins.',
        expectedOutcome: 'Re-establish executive alignment and ensure 95%+ renewal rates on the top 50 revenue accounts.'
      },
      {
        action: 'Introduce multi-year loyalty discounting and bundled service packaging',
        reason: 'Offer 3-year contract renewals with bundled premium AI analytics tiers to lock in long-term enterprise commitments.',
        expectedOutcome: 'Increase multi-year contract mix from 34% to 65%, stabilizing long-term NRR above 112%.'
      },
      {
        action: 'Conduct formal executive loss reviews to refine corporate value proposition',
        reason: 'Engage independent third-party analysts to conduct post-mortem interviews with downgraded or churned client executives.',
        expectedOutcome: 'Gain unbiased actionable competitive intelligence to counter competitor discounting strategies.'
      }
    ],
    evidence: [
      'Enterprise Customer Success Gainsight Health Score Database',
      'Annual Recurring Revenue (ARR) Cohort Retention Waterfall',
      'Executive Loss & Downgrade Analysis Log Q2/Q3'
    ],
    confidence: 'High',
    dataFreshness: 'Updated 3 hours ago'
  },
  {
    insightId: 25,
    role: 'Executive',
    title: 'Operational Cost Increase',
    overview:
      'Consolidated cloud infrastructure and third-party SaaS vendor expenditures increased by 19.0% ($310K monthly cost overrun), compressing corporate gross margins by 2.4 percentage points.',
    historicalTrend:
      'Cloud compute and API expenses grew proportionally with revenue throughout FY23 (averaging 14% of revenue). In Q3, infrastructure cost velocity jumped to 19.8% of revenue due to unoptimized machine learning batch inference.',
    affectedPopulation:
      'Chief Financial Officer, VP of Infrastructure Engineering, Cloud FinOps Team, and Engineering Leads.',
    keyFindings: [
      'Continuous GPU cloud cluster reservations operated at an average utilization rate of only 23% during non-business hours.',
      'Uncompressed archival data storage in high-cost multi-region tiers accumulated over 420 Terabytes of stale log data.',
      'Duplicate third-party SaaS tool licenses across engineering and product pods generated $45K/month in redundant subscriptions.',
      'Automated autoscaling policies failed to de-provision test/staging Kubernetes clusters over weekends and holidays.'
    ],
    contributingFactors: [
      'Rapid deployment of generative AI features without implementing cost-per-query tracking and caching layers.',
      'Decentralized departmental SaaS purchasing without centralized IT procurement governance or single-sign-on audits.',
      'Lack of automated cloud budget threshold alerts triggering automated engineering approvals for high-cost clusters.'
    ],
    businessImpact:
      'Annualized EBITDA reduction of $3.72M, reduced gross margin from 74.2% to 71.8%, and diminished capital efficiency metrics.',
    riskIfIgnored:
      'Continued margin degradation, uncontrolled cloud vendor spend reaching $6M+ annualized, and reduced operational profitability.',
    recommendedActionsDetailed: [
      {
        action: 'Implement automated spot instance scheduling for non-critical AI workloads',
        reason: 'Transition all non-realtime model evaluation, batch inference, and training workloads to elastic spot compute instances.',
        expectedOutcome: 'Reduce monthly cloud GPU compute expenses by 42% ($130K/month savings) with zero SLA degradation.'
      },
      {
        action: 'Consolidate redundant vendor SaaS licenses into enterprise agreements',
        reason: 'Audit all departmental software tools and eliminate duplicate analytics, project management, and monitoring tools.',
        expectedOutcome: 'Eliminate $50K/month in redundant software licenses through consolidated vendor contracts.'
      },
      {
        action: 'Establish automated department budget guardrails and real-time variance alerts',
        reason: 'Deploy cloud FinOps cost monitoring tools that require VP approval for any single service exceeding 10% monthly budget variance.',
        expectedOutcome: 'Enforce fiscal discipline and prevent unmonitored infrastructure cost surges.'
      }
    ],
    evidence: [
      'AWS / GCP Consolidated Cloud Billing & Cost Explorer Analysis',
      'FinOps Infrastructure Utilization Audit & GPU Idle Metrics',
      'Corporate Finance IT SaaS Subscription Spend Ledger'
    ],
    confidence: 'High',
    dataFreshness: 'Updated 4 hours ago'
  }
];

// ============================================================
// RETRIEVAL HELPER UTILITIES
// ============================================================

/**
 * Retrieves the full detailed knowledge record for a specific dashboard insight ID.
 */
export const getDetailedKnowledgeByInsightId = (
  insightId: number
): DetailedInsightKnowledge | undefined => {
  return RAG_KNOWLEDGE_BASE.find((k) => k.insightId === insightId);
};

/**
 * Retrieves all detailed knowledge records applicable to a user role.
 */
export const getDetailedKnowledgeByRole = (
  role: UserRole
): DetailedInsightKnowledge[] => {
  return RAG_KNOWLEDGE_BASE.filter((k) => k.role === role);
};

/**
 * Fast lookup map indexed by insightId for O(1) retrieval.
 */
export const KNOWLEDGE_BASE_MAP: Record<number, DetailedInsightKnowledge> =
  RAG_KNOWLEDGE_BASE.reduce((acc, item) => {
    acc[item.insightId] = item;
    return acc;
  }, {} as Record<number, DetailedInsightKnowledge>);
