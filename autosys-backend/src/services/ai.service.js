'use strict';

/**
 * AutoSys AI Service
 *
 * FIXES:
 *  1. Method was named `generateVehicleDescription` in the class but the original
 *     route called `aiService.generateDescription` — route now fixed to call the
 *     correct name.
 *  2. System prompts were hardcoded to "Nigerian car dealerships" making the app
 *     broken for all other countries (UAE, US, UK, IN, KE etc.).
 *     Prompts now use generic "automotive" language; country context is passed
 *     at call time via dealerContext when available.
 *  3. `generateWhatsappReply` and `generateCampaignMessage` methods were called
 *     from routes but not defined — runtime crash. Added both.
 *  4. `scoreLead` used `lead.createdAt` (camelCase) but the DB field is
 *     `created_at` (snake_case) — score was always 0 days.
 *  5. Error handler threw generic AppError for all AI failures; 429 is now
 *     properly detected and re-thrown with correct status.
 */

'use strict';

const Anthropic    = require('@anthropic-ai/sdk');
const { AppError } = require('../utils/errors');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL     = 'claude-opus-4-5';
const MAX_TOKENS = 1000;

// ── System prompts ────────────────────────────────────────────
const SYSTEMS = {
  copywriter: `You are an expert automotive copywriter for car dealerships.
Write compelling, buyer-focused vehicle descriptions that build trust and create urgency.
Keep it concise and persuasive. End vehicle descriptions with a soft call-to-action.`,

  analyst: `You are an automotive market analyst with extensive experience.
Provide specific price ranges based on make, model, year, mileage, and condition.
Be direct, practical, and data-driven. Reference the local market when context is provided.`,

  salesCoach: `You are an expert car sales communication coach.
Write professional yet warm sales messages that feel personal, not scripted.
Keep WhatsApp messages under 3 sentences. Include follow-up timing suggestions.`,

  socialMedia: `You are a social media marketing expert for car dealerships.
Create engaging, platform-appropriate content that drives inquiries.
For Instagram: use emojis strategically, 5-8 relevant hashtags.
For Facebook: more detailed, storytelling approach.
For WhatsApp Status: ultra-concise, one key message.`,

  assistant: `You are AutoSys AI — the intelligent assistant for car dealerships.
Help with: inventory management, lead follow-up, pricing strategy, marketing, analytics.
Be concise, practical, and specific to the dealer's context when provided.`,
};

// ── AI Service ────────────────────────────────────────────────
class AIService {

  /** Generate a compelling vehicle listing description */
  async generateVehicleDescription({ brand, model, year, mileage, condition, price, features = [], color }) {
    const prompt = `Write a compelling 4-sentence vehicle listing description for:
${year} ${brand} ${model}
Color: ${color || 'Not specified'}
Mileage: ${mileage?.toLocaleString() || 'Low'}km
Condition: ${condition}
Price: ${price ? price.toLocaleString() : 'Competitive price'}
Key Features: ${features.length > 0 ? features.join(', ') : 'Premium features'}

Requirements:
- Sentence 1: Exciting opener about the vehicle's appeal
- Sentence 2: Highlight 2-3 key specs/features buyers care about
- Sentence 3: Emphasize condition and value proposition
- Sentence 4: Call to action`;

    return this._call(SYSTEMS.copywriter, prompt, 300);
  }

  /** Suggest market-based pricing */
  async suggestPricing({ brand, model, year, mileage, condition, currentPrice }) {
    const prompt = `Analyze the used car market and provide pricing guidance for:
${year} ${brand} ${model}
Mileage: ${mileage?.toLocaleString()}km
Condition: ${condition}
${currentPrice ? `Current listed price: ${currentPrice.toLocaleString()}` : ''}

Provide:
1. RECOMMENDED SELLING PRICE RANGE (with brief reasoning)
2. FLOOR PRICE — don't go below this
3. MARKET CONTEXT — 2-3 sentences on current market trends for this model
4. PRICING STRATEGY — one actionable tip

Be specific with amounts based on market rates.`;

    return this._call(SYSTEMS.analyst, prompt, 500);
  }

  /** Generate WhatsApp + email follow-up messages for a lead */
  async generateFollowup({ lead, dealerName = 'AutoSys Motors' }) {
    const daysSince = lead.last_contacted_at
      ? Math.floor((Date.now() - new Date(lead.last_contacted_at)) / 86400000)
      : 0;

    const prompt = `Write two follow-up messages for a car sales lead:

Customer: ${lead.name}
Interested in: ${lead.vehicle_interest || 'a vehicle'}
Lead stage: ${lead.stage || 'New'}
Days since last contact: ${daysSince}
Budget (if known): ${lead.budget ? lead.budget.toLocaleString() : 'Not specified'}
Notes: ${lead.notes || 'None'}

Generate:
**MESSAGE 1 — WhatsApp (max 3 sentences):**
[Warm, personal tone. Reference specific vehicle. Create gentle urgency. Sign as "${dealerName}".]

**MESSAGE 2 — Email:**
Subject: [Write subject]
[More formal, 3-4 sentences. Include next step / call to action.]`;

    return this._call(SYSTEMS.salesCoach, prompt, 500);
  }

  /** Generate social media posts for a vehicle */
  async generateSocialPosts({ vehicle, dealerName = 'AutoSys Motors', dealerLocation = '' }) {
    const prompt = `Write social media posts for this vehicle listing:

Vehicle: ${vehicle.year} ${vehicle.brand} ${vehicle.model}
Price: ${vehicle.price ? vehicle.price.toLocaleString() : 'Contact for price'}
Mileage: ${vehicle.mileage?.toLocaleString()}km
Condition: ${vehicle.condition}
Dealer: ${dealerName}${dealerLocation ? `, ${dealerLocation}` : ''}

Create:
**INSTAGRAM:**
[Exciting caption with 2-3 relevant emojis. End with "DM or WhatsApp to enquire". 5-8 hashtags on new line.]

**FACEBOOK:**
[More detailed post, 3-4 sentences. Tell a story about the vehicle. Include price and contact CTA.]

**WHATSAPP STATUS:**
[One punchy line with emoji. Max 30 words. Price must be included.]`;

    return this._call(SYSTEMS.socialMedia, prompt, 600);
  }

  /** Generate a WhatsApp quick-reply message */
  // FIX: This method was called in routes but was missing from the original service.
  async generateWhatsappReply({ customerName, vehicleInterest, lastMessage, dealerName = 'AutoSys Motors' }) {
    const prompt = `Write a professional WhatsApp reply for a car sales lead.

Customer: ${customerName}
Vehicle interest: ${vehicleInterest || 'general enquiry'}
Their last message: "${lastMessage || ''}"
Dealer: ${dealerName}

Write a warm, friendly reply (max 3 sentences) that:
- Acknowledges their message
- Moves the conversation forward
- Ends with a clear next step`;

    return this._call(SYSTEMS.salesCoach, prompt, 200);
  }

  /** Generate a marketing campaign message */
  // FIX: This method was called in routes but was missing from the original service.
  async generateCampaignMessage({ name, type, audience, dealerName = 'AutoSys Motors' }) {
    const channelGuide = {
      whatsapp:  'WhatsApp (max 160 words, conversational)',
      email:     'Email (include subject line, 3-4 paragraphs)',
      sms:       'SMS (max 160 characters)',
      instagram: 'Instagram caption (emojis, 5-8 hashtags)',
    };

    const prompt = `Write a ${channelGuide[type] || type} marketing campaign message.

Campaign: ${name}
Target audience: ${audience}
Dealer: ${dealerName}

Write a compelling message that drives engagement and action.
${type === 'email' ? 'Start with "Subject: " on the first line.' : ''}`;

    return this._call(SYSTEMS.socialMedia, prompt, 400);
  }

  /** General dealership assistant chat */
  async chat({ messages, dealerContext }) {
    const contextInfo = dealerContext
      ? `\n\nDealer Context:\n- Name: ${dealerContext.name}\n- Plan: ${dealerContext.plan}\n- Location: ${dealerContext.city || 'Unknown'}`
      : '';

    const systemPrompt = SYSTEMS.assistant + contextInfo;

    const response = await client.messages.create({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      system:     systemPrompt,
      messages:   messages.map((m) => ({
        role:    m.role,
        content: m.content || m.text,
      })),
    });

    return response.content[0].text;
  }

  /** Score a lead (1-100) based on available signals */
  async scoreLead({ lead }) {
    // FIX: use snake_case field names from the database row
    const daysSince = lead.created_at
      ? Math.floor((Date.now() - new Date(lead.created_at)) / 86400000)
      : 0;

    const prompt = `Score this car dealership lead from 0-100 based on purchase likelihood.
Higher = more likely to buy.

Lead data:
- Name: ${lead.name}
- Interested in: ${lead.vehicle_interest || 'General'}
- Budget: ${lead.budget ? lead.budget.toLocaleString() : 'Unknown'}
- Source: ${lead.source || 'Unknown'}
- Stage: ${lead.stage}
- Notes: ${lead.notes || 'None'}
- Days since created: ${daysSince}

Respond with ONLY a JSON object: {"score": <0-100>, "reason": "<one sentence>"}`;

    const result = await this._call(
      'You are a sales analyst. Respond only with valid JSON.',
      prompt,
      100,
    );

    try {
      return JSON.parse(result.replace(/```json?|```/g, '').trim());
    } catch {
      return { score: 50, reason: 'Unable to analyze lead' };
    }
  }

  // ── Private call helper ───────────────────────────────────────
  async _call(system, prompt, maxTokens = MAX_TOKENS) {
    try {
      const response = await client.messages.create({
        model:      MODEL,
        max_tokens: maxTokens,
        system,
        messages:   [{ role: 'user', content: prompt }],
      });

      return response.content[0].text;
    } catch (err) {
      if (err.status === 429) {
        throw new AppError('AI rate limit reached. Please try again in a moment.', 429, 'AI_RATE_LIMIT');
      }
      if (err.status === 401) {
        throw new AppError('AI service authentication error.', 500, 'AI_AUTH_ERROR');
      }
      throw new AppError(`AI service error: ${err.message}`, 502, 'AI_ERROR');
    }
  }
}

module.exports = new AIService();
