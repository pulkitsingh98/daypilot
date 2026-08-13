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

/**
 * Reads the name off an embedded `subjects(name)` PostgREST join. A
 * single-FK many-to-one embed like this is normally returned as one object,
 * not an array — but the exact shape has been observed to vary, so this
 * accepts either rather than silently reading `undefined` off the wrong one
 * (which is exactly how classes ended up showing as "(untitled class)"
 * despite the subject existing and being linked correctly).
 */
export function embeddedSubjectName(subjects: { name: string }[] | { name: string } | null): string {
  if (!subjects) return ''
  if (Array.isArray(subjects)) return subjects[0]?.name ?? ''
  return subjects.name ?? ''
}
