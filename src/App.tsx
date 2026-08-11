import { Routes, Route } from 'react-router-dom'
import Shell from './components/Shell'
import Today from './pages/Today'
import Backlog from './pages/Backlog'
import Goals from './pages/Goals'
import History from './pages/History'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Today />} />
        <Route path="backlog" element={<Backlog />} />
        <Route path="goals" element={<Goals />} />
        <Route path="history" element={<History />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
