SELECT setval(pg_get_serial_sequence('customers', 'id'), COALESCE(MAX(id), 1), true) FROM customers;
SELECT setval(pg_get_serial_sequence('sites', 'id'), COALESCE(MAX(id), 1), true) FROM sites;
SELECT setval(pg_get_serial_sequence('work_orders', 'id'), COALESCE(MAX(id), 1), true) FROM work_orders;
