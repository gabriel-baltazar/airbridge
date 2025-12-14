export enum AppMode {
  HOME = 'HOME',
  SENDER = 'SENDER',
  RECEIVER = 'RECEIVER',
}

export enum TransferStatus {
  IDLE = 'IDLE',
  WAITING_FOR_ID = 'WAITING_FOR_ID', // Receiver waiting for peer cloud
  WAITING_FOR_CONNECTION = 'WAITING_FOR_CONNECTION', // Receiver waiting for sender
  CONNECTING = 'CONNECTING',
  TRANSFERRING = 'TRANSFERRING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface FileMeta {
  name: string;
  size: number;
  type: string;
}

// Estrutura dos dados enviados via WebRTC
export type DataPacket = 
  | { type: 'header'; meta: FileMeta }
  | { type: 'chunk'; data: ArrayBuffer }
  | { type: 'end' };
