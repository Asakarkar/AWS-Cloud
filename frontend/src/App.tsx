import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

interface QueryItem {
  key: string;
  label: string;
  description: string;
  sql: string;
}

interface QueryResult {
  target: string;
  queryKey: string;
  rows: Array<Record<string, unknown>>;
  recordsReturned: number;
  timestamp: string;
}

interface BenchmarkResult {
  primaryAverage: number;
  primaryMedian: number;
  primaryMinimum: number;
  primaryMaximum: number;
  replicaAverage: number;
  replicaMedian: number;
  replicaMinimum: number;
  replicaMaximum: number;
  percentageDifference: number;
  runs: Array<{ target: string; durationMs: number; timestamp: string; success: boolean; error?: string }>;
  note: string;
  queryKey: string;
  iterations: number;
  order: 'sequential' | 'alternating';
}

const defaultBenchmark: BenchmarkResult = {
  primaryAverage: 0,
  primaryMedian: 0,
  primaryMinimum: 0,
  primaryMaximum: 0,
  replicaAverage: 0,
  replicaMedian: 0,
  replicaMinimum: 0,
  replicaMaximum: 0,
  percentageDifference: 0,
  runs: [],
  note: '',
  queryKey: 'employees_by_department',
  iterations: 0,
  order: 'alternating'
};

const formatTime = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Unavailable';
  }

  return `${value.toFixed(2)} ms`;
};

const formatPercent = (value: number) => {
  if (!Number.isFinite(value)) {
    return 'Unavailable';
  }

  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

export default function App() {
  const [health, setHealth] = useState<any>({ primary: null, replica: null, monitoring: null, timestamp: null });
  const [queries, setQueries] = useState<QueryItem[]>([]);
  const [selectedQuery, setSelectedQuery] = useState('employees_by_department');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkResult>(defaultBenchmark);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const fetchOverview = async () => {
    try {
      const [healthResponse, queryResponse] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/queries')
      ]);

      const healthData = await healthResponse.json();
      const queryData = await queryResponse.json();

      setHealth(healthData);
      setQueries(queryData);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to reach the backend service.');
    }
  };

  const runBenchmark = async () => {
    setLoading(true);
    setStatusMessage('Running benchmark comparison...');

    try {
      const response = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryKey: selectedQuery, iterations: 10, order: 'alternating' })
      });

      const benchmarkPayload = await response.json();
      if (!response.ok) {
        throw new Error(benchmarkPayload.error ?? 'Benchmark failed.');
      }

      setBenchmark(benchmarkPayload);
      setStatusMessage('Benchmark completed. Results are measured observations from the current environment.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Benchmark failed.');
    } finally {
      setLoading(false);
    }
  };

  const runQuery = async (target: 'primary' | 'replica') => {
    setLoading(true);
    setStatusMessage(`Running ${target} query...`);

    try {
      const queryParams = selectedQuery === 'employees_by_department' ? ['IT'] : [];
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          queryKey: selectedQuery,
          params: queryParams
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Query execution failed.');
      }

      setQueryResult(payload);
      setStatusMessage(`Query completed on the ${target} database.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Query failed.');
    } finally {
      setLoading(false);
    }
  };

  const runComparison = async () => {
    setLoading(true);
    setStatusMessage('Running comparison between primary and replica...');

    try {
      const queryParams = selectedQuery === 'employees_by_department' ? ['IT'] : [];
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'primary', queryKey: selectedQuery, params: queryParams })
      });

      const primaryData = await response.json();
      if (!response.ok) {
        throw new Error(primaryData.error ?? 'Primary query failed.');
      }

      const replicaResponse = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'replica', queryKey: selectedQuery, params: queryParams })
      });

      const replicaData = await replicaResponse.json();
      if (!replicaResponse.ok) {
        throw new Error(replicaData.error ?? 'Replica query failed.');
      }

      setQueryResult({
        target: 'comparison',
        queryKey: selectedQuery,
        rows: [...primaryData.rows, ...replicaData.rows],
        recordsReturned: primaryData.rows.length + replicaData.rows.length,
        timestamp: new Date().toISOString()
      });
      setStatusMessage('Comparison run completed.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Comparison failed.');
    } finally {
      setLoading(false);
    }
  };

  const monitoredLag = health?.monitoring?.value ?? null;
  const selectedTemplate = useMemo(
    () => queries.find((query) => query.key === selectedQuery) ?? queries[0],
    [queries, selectedQuery]
  );

  const chartData = useMemo(
    () => [
      { name: 'Primary', duration: benchmark.primaryAverage ?? 0 },
      { name: 'Replica', duration: benchmark.replicaAverage ?? 0 }
    ],
    [benchmark]
  );

  useEffect(() => {
    void fetchOverview();
    void runBenchmark();
  }, []);

  return (
    <div className="min-h-screen bg-stone-100 text-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">AWS Database Lab</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">Amazon RDS Read Scaling</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Compare the primary database and read replica by running the same read-only workload against each endpoint.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${health?.primary?.status === 'connected' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                <span>Primary: {health?.primary?.status ?? 'unconfigured'}</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${health?.replica?.status === 'connected' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                <span>Replica: {health?.replica?.status ?? 'unconfigured'}</span>
              </div>
              <button
                onClick={() => {
                  void fetchOverview();
                  void runBenchmark();
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Primary database status</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{health?.primary?.status ?? 'unconfigured'}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Read replica status</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{health?.replica?.status ?? 'unconfigured'}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Last test execution time</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'Unavailable'}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Latest observed replication lag</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formattedLag(monitoredLag)}</p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Query execution panel</h2>
                <p className="text-sm text-slate-500">SQL is validated on the backend using a strict read-only allowlist.</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Select read query</label>
                <select
                  value={selectedQuery}
                  onChange={(event) => setSelectedQuery(event.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm outline-none"
                >
                  {queries.map((query) => (
                    <option key={query.key} value={query.key}>{query.label}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Selected SQL</p>
                <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{selectedTemplate?.sql ?? 'No query selected'}</pre>
              </div>

              <div className="flex flex-wrap gap-3">
                <button onClick={() => void runQuery('primary')} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100">
                  Run on Primary
                </button>
                <button onClick={() => void runQuery('replica')} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100">
                  Run on Replica
                </button>
                <button onClick={() => void runComparison()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                  Run Comparison
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-stone-200">
                <table className="min-w-full divide-y divide-stone-200 bg-white text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Target</th>
                      <th className="px-3 py-2">Records</th>
                      <th className="px-3 py-2">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult ? (
                      <tr>
                        <td className="px-3 py-3">{queryResult.target}</td>
                        <td className="px-3 py-3">{queryResult.recordsReturned}</td>
                        <td className="px-3 py-3">{new Date(queryResult.timestamp).toLocaleString()}</td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-3 py-3 text-slate-500"> No query result available yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Performance comparison</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="flex justify-between"><span>Primary execution time</span><strong>{formatTime(benchmark.primaryAverage)}</strong></div>
                <div className="flex justify-between"><span>Replica execution time</span><strong>{formatTime(benchmark.replicaAverage)}</strong></div>
                <div className="flex justify-between"><span>Relative change</span><strong>{formatPercent(benchmark.percentageDifference)}</strong></div>
              </div>
              <div className="mt-5 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(2)} ms`, 'Duration']} />
                    <Bar dataKey="duration" fill="#1f2937" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Replications and monitoring</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p>
                  CloudWatch metric reporting can be delayed and may not match the directly measured replication visibility delay in this lab.
                </p>
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Monitoring status</p>
                  <p className="mt-2 text-sm font-medium">
                    {health?.monitoring?.available ? 'Monitoring configured' : 'AWS monitoring unavailable'}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Benchmark runs</h3>
            <div className="mt-4 overflow-auto">
              <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                <thead className="bg-stone-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2">Target</th>
                    <th className="px-3 py-2">Duration</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmark.runs.length ? (
                    benchmark.runs.map((run, index) => (
                      <tr key={`${run.target}-${index}`} className="even:bg-stone-50">
                        <td className="px-3 py-2 capitalize">{run.target}</td>
                        <td className="px-3 py-2">{formatTime(run.durationMs)}</td>
                        <td className="px-3 py-2">{run.success ? 'Success' : 'Failed'}</td>
                        <td className="px-3 py-2">{new Date(run.timestamp).toLocaleTimeString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-slate-500">No benchmark runs recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Replication demonstration</h3>
            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <p>
                A dedicated write endpoint inserts a sample record into the primary database. The application then polls the replica until the record appears or a bounded timeout is reached.
              </p>
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const response = await fetch('/api/replication-demo', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ employee_name: `lab-${Date.now()}`, department: 'IT', salary: 95000 })
                    });
                    const payload = await response.json();
                    setStatusMessage(response.ok ? `Replication observed: ${payload.observed ? 'yes' : 'no'}` : payload.error ?? 'Replication check failed.');
                  } catch (error) {
                    setStatusMessage(error instanceof Error ? error.message : 'Replication check failed.');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Run replication check
              </button>

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
                <p className="mt-2 text-sm font-medium">{statusMessage || 'Waiting for the next test run.'}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">Read scaling explanation</h3>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div className="space-y-4 text-sm text-slate-700">
              <p>The primary database handles writes and can also serve reads. Read replicas offload read traffic and improve scalability for repeatable read-only workloads.</p>
              <p>Replication is asynchronous, which means reads from the replica may be stale, especially under bursty write loads or when network latency increases.</p>
              <p>Read replicas can improve read throughput, but they do not automatically accelerate every query and introduce operational cost. They are not a substitute for a full high-availability configuration.</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-800">Simple architecture</p>
              <pre className="mt-3 whitespace-pre-wrap break-words text-sm">Application → Primary RDS → Asynchronous Replication → Read Replica

Write queries: Primary
Eligible reads: Replica</pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function formattedLag(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Unavailable';
  }

  return `${value.toFixed(2)} sec`;
}
