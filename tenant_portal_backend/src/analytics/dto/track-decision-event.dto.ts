export class TrackDecisionEventDto {
  decisionId!: string;
  actionTaken!: string;
  timeToDecisionMs!: number;
  confidenceAtTime?: number;
  outcome?: 'approved' | 'rejected' | 'deferred' | 'escalated';
}
