'use strict';

/**
 * AutoSys Communication Service
 * ──────────────────────────────
 * Unified multi-channel outbound messaging.
 * Routes to the right provider based on dealer's country.
 *
 * Channels:  WhatsApp · SMS (Termii / Twilio) · Email (SendGrid / Resend)
 */

const { supabase }         = require('../config/supabase');
const { getCountryConfig } = require('../config/countryConfig');
const logger               = require('../utils/logger');

// ── WhatsApp Service (Meta Cloud API) ────────────────────────
class WhatsAppService {
  constructor() {
    this.token      = process.env.WHATSAPP_TOKEN;
    this.phoneId    = process.env.WHATSAPP_PHONE_ID;
    this.baseUrl    = 'https://graph.facebook.com/v18.0';
  }

  async sendMessage(to, body, type = 'text') {
    if (!this.token || !this.phoneId) {
      logger.warn('[WA] Missing credentials — skipping (dev mode)');
      return { skipped: true };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type:    'individual',
      to:                this._normalizePhone(to),
      type,
      text:              { body },
    };

    const res = await fetch(`${this.baseUrl}/${this.phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
    return data;
  }

  async sendTemplate(to, templateName, languageCode = 'en', components = []) {
    const payload = {
      messaging_product: 'whatsapp',
      to:                this._normalizePhone(to),
      type:              'template',
      template: {
        name:     templateName,
        language: { code: languageCode },
        components,
      },
    };

    const res = await fetch(`${this.baseUrl}/${this.phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`WhatsApp template error: ${JSON.stringify(data)}`);
    return data;
  }

  _normalizePhone(phone) {
    // Ensure E.164 format: +2348012345678
    const digits = phone.replace(/\D/g, '');
    return phone.startsWith('+') ? phone : `+${digits}`;
  }
}

// ── SMS Service — Termii (Africa) ─────────────────────────────
class TermiiService {
  constructor() {
    this.apiKey  = process.env.TERMII_API_KEY;
    this.baseUrl = 'https://api.ng.termii.com/api';
  }

  async send(to, message, senderId = 'AutoSys') {
    if (!this.apiKey) { logger.warn('[Termii] No API key'); return { skipped: true }; }

    const res = await fetch(`${this.baseUrl}/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to, from: senderId, sms: message, type: 'plain',
        channel: 'generic', api_key: this.apiKey,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    if (data.code !== 'ok') throw new Error(`Termii error: ${data.message}`);
    return data;
  }
}

// ── SMS Service — Twilio (Global) ─────────────────────────────
class TwilioService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken  = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_FROM_NUMBER;
    this.baseUrl    = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
  }

  async send(to, body) {
    if (!this.accountSid) { logger.warn('[Twilio] No credentials'); return { skipped: true }; }

    const params = new URLSearchParams({ To: to, From: this.fromNumber, Body: body });
    const auth   = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const res = await fetch(`${this.baseUrl}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    if (res.status >= 400) throw new Error(`Twilio error: ${data.message}`);
    return data;
  }
}

// ── Email Service — SendGrid ──────────────────────────────────
class EmailService {
  constructor() {
    this.apiKey     = process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY;
    this.provider   = process.env.SENDGRID_API_KEY ? 'sendgrid' : 'resend';
    this.fromEmail  = process.env.FROM_EMAIL || 'noreply@autosys.app';
    this.fromName   = process.env.FROM_NAME  || 'AutoSys';
  }

  async send({ to, subject, html, text, replyTo }) {
    if (!this.apiKey) { logger.warn('[Email] No API key'); return { skipped: true }; }

    if (this.provider === 'sendgrid') {
      return this._sendViaSendGrid({ to, subject, html, text, replyTo });
    }
    return this._sendViaResend({ to, subject, html, text, replyTo });
  }

  async _sendViaSendGrid({ to, subject, html, text, replyTo }) {
    const payload = {
      personalizations: [{ to: [{ email: to }] }],
      from:             { email: this.fromEmail, name: this.fromName },
      subject,
      content: [
        { type: 'text/plain', value: text || this._stripHtml(html) },
        ...(html ? [{ type: 'text/html', value: html }] : []),
      ],
      ...(replyTo ? { reply_to: { email: replyTo } } : {}),
    };

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`SendGrid error ${res.status}: ${err}`);
    }

    return { provider: 'sendgrid', status: res.status };
  }

  async _sendViaResend({ to, subject, html, text, replyTo }) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    `${this.fromName} <${this.fromEmail}>`,
        to:      [to], subject, html, text,
        reply_to: replyTo,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`Resend error: ${JSON.stringify(data)}`);
    return { provider: 'resend', ...data };
  }

  _stripHtml(html) {
    return html?.replace(/<[^>]*>/g, '') ?? '';
  }
}

// ── Unified Communication Service ────────────────────────────
class CommunicationService {
  constructor() {
    this.whatsapp = new WhatsAppService();
    this.termii   = new TermiiService();
    this.twilio   = new TwilioService();
    this.email    = new EmailService();
  }

  /**
   * Send a WhatsApp message and persist to messages table.
   */
  async sendWhatsApp(dealerId, leadId, phone, message, senderUserId = null) {
    const result = await this.whatsapp.sendMessage(phone, message);

    await this._persistMessage({
      dealer_id:  dealerId,
      lead_id:    leadId,
      channel:    'whatsapp',
      direction:  'outbound',
      from_number: process.env.WHATSAPP_BUSINESS_NUMBER,
      to_number:  phone,
      body:       message,
      status:     result.skipped ? 'simulated' : 'sent',
      sent_by:    senderUserId,
      provider:   'meta',
      provider_message_id: result?.messages?.[0]?.id,
    });

    return result;
  }

  /**
   * Send SMS — routes to Termii (Africa) or Twilio (Global) based on country.
   */
  async sendSms(dealerId, leadId, phone, message, country = 'US') {
    const countryConfig = getCountryConfig(country);
    const isAfrica = ['NG', 'GH', 'KE', 'ZA', 'EG'].includes(country);

    let result;
    let provider;
    try {
      if (isAfrica) {
        result   = await this.termii.send(phone, message);
        provider = 'termii';
      } else {
        result   = await this.twilio.send(phone, message);
        provider = 'twilio';
      }
    } catch (err) {
      logger.warn({ err, country }, '[Comm] Primary SMS failed, trying Twilio fallback');
      result   = await this.twilio.send(phone, message);
      provider = 'twilio_fallback';
    }

    await this._persistMessage({
      dealer_id: dealerId,
      lead_id:   leadId,
      channel:   'sms',
      direction: 'outbound',
      to_number: phone,
      body:      message,
      status:    result.skipped ? 'simulated' : 'sent',
      provider,
    });

    return result;
  }

  /**
   * Send Email.
   */
  async sendEmail(dealerId, leadId, to, subject, html, text = null) {
    const result = await this.email.send({ to, subject, html, text });

    await this._persistMessage({
      dealer_id: dealerId,
      lead_id:   leadId,
      channel:   'email',
      direction: 'outbound',
      to_number: to,
      subject,
      body:      text || subject,
      status:    result.skipped ? 'simulated' : 'sent',
      provider:  result.provider || 'email',
    });

    return result;
  }

  /**
   * Initiate a phone call (Phase 1: tel: link; Phase 2: VoIP).
   */
  async initiateCall(phone, method = 'tel') {
    if (method === 'tel') {
      return { url: `tel:${phone}`, method: 'tel' };
    }
    // Phase 2: VoIP via Twilio Programmable Voice
    throw new Error('VoIP calling not yet implemented. Use tel: method.');
  }

  /**
   * Handle incoming WhatsApp webhook — create lead if new contact.
   */
  async handleIncomingWhatsApp(dealerId, message, contact) {
    const phone = contact.wa_id;
    const body  = message.text?.body || '';

    // Check if we already have this contact as a lead
    let { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('dealer_id', dealerId)
      .eq('phone', phone)
      .maybeSingle();

    // Auto-create lead from new WhatsApp contact
    if (!existingLead) {
      const { data: newLead } = await supabase
        .from('leads')
        .insert({
          dealer_id: dealerId,
          name:      contact.profile?.name || `WA Contact (${phone.slice(-4)})`,
          phone:     `+${phone}`,
          source:    'whatsapp',
          stage:     'new',
        })
        .select()
        .single();

      existingLead = newLead;

      // Fire automation: lead.created
      const { engine } = require('./automation.engine');
      await engine.fire('lead.created', { lead: newLead }, dealerId);
    }

    // Persist the inbound message
    await this._persistMessage({
      dealer_id:  dealerId,
      lead_id:    existingLead?.id,
      channel:    'whatsapp',
      direction:  'inbound',
      from_number: phone,
      body,
      status:     'received',
      provider:   'meta',
      provider_message_id: message.id,
    });

    // Fire automation: message.received
    const { engine } = require('./automation.engine');
    await engine.fire('message.received', {
      lead:    existingLead,
      message: { channel: 'whatsapp', body, phone },
    }, dealerId);

    return { leadId: existingLead?.id };
  }

  /**
   * Get unified conversation thread for a lead.
   */
  async getThread(dealerId, leadId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('dealer_id', dealerId)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get unified inbox — all recent conversations grouped by lead.
   */
  async getInbox(dealerId, { channel, limit = 50, offset = 0 } = {}) {
    let query = supabase
      .from('messages')
      .select(`
        id, channel, direction, body, subject, status, created_at,
        lead_id, from_number, to_number,
        leads!inner(id, name, phone, email, stage)
      `)
      .eq('dealer_id', dealerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (channel) query = query.eq('channel', channel);

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  // ── Private ───────────────────────────────────────────────────

  async _persistMessage(data) {
    try {
      const { error } = await supabase.from('messages').insert({
        ...data,
        created_at: new Date().toISOString(),
      });
      if (error) logger.error({ error }, '[Comm] Failed to persist message');
    } catch (err) {
      logger.error({ err }, '[Comm] Exception persisting message');
    }
  }
}

module.exports = new CommunicationService();
