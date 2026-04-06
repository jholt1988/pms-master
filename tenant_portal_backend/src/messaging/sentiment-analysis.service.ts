import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SentimentAnalysisService {
  private readonly logger = new Logger(SentimentAnalysisService.name);

  // Simple heuristic dictionary
  private readonly urgentKeywords = ['leak', 'flood', 'fire', 'broken', 'emergency', 'smell', 'urgent', 'smoke', 'power', 'water'];
  private readonly frustratedKeywords = ['angry', 'unacceptable', 'ridiculous', 'hate', 'terrible', 'worst', 'upset', 'ignored', 'sue', 'lawyer'];
  private readonly positiveKeywords = ['thank you', 'thanks', 'great', 'awesome', 'good', 'perfect', 'appreciate'];
  private readonly languagePatterns: Array<{ code: string; pattern: RegExp }> = [
    { code: 'es', pattern: /\b(hola|gracias|por favor|necesito|ayuda|mantenimiento|agua|fuga|renta)\b/i },
    { code: 'fr', pattern: /\b(bonjour|merci|s'il vous plait|besoin|aide|urgence|loyer)\b/i },
    { code: 'pt', pattern: /\b(ola|obrigado|preciso|ajuda|manutencao|aluguel)\b/i },
    { code: 'de', pattern: /\b(hallo|danke|bitte|hilfe|dringend|miete)\b/i },
  ];
  private readonly translationDictionary: Record<string, Array<[RegExp, string]>> = {
    es: [
      [/\bhola\b/gi, 'hello'],
      [/\bgracias\b/gi, 'thank you'],
      [/\bpor favor\b/gi, 'please'],
      [/\bnecesito\b/gi, 'I need'],
      [/\bayuda\b/gi, 'help'],
      [/\bmantenimiento\b/gi, 'maintenance'],
      [/\bfuga\b/gi, 'leak'],
      [/\bagua\b/gi, 'water'],
      [/\brenta\b/gi, 'rent'],
      [/\burgente\b/gi, 'urgent'],
    ],
    fr: [
      [/\bbonjour\b/gi, 'hello'],
      [/\bmerci\b/gi, 'thank you'],
      [/\bbesoin\b/gi, 'need'],
      [/\baide\b/gi, 'help'],
      [/\burgence\b/gi, 'urgent'],
      [/\bloyer\b/gi, 'rent'],
    ],
    pt: [
      [/\bola\b/gi, 'hello'],
      [/\bobrigado\b/gi, 'thank you'],
      [/\bpreciso\b/gi, 'I need'],
      [/\bajuda\b/gi, 'help'],
      [/\bmanutencao\b/gi, 'maintenance'],
      [/\baluguel\b/gi, 'rent'],
    ],
    de: [
      [/\bhallo\b/gi, 'hello'],
      [/\bdanke\b/gi, 'thank you'],
      [/\bhilfe\b/gi, 'help'],
      [/\bdringend\b/gi, 'urgent'],
      [/\bmiete\b/gi, 'rent'],
    ],
  };

  public detectLanguage(content: string): string {
    const trimmed = content.trim();
    if (!trimmed) return 'en';

    if (/[А-Яа-яЁё]/.test(trimmed)) return 'ru';
    if (/[\u4E00-\u9FFF]/.test(trimmed)) return 'zh';
    if (/[\u0600-\u06FF]/.test(trimmed)) return 'ar';

    const matchedPattern = this.languagePatterns.find(({ pattern }) => pattern.test(trimmed));
    return matchedPattern?.code ?? 'en';
  }

  public translateToEnglish(content: string, detectedLanguage: string): string {
    if (!content.trim() || detectedLanguage === 'en') {
      return content;
    }

    const replacements = this.translationDictionary[detectedLanguage];
    if (!replacements?.length) {
      this.logger.debug(`No translation dictionary available for language "${detectedLanguage}". Returning original content.`);
      return content;
    }

    return replacements.reduce((translated, [pattern, replacement]) => {
      return translated.replace(pattern, replacement);
    }, content);
  }

  /**
   * Scans unstructured tenant message payload to assign a discrete sentiment marker.
   */
  public analyzeIncomingText(content: string): 'URGENT' | 'FRUSTRATED' | 'POSITIVE' | 'NEUTRAL' {
    const text = content.toLowerCase();

    // Check URGENT
    for (const word of this.urgentKeywords) {
      if (text.includes(word)) {
        return 'URGENT';
      }
    }

    // Check FRUSTRATED
    for (const word of this.frustratedKeywords) {
      if (text.includes(word)) {
        return 'FRUSTRATED';
      }
    }

    // Check POSITIVE
    for (const word of this.positiveKeywords) {
      if (text.includes(word)) {
        return 'POSITIVE';
      }
    }

    return 'NEUTRAL';
  }

  /**
   * Pseudo-RAG AI Context Generator.
   * Drafts an outbound response template saving the PM time.
   */
  public generateDraftReply(content: string, sentiment: string): string {
    if (sentiment === 'URGENT') {
      return `We've received your urgent message and dispatched it immediately to our maintenance coordination team. If this is a life-threatening emergency, please call 911. We will reach out momentarily to schedule an emergency technician.`;
    }

    if (sentiment === 'FRUSTRATED') {
      return `I completely understand your frustration and apologize for the inconvenience this has caused. We are looking into this account anomaly and will provide a status update within the next 2 hours. Thank you for your continued patience.`;
    }

    if (sentiment === 'POSITIVE') {
      return `You're very welcome! We're glad to hear everything is sorted out. Let us know if there is anything else you need.`;
    }

    // NEUTRAL
    return `Thank you for your message. We have received your inquiry and a team member will review it shortly.`;
  }
}
