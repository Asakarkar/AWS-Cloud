import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { config, databaseConfiguration } from '../config.js';
import type { ConnectionStatus, DatabaseTarget, QueryTemplate } from '../types.js';

const pools: Record<DatabaseTarget, Pool | null> = {
  primary: null,
  replica: null
};

export const readOnlyQueries: Record<string, QueryTemplate> = {
  employees_by_department: {
    key: 'employees_by_department',
    label: 'Employees in IT department',
    description: 'Return the current technical workforce records, capped to 100 rows.',
    sql: "SELECT * FROM employees WHERE department = ? LIMIT 100;"
  },
  department_summary: {
    key: 'department_summary',
    label: 'Department salary summary',
    description: 'Aggregate compensation by department.',
    sql: `SELECT department, COUNT(*) AS employee_count,
       AVG(salary) AS average_salary
FROM employees
GROUP BY department;`
  },
  total_employees: {
    key: 'total_employees',
    label: 'Total employee count',
    description: 'Count the records available in the employees table.',
    sql: 'SELECT COUNT(*) AS total_employees FROM employees;'
  }
};

const poolOptions = (target: DatabaseTarget) => {
  const dbConfig = target === 'primary' ? config.primaryDb : config.replicaDb;

  if (!dbConfig.host || !dbConfig.user) {
    return null;
  }

  return {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    connectionLimit: 10,
    timezone: 'Z',
    ssl: dbConfig.ssl ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 20000,
    waitForConnections: true
  };
};

const getPool = (target: DatabaseTarget): Pool | null => {
  if (!pools[target]) {
    const options = poolOptions(target);
    if (!options) {
      pools[target] = null;
      return null;
    }

    pools[target] = mysql.createPool(options);
  }

  return pools[target];
};

export const getDatabaseStatus = async (target: DatabaseTarget): Promise<ConnectionStatus> => {
  const pool = getPool(target);
  const dbConfig = target === 'primary' ? config.primaryDb : config.replicaDb;

  if (!dbConfig.host || !dbConfig.user) {
    return {
      target,
      configured: false,
      status: 'unconfigured',
      message: 'Database credentials are not configured for this environment.'
    };
  }

  if (!pool) {
    return {
      target,
      configured: true,
      status: 'disconnected',
      host: dbConfig.host,
      database: dbConfig.database,
      message: 'Connection pool was not created.'
    };
  }

  try {
    await pool.query('SELECT 1 + 1 AS healthcheck');
    return {
      target,
      configured: true,
      status: 'connected',
      host: dbConfig.host,
      database: dbConfig.database,
      message: 'Database connectivity check succeeded.'
    };
  } catch (error) {
    return {
      target,
      configured: true,
      status: 'disconnected',
      host: dbConfig.host,
      database: dbConfig.database,
      message: error instanceof Error ? error.message : 'Database connection failed.'
    };
  }
};

export const getQueryTemplates = () => Object.values(readOnlyQueries);

export const validateReadQuery = (queryKey: string, params?: unknown[]) => {
  const template = readOnlyQueries[queryKey];
  if (!template) {
    throw new Error('The selected query is not allowed.');
  }

  const safeParams = Array.isArray(params) ? params : [];

  if (safeParams.length > 3) {
    throw new Error('Too many query parameters supplied.');
  }

  return { template, params: safeParams };
};

export const executeReadQuery = async (
  target: DatabaseTarget,
  queryKey: string,
  params: unknown[] = []
): Promise<RowDataPacket[]> => {
  const pool = getPool(target);
  if (!pool) {
    throw new Error(`${target} database is not configured.`);
  }

  const { template, params: safeParams } = validateReadQuery(queryKey, params);
  const values = safeParams.map((value) => value ?? null) as any[];
  const [rows] = await pool.execute(template.sql, values);
  return rows as RowDataPacket[];
};

export const insertEmployeeOnPrimary = async (employee: {
  employee_name: string;
  department: string;
  salary: number;
}) => {
  const pool = getPool('primary');
  if (!pool) {
    throw new Error('Primary database is not configured.');
  }

  const [result] = await pool.execute(
    'INSERT INTO employees (employee_name, department, salary) VALUES (?, ?, ?)',
    [employee.employee_name, employee.department, employee.salary]
  );

  return result;
};

export const findEmployeeById = async (target: DatabaseTarget, employeeId: number) => {
  const pool = getPool(target);
  if (!pool) {
    throw new Error(`${target} database is not configured.`);
  }

  const [rows] = await pool.execute('SELECT * FROM employees WHERE employee_id = ?', [employeeId]);
  return rows as RowDataPacket[];
};

export const isDatabaseConfigured = {
  primary: databaseConfiguration.primaryConfigured,
  replica: databaseConfiguration.replicaConfigured
};
