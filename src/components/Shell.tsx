import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { useMoodleAutoSync } from '../data/moodleSync'

export default function Shell() {
  useMoodleAutoSync()

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="min-w-0 flex-1 pb-16 md:h-screen md:overflow-y-auto md:pb-0">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
