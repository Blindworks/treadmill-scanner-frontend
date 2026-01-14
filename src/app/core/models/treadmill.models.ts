export interface TreadmillSample {
  speed: number;
  incline: number;
  distance: number;
  calories: number;
  heartRate?: number;
  cadence?: number;
  steps?: number;
  timestamp: string;
}

export interface TreadmillSessionStats {
  durationSeconds: number;
  distance: number;
  averageSpeed: number;
  averagePace: number;
  maxSpeed: number;
  maxIncline: number;
}

export interface TreadmillSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  samples: TreadmillSample[];
  stats: TreadmillSessionStats;
  note?: string;
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'offline';

export type DataTransport = 'sse' | 'polling';
