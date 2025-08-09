export const SQL_QUERIES = {
  ENQUEUE_JOB: `
    INSERT INTO que_jobs (job_class, args, priority, run_at, queue)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING job_id, priority, run_at, job_class, args, error_count, last_error, queue
  `,

  LOCK_JOB: `
    WITH RECURSIVE jobs AS (
      SELECT (j).*, pg_try_advisory_lock((j).job_id) AS locked
      FROM (
        SELECT j
        FROM que_jobs AS j
        WHERE queue = $1 AND run_at <= now() AND error_count < 5
        ORDER BY priority, run_at, job_id
        LIMIT 1
      ) AS t1
      UNION ALL (
        SELECT (j).*, pg_try_advisory_lock((j).job_id) AS locked
        FROM (
          SELECT (
            SELECT j
            FROM que_jobs AS j
            WHERE queue = $1 AND run_at <= now() AND error_count < 5
            AND (priority, run_at, job_id) > (jobs.priority, jobs.run_at, jobs.job_id)
            ORDER BY priority, run_at, job_id
            LIMIT 1
          ) AS j
          FROM jobs
          WHERE jobs.job_id IS NOT NULL
          LIMIT 1
        ) AS t1
      )
    )
    SELECT job_id, priority, run_at, job_class, args, error_count, last_error, queue
    FROM jobs
    WHERE locked
    LIMIT 1
  `,

  DELETE_JOB: `
    DELETE FROM que_jobs
    WHERE job_id = $1
  `,

  UPDATE_JOB_ERROR: `
    UPDATE que_jobs
    SET error_count = error_count + 1,
        last_error = $2,
        run_at = now() + interval '%d seconds'
    WHERE job_id = $1
  `,

  UNLOCK_JOB: `
    SELECT pg_advisory_unlock($1)
  `
} as const;