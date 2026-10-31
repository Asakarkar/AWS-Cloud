CREATE DATABASE IF NOT EXISTS readdemo;
USE readdemo;

CREATE TABLE IF NOT EXISTS employees (
  employee_id INT NOT NULL AUTO_INCREMENT,
  employee_name VARCHAR(255) NOT NULL,
  department VARCHAR(100) NOT NULL,
  salary DECIMAL(12, 2) NOT NULL,
  PRIMARY KEY (employee_id)
);

INSERT INTO employees (employee_name, department, salary)
VALUES
  ('Alice Nguyen', 'IT', 120000.00),
  ('Brandon Singh', 'Finance', 98000.00),
  ('Carmen Lopez', 'IT', 128000.00),
  ('Daniel Kim', 'HR', 87000.00),
  ('Evelyn Chen', 'Operations', 94000.00)
ON DUPLICATE KEY UPDATE
  employee_name = VALUES(employee_name),
  department = VALUES(department),
  salary = VALUES(salary);

-- Initialize the schema only against the primary instance.
-- The read replica should receive the changes via MySQL replication.
