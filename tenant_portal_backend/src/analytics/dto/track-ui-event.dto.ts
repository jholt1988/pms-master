export class TrackUiEventDto {
  eventType!: 'decision_view' | 'action_click' | 'panel_expand' | 'context_switch' | 'application_step_view';
  elementId?: string;
  sessionDurationMs?: number;
  path?: string[];
}
