import { resolve } from 'node:path';
import { FunctionProcessor } from './types';

const TIME_OUT = 10_000;
let currentTimer: NodeJS.Timeout | null = null;

process.on('message', async ({
  event,
  fileName,
  functionName,
  handlerName,
}: FunctionProcessor) => {
  try {
    if (currentTimer) {
      clearTimeout(currentTimer);
    }

    const functionModule = await import(resolve(__dirname, '..', 'functions', functionName, fileName));
    const handler = functionModule[handlerName];
    
    if (typeof handler === 'function') {
      await handler({ ...event, pid: process.pid });

      currentTimer = setTimeout(() => {
        if (process.send) {
          process.send({ pid: process.pid, status: 'exit' });
        }
        process.exit(0);
      }, TIME_OUT);
    } else {
      throw new Error(`Handler ${handlerName} is not a function`);
    }
  } catch (error) {
    console.error(`Failed to execute handler: ${(error as Error).message}`);
    process.exit(1);
  }
});
