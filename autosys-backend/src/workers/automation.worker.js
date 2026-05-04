'use strict';

/**
 * AutoSys Automation Worker
 * ──────────────────────────
 * BullMQ worker that processes automation jobs.
 * Run this as a separate process in production:
 *   node src/workers/automation.worker.js
 *
 * Or pass the queue to the engine at startup (server.js).
 */

const { Worker, Queue, QueueEvents } = require('bullmq');
const IORedis   = require('ioredis');
const logger    = require('../utils/logger');
const { engine } = require('../services/automation.engine');

const QUEUE_NAME = 'autosys-automations';
const REDIS_URL  = process.env.REDIS_URL || 'redis://localhost:6379';

let queue;
let worker;

function createConnection() {
  return new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck:     false,
  });
}

/**
 * Initialize the queue and attach it to the engine.
 * Call this from server.js on startup.
 */
function initQueue() {
  const connection = createConnection();
  queue = new Queue(QUEUE_NAME, { connection });
  engine.initQueue(queue);
  logger.info({ queue: QUEUE_NAME }, '[Worker] Queue initialized and attached to engine');
  return queue;
}

/**
 * Start the BullMQ worker.
 * In production, run in a separate process.
 */
function startWorker() {
  const connection = createConnection();

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { automationId, dealerId } = job.data;
      logger.info({ jobId: job.id, automationId, dealerId }, '[Worker] Processing job');

      // Delegate to the engine's action executor
      await engine._executeActions(job.data);

      // Increment run count
      const { supabase } = require('../config/supabase');
      await supabase.rpc('increment_automation_run', { automation_id: automationId });

      logger.info({ jobId: job.id }, '[Worker] Job complete');
    },
    {
      connection,
      concurrency:  5,
      limiter:      { max: 50, duration: 10_000 }, // 50 jobs per 10 seconds per worker
      removeOnComplete: { count: 200, age: 86400 },
      removeOnFail:     { count: 50 },
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, '[Worker] Job failed');
  });

  worker.on('error', (err) => {
    logger.error({ err }, '[Worker] Worker error');
  });

  // Queue event monitoring
  const events = new QueueEvents(QUEUE_NAME, { connection: createConnection() });
  events.on('stalled', ({ jobId }) => {
    logger.warn({ jobId }, '[Worker] Job stalled');
  });

  logger.info({ queue: QUEUE_NAME, concurrency: 5 }, '[Worker] 🚀 Automation worker started');
  return worker;
}

/**
 * Scheduled trigger poller.
 * Checks automation_schedules every minute for fire_at <= now.
 * Call startSchedulePoller() from server.js.
 */
function startSchedulePoller() {
  const POLL_INTERVAL = 60_000; // 1 minute

  const poll = async () => {
    try {
      const { supabase } = require('../config/supabase');
      const now = new Date().toISOString();

      const { data: schedules } = await supabase
        .from('automation_schedules')
        .select('*')
        .eq('status', 'pending')
        .lte('fire_at', now)
        .limit(50);

      if (!schedules?.length) return;

      logger.info({ count: schedules.length }, '[Poller] Firing scheduled triggers');

      for (const sched of schedules) {
        // Mark as fired first (prevent double-fire)
        await supabase.from('automation_schedules')
          .update({ status: 'fired', fired_at: now })
          .eq('id', sched.id);

        // Fire into the engine
        await engine.fire(sched.trigger, sched.payload, sched.dealer_id);
      }
    } catch (err) {
      logger.error({ err }, '[Poller] Schedule poll error');
    }
  };

  const interval = setInterval(poll, POLL_INTERVAL);
  poll(); // Run immediately on start
  logger.info({ intervalMs: POLL_INTERVAL }, '[Poller] Schedule poller started');

  return interval;
}

/**
 * Graceful shutdown.
 */
async function shutdown() {
  logger.info('[Worker] Shutting down...');
  await worker?.close();
  await queue?.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);

// ── If run directly as a process ─────────────────────────────────
if (require.main === module) {
  // Standalone worker process
  require('../../server.global'); // Ensure env is loaded
  startWorker();
  startSchedulePoller();
}

module.exports = { initQueue, startWorker, startSchedulePoller };
