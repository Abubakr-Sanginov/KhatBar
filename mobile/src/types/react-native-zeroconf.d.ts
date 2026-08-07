declare module "react-native-zeroconf" {
  export default class Zeroconf {
    publish(name: string, type: string, port: number, txt?: Record<string, string>): void;
    unpublishAll(): void;
    scan(type?: string, domain?: string): void;
    stop(): void;
    resolve(type: string, name: string, domain: string): void;
    on(event: string, handler: (...args: any[]) => void): void;
    off(event: string, handler: (...args: any[]) => void): void;
    removeListener(event: string, handler: (...args: any[]) => void): void;
  }
}
