import { Routes, Route } from 'react-router-dom'
import Shell from './components/Shell'
import RequireAuth from './components/RequireAuth'
import Login from './pages/Login'
import Today from './pages/Today'
import Backlog from './pages/Backlog'
import Goals from './pages/Goals'
import MyLife from './pages/MyLife'
import History from './pages/History'
import Settings from './pages/Settings'
import Timetable from './pages/Timetable'
import Subjects from './pages/Subjects'
import SubjectDetail from './pages/SubjectDetail'
import Documents from './pages/Documents'
import DebugLog from './pages/DebugLog'

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route index element={<Today />} />
          <Route path="backlog" element={<Backlog />} />
          <Route path="goals" element={<Goals />} />
          <Route path="my-life" element={<MyLife />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/timetable" element={<Timetable />} />
          <Route path="settings/subjects" element={<Subjects />} />
          <Route path="settings/subjects/:id" element={<SubjectDetail />} />
          <Route path="settings/documents" element={<Documents />} />
          <Route path="settings/debug" element={<DebugLog />} />
        </Route>
      </Route>
    </Routes>
  )
}
