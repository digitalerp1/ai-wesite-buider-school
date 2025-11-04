
export type GeminiModel = 
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-flash-latest'
  | 'gemini-2.5-flash-image'
  | 'gemini-2.5-flash-preview-tts';

export interface ModelOption {
  value: GeminiModel;
  label: string;
  description: string;
}
