import { resolve } from 'node:path';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

process.on('message', async ({ message, sharedFile, functionName, handlerName }) => {
  try {
    const functionModule = await import(resolve(__dirname, '..', 'functions', functionName, 'index'));
    const handler = functionModule[handlerName];
    
    if (typeof handler === 'function') {
      await handler(message, sharedFile);
      await sleep(5000);
      process.exit(0);
    } else {
      throw new Error(`Handler ${handlerName} is not a function`);
    }
  } catch (error) {
    console.error(`Failed to execute handler: ${(error as Error).message}`);
    process.exit(1);
  }
});
