import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { WorkspaceProvider } from './state/WorkspaceContext'
import App from './App'
import{TrafficSessionProvider}from'./state/TrafficSessionContext'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><WorkspaceProvider><TrafficSessionProvider><App /></TrafficSessionProvider></WorkspaceProvider></BrowserRouter></React.StrictMode>)
