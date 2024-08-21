export enum ProcessStatuses {
  EXIT = 'exit'
};

export type FunctionProcessor = {
  event: Record<string, unknown>,
  fileName: string,
  functionName: string,
  handlerName: string,
};