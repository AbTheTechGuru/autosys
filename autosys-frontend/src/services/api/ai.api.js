/**
 * AI API service — fronts all Claude calls through the backend.
 *
 * The Anthropic API key NEVER touches the browser.
 * Rate limiting and cost control happen server-side.
 */
import client from './client';

export const aiApi = {
  /** Generate vehicle listing description */
  description: (vehicle) =>
    client.post('/ai/description', vehicle),

  /** Smart pricing analysis */
  pricing: (vehicle) =>
    client.post('/ai/pricing', vehicle),

  /** WhatsApp + email follow-up for a lead (lead_id only — server fetches data) */
  followup: (leadId) =>
    client.post('/ai/followup', { lead_id: leadId }),

  /** Social media posts (Instagram, Facebook, WhatsApp Status) */
  social: (vehicle) =>
    client.post('/ai/social', vehicle),

  /** General dealership assistant chat */
  chat: (messages) =>
    client.post('/ai/chat', { messages }),

  /** Generate WhatsApp quick reply */
  whatsappReply: (payload) =>
    client.post('/ai/whatsapp-reply', payload),

  /** Generate marketing campaign message */
  campaignMessage: (payload) =>
    client.post('/ai/campaign-message', payload),

  /** Score a lead (0-100) */
  scoreLead: (leadId) =>
    client.post(`/ai/score-lead/${leadId}`),
};
