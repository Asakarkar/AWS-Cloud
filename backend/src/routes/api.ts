import { Router } from 'express';
import { z } from 'zod';
import { executeReadQuery, findEmployeeById, getDatabaseStatus, getQueryTemplates, insertEmployeeOnPrimary, isDatabaseConfigured, readOnlyQueries } from '../db/mysql.js';
import { benchmarkReadQuery } from '../services/benchmark.js';
import { getReplicaLagMetric } from '../services/cloudwatch.js';
import type { BenchmarkResult, DatabaseTarget } from '../types.js';
import { benchmarkRequestSchema, queryParamSchema, replicationDemoSchema, writeDemoSchema } from '../validators.js';

const router = Router();
const benchmarkHistory: BenchmarkResult[] = [];

router.get('/health', async (_req, res) => {
  const primary = await getDatabaseStatus('primary');
  const replica = await getDatabaseStatus('replica');
  const monitoring = await getReplicaLagMetric();

  res.json({
    primary,
    replica,
    monitoring,
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

router.get('/db/status', async (_req, res) => {
  const primary = await getDatabaseStatus('primary');
  const replica = await getDatabaseStatus('replica');
  res.json({ primary, replica, timestamp: new Date().toISOString() });
});

router.get('/queries', (_req, res) => {
  res.json(getQueryTemplates());
});

const ensureAllowedQuery = (queryKey: string) => {
  if (!(queryKey in readOnlyQueries)) {
    throw new Error('The selected query is not allowed.');
  }
};

router.post('/query', async (req, res, next) => {
  try {
    const payload = queryParamSchema.parse(req.body ?? {});
    ensureAllowedQuery(payload.queryKey);
    const rows = await executeReadQuery(payload.target, payload.queryKey, payload.params as unknown[]);

    res.json({
      target: payload.target,
      queryKey: payload.queryKey,
      rows,
      recordsReturned: rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'The selected query is not allowed.') {
      return res.status(400).json({ error: error.message, target: req.body?.target ?? 'primary', queryKey: req.body?.queryKey ?? '' });
    }
    next(error);
  }
});

router.post('/query/execute', async (req, res, next) => {
  try {
    const payload = queryParamSchema.parse(req.body ?? {});
    ensureAllowedQuery(payload.queryKey);
    const rows = await executeReadQuery(payload.target, payload.queryKey, payload.params as unknown[]);
    res.json({
      target: payload.target,
      queryKey: payload.queryKey,
      rows,
      recordsReturned: rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'The selected query is not allowed.') {
      return res.status(400).json({ error: error.message, target: req.body?.target ?? 'primary', queryKey: req.body?.queryKey ?? '' });
    }
    next(error);
  }
});

router.post('/benchmark', async (req, res, next) => {
  try {
    const payload = benchmarkRequestSchema.parse(req.body ?? {});
    ensureAllowedQuery(payload.queryKey);
    const benchmark = await benchmarkReadQuery({
      queryKey: payload.queryKey,
      iterations: payload.iterations,
      order: payload.order
    });

    benchmarkHistory.unshift(benchmark);
    if (benchmarkHistory.length > 12) benchmarkHistory.splice(12);

    res.json(benchmark);
  } catch (error) {
    if (error instanceof Error && error.message === 'The selected query is not allowed.') {
      return res.status(400).json({ error: error.message, queryKey: req.body?.queryKey ?? '' });
    }
    next(error);
  }
});

router.post('/benchmark/run', async (req, res, next) => {
  try {
    const payload = benchmarkRequestSchema.parse(req.body ?? {});
    ensureAllowedQuery(payload.queryKey);
    const benchmark = await benchmarkReadQuery({
      queryKey: payload.queryKey,
      iterations: payload.iterations,
      order: payload.order
    });

    benchmarkHistory.unshift(benchmark);
    if (benchmarkHistory.length > 12) benchmarkHistory.splice(12);

    res.json(benchmark);
  } catch (error) {
    if (error instanceof Error && error.message === 'The selected query is not allowed.') {
      return res.status(400).json({ error: error.message, queryKey: req.body?.queryKey ?? '' });
    }
    next(error);
  }
});

router.post('/write-demo', async (req, res, next) => {
  try {
    const payload = writeDemoSchema.parse(req.body ?? {});

    if (!isDatabaseConfigured.primary) {
      return res.status(503).json({ error: 'Primary database is not configured.' });
    }

    const result = await insertEmployeeOnPrimary(payload);
    res.json({
      message: 'Write succeeded on the primary database.',
      employee: payload,
      insertResult: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

router.post('/demo/insert', async (req, res, next) => {
  try {
    const payload = writeDemoSchema.parse(req.body ?? {});

    if (!isDatabaseConfigured.primary) {
      return res.status(503).json({ error: 'Primary database is not configured.' });
    }

    const result = await insertEmployeeOnPrimary(payload);
    res.json({
      message: 'Write succeeded on the primary database.',
      employee: payload,
      insertResult: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

router.post('/replication-demo', async (req, res, next) => {
  try {
    const payload = replicationDemoSchema.parse(req.body ?? {});

    if (!isDatabaseConfigured.primary || !isDatabaseConfigured.replica) {
      return res.status(503).json({
        error: 'Primary and replica database configuration is required for this lab step.'
      });
    }

    const sampleName = payload.employee_name ?? `replica-demo-${Date.now()}`;
    const department = payload.department ?? 'Operations';
    const salary = payload.salary ?? 90000;
    const startedAt = Date.now();
    const timeoutMs = 20000;
    const intervalMs = 500;

    await insertEmployeeOnPrimary({
      employee_name: sampleName,
      department,
      salary
    });

    let observed = false;
    let row: Record<string, unknown> | null = null;
    let employeeId: number | null = null;

    while (Date.now() - startedAt < timeoutMs) {
      const matchingRows = await executeReadQuery('replica', 'employees_by_department', [department]);
      const found = matchingRows.find((record) => String(record.employee_name ?? '') === sampleName);

      if (found) {
        observed = true;
        row = found as Record<string, unknown>;
        employeeId = Number(found.employee_id ?? 0);
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    res.json({
      observed,
      employeeId,
      primaryWrite: { employee_name: sampleName, department, salary },
      visibilityDelayMs: observed && row ? Date.now() - startedAt : null,
      timeoutMs,
      measuredFromPrimaryWrite: 'This is the measured visibility delay from the primary write until the replica observed the record.',
      aws_metric_note: 'CloudWatch ReplicaLag is a separate AWS metric and is not equivalent to the replica visibility delay observed here.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

router.get('/demo/replication/:employeeId', async (req, res, next) => {
  try {
    const employeeId = Number(req.params.employeeId);
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return res.status(400).json({ error: 'employeeId must be a positive integer.' });
    }

    const rows = await findEmployeeById('replica', employeeId);
    res.json({
      employeeId,
      found: rows.length > 0,
      row: rows[0] ?? null,
      observedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

router.get('/metrics/replica-lag', async (_req, res) => {
  const cloudwatchData = await getReplicaLagMetric();
  res.json(cloudwatchData);
});

router.get('/monitoring/replica-lag', async (_req, res) => {
  const cloudwatchData = await getReplicaLagMetric();
  res.json(cloudwatchData);
});

router.get('/results/history', (_req, res) => {
  res.json({
    count: benchmarkHistory.length,
    results: benchmarkHistory
  });
});

router.get('/lab-overview', (_req, res) => {
  res.json({
    architecture: 'Application → Primary RDS → Asynchronous Replication → Read Replica',
    explanation: 'Write queries target the primary database, while eligible read queries can use the replica for scale-out read traffic.',
    readOnlyQueries: Object.values(readOnlyQueries),
    notes: [
      'The primary handles writes and can also serve reads.',
      'Replicas are asynchronous and may be stale.',
      'Read replicas improve read throughput but do not guarantee lower latency for every workload.',
      'Read replica instances add cost and are not a replacement for a full HA configuration.'
    ]
  });
});

export default router;
