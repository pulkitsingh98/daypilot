-- ============================================================================
-- profiles.ai_model — an optional, provider-specific model override.
-- Every provider so far has been pinned to one hardcoded model (see
-- src/services/ai.ts) since there was nothing meaningful to choose between.
-- Groq changes that: it hosts several genuinely different free models (a
-- large reasoning model, a smaller/faster one, a vision-capable one), so
-- Settings now lets the user pick when Groq is the active provider. Left
-- null for every other provider, which keeps using its hardcoded default.
-- ============================================================================

alter table public.profiles
  add column ai_model text;
