-- V5: Concurrency-safe identifiers, SLA warning state, and integrity constraints.

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS sla_at_risk BOOLEAN NOT NULL DEFAULT FALSE;

CREATE SEQUENCE IF NOT EXISTS work_order_code_seq START WITH 1001;

SELECT setval(
    'work_order_code_seq',
    GREATEST(
        COALESCE((SELECT MAX(SUBSTRING(code FROM 4)::BIGINT) FROM work_orders), 1000),
        1000
    ),
    TRUE
);

ALTER TABLE parts
    ADD CONSTRAINT chk_parts_stock_non_negative CHECK (stock_qty >= 0);

ALTER TABLE part_usages
    ADD CONSTRAINT chk_part_usage_quantity_positive CHECK (quantity_used > 0);

ALTER TABLE time_logs
    ADD CONSTRAINT chk_time_log_minutes_positive CHECK (minutes > 0);
