import { fork, ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import Bull from 'bull';
import * as yaml from 'js-yaml';

interface FunctionInstance {
  process: ChildProcess;
  startTime: number;
}

interface RegisteredFunctionConfig {
  name: string;
  handler: string;
}

export class FunctionManager {
  private activeInstances: number = 0;
  private totalInvocations: number = 0;
  private processes: FunctionInstance[] = [];
  private readonly sharedFile = resolve(__dirname, 'shared_file.txt');
  private readonly messageQueue = new Bull('messageQueue');

  constructor() {
    setInterval(() => {
      this.cleanup();
    }, 60000);

    this.messageQueue.process(async (job) => {
      const { functionName, message } = job.data;
      await this.processMessage(functionName, message);
    });
  }

  public async handleMessage(functionName: string, message: string): Promise<void> {
    console.log(`Received message for function ${functionName}: ${message}`);
    await this.messageQueue.add({ functionName, message });
  }

  private async processMessage(functionName: string, message: string): Promise<void> {
    const functionConfig = await this.loadFunctionConfig(functionName);
    if (!functionConfig) {
      console.error(`No configuration found for function: ${functionName}`);
      return;
    }

    const idleProcess = this.processes.find(p => p.process.exitCode !== null);
    if (idleProcess) {
      this.reuseProcess(idleProcess, functionConfig, message);
    } else {
      this.createProcess(functionConfig, message);
    }

    this.totalInvocations++;
  }

  private async loadFunctionConfig(functionName: string): Promise<RegisteredFunctionConfig | null> {
    try {
      const configPath = resolve(__dirname, '..', 'functions', functionName, `config.yaml`);
      const configFile = await readFile(configPath, 'utf-8');
      const config: RegisteredFunctionConfig = yaml.load(configFile) as RegisteredFunctionConfig;

      return config;
    } catch (error) {
      console.error(`Failed to load config for function ${functionName}: ${(error as Error).message}`);
      return null;
    }
  }

  private reuseProcess(instance: FunctionInstance, config: RegisteredFunctionConfig, message: string): void {
    instance.process.send({ message, sharedFile: this.sharedFile, ...config });
    instance.startTime = Date.now();
    this.activeInstances++;
  }

  private createProcess(config: RegisteredFunctionConfig, message: string): void {
    const child = fork(resolve(__dirname, 'functionProcess'));

    child.send({ message, functionName: config.name, handlerName: config.handler, sharedFile: this.sharedFile });
    
    this.processes.push({ process: child, startTime: Date.now() });
    this.activeInstances++;
  }

  private cleanup(): void {
    const now = Date.now();
    this.processes = this.processes.filter(instance => {
      if (instance.process.exitCode === null && (now - instance.startTime) > 60000) {
        console.log(`Cleaning up process started at ${new Date(instance.startTime)}`);
        instance.process.kill();
        this.activeInstances--;
        return false;
      }
      return true;
    });
  }

  public getStatistics(): { activeInstances: number, totalInvocations: number } {
    return {
      activeInstances: this.activeInstances,
      totalInvocations: this.totalInvocations
    };
  }
}
