import { performance } from 'node:perf_hooks';
import { executeReadQuery } from '../db/mysql.js';
import type { BenchmarkResult, BenchmarkRun, DatabaseTarget } from '../types.js';

const median = (values: number[]) => {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
};

const summarizeRuns = (runs: BenchmarkRun[]) => {
  const successfulRuns = runs.filter((run) => run.success);
  const timesByTarget = {
    primary: successfulRuns.filter((run) => run.target === 'primary').map((run) => run.durationMs),
    replica: successfulRuns.filter((run) => run.target === 'replica').map((run) => run.durationMs)
  };

  const average = (stats: number[]) => (stats.length ? stats.reduce((sum, value) => sum + value, 0) / stats.length : 0);
  const minimum = (stats: number[]) => (stats.length ? Math.min(...stats) : 0);
  const maximum = (stats: number[]) => (stats.length ? Math.max(...stats) : 0);

  const primaryAverage = average(timesByTarget.primary);
  const replicaAverage = average(timesByTarget.replica);
  const primaryMedian = median(timesByTarget.primary);
  const replicaMedian = median(timesByTarget.replica);

  const primaryMinimum = minimum(timesByTarget.primary);
  const replicaMinimum = minimum(timesByTarget.replica);
  const primaryMaximum = maximum(timesByTarget.primary);
  const replicaMaximum = maximum(timesByTarget.replica);
  const percentageDifference = primaryAverage === 0 ? 0 : ((primaryAverage - replicaAverage) / primaryAverage) * 100;

  return {
    primaryAverage,
    primaryMedian,
    primaryMinimum,
    primaryMaximum,
    replicaAverage,
    replicaMedian,
    replicaMinimum,
    replicaMaximum,
    percentageDifference
  };
};

const getTargetSequence = (iterations: number, order: 'sequential' | 'alternating') => {
  if (order === 'sequential') {
    return Array.from({ length: iterations }, (_, index) => (index < Math.ceil(iterations / 2) ? 'primary' : 'replica'));
  }

  return Array.from({ length: iterations }, (_, index) => (index % 2 === 0 ? 'primary' : 'replica'));
};

const getQueryParams = (queryKey: string) => {
  if (queryKey === 'employees_by_department') {
    return ['IT'];
  }

  return [];
};

export const benchmarkReadQuery = async ({
  queryKey,
  iterations = 10,
  order = 'alternating'
}: {
  queryKey: string;
  iterations?: number;
  order?: 'sequential' | 'alternating';
}): Promise<BenchmarkResult> => {
  const safeIterations = Number.isInteger(iterations) && iterations > 0 ? iterations : 10;
  const sequence = getTargetSequence(safeIterations, order);
  const runs: BenchmarkRun[] = [];

  for (const target of sequence) {
    const startedAt = performance.now();
    try {
      await executeReadQuery(target, queryKey, getQueryParams(queryKey));
      const durationMs = performance.now() - startedAt;
      runs.push({
        target,
        durationMs,
        timestamp: new Date().toISOString(),
        success: true
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Query execution failed.';
      runs.push({
        target,
        durationMs: performance.now() - startedAt,
        timestamp: new Date().toISOString(),
        success: false,
        error: message
      });
    }
  }

  const summary = summarizeRuns(runs);

  return {
    queryKey,
    iterations: runs.length,
    order,
    note: 'Measured observations depend on the instance class, dataset size, indexing, cache state, concurrency, and network conditions.',
    runs,
    ...summary
  };
};
