import { fork, ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import * as yaml from 'js-yaml';

interface FunctionInstance {
  process: ChildProcess;
  busy: boolean;
}

interface RegisteredFunctionConfig {
  name: string;
  handler: string;
  file: string;
}

export class FunctionManager {
  private activeInstances: number = 0;
  private totalInvocations: number = 0;
  private processesPool: FunctionInstance[] = [];

  public async handleMessage(functionName: string, message: string): Promise<void> {
    console.log(`Received message for function ${functionName}: ${message}`);
    await this.processMessage(functionName, message);
  }

  private async processMessage(functionName: string, message: string): Promise<void> {
    const functionConfig = await this.loadFunctionConfig(functionName);
    if (!functionConfig) {
      console.error(`No configuration found for function: ${functionName}`);
      return;
    }

    const idleProcess = this.processesPool.find(p => !p.busy);
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
    instance.busy = true;
    instance.process.send({
      event: { message },
      functionName: config.name,
      handlerName: config.handler,
    });
  }

  private createProcess(config: RegisteredFunctionConfig, message: string): void {
    const child = fork(resolve(__dirname, 'functionProcess'));

    const instance: FunctionInstance = {
      process: child,
      busy: true
    };

    child.send({
      event: { message },
      functionName: config.name,
      handlerName: config.handler,
      fileName: config.file,
    });

    child.on('message', this.onProcessMessage.bind(this));

    this.processesPool.push(instance);
    this.activeInstances++;
  }

  private onProcessMessage({ pid, status }: { pid: number, status: string }): void {
    if (status === 'exit') {
      this.processCleanup(pid);
    } else if (status === 'idle') {
      this.setProcessIdle(pid);
    }
  }

  private setProcessIdle(pid: number): void {
    const instance = this.processesPool.find(p => p.process.pid === pid);
    if (instance) {
      instance.busy = false;
    }
  }

  private processCleanup(pid: number) {
    this.processesPool = this.processesPool.filter(instance => instance.process.pid !== pid);
    this.activeInstances--;
  }

  public getStatistics(): { activeInstances: number, totalInvocations: number } {
    return {
      activeInstances: this.activeInstances,
      totalInvocations: this.totalInvocations
    };
  }
}
