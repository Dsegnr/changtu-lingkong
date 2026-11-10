import { Route, Routes, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import CampusPage from './pages/CampusPage'
import { Component, Suspense, lazy, type ReactNode } from 'react'

const EvaluationPage = lazy(() => import('./pages/EvaluationPage'))
const EventStudyPage = lazy(() => import('./pages/EventStudyPage'))
const JunctionPage = lazy(() => import('./pages/JunctionPage'))
const ExperimentPage = lazy(() => import('./pages/ExperimentPage'))
const PolicePage = lazy(() => import('./pages/PolicePage'))
const DecisionsPage = lazy(() => import('./pages/DecisionsPage'))
const DataPage = lazy(() => import('./pages/DataPage'))
const RealReplayPage = lazy(() => import('./pages/RealReplayPage'))
const TasksPage = lazy(() => import('./pages/TasksPage'))
const loading = (page: ReactNode) => <Suspense fallback={<div className="loading">正在载入工作空间…</div>}>{page}</Suspense>

class WorkspaceBoundary extends Component<{ children: ReactNode }, { message: string; stack: string }> {
  state = { message: '', stack: '' }
  static getDerivedStateFromError(error: Error) { return { message: error.message, stack: error.stack || '' } }
  componentDidCatch(error: Error) { console.error(error.stack) }
  render() { return this.state.message ? <div className="error" data-stack={this.state.stack} role="alert"><h2>工作空间暂时无法显示</h2><p>请重新加载工作台；已有记录不会改变。</p><button onClick={()=>window.location.reload()}>重新加载工作台</button><details><summary>故障详情</summary><code>{this.state.message}</code></details></div> : this.props.children }
}

export default function App() {
  return <WorkspaceBoundary><Routes><Route element={<AppShell />}><Route path="/tasks" element={loading(<TasksPage />)} /><Route path="/evaluation" element={loading(<EvaluationPage />)} /><Route path="/events" element={loading(<EventStudyPage />)} /><Route path="/campus" element={<CampusPage />} /><Route path="/junction" element={loading(<JunctionPage />)} /><Route path="/experiment" element={loading(<ExperimentPage />)} /><Route path="/police" element={loading(<PolicePage />)} /><Route path="/replay" element={loading(<RealReplayPage />)} /><Route path="/decisions" element={loading(<DecisionsPage />)} /><Route path="/data" element={loading(<DataPage />)} /><Route path="*" element={<Navigate to="/campus" replace />} /></Route></Routes></WorkspaceBoundary>
}
