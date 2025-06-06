import pino from 'pino';

const transport = pino.transport({
  targets: [
    {
      target: 'pino/file',
      options: { destination: './next/logs/next_logs.txt' },
      level: 'info',
    },
    {
      target: 'pino-pretty',
      options: { colorize: true },
      level: 'silent',
    },
  ],
});

const logger = pino(
  {
    level: 'info',
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  },
  transport
);

export default logger;
