import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function Shell() {
  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="min-w-0 flex-1 pb-16 md:pb-0">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
