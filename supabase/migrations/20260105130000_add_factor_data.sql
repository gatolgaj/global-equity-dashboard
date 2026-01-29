-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add factor_data table for storing factor analysis data
CREATE TABLE IF NOT EXISTS factor_data (
  factor_data_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  version_label TEXT NOT NULL DEFAULT 'current',
  as_of_date DATE NOT NULL,
  holdings JSONB NOT NULL DEFAULT '[]',
  portfolio_averages JSONB NOT NULL DEFAULT '{}',
  benchmark_averages JSONB NOT NULL DEFAULT '{}',
  sector_factors JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_factor_version UNIQUE (version_label)
);

-- Add index for version lookup
CREATE INDEX IF NOT EXISTS idx_factor_version ON factor_data (version_label);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_factor_data_updated_at ON factor_data;
CREATE TRIGGER update_factor_data_updated_at
  BEFORE UPDATE ON factor_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update uploads table to allow 'factors' data type
ALTER TABLE uploads DROP CONSTRAINT IF EXISTS uploads_data_type_check;
ALTER TABLE uploads ADD CONSTRAINT uploads_data_type_check
  CHECK (data_type IN ('holdings', 'performance', 'composition', 'factors'));
