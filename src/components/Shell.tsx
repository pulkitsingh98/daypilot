import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import FloatingIconsBackground from './FloatingIconsBackground'

export default function Shell() {
  return (
    <div className="flex min-h-screen bg-paper">
      <FloatingIconsBackground />
      <Sidebar />
      <div className="relative z-10 min-w-0 flex-1 pb-16 md:h-screen md:overflow-y-auto md:pb-0">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
