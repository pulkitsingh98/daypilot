import type { PostgrestError } from '@supabase/supabase-js'

/** Throws with the Postgres/PostgREST message if the query errored, otherwise returns data. */
export function unwrap<T>(result: { data: T | null; error: PostgrestError | null }): T {
  if (result.error) throw new Error(result.error.message)
  if (result.data === null) throw new Error('Supabase returned no data for a query expected to have some.')
  return result.data
}

/** Same as unwrap(), but null data is valid (e.g. .maybeSingle()). */
export function unwrapNullable<T>(result: { data: T | null; error: PostgrestError | null }): T | null {
  if (result.error) throw new Error(result.error.message)
  return result.data
}
