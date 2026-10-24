"""Additive schema for optional long-term progress profiles.

The review module owns the base session/take tables. This schema is applied
after them and never changes existing rows except for filling server-time
fallbacks on the new take columns.
"""

PROGRESS_SCHEMA = """
CREATE TABLE IF NOT EXISTS speaker_profiles (
    id uuid PRIMARY KEY,
    display_name text NOT NULL DEFAULT '',
    locale text NOT NULL DEFAULT 'de' CHECK (locale IN ('de', 'en')),
    consent jsonb NOT NULL,
    retention_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profile_tokens (
    id uuid PRIMARY KEY,
    profile_id uuid NOT NULL REFERENCES speaker_profiles(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    label text,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz,
    revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS profile_tokens_profile_idx
    ON profile_tokens(profile_id, created_at);

ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES speaker_profiles(id) ON DELETE SET NULL;
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS presentation_mode text
    CHECK (presentation_mode IS NULL OR presentation_mode IN
           ('startup', 'thesis', 'school', 'nonprofit'));

ALTER TABLE takes
    ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES speaker_profiles(id) ON DELETE SET NULL;
ALTER TABLE takes
    ADD COLUMN IF NOT EXISTS recorded_at timestamptz;
ALTER TABLE takes
    ADD COLUMN IF NOT EXISTS recorded_at_source text
    CHECK (recorded_at_source IS NULL OR recorded_at_source IN ('client', 'server'));
ALTER TABLE takes
    ADD COLUMN IF NOT EXISTS device_key uuid;

UPDATE takes
   SET recorded_at = created_at,
       recorded_at_source = 'server'
 WHERE recorded_at IS NULL;

ALTER TABLE takes ALTER COLUMN recorded_at SET DEFAULT now();
ALTER TABLE takes ALTER COLUMN recorded_at_source SET DEFAULT 'server';
ALTER TABLE takes ALTER COLUMN recorded_at SET NOT NULL;
ALTER TABLE takes ALTER COLUMN recorded_at_source SET NOT NULL;

CREATE INDEX IF NOT EXISTS sessions_profile_time_idx
    ON sessions(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS takes_profile_time_idx
    ON takes(profile_id, recorded_at DESC, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS takes_session_recorded_idx
    ON takes(session_id, recorded_at, created_at, id);

CREATE TABLE IF NOT EXISTS metric_definitions (
    metric_id text NOT NULL,
    version integer NOT NULL CHECK (version >= 1),
    label_de text NOT NULL,
    label_en text NOT NULL,
    description_de text NOT NULL,
    description_en text NOT NULL,
    unit text NOT NULL,
    value_type text NOT NULL CHECK (value_type IN
        ('ratio', 'rate', 'count', 'duration', 'level', 'angle', 'perMin')),
    suggested_direction text NOT NULL CHECK (suggested_direction IN
        ('increase', 'decrease', 'target_band', 'neutral')),
    is_primary boolean NOT NULL DEFAULT false,
    heuristic boolean NOT NULL DEFAULT true,
    source text NOT NULL CHECK (source IN
        ('pose', 'speech', 'asr', 'factcheck', 'derived')),
    noise_floor double precision NOT NULL DEFAULT 0 CHECK (noise_floor >= 0),
    min_duration_ms integer NOT NULL DEFAULT 0 CHECK (min_duration_ms >= 0),
    min_pose_coverage double precision,
    min_pose_valid_ratio double precision,
    min_audio_active_ratio double precision,
    min_word_count integer,
    min_claim_count integer,
    device_sensitive boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (metric_id, version),
    CHECK (min_pose_coverage IS NULL OR min_pose_coverage BETWEEN 0 AND 1),
    CHECK (min_pose_valid_ratio IS NULL OR min_pose_valid_ratio BETWEEN 0 AND 1),
    CHECK (min_audio_active_ratio IS NULL OR min_audio_active_ratio BETWEEN 0 AND 1),
    CHECK (min_word_count IS NULL OR min_word_count >= 0),
    CHECK (min_claim_count IS NULL OR min_claim_count >= 0)
);

CREATE TABLE IF NOT EXISTS take_quality (
    take_id uuid PRIMARY KEY REFERENCES takes(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('ok', 'partial', 'poor')),
    global_exclusion_reasons text[] NOT NULL DEFAULT '{}',
    pose_coverage_ratio double precision,
    pose_valid_ratio double precision,
    audio_active_ratio double precision,
    word_count integer,
    claim_count integer,
    synthetic_demo boolean NOT NULL DEFAULT false,
    quality_version text NOT NULL,
    computed_at timestamptz NOT NULL DEFAULT now(),
    CHECK (pose_coverage_ratio IS NULL OR pose_coverage_ratio BETWEEN 0 AND 1),
    CHECK (pose_valid_ratio IS NULL OR pose_valid_ratio BETWEEN 0 AND 1),
    CHECK (audio_active_ratio IS NULL OR audio_active_ratio BETWEEN 0 AND 1)
);

CREATE TABLE IF NOT EXISTS take_metrics (
    take_id uuid NOT NULL REFERENCES takes(id) ON DELETE CASCADE,
    metric_id text NOT NULL,
    metric_version integer NOT NULL,
    value double precision,
    unit text NOT NULL,
    n integer NOT NULL DEFAULT 1 CHECK (n >= 0),
    denominator double precision,
    rule_version text,
    computation_version text NOT NULL,
    quality jsonb NOT NULL DEFAULT '{}',
    computed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (take_id, metric_id, metric_version),
    FOREIGN KEY (metric_id, metric_version)
        REFERENCES metric_definitions(metric_id, version) ON DELETE RESTRICT,
    CHECK (denominator IS NULL OR denominator > 0)
);
CREATE INDEX IF NOT EXISTS take_metrics_metric_idx
    ON take_metrics(metric_id, metric_version, computed_at DESC);

CREATE TABLE IF NOT EXISTS progress_snapshots (
    id uuid PRIMARY KEY,
    profile_id uuid NOT NULL REFERENCES speaker_profiles(id) ON DELETE CASCADE,
    metric_id text NOT NULL,
    metric_version integer NOT NULL,
    window_kind text NOT NULL CHECK (window_kind IN
        ('all', 'last_20', 'last_10', 'last_5')),
    window_end_take_id uuid NOT NULL REFERENCES takes(id) ON DELETE CASCADE,
    total_n integer NOT NULL,
    eligible_n integer NOT NULL,
    baseline_value double precision,
    latest_value double precision,
    recent_value double precision,
    noise_band double precision,
    trend_status text NOT NULL CHECK (trend_status IN
        ('insufficient', 'early_signal', 'stable', 'trend_up', 'trend_down', 'unclear')),
    goal_status text NOT NULL CHECK (goal_status IN
        ('not_applicable', 'unknown', 'on_track', 'off_track')),
    slope_per_take double precision,
    slope_per_10_takes double precision,
    slope_ci_low double precision,
    slope_ci_high double precision,
    relative_change double precision,
    effect_size double precision,
    minimum_detectable_change double precision,
    mann_kendall_p double precision,
    adjusted_p double precision,
    method text NOT NULL,
    algorithm_version text NOT NULL,
    rule_versions text[] NOT NULL DEFAULT '{}',
    version_break boolean NOT NULL DEFAULT false,
    input_hash text NOT NULL,
    computed_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (metric_id, metric_version)
        REFERENCES metric_definitions(metric_id, version) ON DELETE RESTRICT,
    UNIQUE (profile_id, metric_id, metric_version, window_kind, window_end_take_id)
);
CREATE INDEX IF NOT EXISTS progress_snapshots_profile_idx
    ON progress_snapshots(profile_id, metric_id, computed_at DESC);

CREATE TABLE IF NOT EXISTS progress_change_points (
    id uuid PRIMARY KEY,
    profile_id uuid NOT NULL REFERENCES speaker_profiles(id) ON DELETE CASCADE,
    metric_id text NOT NULL,
    metric_version integer NOT NULL,
    take_id uuid NOT NULL REFERENCES takes(id) ON DELETE CASCADE,
    change_started_at_take_id uuid NOT NULL REFERENCES takes(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN
        ('step_up', 'step_down', 'regression', 'recovery')),
    from_value double precision,
    to_value double precision,
    magnitude double precision,
    confidence text NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
    evidence_take_ids uuid[] NOT NULL DEFAULT '{}',
    algorithm_version text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (metric_id, metric_version)
        REFERENCES metric_definitions(metric_id, version) ON DELETE RESTRICT,
    UNIQUE (profile_id, metric_id, metric_version, take_id, algorithm_version)
);
CREATE INDEX IF NOT EXISTS progress_change_points_profile_idx
    ON progress_change_points(profile_id, metric_id, created_at DESC);

CREATE TABLE IF NOT EXISTS profile_goals (
    profile_id uuid NOT NULL REFERENCES speaker_profiles(id) ON DELETE CASCADE,
    metric_id text NOT NULL,
    metric_version integer NOT NULL,
    direction text NOT NULL CHECK (direction IN
        ('increase', 'decrease', 'target_band')),
    target_value double precision,
    target_min double precision,
    target_max double precision,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (profile_id, metric_id, metric_version),
    FOREIGN KEY (metric_id, metric_version)
        REFERENCES metric_definitions(metric_id, version) ON DELETE RESTRICT,
    CHECK (
        (direction = 'target_band' AND target_min IS NOT NULL AND target_max IS NOT NULL
         AND target_min <= target_max)
        OR (direction IN ('increase', 'decrease') AND target_value IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS profile_idempotency (
    scope text NOT NULL,
    key text NOT NULL,
    request_hash text NOT NULL,
    profile_id uuid REFERENCES speaker_profiles(id) ON DELETE CASCADE,
    status integer NOT NULL,
    response jsonb NOT NULL,
    expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
    PRIMARY KEY (scope, key)
);
CREATE INDEX IF NOT EXISTS profile_idempotency_expiry_idx
    ON profile_idempotency(expires_at);
"""
