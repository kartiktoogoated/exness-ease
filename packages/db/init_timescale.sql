-- 1. Convert Tick into hypertable (safe re-run)
SELECT create_hypertable('public."Tick"', 'ts', migrate_data => true, if_not_exists => true);

-- 2. Create 1m candles
CREATE MATERIALIZED VIEW IF NOT EXISTS candles_1m
WITH (timescaledb.continuous) AS
SELECT
  "assetId",
  time_bucket('1 minute'::interval, "ts") AS bucket,
  FIRST("askPrice", "ts") AS open,
  MAX("askPrice") AS high,
  MIN("askPrice") AS low,
  LAST("askPrice", "ts") AS close,
  SUM("askQty") AS volume
FROM public."Tick"
GROUP BY "assetId", bucket;

CREATE INDEX IF NOT EXISTS candles_1m_idx ON candles_1m ("assetId", bucket);

-- 3. Create 5m candles
CREATE MATERIALIZED VIEW IF NOT EXISTS candles_5m
WITH (timescaledb.continuous) AS
SELECT
  "assetId",
  time_bucket('5 minutes'::interval, "ts") AS bucket,
  FIRST("askPrice", "ts") AS open,
  MAX("askPrice") AS high,
  MIN("askPrice") AS low,
  LAST("askPrice", "ts") AS close,
  SUM("askQty") AS volume
FROM public."Tick"
GROUP BY "assetId", bucket;

CREATE INDEX IF NOT EXISTS candles_5m_idx ON candles_5m ("assetId", bucket);

-- 4. Create 15m candles
CREATE MATERIALIZED VIEW IF NOT EXISTS candles_15m
WITH (timescaledb.continuous) AS
SELECT
  "assetId",
  time_bucket('15 minutes'::interval, "ts") AS bucket,
  FIRST("askPrice", "ts") AS open,
  MAX("askPrice") AS high,
  MIN("askPrice") AS low,
  LAST("askPrice", "ts") AS close,
  SUM("askQty") AS volume
FROM public."Tick"
GROUP BY "assetId", bucket;

CREATE INDEX IF NOT EXISTS candles_15m_idx ON candles_15m ("assetId", bucket);

-- 5. Create 1h candles
CREATE MATERIALIZED VIEW IF NOT EXISTS candles_1h
WITH (timescaledb.continuous) AS
SELECT
  "assetId",
  time_bucket('1 hour'::interval, "ts") AS bucket,
  FIRST("askPrice", "ts") AS open,
  MAX("askPrice") AS high,
  MIN("askPrice") AS low,
  LAST("askPrice", "ts") AS close,
  SUM("askQty") AS volume
FROM public."Tick"
GROUP BY "assetId", bucket;

CREATE INDEX IF NOT EXISTS candles_1h_idx ON candles_1h ("assetId", bucket);

-- 6. Add refresh policies (auto update)
SELECT add_continuous_aggregate_policy('candles_1m',
    start_offset => INTERVAL '1 day',
    end_offset   => INTERVAL '1 minute',
    schedule_interval => INTERVAL '30 seconds');

SELECT add_continuous_aggregate_policy('candles_5m',
    start_offset => INTERVAL '7 days',
    end_offset   => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '1 minute');

SELECT add_continuous_aggregate_policy('candles_15m',
    start_offset => INTERVAL '14 days',
    end_offset   => INTERVAL '15 minutes',
    schedule_interval => INTERVAL '5 minutes');

SELECT add_continuous_aggregate_policy('candles_1h',
    start_offset => INTERVAL '90 days',
    end_offset   => INTERVAL '1 hour',
    schedule_interval => INTERVAL '15 minutes');

-- 7. Add compression to Tick (optional but good for perf)
ALTER TABLE public."Tick" SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'assetId'
);

-- Compress ticks older than 3 days
SELECT add_compression_policy('public."Tick"', INTERVAL '3 days');
