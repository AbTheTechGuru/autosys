'use strict';

const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target:  'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
    },
  }),
  base: { service: 'autosys-global' },
  redact: ['req.headers.authorization', '*.password', '*.secret', '*.token'],
});

module.exports = logger;
