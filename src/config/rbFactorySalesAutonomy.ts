export type RbFactorySalesAutonomyMode = 'SUPERVISED' | 'SEMI_AUTONOMOUS' | 'AUTONOMOUS';

export interface RbFactorySalesAutonomyConfig {
  mode: RbFactorySalesAutonomyMode;
  maxDailyOutbound: number;
  minHoursBetweenOutbound: number;
  maxFollowUpsPerProspect: number;
  businessHoursStart: number;
  businessHoursEnd: number;
  autoPrepareFirstApproach: boolean;
  autoPrepareFollowUps: boolean;
  autoPrepareDemo: boolean;
  autoPrepareProposal: boolean;
  requireHumanForDiscount: boolean;
  requireHumanForComplaints: boolean;
  requireHumanForUncertainAI: boolean;
  minConfidenceForAutonomous: number;
}

export const RB_FACTORY_SALES_AUTONOMY: RbFactorySalesAutonomyConfig = {
  mode: (process.env.RB_FACTORY_SALES_MODE as RbFactorySalesAutonomyMode) || 'SEMI_AUTONOMOUS',
  maxDailyOutbound: Number(process.env.RB_FACTORY_SALES_MAX_DAILY_OUTBOUND || 30),
  minHoursBetweenOutbound: Number(process.env.RB_FACTORY_SALES_MIN_HOURS_BETWEEN_OUTBOUND || 24),
  maxFollowUpsPerProspect: Number(process.env.RB_FACTORY_SALES_MAX_FOLLOWUPS || 3),
  businessHoursStart: Number(process.env.RB_FACTORY_SALES_BUSINESS_START || 8),
  businessHoursEnd: Number(process.env.RB_FACTORY_SALES_BUSINESS_END || 19),
  autoPrepareFirstApproach: process.env.RB_FACTORY_AUTO_FIRST_APPROACH !== 'false',
  autoPrepareFollowUps: process.env.RB_FACTORY_AUTO_FOLLOWUPS !== 'false',
  autoPrepareDemo: process.env.RB_FACTORY_AUTO_DEMO !== 'false',
  autoPrepareProposal: process.env.RB_FACTORY_AUTO_PROPOSAL !== 'false',
  requireHumanForDiscount: true,
  requireHumanForComplaints: true,
  requireHumanForUncertainAI: true,
  minConfidenceForAutonomous: Number(process.env.RB_FACTORY_SALES_MIN_CONFIDENCE || 80),
};
