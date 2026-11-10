import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { WorkspaceProvider, useWorkspace, workspaceReducer, initialState } from './WorkspaceContext'

afterEach(cleanup)
describe('data domain and object identity', () => {
  it('clears spatial objects, time and playback when changing projection domain', () => {
    const state = { ...initialState, vehicle: 'LH_040', signal: 5, policeFrame: 120, campusTime: 1500, playing: true }
    const next = workspaceReducer(state, { type: 'domain', domain: 'police' })
    expect(next).toMatchObject({ domain: 'police', vehicle: null, signal: null, policeFrame: 0, campusTime: 750, playing: false })
    expect(state.vehicle).toBe('LH_040')
  })
  it('never carries a selected LH vehicle into SS', () => {
    const next = workspaceReducer({ ...initialState, vehicle: 'LH_055', playing: true }, { type: 'campus', campus: 'SS' })
    expect(next.campus).toBe('SS'); expect(next.vehicle).toBeNull(); expect(next.playing).toBe(false)
  })
  it('rejects unavailable reference through both entry paths', () => {
    const chosen = workspaceReducer({ ...initialState, compare: 'reference' }, { type: 'case', recovery: '960' })
    expect(chosen.compare).toBe('static')
    expect(workspaceReducer(chosen, { type: 'compare', compare: 'reference' }).compare).toBe('static')
  })
  it('preserves the selected decision frame within the police domain', () => {
    const state = { ...initialState, domain: 'police' as const, policeFrame: 123 }
    expect(workspaceReducer(state, { type: 'domain', domain: 'police' }).policeFrame).toBe(123)
    expect(workspaceReducer(state, { type: 'policePolicy', policy: 'fixed' }).policeFrame).toBe(0)
  })
  it('shares one state across consumers rather than local page copies', () => {
    function Control() { const { dispatch } = useWorkspace(); return <button onClick={() => dispatch({ type: 'campus', campus: 'SS' })}>切换校区</button> }
    function Viewer() { const { state } = useWorkspace(); return <output>{state.campus}</output> }
    render(<WorkspaceProvider><Control /><Viewer /></WorkspaceProvider>)
    expect(screen.getByRole('status').textContent).toBe('LH')
    fireEvent.click(screen.getByText('切换校区'))
    expect(screen.getByRole('status').textContent).toBe('SS')
  })
})
