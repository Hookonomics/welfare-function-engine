# TimescaleDB Schema Design for Endogenous Variables

## Overview

This document defines the TimescaleDB schema for efficiently storing and querying time-series data for endogenous variables. TimescaleDB's hypertable functionality provides optimal performance for time-series data with automatic partitioning and compression.

## Core Tables

### 1. Endogenous Variable Snapshots (Main Hypertable)
```sql
-- Main hypertable for storing variable snapshots
CREATE TABLE endog_variable_snapshots (
  time TIMESTAMPTZ NOT NULL,
  pool_id TEXT NOT NULL,
  variable_type TEXT NOT NULL,
  token0_address TEXT NOT NULL,
  token1_address TEXT NOT NULL,
  value NUMERIC NOT NULL,
  determinants JSONB NOT NULL,
  pool_state JSONB NOT NULL,
  calculation_metadata JSONB,
  block_number BIGINT NOT NULL,
  transaction_hash TEXT,
  PRIMARY KEY (time, pool_id, variable_type)
);

-- Convert to hypertable with 1-hour chunk intervals
SELECT create_hypertable('endog_variable_snapshots', 'time', chunk_time_interval => INTERVAL '1 hour');

-- Create indexes for efficient querying
CREATE INDEX idx_endog_snapshots_token_pair ON endog_variable_snapshots (token0_address, token1_address, variable_type, time DESC);
CREATE INDEX idx_endog_snapshots_pool_time ON endog_variable_snapshots (pool_id, time DESC);
CREATE INDEX idx_endog_snapshots_variable_time ON endog_variable_snapshots (variable_type, time DESC);
CREATE INDEX idx_endog_snapshots_value ON endog_variable_snapshots (value) WHERE value > 0;
```

### 2. Pool State History
```sql
-- Track pool state changes for historical analysis
CREATE TABLE pool_state_history (
  time TIMESTAMPTZ NOT NULL,
  pool_id TEXT NOT NULL,
  token0_address TEXT NOT NULL,
  token1_address TEXT NOT NULL,
  liquidity NUMERIC NOT NULL,
  sqrt_price NUMERIC NOT NULL,
  tick INTEGER NOT NULL,
  volume_usd NUMERIC NOT NULL,
  total_value_locked_usd NUMERIC NOT NULL,
  tx_count BIGINT NOT NULL,
  fee_tier INTEGER NOT NULL,
  block_number BIGINT NOT NULL,
  transaction_hash TEXT,
  PRIMARY KEY (time, pool_id)
);

-- Convert to hypertable
SELECT create_hypertable('pool_state_history', 'time', chunk_time_interval => INTERVAL '1 hour');

-- Create indexes
CREATE INDEX idx_pool_history_token_pair ON pool_state_history (token0_address, token1_address, time DESC);
CREATE INDEX idx_pool_history_pool_time ON pool_state_history (pool_id, time DESC);
CREATE INDEX idx_pool_history_volume ON pool_state_history (volume_usd, time DESC);
```

### 3. Variable Subscriptions
```sql
-- Track active variable subscriptions
CREATE TABLE variable_subscriptions (
  id TEXT PRIMARY KEY,
  variable_type TEXT NOT NULL,
  token0_address TEXT NOT NULL,
  token1_address TEXT NOT NULL,
  parameters JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscriber_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_variable_subscriptions_token_pair ON variable_subscriptions (token0_address, token1_address, variable_type);
CREATE INDEX idx_variable_subscriptions_active ON variable_subscriptions (is_active, variable_type);
```

### 4. Pool Tracking
```sql
-- Track which pools are monitored for each variable
CREATE TABLE pool_tracking (
  id TEXT PRIMARY KEY,
  pool_id TEXT NOT NULL,
  variable_type TEXT NOT NULL,
  token0_address TEXT NOT NULL,
  token1_address TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  first_snapshot_at TIMESTAMPTZ,
  last_snapshot_at TIMESTAMPTZ,
  snapshot_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_pool_tracking_pool ON pool_tracking (pool_id, variable_type);
CREATE INDEX idx_pool_tracking_token_pair ON pool_tracking (token0_address, token1_address, variable_type);
CREATE INDEX idx_pool_tracking_active ON pool_tracking (is_active, variable_type);
```

## Continuous Aggregates

### 1. Hourly Variable Aggregates
```sql
-- Hourly aggregates for performance
CREATE MATERIALIZED VIEW endog_variable_hourly
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 hour', time) AS hour,
  pool_id,
  variable_type,
  token0_address,
  token1_address,
  AVG(value) AS avg_value,
  MIN(value) AS min_value,
  MAX(value) AS max_value,
  STDDEV(value) AS stddev_value,
  COUNT(*) AS sample_count
FROM endog_variable_snapshots
GROUP BY hour, pool_id, variable_type, token0_address, token1_address;

-- Create index on the materialized view
CREATE INDEX idx_endog_hourly_time ON endog_variable_hourly (hour DESC, pool_id, variable_type);
```

### 2. Daily Variable Aggregates
```sql
-- Daily aggregates for long-term trends
CREATE MATERIALIZED VIEW endog_variable_daily
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 day', time) AS day,
  pool_id,
  variable_type,
  token0_address,
  token1_address,
  AVG(value) AS avg_value,
  MIN(value) AS min_value,
  MAX(value) AS max_value,
  STDDEV(value) AS stddev_value,
  COUNT(*) AS sample_count
FROM endog_variable_snapshots
GROUP BY day, pool_id, variable_type, token0_address, token1_address;

-- Create index on the materialized view
CREATE INDEX idx_endog_daily_time ON endog_variable_daily (day DESC, pool_id, variable_type);
```

### 3. Pool Volume Aggregates
```sql
-- Track pool volume trends
CREATE MATERIALIZED VIEW pool_volume_hourly
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 hour', time) AS hour,
  pool_id,
  token0_address,
  token1_address,
  AVG(volume_usd) AS avg_volume_usd,
  MAX(volume_usd) AS max_volume_usd,
  SUM(volume_usd) AS total_volume_usd,
  AVG(total_value_locked_usd) AS avg_tvl_usd
FROM pool_state_history
GROUP BY hour, pool_id, token0_address, token1_address;

-- Create index
CREATE INDEX idx_pool_volume_hourly_time ON pool_volume_hourly (hour DESC, pool_id);
```

## Data Retention Policies

### 1. Raw Data Retention
```sql
-- Keep raw snapshots for 30 days
SELECT add_retention_policy('endog_variable_snapshots', INTERVAL '30 days');

-- Keep pool state history for 90 days
SELECT add_retention_policy('pool_state_history', INTERVAL '90 days');
```

### 2. Aggregated Data Retention
```sql
-- Keep hourly aggregates for 1 year
SELECT add_retention_policy('endog_variable_hourly', INTERVAL '1 year');

-- Keep daily aggregates for 5 years
SELECT add_retention_policy('endog_variable_daily', INTERVAL '5 years');
```

## Query Optimization

### 1. Common Query Patterns

#### Get Latest Variable Values
```sql
-- Get latest value for each pool with a specific variable type
SELECT DISTINCT ON (pool_id) 
  pool_id,
  time,
  value,
  determinants
FROM endog_variable_snapshots
WHERE variable_type = 'volume-liquidity-efficiency'
  AND token0_address = $1 
  AND token1_address = $2
ORDER BY pool_id, time DESC;
```

#### Get Variable History
```sql
-- Get variable history for a specific pool
SELECT 
  time,
  value,
  determinants
FROM endog_variable_snapshots
WHERE pool_id = $1 
  AND variable_type = $2
  AND time >= $3 
  AND time <= $4
ORDER BY time ASC;
```

#### Get Token Pair Statistics
```sql
-- Get statistics for all pools with a token pair
SELECT 
  pool_id,
  AVG(value) as avg_value,
  MIN(value) as min_value,
  MAX(value) as max_value,
  COUNT(*) as sample_count
FROM endog_variable_snapshots
WHERE token0_address = $1 
  AND token1_address = $2
  AND variable_type = $3
  AND time >= $4
GROUP BY pool_id
ORDER BY avg_value DESC;
```

### 2. Performance Queries

#### Top Performing Pools
```sql
-- Get top performing pools by variable value
SELECT 
  pool_id,
  token0_address,
  token1_address,
  AVG(value) as avg_efficiency,
  MAX(value) as peak_efficiency,
  COUNT(*) as sample_count
FROM endog_variable_snapshots
WHERE variable_type = 'volume-liquidity-efficiency'
  AND time >= NOW() - INTERVAL '24 hours'
GROUP BY pool_id, token0_address, token1_address
HAVING COUNT(*) >= 10  -- Minimum sample size
ORDER BY avg_efficiency DESC
LIMIT 20;
```

#### Variable Trends
```sql
-- Get variable trends using hourly aggregates
SELECT 
  hour,
  AVG(avg_value) as trend_value,
  COUNT(DISTINCT pool_id) as active_pools
FROM endog_variable_hourly
WHERE variable_type = 'volume-liquidity-efficiency'
  AND token0_address = $1 
  AND token1_address = $2
  AND hour >= $3
GROUP BY hour
ORDER BY hour ASC;
```

## Compression and Storage

### 1. Compression Policies
```sql
-- Compress data older than 7 days
SELECT add_compression_policy('endog_variable_snapshots', INTERVAL '7 days');

-- Compress pool state history older than 7 days
SELECT add_compression_policy('pool_state_history', INTERVAL '7 days');
```

### 2. Storage Optimization
```sql
-- Optimize storage for JSONB columns
ALTER TABLE endog_variable_snapshots 
ALTER COLUMN determinants SET STORAGE EXTENDED;

ALTER TABLE endog_variable_snapshots 
ALTER COLUMN pool_state SET STORAGE EXTENDED;

-- Create GIN indexes for JSONB columns
CREATE INDEX idx_endog_snapshots_determinants_gin ON endog_variable_snapshots USING GIN (determinants);
CREATE INDEX idx_endog_snapshots_pool_state_gin ON endog_variable_snapshots USING GIN (pool_state);
```

## Monitoring and Maintenance

### 1. Database Statistics
```sql
-- Monitor hypertable statistics
SELECT 
  schemaname,
  tablename,
  num_chunks,
  num_compressed_chunks,
  compressed_bytes,
  uncompressed_bytes
FROM timescaledb_information.hypertables
WHERE tablename IN ('endog_variable_snapshots', 'pool_state_history');
```

### 2. Query Performance
```sql
-- Monitor slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements
WHERE query LIKE '%endog_variable_snapshots%'
ORDER BY mean_time DESC
LIMIT 10;
```

### 3. Storage Usage
```sql
-- Monitor storage usage by table
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%endog%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Data Migration and Backup

### 1. Backup Strategy
```sql
-- Create backup of critical tables
-- This would be implemented in backup scripts
-- pg_dump --table=endog_variable_snapshots --table=pool_state_history
```

### 2. Data Migration
```sql
-- Example migration for schema changes
-- ALTER TABLE endog_variable_snapshots ADD COLUMN new_field TEXT;
-- UPDATE endog_variable_snapshots SET new_field = 'default_value';
-- ALTER TABLE endog_variable_snapshots ALTER COLUMN new_field SET NOT NULL;
```

## Security and Access Control

### 1. Row Level Security
```sql
-- Enable RLS on sensitive tables
ALTER TABLE endog_variable_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_state_history ENABLE ROW LEVEL SECURITY;

-- Create policies for different access levels
CREATE POLICY endog_snapshots_read_policy ON endog_variable_snapshots
  FOR SELECT TO authenticated_users
  USING (true);

CREATE POLICY endog_snapshots_write_policy ON endog_variable_snapshots
  FOR INSERT TO service_account
  WITH CHECK (true);
```

### 2. User Management
```sql
-- Create roles for different access levels
CREATE ROLE endog_reader;
CREATE ROLE endog_writer;
CREATE ROLE endog_admin;

-- Grant appropriate permissions
GRANT SELECT ON endog_variable_snapshots TO endog_reader;
GRANT SELECT, INSERT, UPDATE ON endog_variable_snapshots TO endog_writer;
GRANT ALL ON endog_variable_snapshots TO endog_admin;
```

## Performance Tuning

### 1. Connection Pooling
```sql
-- Configure connection pooling parameters
-- max_connections = 200
-- shared_preload_libraries = 'pg_stat_statements'
-- track_activity_query_size = 2048
```

### 2. Query Optimization
```sql
-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM endog_variable_snapshots 
WHERE pool_id = '0x123' 
  AND time >= NOW() - INTERVAL '24 hours'
ORDER BY time DESC;
```

### 3. Index Maintenance
```sql
-- Reindex tables periodically
REINDEX TABLE endog_variable_snapshots;
REINDEX TABLE pool_state_history;

-- Update table statistics
ANALYZE endog_variable_snapshots;
ANALYZE pool_state_history;
```
