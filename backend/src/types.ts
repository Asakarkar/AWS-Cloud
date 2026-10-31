export type DatabaseTarget = 'primary' | 'replica';

export interface ConnectionStatus {
  target: DatabaseTarget;
  configured: boolean;
  status: 'connected' | 'disconnected' | 'unconfigured';
  host?: string;
  database?: string;
  message: string;
}

export interface QueryTemplate {
  key: string;
  label: string;
  description: string;
  sql: string;
}

export interface BenchmarkRun {
  target: DatabaseTarget;
  durationMs: number;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface BenchmarkResult {
  queryKey: string;
  iterations: number;
  order: 'sequential' | 'alternating';
  primaryAverage: number;
  primaryMedian: number;
  primaryMinimum: number;
  primaryMaximum: number;
  replicaAverage: number;
  replicaMedian: number;
  replicaMinimum: number;
  replicaMaximum: number;
  percentageDifference: number;
  runs: BenchmarkRun[];
  note: string;
}

export interface CloudWatchResult {
  available: boolean;
  metricName: string;
  instanceIdentifier?: string;
  value?: number | null;
  timestamp?: string;
  unit?: string;
  message: string;
}
