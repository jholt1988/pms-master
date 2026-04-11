// apps/api/src/swarm/swarm.config.ts
export const SWARM_THRESHOLDS = {
  MAX_REPAIR_ESTIMATE: 5000, // $5,000 triggers a manual review
  MIN_PRESCREEN_SCORE: 70,   // Below 70% triggers a halt
  CRITICAL_PRIORITY_HALT: true,
};