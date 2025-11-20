/// <reference types="vite/client" />

interface ImportMetaEnv {
  // AI Features
  readonly VITE_FEATURE_RENT_OPTIMIZATION?: string;
  readonly VITE_FEATURE_CHATBOT?: string;
  readonly VITE_FEATURE_SMART_BILL_ENTRY?: string;
  readonly VITE_FEATURE_PREDICTIVE_MAINTENANCE?: string;

  // API Keys
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_ANTHROPIC_API_KEY?: string;
  readonly VITE_ZILLOW_API_KEY?: string;
  readonly VITE_RENTOMETER_API_KEY?: string;
  readonly VITE_AWS_TEXTRACT_KEY?: string;
  readonly VITE_ML_SERVICE_KEY?: string;

  // Service Configuration
  readonly VITE_ML_SERVICE_URL?: string;
  readonly VITE_LLM_PROVIDER?: string;
  readonly VITE_LLM_MODEL?: string;
  readonly VITE_LLM_ENDPOINT?: string;
  readonly VITE_MARKET_DATA_PROVIDER?: string;
  readonly VITE_OCR_PROVIDER?: string;
  readonly VITE_PREDICTION_MODEL?: string;

  // Service Settings
  readonly VITE_AI_SERVICE_TIMEOUT?: string;
  readonly VITE_CACHE_ENABLED?: string;
  readonly VITE_RENT_CACHE_TTL?: string;
  readonly VITE_RENT_UPDATE_INTERVAL?: string;
  readonly VITE_CHATBOT_MAX_TOKENS?: string;
  readonly VITE_CHATBOT_TEMPERATURE?: string;
  readonly VITE_OCR_CACHE_TTL?: string;
  readonly VITE_AUTO_APPROVE_THRESHOLD?: string;
  readonly VITE_PREDICTION_CACHE_TTL?: string;
  readonly VITE_PREDICTION_HORIZON?: string;
  readonly VITE_MIN_DATA_POINTS?: string;
  readonly VITE_PREDICTION_UPDATE_FREQ?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
