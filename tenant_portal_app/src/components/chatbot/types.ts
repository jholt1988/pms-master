export type ChatRole = 'user' | 'assistant';

export interface SuggestedAction {
  label: string;
  action: string;
  params?: Record<string, unknown>;
}

export interface ChatMessageUI {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  confidence?: number;
  relatedQuestions?: string[];
  suggestedActions?: SuggestedAction[];
  streaming?: boolean;
  feedback?: 'positive' | 'negative' | null;
}

export interface FeedbackPayload {
  messageId: string;
  sentiment: 'positive' | 'negative';
}
