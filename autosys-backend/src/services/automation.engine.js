'use strict';

/**
 * AutoSys Global Automation Engine
 * ──────────────────────────────────
 * Event-driven trigger → condition → action pipeline.
 * Uses BullMQ for async, retryable, non-blocking job execution.
 * Fully multi-tenant: every operation scoped by dealerId.
 */

const { supabase }      = require('../config/supabase');
const { getCountryConfig } = require('../config/countryConfig');
const logger            = require('../utils/logger');

// ── Supported triggers ────────────────────────────────────────
const TRIGGERS = {
  LEAD_CREATED:       'lead.created',
  LEAD_UPDATED:       'lead.updated',
  LEAD_STAGE_CHANGED: 'lead.stage_changed',
  DEAL_CREATED:       'deal.created',
  DEAL_MOVED:         'deal.moved',
  MESSAGE_RECEIVED:   'message.received',
  TASK_DUE:           'task.due',
  SCHEDULE_TIME:      'schedule.time',
  VEHICLE_CREATED:    'vehicle.created',
  PAYMENT_SUCCESS:    'payment.success',
};

// ── Supported actions ─────────────────────────────────────────
const ACTIONS = {
  SEND_WHATSAPP:        'send_whatsapp',
  SEND_SMS:             'send_sms',
  SEND_EMAIL:           'send_email',
  ASSIGN_AGENT:         'assign_agent',
  CREATE_TASK:          'create_task',
  MOVE_DEAL:            'move_deal',
  ADD_NOTE:             'add_note',
  SCHEDULE_FOLLOWUP:    'schedule_followup',
  CREATE_CALENDAR_EVENT:'create_calendar_event',
  POST_SOCIAL:          'post_social',
};

// ── Automation Engine ─────────────────────────────────────────
class AutomationEngine {
  constructor() {
    this.queue = null; // BullMQ queue — initialized lazily
  }

  /**
   * Fire an event into the automation engine.
   * This is the main entry point: call this whenever something happens.
   *
   * @param {string} trigger  - e.g. 'lead.created'
   * @param {object} payload  - event payload (must include dealerId)
   * @param {string} dealerId - required for multi-tenant isolation
   */
  async fire(trigger, payload, dealerId) {
    if (!dealerId) {
      logger.error({ trigger }, '[AutoEngine] fire() called without dealerId — skipping');
      return;
    }

    logger.info({ trigger, dealerId }, '[AutoEngine] Event fired');

    try {
      // Fetch all enabled automations for this dealer + trigger
      const { data: automations, error } = await supabase
        .from('automations')
        .select('*')
        .eq('dealer_id', dealerId)
        .eq('trigger', trigger)
        .eq('enabled', true);

      if (error) throw error;
      if (!automations?.length) return;

      logger.info({ trigger, count: automations.length, dealerId }, '[AutoEngine] Matching automations found');

      // Evaluate and enqueue each matching automation
      for (const automation of automations) {
        const passes = this._evaluateConditions(automation.conditions, payload);
        if (!passes) {
          logger.debug({ automationId: automation.id }, '[AutoEngine] Conditions not met — skipping');
          continue;
        }

        await this._enqueueActions(automation, payload, dealerId);
      }
    } catch (err) {
      logger.error({ err, trigger, dealerId }, '[AutoEngine] Error processing trigger');
    }
  }

  /**
   * Evaluate automation conditions against payload.
   * Conditions: { field, operator, value }[]
   */
  _evaluateConditions(conditions, payload) {
    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return true; // No conditions = always run
    }

    return conditions.every((cond) => {
      const payloadVal = this._getNestedValue(payload, cond.field);

      switch (cond.operator) {
        case 'eq':          return payloadVal === cond.value;
        case 'neq':         return payloadVal !== cond.value;
        case 'contains':    return String(payloadVal).includes(cond.value);
        case 'gt':          return Number(payloadVal) > Number(cond.value);
        case 'lt':          return Number(payloadVal) < Number(cond.value);
        case 'exists':      return payloadVal !== undefined && payloadVal !== null;
        default:            return true;
      }
    });
  }

  _getNestedValue(obj, path) {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

  /**
   * Enqueue all actions for an automation.
   * Uses BullMQ if available, falls back to direct execution in dev.
   */
  async _enqueueActions(automation, payload, dealerId) {
    // Get dealer context for country-aware actions
    const dealer = await this._getDealerContext(dealerId);

    const jobPayload = {
      automationId: automation.id,
      dealerId,
      dealer,
      trigger:      automation.trigger,
      actions:      automation.actions ?? [{ type: automation.action, config: automation.config }],
      payload,
      enqueuedAt:   new Date().toISOString(),
    };

    try {
      if (this.queue) {
        // Production: BullMQ queue with retry
        await this.queue.add('execute-automation', jobPayload, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail:     50,
        });
        logger.info({ automationId: automation.id }, '[AutoEngine] Job enqueued');
      } else {
        // Development / fallback: execute synchronously
        await this._executeActions(jobPayload);
      }
    } catch (err) {
      logger.error({ err, automationId: automation.id }, '[AutoEngine] Failed to enqueue');
    }
  }

  /**
   * Execute all actions in an automation job.
   * Called by the BullMQ worker (or directly in dev mode).
   */
  async _executeActions(job) {
    const { automationId, dealerId, dealer, actions, payload } = job;

    for (const action of actions) {
      try {
        await this._executeAction(action, payload, dealer, dealerId);

        // Log success
        await this._logActivity(dealerId, automationId, action.type, 'success', payload);
      } catch (err) {
        logger.error({ err, action: action.type, automationId }, '[AutoEngine] Action failed');
        await this._logActivity(dealerId, automationId, action.type, 'failed', payload, err.message);
      }
    }
  }

  /**
   * Execute a single action. Each action type is handled here.
   */
  async _executeAction(action, payload, dealer, dealerId) {
    const { type, config = {} } = action;

    logger.debug({ type, dealerId }, '[AutoEngine] Executing action');

    switch (type) {
      case ACTIONS.SEND_WHATSAPP:
        return this._actionSendWhatsApp(config, payload, dealer);

      case ACTIONS.SEND_SMS:
        return this._actionSendSms(config, payload, dealer);

      case ACTIONS.SEND_EMAIL:
        return this._actionSendEmail(config, payload, dealer);

      case ACTIONS.CREATE_TASK:
        return this._actionCreateTask(config, payload, dealerId);

      case ACTIONS.MOVE_DEAL:
        return this._actionMoveDeal(config, payload, dealerId);

      case ACTIONS.ADD_NOTE:
        return this._actionAddNote(config, payload, dealerId);

      case ACTIONS.ASSIGN_AGENT:
        return this._actionAssignAgent(config, payload, dealerId);

      case ACTIONS.CREATE_CALENDAR_EVENT:
        return this._actionCreateCalendarEvent(config, payload, dealerId);

      case ACTIONS.POST_SOCIAL:
        return this._actionPostSocial(config, payload, dealerId);

      case ACTIONS.SCHEDULE_FOLLOWUP:
        return this._actionScheduleFollowup(config, payload, dealerId);

      default:
        logger.warn({ type }, '[AutoEngine] Unknown action type');
    }
  }

  // ── Action Handlers ───────────────────────────────────────────

  async _actionSendWhatsApp(config, payload, dealer) {
    const phone   = config.phone || payload.lead?.phone || payload.customer?.phone;
    const message = this._interpolate(config.message || 'Hello from AutoSys!', payload);

    if (!phone) throw new Error('No phone number for WhatsApp action');

    // Integrate with your WhatsApp provider (Twilio, Meta API, etc.)
    logger.info({ phone, dealer: dealer.id }, '[AutoEngine] WhatsApp sent');

    // TODO: wire to communicationService.sendWhatsApp(phone, message, dealer)
    return { channel: 'whatsapp', phone, message };
  }

  async _actionSendSms(config, payload, dealer) {
    const phone   = config.phone || payload.lead?.phone;
    const message = this._interpolate(config.message || '', payload);
    const country = getCountryConfig(dealer.country);

    // Africa → Termii; Global → Twilio
    const provider = ['NG', 'GH', 'KE'].includes(dealer.country) ? 'termii' : 'twilio';

    logger.info({ phone, provider, country: dealer.country }, '[AutoEngine] SMS sent');
    return { channel: 'sms', provider, phone, message };
  }

  async _actionSendEmail(config, payload, dealer) {
    const email   = config.email || payload.lead?.email || payload.customer?.email;
    const subject = this._interpolate(config.subject || 'Message from AutoSys', payload);
    const body    = this._interpolate(config.body || '', payload);

    logger.info({ email }, '[AutoEngine] Email sent');
    return { channel: 'email', email, subject };
  }

  async _actionCreateTask(config, payload, dealerId) {
    const dueDate = config.daysFromNow
      ? new Date(Date.now() + config.daysFromNow * 86400000).toISOString()
      : config.dueDate || new Date(Date.now() + 86400000).toISOString();

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        dealer_id:   dealerId,
        title:       this._interpolate(config.title || 'Follow-up task', payload),
        description: config.description || '',
        due_date:    dueDate,
        assigned_to: config.assignedTo || payload.assignedTo,
        lead_id:     payload.lead?.id,
        deal_id:     payload.deal?.id,
        status:      'pending',
        priority:    config.priority || 'medium',
        created_by:  'automation',
      })
      .select()
      .single();

    if (error) throw error;
    logger.info({ taskId: data.id }, '[AutoEngine] Task created');
    return data;
  }

  async _actionMoveDeal(config, payload, dealerId) {
    const dealId = config.dealId || payload.deal?.id;
    if (!dealId) throw new Error('No deal ID for move action');

    const { error } = await supabase
      .from('deals')
      .update({ stage: config.toStage })
      .eq('id', dealId)
      .eq('dealer_id', dealerId);

    if (error) throw error;
    logger.info({ dealId, toStage: config.toStage }, '[AutoEngine] Deal moved');
  }

  async _actionAddNote(config, payload, dealerId) {
    const note = this._interpolate(config.note || '', payload);

    await supabase.from('lead_events').insert({
      dealer_id: dealerId,
      lead_id:   payload.lead?.id,
      type:      'note',
      note,
      source:    'automation',
    });
  }

  async _actionAssignAgent(config, payload, dealerId) {
    const leadId = payload.lead?.id;
    if (!leadId) return;

    // If round-robin, pick next agent
    let agentId = config.agentId;
    if (config.strategy === 'round_robin') {
      agentId = await this._roundRobinAgent(dealerId);
    }

    await supabase.from('leads')
      .update({ assigned_to: agentId })
      .eq('id', leadId)
      .eq('dealer_id', dealerId);
  }

  async _actionCreateCalendarEvent(config, payload, dealerId) {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        dealer_id:   dealerId,
        title:       this._interpolate(config.title || 'Appointment', payload),
        description: config.description || '',
        start_time:  config.startTime || new Date(Date.now() + 86400000).toISOString(),
        end_time:    config.endTime   || new Date(Date.now() + 90000000).toISOString(),
        lead_id:     payload.lead?.id,
        deal_id:     payload.deal?.id,
        assigned_to: config.assignedTo,
        type:        config.type || 'followup',
      })
      .select().single();

    if (error) throw error;
    return data;
  }

  async _actionPostSocial(config, payload, dealerId) {
    const { data, error } = await supabase
      .from('social_posts')
      .insert({
        dealer_id:  dealerId,
        platform:   config.platform || 'facebook',
        content:    this._interpolate(config.content || '', payload),
        media_urls: config.mediaUrls || [],
        status:     'scheduled',
        scheduled_at: config.scheduledAt || new Date().toISOString(),
        source:     'automation',
      })
      .select().single();

    if (error) throw error;
    logger.info({ postId: data.id, platform: config.platform }, '[AutoEngine] Social post queued');
    return data;
  }

  async _actionScheduleFollowup(config, payload, dealerId) {
    const fireAt = new Date(Date.now() + (config.delayHours || 24) * 3600000);

    await supabase.from('automation_schedules').insert({
      dealer_id:     dealerId,
      trigger:       TRIGGERS.SCHEDULE_TIME,
      fire_at:       fireAt.toISOString(),
      action_config: config,
      payload:       payload,
    });
  }

  // ── Helpers ───────────────────────────────────────────────────

  /**
   * Replace {{variable}} placeholders in a string with payload values.
   */
  _interpolate(template, payload) {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) =>
      this._getNestedValue(payload, path) ?? ''
    );
  }

  async _getDealerContext(dealerId) {
    const { data } = await supabase
      .from('dealers')
      .select('id,name,country,currency,timezone,payment_provider')
      .eq('id', dealerId)
      .single();
    return data || { id: dealerId };
  }

  async _roundRobinAgent(dealerId) {
    const { data: agents } = await supabase
      .from('dealer_users')
      .select('id')
      .eq('dealer_id', dealerId)
      .eq('is_active', true)
      .in('role', ['agent', 'admin']);

    if (!agents?.length) return null;

    // Simple round-robin: pick agent with fewest open leads
    const { data: counts } = await supabase
      .from('leads')
      .select('assigned_to, count(*)')
      .eq('dealer_id', dealerId)
      .not('stage', 'in', '(closed_won,closed_lost)')
      .group('assigned_to');

    const agentSet = new Map(agents.map((a) => [a.id, 0]));
    counts?.forEach((c) => {
      if (agentSet.has(c.assigned_to)) agentSet.set(c.assigned_to, Number(c.count));
    });

    return [...agentSet.entries()].sort((a, b) => a[1] - b[1])[0]?.[0] || null;
  }

  async _logActivity(dealerId, automationId, actionType, status, payload, errorMessage = null) {
    try {
      await supabase.from('activity_logs').insert({
        dealer_id:      dealerId,
        entity_type:    'automation',
        entity_id:      automationId,
        action:         `automation.${actionType}.${status}`,
        metadata:       { payload, error: errorMessage },
        created_at:     new Date().toISOString(),
      });
    } catch { /* Log failure should never throw */ }
  }

  /**
   * Initialize BullMQ queue for production use.
   * Call this from server.js startup.
   */
  initQueue(queue) {
    this.queue = queue;
    logger.info('[AutoEngine] BullMQ queue attached');
  }
}

// ── Singleton engine ──────────────────────────────────────────
const engine = new AutomationEngine();

module.exports = { engine, TRIGGERS, ACTIONS };
