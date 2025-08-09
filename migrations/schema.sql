-- Que job queue table compatible with Ruby Que and que-go
CREATE TABLE que_jobs (
    priority    smallint    NOT NULL DEFAULT 100,
    run_at      timestamptz NOT NULL DEFAULT now(),
    job_id      bigserial   NOT NULL,
    job_class   text        NOT NULL,
    args        json        NOT NULL DEFAULT '[]'::json,
    error_count integer     NOT NULL DEFAULT 0,
    last_error  text,
    queue       text        NOT NULL DEFAULT '',
    
    -- Composite primary key for efficient job ordering and retrieval
    PRIMARY KEY (queue, priority, run_at, job_id)
);

-- Index for efficient job polling
CREATE INDEX CONCURRENTLY que_poll_idx ON que_jobs (queue, priority, run_at, job_id) WHERE error_count < 5;

-- Function to get current time (useful for compatibility)
CREATE OR REPLACE FUNCTION que_current_time()
RETURNS timestamptz
LANGUAGE SQL
STABLE
AS $$
  SELECT now();
$$;