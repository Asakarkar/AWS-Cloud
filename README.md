# Amazon RDS Read Scaling Lab

This monorepo contains a working full-stack lab for demonstrating Amazon RDS MySQL read scaling with a primary instance and a read replica.

## Project objective

The application connects to both database endpoints, runs the same read-only queries against each target, measures execution timing, compares the results, and demonstrates replication visibility delay without exposing database credentials to the frontend.

## Local setup

1. Copy `.env.example` to `.env` in the project root.
2. Fill in the MySQL endpoints, credentials, and AWS monitoring values.
3. Run `npm install`.
4. Start the application with `npm run dev`.
5. Open `http://localhost:5173` to view the dashboard.

## Database initialization

Create and apply the schema against the primary database only. The read replica should receive the changes through MySQL replication.

Use the SQL scripts in `backend/sql` with your primary database connection.

## Commands

- `npm install` - install all dependencies
- `npm run dev` - start the backend and frontend together
- `npm run build` - build the backend and frontend for production
- `npm run test --workspace backend` - run the backend test suite

## Backend API

The backend exposes the following lab endpoints:

- `GET /api/health`
- `GET /api/db/status`
- `GET /api/queries`
- `POST /api/query`
- `POST /api/query/execute`
- `POST /api/benchmark`
- `POST /api/benchmark/run`
- `POST /api/demo/insert`
- `GET /api/demo/replication/:employeeId`
- `GET /api/metrics/replica-lag`
- `GET /api/results/history`

The query execution layer only permits explicitly approved SELECT statements. The write demo endpoint is the only write route and targets the primary instance.

## AWS monitoring note

CloudWatch monitoring is optional and only works when the replica instance identifier and valid AWS credentials are configured. If monitoring is unavailable, the rest of the lab continues to work without fabricated data.

## Documentation

- `docs/aws-setup.md` - step-by-step AWS configuration guide
- `docs/practical-report.md` - academic practical report template

## Outstanding requirements that need a real AWS account

- A real RDS primary and read replica instance
- Valid database credentials and endpoint URLs
- Optional CloudWatch `ReplicaLag` metric retrieval
- Real replication timing and monitoring verification
