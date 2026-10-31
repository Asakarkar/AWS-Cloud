USE readdemo;

DELIMITER $$
CREATE PROCEDURE generate_employee_data(IN rows_to_create INT)
BEGIN
  DECLARE counter INT DEFAULT 0;
  WHILE counter < rows_to_create DO
    INSERT INTO employees (employee_name, department, salary)
    VALUES (
      CONCAT('Employee_', counter),
      CASE MOD(counter, 5)
        WHEN 0 THEN 'IT'
        WHEN 1 THEN 'Finance'
        WHEN 2 THEN 'HR'
        WHEN 3 THEN 'Operations'
        ELSE 'Engineering'
      END,
      50000 + (counter * 1250)
    );
    SET counter = counter + 1;
  END WHILE;
END $$
DELIMITER ;

CALL generate_employee_data(5000);

SELECT COUNT(*) AS total_rows FROM employees;
