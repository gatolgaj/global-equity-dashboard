-- Uploads tracking table
CREATE TABLE IF NOT EXISTS uploads (
  upload_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data_type TEXT NOT NULL CHECK (data_type IN ('holdings', 'performance', 'composition')),
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  market_type TEXT CHECK (market_type IN ('DM', 'EM', 'COMBINED')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  snapshot_id BIGINT,
  performance_data_id BIGINT,
  composition_data_id BIGINT
);

-- Portfolio snapshots (holdings data)
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  snapshot_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  market_type TEXT NOT NULL CHECK (market_type IN ('DM', 'EM', 'COMBINED')),
  quarter_label TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  alpha_score DOUBLE PRECISION,
  active_share DOUBLE PRECISION,
  number_of_stocks INTEGER,
  effective_number_of_stocks DOUBLE PRECISION,
  volatility DOUBLE PRECISION,
  tracking_error DOUBLE PRECISION,
  statistics JSONB NOT NULL DEFAULT '{}',
  holdings JSONB NOT NULL DEFAULT '[]',
  sector_allocations JSONB NOT NULL DEFAULT '[]',
  country_allocations JSONB NOT NULL DEFAULT '[]',
  region_allocations JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_snapshot_market_quarter UNIQUE (market_type, quarter_label)
);

-- Performance & risk time series
CREATE TABLE IF NOT EXISTS performance_data (
  performance_data_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  version_label TEXT NOT NULL DEFAULT 'current',
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  performance JSONB NOT NULL DEFAULT '[]',
  summary_stats JSONB NOT NULL DEFAULT '{}',
  rolling_alpha_1y JSONB NOT NULL DEFAULT '[]',
  rolling_alpha_3y JSONB NOT NULL DEFAULT '[]',
  volatility JSONB NOT NULL DEFAULT '[]',
  tracking_error JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_performance_version UNIQUE (version_label)
);

-- Composition time series
CREATE TABLE IF NOT EXISTS composition_data (
  composition_data_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  version_label TEXT NOT NULL DEFAULT 'current',
  region JSONB NOT NULL DEFAULT '[]',
  sector JSONB NOT NULL DEFAULT '[]',
  country JSONB NOT NULL DEFAULT '[]',
  constituents JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_composition_version UNIQUE (version_label)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_uploads_type_date ON uploads (data_type, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_market ON portfolio_snapshots (market_type);
CREATE INDEX IF NOT EXISTS idx_snapshots_created ON portfolio_snapshots (created_at DESC);
