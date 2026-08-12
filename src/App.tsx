import { Routes, Route } from 'react-router-dom'
import Shell from './components/Shell'
import RequireAuth from './components/RequireAuth'
import Login from './pages/Login'
import Today from './pages/Today'
import Backlog from './pages/Backlog'
import Goals from './pages/Goals'
import History from './pages/History'
import Settings from './pages/Settings'
import Timetable from './pages/Timetable'

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route index element={<Today />} />
          <Route path="backlog" element={<Backlog />} />
          <Route path="goals" element={<Goals />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/timetable" element={<Timetable />} />
        </Route>
      </Route>
    </Routes>
  )
}
