const DEFAULT_LICENSE_SERVER = 'http://localhost:3000';

export class ServerPool {
  onPrimaryBackOnline?: () => void;

  constructor(private config: { server?: string }) {}

  getAllServerUrls(): string[] {
    return [this.config.server || DEFAULT_LICENSE_SERVER];
  }

  getCurrentServerUrl(): string {
    return this.config.server || DEFAULT_LICENSE_SERVER;
  }

  rotateServer(): void {}
  resetServerIndex(): void {}
  setBackupServers(_list: string[]): void {}
  startPrimaryHealthCheck(): void {}
  stopPrimaryHealthCheck(): void {}

  get activeServerIndex(): number { return 0; }
  set activeServerIndex(_v: number) {}
  get connectedServerIndex(): number { return 0; }
  set connectedServerIndex(_v: number) {}
  get skipRotateOnClose(): boolean { return false; }
  set skipRotateOnClose(_v: boolean) {}
}
