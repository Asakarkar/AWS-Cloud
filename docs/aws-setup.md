# AWS Setup Guide

This guide explains how to configure an Amazon RDS MySQL primary instance and replica for this lab. Do not create AWS resources without explicit authorization and approval.

## 1. Create an RDS MySQL primary instance

1. Open the Amazon RDS console in the target AWS region.
2. Select Create database.
3. Choose MySQL as the engine.
4. Select a dev/test or production template based on the lab budget.
5. Set a database instance identifier, username, and password.
6. Choose a small instance class for the lab and configure public access carefully.
7. Configure the VPC, subnet group, and security group to allow inbound MySQL traffic from the lab host.
8. Enable automatic backups and a retention window that meets institutional requirements.
9. Create the database and wait for it to become available.

## 2. Create the read replica

1. In the primary instance details, choose Create read replica.
2. Select the same or compatible region and instance class.
3. Configure the replica subnet and security group settings.
4. Wait for the replication status to become available.

## 3. Retrieve connection details

Capture these values:

- Primary endpoint
- Replica endpoint
- Database name
- Port
- Security group rules

Update the root `.env` file using the `.env.example` template.

## 4. Local configuration

Set the following values before running the application:

- `PRIMARY_DB_HOST`
- `PRIMARY_DB_PORT`
- `PRIMARY_DB_USER`
- `PRIMARY_DB_PASSWORD`
- `PRIMARY_DB_NAME`
- `REPLICA_DB_HOST`
- `REPLICA_DB_PORT`
- `REPLICA_DB_USER`
- `REPLICA_DB_PASSWORD`
- `REPLICA_DB_NAME`
- `AWS_REGION`
- `AWS_REPLICA_INSTANCE_IDENTIFIER`

## 5. Monitoring and troubleshooting

- Use CloudWatch `ReplicaLag` when the metric is available.
- Expect delays between writes on the primary and visibility on the replica.
- Verify the replica is in a healthy replication state.
- Check security group rules, IAM permissions, and parameter group configuration if connectivity fails.

## 6. Cleanup

When the lab completes, delete the read replica and the primary database to avoid ongoing charges.
