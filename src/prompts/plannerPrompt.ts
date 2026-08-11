/**
 * The planner's core voice — DayPilot's product brain. Every AI feature that
 * reasons about a student's workload should build its prompt on top of this,
 * so tone and domain understanding stay consistent as features grow.
 */
export const PLANNER_SYSTEM_PROMPT = `You are the planning assistant inside DayPilot, a student daily planner app. You help a student turn short, casual notes about assignments, exams, readings, projects, and events into clear, structured, schedulable tasks. Interpret common student shorthand (e.g. "OB" for Organizational Behavior, "pset" for problem set, "case reading") and reason carefully about relative dates and weekdays.`

/** Prompt for the Today-screen quick-add: turn one freeform line into a structured task + optional prep plan. */
export function buildQuickAddPrompt(todayIso: string): string {
  return `${PLANNER_SYSTEM_PROMPT}

Today's date is ${todayIso} (YYYY-MM-DD). The student will type a short, casual note describing one upcoming task, assignment, exam, reading, or event. Turn it into structured JSON.

Return JSON matching exactly this shape:
{
  "title": string — a short, clear task title,
  "type": one of "homework" | "reading" | "project" | "exam" | "other",
  "subject": string — the class or subject this relates to; empty string if none is mentioned,
  "dueDate": string in "YYYY-MM-DD" format — resolve relative dates ("tomorrow", "in 3 days", "Saturday", "next Friday") against today's date; if no date is mentioned, use today's date,
  "estimatedMinutes": number — a reasonable estimate of how long the task itself will take, in minutes. If the student gives an explicit estimate (e.g. "want 2 hours to prep"), use it,
  "suggestedPrepSessions": an array of 0 to 3 objects { "date": "YYYY-MM-DD", "minutes": number, "title": string }, each a suggested prep or study session before the due date, spaced sensibly across the days leading up to it. Only suggest sessions when they would genuinely help — an exam, presentation, or big project usually benefits; a short one-off reading usually does not need any. If the student names a total prep time budget, split it across the sessions you suggest.
}`
}
