# Practical Report: Amazon RDS Read Scaling

## 1. Title and objective

This project demonstrates how Amazon RDS MySQL read replicas can be used to separate read traffic from primary write traffic and compare performance between a primary instance and a read replica.

## 2. Problem statement

A database workload with many read queries can overload the primary instance. RDS read replicas allow read-heavy workloads to be served separately while the primary continues to process writes and replication continues asynchronously.

## 3. Requirements

- Connect to a primary and replica endpoint independently
- Run read-only benchmark queries against both endpoints
- Compare measured execution durations
- Demonstrate replication visibility delay
- Show CloudWatch `ReplicaLag` when monitoring is configured
- Document AWS cost, limits, and cleanup responsibilities

## 4. Technologies used

- React, Vite, TypeScript, Tailwind CSS
- Node.js, Express.js, TypeScript
- MySQL 8 / RDS MySQL
- mysql2
- Recharts
- AWS SDK v3
- Vitest, Supertest

## 5. Architecture diagram

Application → Primary RDS → Asynchronous Replication → Read Replica

Write queries go to the primary. Eligible read queries can be routed to the replica.

## 6. Database schema

The lab uses the `readdemo` database with an `employees` table:

- employee_id (INT, primary key)
- employee_name (VARCHAR)
- department (VARCHAR)
- salary (DECIMAL)

## 7. AWS implementation steps

Follow the instructions in `docs/aws-setup.md` to create the primary instance, replica, and required networking.

## 8. Application implementation

The application exposes a dashboard and backend API for health checks, query execution, benchmarking, replication checks, and monitoring.

## 9. Query execution procedure

1. Configure the primary and read replica endpoints.
2. Run `npm install`.
3. Start the application with `npm run dev`.
4. Select a read query from the dashboard.
5. Execute it against the primary or replica.
6. Compare the results.

## 10. Benchmark methodology

The benchmark runs identical read-only queries against the primary and replica using a configurable iteration count and alternating execution order. Durations are measured with `performance.now()` and only successful runs are included in the statistics.

## 11. Actual results and comparison table

Blank result table placeholder:

| Query | Primary (ms) | Replica (ms) | Improvement (%) |
|---|---:|---:|---:|
| Example query | — | — | — |

## 12. Replication lag analysis

The read replica is asynchronous. A write on the primary may not be immediately visible on the replica. The lab measures the time until a new row becomes visible on the replica, which is distinct from AWS CloudWatch `ReplicaLag`.

## 13. Read-scaling limitations

- Replica reads are not always faster.
- Writes still go to the primary.
- Replicas add cost.
- Performance depends on indexing, instance class, dataset size, and workload concurrency.
- A replica is not a replacement for high availability.

## 14. Testing and observations

Tests run locally without real AWS credentials or RDS endpoints by validating request schemas and route logic. Actual database integration remains unverified until real AWS endpoints are configured.

## 15. Conclusion

The lab demonstrates the core value of read replicas: they let you scale read throughput away from the primary, while retaining the correctness guarantees of the source database and the asynchronous nature of replication.

## 16. Viva questions with answers

- Q: Why are read replicas useful?  
  A: They offload read traffic and improve scalability for read-heavy workloads.
- Q: Can a replica be used for writes?  
  A: No, writes should be directed to the primary.
- Q: Why can replica reads be stale?  
  A: Replication is asynchronous.
- Q: Is CloudWatch `ReplicaLag` the same as the demo visibility delay?  
  A: No. They are related but are measured differently. The lab directly measures the row visibility time on the replica.
