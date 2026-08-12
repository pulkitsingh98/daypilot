import { useState } from 'react'
import { useGoals, type Goal, type GoalHorizon } from '../data/goals'
import { GOAL_HORIZONS } from '../lib/goals'
import GoalCard from '../components/goals/GoalCard'
import GoalFormSheet from '../components/goals/GoalFormSheet'

export default function Goals() {
  const { data: goals = [], isLoading, error } = useGoals()
  const [editing, setEditing] = useState<Goal | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [defaultHorizon, setDefaultHorizon] = useState<GoalHorizon>('30')

  function openAdd(horizon: GoalHorizon = '30') {
    setEditing(null)
    setDefaultHorizon(horizon)
    setFormOpen(true)
  }

  function openEdit(goal: Goal) {
    setEditing(goal)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Goals</h1>
          <p className="mt-1 text-sm text-slate-500">Track weekly progress toward your goals.</p>
        </div>
        <button
          type="button"
          onClick={() => openAdd()}
          className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add goal
        </button>
      </div>

      {isLoading && <p className="mb-4 text-sm text-slate-500">Loading your goals…</p>}
      {error && <p className="mb-4 text-sm text-red-600">Could not load your goals. Try refreshing.</p>}

      <div className="flex flex-col gap-6">
        {GOAL_HORIZONS.map((horizon) => {
          const horizonGoals = goals.filter((goal) => goal.horizon === horizon.key)
          return (
            <section key={horizon.key}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">{horizon.label}</h2>
                <button
                  type="button"
                  onClick={() => openAdd(horizon.key)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  + Add
                </button>
              </div>

              {horizonGoals.length === 0 ? (
                <p className="text-sm text-slate-400">No goals yet</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {horizonGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} onEdit={openEdit} />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {formOpen && (
        <GoalFormSheet
          key={editing?.id ?? 'new'}
          initial={editing}
          defaultHorizon={defaultHorizon}
          onClose={closeForm}
        />
      )}
    </div>
  )
}
