import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const EMBED_MODEL = 'text-embedding-004';
// On a 429 we stop hitting the API for this long. Avoids burning the rest of the daily
// quota retrying when the key has `limit: 0` for everything we listed.
const QUOTA_COOLDOWN_MS = 10 * 60 * 1000;

@Injectable()
export class AiService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly logger = new Logger(AiService.name);
  private readonly summaryModels: string[];
  private readonly hasApiKey: boolean;
  // In-process cache: summarising the same chat history twice in a row should not burn quota.
  private readonly summaryCache = new Map<string, string>();
  private static readonly SUMMARY_CACHE_LIMIT = 50;
  // Per-model cooldown — a 429 on one model doesn't poison the others.
  private readonly modelCooldownUntil = new Map<string, number>();

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('app.geminiApiKey') ?? process.env.GEMINI_API_KEY;
    this.hasApiKey = Boolean(apiKey);
    if (!this.hasApiKey) {
      this.logger.warn('Initialised without GEMINI_API_KEY. AI functions will return canned output.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || 'DUMMY_KEY');

    const configuredModels =
      this.configService.get<string[]>('app.geminiSummaryModels') ?? [];
    this.summaryModels = configuredModels.length
      ? configuredModels
      : ['gemini-2.0-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    this.logger.log(`Gemini summary fallback chain: ${this.summaryModels.join(' → ')}`);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.hasApiKey) {
      return Array(768).fill(0).map(() => Math.random());
    }
    // Use fallback models if the first one fails
    const models = ['text-embedding-004', 'embedding-001'];
    for (const modelName of models) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.embedContent(text);
        return result.embedding.values;
      } catch (err) {
        this.logger.warn(`Failed to generate embedding with ${modelName}: ${(err as Error).message}`);
      }
    }
    this.logger.error('All embedding models failed.');
    return Array(768).fill(0).map(() => Math.random());
  }

  async *streamSessionSummary(chatHistory: string): AsyncGenerator<string, void, unknown> {
    const prompt = [
      'You are summarising a skill-sharing session strictly from the literal chat transcript below.',
      '',
      'Hard rules:',
      '- Only summarise what is actually stated in the transcript. Never invent topics, skills, names, or next steps.',
      '- If the transcript is empty, contains only greetings/single characters/typos/test gibberish (e.g. "hi", "asas", "h", "df"), or has no concrete subject matter, respond with EXACTLY: "Not enough substantive chat to summarise yet — keep teaching and try again later." and nothing else.',
      '- Do not name specific technologies, instruments, frameworks, or skills unless those exact words appear in the transcript.',
      '- Keep the tone warm and concise: 2 short paragraphs maximum.',
      '',
      'Transcript:',
      chatHistory,
    ].join('\n');
    yield* this.streamPrompt(prompt, chatHistory);
  }

  /**
   * Summarise the public reviews left for one user. The cache is keyed on the review payload
   * itself, so a new review naturally invalidates the entry (different SHA-1).
   */
  async *streamUserReviewsSummary(
    reviewsText: string,
    reviewCount: number,
  ): AsyncGenerator<string, void, unknown> {
    if (reviewCount < 2) {
      yield 'Not enough reviews yet to summarise — at least 2 are needed for a meaningful overview.';
      return;
    }
    const prompt = [
      'You are writing a short reputation summary for a skill-exchange user, based ONLY on the verbatim reviews below.',
      '',
      'Hard rules:',
      '- Use only what reviewers actually wrote. Never invent strengths, weaknesses, skills, or anecdotes.',
      '- Surface recurring themes (e.g. patience, clarity, preparation) only if multiple reviews mention them.',
      '- If reviews are too sparse, vague, or contradictory to summarise, respond with EXACTLY: "Reviews are too sparse to draw a clear picture yet."',
      '- 1 short paragraph. Neutral and factual, not promotional. Do not invent a star rating.',
      '',
      `Reviews (${reviewCount} total):`,
      reviewsText,
    ].join('\n');
    yield* this.streamPrompt(prompt, `reviews:${reviewsText}`);
  }

  private async *streamPrompt(
    prompt: string,
    cacheSeed: string,
  ): AsyncGenerator<string, void, unknown> {
    const cacheKey = createHash('sha1').update(cacheSeed).digest('hex');
    const cached = this.summaryCache.get(cacheKey);
    if (cached) {
      yield cached;
      return;
    }

    if (!this.hasApiKey) {
      yield 'AI summaries are disabled — no GEMINI_API_KEY is configured.';
      return;
    }

    let lastQuotaError = false;
    for (const modelName of this.summaryModels) {
      if (this.isCoolingDown(modelName)) {
        this.logger.debug(`Skipping ${modelName}: in 429 cooldown`);
        continue;
      }
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContentStream(prompt);
        let full = '';
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            full += chunkText;
            yield chunkText;
          }
        } catch (streamErr) {
          this.logger.error(`Stream iteration failed on ${modelName}`, streamErr);
          // If we already have some content, yield it and return instead of failing the whole thing
          if (full) return;
          throw streamErr; 
        }
        this.rememberSummary(cacheKey, full);
        return;
      } catch (err) {
        const message = (err as Error).message || '';
        const quotaHit = message.includes('429') || message.toLowerCase().includes('quota');
        if (quotaHit) {
          lastQuotaError = true;
          this.markCooldown(modelName);
          this.logger.warn(
            `Quota hit (429) on ${modelName}; cooling down for ${QUOTA_COOLDOWN_MS / 60000}m and trying next.`,
          );
          continue;
        }
        this.logger.error(`AI stream failed on ${modelName}`, err);
        const errMessage = (err as Error).message || '';
        const isTransient = errMessage.includes('503') || errMessage.includes('502') || errMessage.includes('504');
        
        if (isTransient) {
          this.logger.warn(`Transient error on ${modelName}; trying next model.`);
          continue;
        }
        
        yield 'An error occurred while generating the summary.';
        return;
      }
    }

    yield lastQuotaError
      ? "Today's AI quota is fully used across all configured Gemini models. Try again later, or set GEMINI_SUMMARY_MODELS in .env to point at a model your key can use."
      : 'AI summary is temporarily unavailable.';
  }

  async generateLearningInsights(
    skillTitle: string,
    proficiencyLevel: string,
  ): Promise<{ roadmap: string; resources: any[] }> {
    const prompt = [
      `Career advisor for a user who completed "${skillTitle}" at ${proficiencyLevel} level.`,
      '',
      'Tasks:',
      '1. Short learning roadmap (3 stages, under 60 words).',
      '2. 2-3 high-quality free online resources (title, url, description).',
      '',
      'Respond ONLY with a JSON object:',
      '{ "roadmap": "markdown", "resources": [{ "title": "...", "url": "...", "description": "..." }] }',
      'No preamble.',
    ].join('\n');

    const response = await this.getSinglePromptResponse(prompt, `insights:${skillTitle}:${proficiencyLevel}`);
    if (!response || response.includes('error occurred') || response.includes('unavailable')) {
      return { roadmap: 'Roadmap generation is currently unavailable.', resources: [] };
    }

    try {
      const start = response.indexOf('{');
      const end = response.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('No JSON object found');
      const json = JSON.parse(response.substring(start, end + 1));
      return {
        roadmap: json.roadmap || 'No roadmap generated.',
        resources: Array.isArray(json.resources) ? json.resources : [],
      };
    } catch (e) {
      this.logger.error(`Failed to parse AI insights JSON for ${skillTitle}`, e);
      return { roadmap: 'Error parsing AI results.', resources: [] };
    }
  }

  async generateRoadmap(skillTitle: string, proficiencyLevel: string): Promise<string> {
    const insights = await this.generateLearningInsights(skillTitle, proficiencyLevel);
    return insights.roadmap;
  }

  async generateResources(skillTitle: string): Promise<any[]> {
    const insights = await this.generateLearningInsights(skillTitle, 'INTERMEDIATE');
    return insights.resources;
  }

  private async getSinglePromptResponse(prompt: string, cacheSeed: string): Promise<string> {
    const start = Date.now();
    const generator = this.streamPrompt(prompt, cacheSeed);
    let full = '';
    for await (const chunk of generator) {
      full += chunk;
    }
    this.logger.debug(`AI prompt [${cacheSeed.substring(0, 20)}...] took ${Date.now() - start}ms`);
    return full;
  }

  private isCoolingDown(modelName: string): boolean {
    const until = this.modelCooldownUntil.get(modelName) ?? 0;
    return Date.now() < until;
  }

  private markCooldown(modelName: string) {
    this.modelCooldownUntil.set(modelName, Date.now() + QUOTA_COOLDOWN_MS);
  }

  private rememberSummary(key: string, value: string) {
    if (!value) return;
    if (this.summaryCache.size >= AiService.SUMMARY_CACHE_LIMIT) {
      const firstKey = this.summaryCache.keys().next().value;
      if (firstKey) this.summaryCache.delete(firstKey);
    }
    this.summaryCache.set(key, value);
  }
}
