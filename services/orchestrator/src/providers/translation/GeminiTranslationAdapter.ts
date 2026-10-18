import { GoogleGenAI } from '@google/genai';
import { TranslationProvider, TranslationResult } from '../types.js';

export interface GeminiConfig {
  apiKey?: string;
  modelName?: string; // defaults to 'gemini-2.0-flash'
}

export class GeminiTranslationAdapter implements TranslationProvider {
  public name = 'gemini';
  private ai: GoogleGenAI | null = null;
  private modelName: string;

  constructor(config?: GeminiConfig) {
    const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
    this.modelName = config?.modelName || 'gemini-2.0-flash';

    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    } else {
      console.warn(
        '[GeminiTranslationAdapter] GEMINI_API_KEY is not set. Translation will run in fallback mock mode.'
      );
    }
  }

  async translate(
    text: string,
    sourceLang: string,
    targetLang: string,
    context?: { originalDurationMs?: number }
  ): Promise<TranslationResult> {
    if (!text || text.trim() === '') {
      return {
        sourceText: text,
        translatedText: '',
        isFinal: true,
      };
    }

    // Fallback if no API key is provided
    if (!this.ai) {
      return {
        sourceText: text,
        translatedText: `[ترجمه شبیه‌سازی‌شده: ${text}]`,
        isFinal: true,
        estimatedDurationMs: context?.originalDurationMs,
      };
    }

    const durationConstraint = context?.originalDurationMs
      ? `The original speech took approximately ${context.originalDurationMs}ms. Keep the syllable count and spoken rhythm of the translation closely matching this duration.`
      : 'Keep the length and tempo natural and concise.';

    const systemInstruction = `You are a real-time simultaneous dubbing translator. 
Translate the incoming speech from ${sourceLang} into fluent, natural ${targetLang} (Persian).
${durationConstraint}
Output ONLY the direct translated sentence with no additional explanations, tags, or commentary.`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: text,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      const translatedText = response.text?.trim() || '';

      return {
        sourceText: text,
        translatedText,
        isFinal: true,
        estimatedDurationMs: context?.originalDurationMs,
      };
    } catch (error) {
      console.error('[GeminiTranslationAdapter] Translation error:', error);
      throw error;
    }
  }
}
