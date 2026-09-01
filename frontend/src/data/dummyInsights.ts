import { Insight, UserRole } from '../types';

// ============================================================
// PROTOTYPE DATA
// ============================================================
// These are static insights used for the InSightAI demonstration.
// In the future, these insights will come from the backend
// recommendation and RAG pipeline.
// ============================================================

export const ROLE_INSIGHTS: Record<UserRole, Insight[]> = {
  // ============================================================
  // 1. HR INSIGHTS
  // Topics: Employee Satisfaction, Retention, Attrition, Engagement, Hiring, Absenteeism, Training
  // Categories: Workforce, Retention, Hiring, Engagement
  // ============================================================
  HR: [
    {
      id: 1,
      role: 'HR',
      severity: 'High',
      title: 'Employee Satisfaction Decline',
      metric: 'Employee Satisfaction',
      change: '-18%',
      trend: 'down',
      region: 'Sales Department',
      summary: 'Employee satisfaction declined alongside an increase in negative HR feedback.',
      cause: 'High workload and inconsistent manager communication.',
      recommendations: [
        'Review workload distribution across regional sales teams',
        'Conduct employee feedback sessions and pulse checks',
        'Work with department managers to streamline communication'
      ],
      actionFeasibilities: ['Medium', 'Easy', 'Medium'],
      category: 'Workforce',
      timestamp: '1 hour ago',
      impactScore: 92
    },
    {
      id: 2,
      role: 'HR',
      severity: 'High',
      title: 'Attrition Risk Increased',
      metric: 'Engineering Flight Risk',
      change: '+14%',
      trend: 'up',
      region: 'Engineering Division',
      summary: 'Predictive attrition models indicate an elevated departure risk among senior engineers.',
      cause: 'Market compensation disparity and aggressive milestone deadlines.',
      recommendations: [
        'Authorize targeted retention equity refreshers for critical technical talent',
        'Establish cooldown sprint intervals between major releases',
        'Conduct 1-on-1 stay interviews with engineering team leads'
      ],
      actionFeasibilities: ['Hard', 'Medium', 'Easy'],
      category: 'Retention',
      timestamp: '2 hours ago',
      impactScore: 88
    },
    {
      id: 3,
      role: 'HR',
      severity: 'Medium',
      title: 'Absenteeism Increased',
      metric: 'Unplanned Absence Rate',
      change: '+22%',
      trend: 'up',
      region: 'Customer Support Hub',
      summary: 'Unplanned employee absences have risen across customer support teams.',
      cause: 'Shift fatigue, repetitive ticket volume, and inadequate wellness support.',
      recommendations: [
        'Rebalance shift scheduling to avoid consecutive weekend allocations',
        'Deploy automated AI triage to reduce routine manual ticket load',
        'Promote employee assistance and mental wellness programs'
      ],
      actionFeasibilities: ['Easy', 'Medium', 'Easy'],
      category: 'Workforce',
      timestamp: '3 hours ago',
      impactScore: 74
    },
    {
      id: 4,
      role: 'HR',
      severity: 'Medium',
      title: 'Hiring Pipeline Delays',
      metric: 'Time-to-Hire SLA',
      change: '+28%',
      trend: 'up',
      region: 'North America Talent',
      summary: 'Average time-to-hire for specialized data and machine learning roles has extended.',
      cause: 'Prolonged interview loops and delayed hiring manager feedback submission.',
      recommendations: [
        'Enforce a strict 48-hour hiring manager feedback SLA after panel rounds',
        'Consolidate technical assessment stages into paired coding sessions',
        'Expand proactive talent pipelining through targeted technical outreach'
      ],
      actionFeasibilities: ['Easy', 'Medium', 'Medium'],
      category: 'Hiring',
      timestamp: '4 hours ago',
      impactScore: 68
    },
    {
      id: 5,
      role: 'HR',
      severity: 'Low',
      title: 'Training Completion Improved',
      metric: 'Mandatory Training Compliance',
      change: '+35%',
      trend: 'up',
      region: 'Global Workforce',
      summary: 'Compliance and leadership development course completions exceeded quarterly benchmarks.',
      cause: 'Rollout of modular micro-learning modules and automated milestone nudges.',
      recommendations: [
        'Expand micro-learning modules to technical upskilling programs',
        'Recognize top-completing departments in company-wide all-hands',
        'Incorporate training completion metrics into quarterly performance reviews'
      ],
      actionFeasibilities: ['Medium', 'Easy', 'Hard'],
      category: 'Engagement',
      timestamp: '5 hours ago',
      impactScore: 52
    }
  ],

  // ============================================================
  // 2. MANAGER INSIGHTS
  // Topics: Revenue Performance, Project Delivery, Team Productivity, Customer Complaints, SLA Performance
  // Categories: Finance, Project Delivery, Customer, Performance, Operations
  // ============================================================
  Manager: [
    {
      id: 11,
      role: 'Manager',
      severity: 'High',
      title: 'Retail Revenue Drop',
      metric: 'Retail Revenue',
      change: '-8%',
      trend: 'down',
      region: 'Maharashtra Hub',
      summary: 'Retail revenue dropped significantly compared to the previous reporting period.',
      cause: 'Increasing shipment delays and delivery-related customer complaints.',
      recommendations: [
        'Investigate regional logistics partners and fulfillment routing',
        'Prioritize delayed deliveries and unblock transit bottlenecks',
        'Notify affected customers proactively with status updates'
      ],
      actionFeasibilities: ['Medium', 'Easy', 'Easy'],
      category: 'Finance',
      timestamp: '20 mins ago',
      impactScore: 94
    },
    {
      id: 12,
      role: 'Manager',
      severity: 'High',
      title: 'Project Delivery Delays',
      metric: 'On-Time Milestone Rate',
      change: '-20%',
      trend: 'down',
      region: 'Mobile App Pod',
      summary: 'Mobile release milestones have slipped by an average of 9 business days.',
      cause: 'Late requirement changes and unexpected third-party API integration defects.',
      recommendations: [
        'Freeze scope requirements 10 days prior to target release dates',
        'Implement automated staging integration smoke tests',
        'Conduct mid-sprint risk audits with product owners to flag blockers early'
      ],
      actionFeasibilities: ['Easy', 'Medium', 'Easy'],
      category: 'Project Delivery',
      timestamp: '1 hour ago',
      impactScore: 86
    },
    {
      id: 13,
      role: 'Manager',
      severity: 'High',
      title: 'Increased Customer Complaints',
      metric: 'Escalated Customer Tickets',
      change: '+31%',
      trend: 'up',
      region: 'Enterprise Accounts Pod',
      summary: 'Customer complaints have increased significantly during the last reporting period.',
      cause: 'Longer support response times and unresolved delivery issues.',
      recommendations: [
        'Increase customer support capacity and deploy rapid response team',
        'Prioritize unresolved tickets and escalate recurring blockers',
        'Monitor response times daily and follow up proactively with clients'
      ],
      actionFeasibilities: ['Medium', 'Easy', 'Easy'],
      category: 'Customer',
      timestamp: '2 hours ago',
      impactScore: 91
    },
    {
      id: 14,
      role: 'Manager',
      severity: 'Medium',
      title: 'Team Productivity Decline',
      metric: 'Team Velocity',
      change: '-12%',
      trend: 'down',
      region: 'Product Engineering',
      summary: 'Team productivity has declined compared with the previous reporting period.',
      cause: 'Increased workload and multiple delayed cross-functional dependencies.',
      recommendations: [
        'Reprioritize current sprint tasks and postpone non-essential backlog items',
        'Review team workload distribution and protect core development focus time',
        'Resolve dependency bottlenecks by scheduling daily blocker standups'
      ],
      actionFeasibilities: ['Easy', 'Medium', 'Easy'],
      category: 'Performance',
      timestamp: '3 hours ago',
      impactScore: 76
    },
    {
      id: 15,
      role: 'Manager',
      severity: 'Medium',
      title: 'SLA Performance Decline',
      metric: 'First Response SLA Adherence',
      change: '-16%',
      trend: 'down',
      region: 'Client Services Team',
      summary: 'First-response SLA compliance dropped to 84%, below the 95% target.',
      cause: 'Sudden surge in concurrent chat requests without dynamic queue balancing.',
      recommendations: [
        'Activate smart queue routing based on agent availability and expertise',
        'Integrate AI-assisted response suggestions to accelerate agent replies',
        'Adjust agent coverage schedules to match peak incoming volume windows'
      ],
      actionFeasibilities: ['Medium', 'Medium', 'Easy'],
      category: 'Operations',
      timestamp: '4 hours ago',
      impactScore: 68
    }
  ],

  // ============================================================
  // 3. EXECUTIVE / DIRECTOR INSIGHTS
  // Topics: Revenue Forecast, Regional Gaps, Workforce Risk, Customer Retention, Operational Cost
  // Categories: Strategic, Regional Performance, Workforce Risk, Finance, Operations
  // ============================================================
  Executive: [
    {
      id: 21,
      role: 'Executive',
      severity: 'High',
      title: 'Quarterly Revenue Forecast Risk',
      metric: 'Forecast Revenue Variance',
      change: '-9.4%',
      trend: 'down',
      region: 'Global Commercial',
      summary: 'Quarterly revenue projections are tracking below board-approved targets across key sectors.',
      cause: 'Macro enterprise deal slippage and extended CFO procurement approval cycles.',
      recommendations: [
        'Convene executive deal desk to structure flexible enterprise licensing terms',
        'Accelerate mid-market expansion campaigns to compensate for enterprise pipeline delays',
        'Rebalance Q4 discretionary operational expenditure allocations'
      ],
      actionFeasibilities: ['Medium', 'Hard', 'Medium'],
      category: 'Strategic',
      timestamp: '15 mins ago',
      impactScore: 96
    },
    {
      id: 22,
      role: 'Executive',
      severity: 'High',
      title: 'Regional Performance Gap',
      metric: 'Regional Growth Index',
      change: '-11.2%',
      trend: 'down',
      region: 'APAC South Region',
      summary: 'Growth velocity across the APAC South commercial zone trailed corporate projections.',
      cause: 'Local regulatory compliance bottlenecks and delayed localization of enterprise suites.',
      recommendations: [
        'Appoint dedicated regional compliance leadership to expedite product authorizations',
        'Accelerate regional language localization and local payment gateway integrations',
        'Reallocate supplemental growth capital to high-performing tier-2 expansion hubs'
      ],
      actionFeasibilities: ['Hard', 'Hard', 'Medium'],
      category: 'Regional Performance',
      timestamp: '1 hour ago',
      impactScore: 89
    },
    {
      id: 23,
      role: 'Executive',
      severity: 'High',
      title: 'Workforce Attrition Risk',
      metric: 'Executive & Tech Flight Risk',
      change: '+16.8%',
      trend: 'up',
      region: 'Core R&D Operations',
      summary: 'Strategic talent loss risk is compounding across key architectural leaders and engineering VP levels.',
      cause: 'Aggressive competitor executive poaching and long-term equity vesting cliffs.',
      recommendations: [
        'Authorize executive equity refresher pool for top 5% core technical leaders',
        'Implement succession contingency plans for mission-critical engineering units',
        'Conduct quarterly C-suite talent review and leadership alignment retreats'
      ],
      actionFeasibilities: ['Hard', 'Hard', 'Easy'],
      category: 'Workforce Risk',
      timestamp: '2 hours ago',
      impactScore: 92
    },
    {
      id: 24,
      role: 'Executive',
      severity: 'High',
      title: 'Customer Retention Decline',
      metric: 'Net Revenue Retention (NRR)',
      change: '-6.5%',
      trend: 'down',
      region: 'Strategic Accounts',
      summary: 'Enterprise client renewal rates softened during Q2 across strategic corporate accounts.',
      cause: 'Competitor pricing pressure and slow executive sponsor engagement during renewals.',
      recommendations: [
        'Initiate C-level executive sponsorship program for top 50 strategic accounts',
        'Introduce multi-year loyalty discounting and bundled service packaging',
        'Conduct formal executive loss reviews to refine corporate value proposition'
      ],
      actionFeasibilities: ['Medium', 'Medium', 'Easy'],
      category: 'Finance',
      timestamp: '3 hours ago',
      impactScore: 88
    },
    {
      id: 25,
      role: 'Executive',
      severity: 'Medium',
      title: 'Operational Cost Increase',
      metric: 'Operating Margin Impact',
      change: '+19.0%',
      trend: 'up',
      region: 'Global Infrastructure',
      summary: 'Cloud infrastructure and vendor SaaS expenditures outpaced budgeted allocations.',
      cause: 'Over-provisioned GPU cluster reservations and unoptimized batch inference jobs.',
      recommendations: [
        'Implement automated spot instance scheduling for non-critical AI workloads',
        'Consolidate redundant vendor SaaS licenses into enterprise agreements',
        'Establish automated department budget guardrails and real-time variance alerts'
      ],
      actionFeasibilities: ['Medium', 'Medium', 'Easy'],
      category: 'Operations',
      timestamp: '4 hours ago',
      impactScore: 79
    }
  ]
};

/**
 * Returns the static dummy insights based on the selected user role.
 */
export const getInsightsByRole = async (role: UserRole): Promise<Insight[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const roleData = ROLE_INSIGHTS[role] || ROLE_INSIGHTS.HR;
      resolve(roleData);
    }, 150);
  });
};

/**
 * Simulates refreshing insights for the given role.
 */
export const refreshInsightsByRole = async (role: UserRole): Promise<Insight[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const base = ROLE_INSIGHTS[role] || ROLE_INSIGHTS.HR;
      const updated = base.map((insight) => ({
        ...insight,
        change: insight.trend === 'up'
          ? `+${(Math.abs(parseFloat(insight.change)) + (Math.random() * 2 - 1)).toFixed(1)}%`
          : `-${(Math.abs(parseFloat(insight.change)) + (Math.random() * 2 - 1)).toFixed(1)}%`
      }));
      resolve(updated);
    }, 300);
  });
};

// Fallback compatibility export
export const INITIAL_INSIGHTS = ROLE_INSIGHTS.HR;


