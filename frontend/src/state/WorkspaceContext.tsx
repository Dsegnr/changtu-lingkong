import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react'
import type { CampusID, Domain, PolicePolicy, PolicyID } from '../types'
import type { ConnectedPolicy } from '../components/connectedCampusTypes'

export interface WorkspaceState { domain: Domain; campus: CampusID; recovery: string; policy: PolicyID; compare: PolicyID | 'reference'; vehicle: string | null; campusTime: number; policePolicy: PolicePolicy; policeFrame: number; signal: number | null; playing: boolean; connectedTime:number; connectedPolicy:ConnectedPolicy; connectedVehicle:string|null; connectedJunction:string|null }
export const initialState: WorkspaceState = { domain: 'campus', campus: 'LH', recovery: '900', policy: 'regret', compare: 'static', vehicle: null, campusTime: 750, policePolicy: 'adaptive', policeFrame: 0, signal: null, playing: false, connectedTime:120,connectedPolicy:'pressure',connectedVehicle:null,connectedJunction:null }
export type Action = { type: 'domain'; domain: Domain } | { type: 'campus'; campus: CampusID } | { type: 'case'; recovery: string } | { type: 'policy'; policy: PolicyID } | { type: 'compare'; compare: PolicyID | 'reference' } | { type: 'vehicle'; vehicle: string | null } | { type: 'campusTime'; time: number } | { type: 'policePolicy'; policy: PolicePolicy } | { type: 'policeFrame'; frame: number } | { type: 'signal'; signal: number | null } | { type: 'play'; playing: boolean } | {type:'connectedTime';time:number} | {type:'connectedPolicy';policy:ConnectedPolicy} | {type:'connectedVehicle';vehicle:string|null} | {type:'connectedJunction';junction:string|null}
export function workspaceReducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case 'connectedTime': return {...state,connectedTime:Math.max(.2,Math.round(action.time*5)/5)}
    case 'connectedPolicy':return {...state,connectedPolicy:action.policy,playing:false}
    case 'connectedVehicle':return {...state,connectedVehicle:action.vehicle}
    case 'connectedJunction':return {...state,connectedJunction:action.junction}
    case 'domain': return action.domain === state.domain ? state : { ...state, domain: action.domain, vehicle: null, signal: null, policeFrame: 0, campusTime: 750, playing: false }
    case 'campus': return { ...state, campus: action.campus, vehicle: null, signal: null, campusTime: 750, playing: false }
    case 'case': return { ...state, recovery: action.recovery, compare: action.recovery === '960' && state.compare === 'reference' ? 'static' : state.compare, playing: false }
    case 'policy': return { ...state, policy: action.policy, playing: false }
    case 'compare': return { ...state, compare: action.compare === 'reference' && state.recovery === '960' ? 'static' : action.compare, playing: false }
    case 'vehicle': return { ...state, vehicle: action.vehicle }
    case 'campusTime': return { ...state, campusTime: Math.max(1, Math.floor(action.time)) }
    case 'policePolicy': return { ...state, policePolicy: action.policy, policeFrame: 0, signal: null, playing: false }
    case 'policeFrame': return { ...state, policeFrame: Math.max(0, Math.floor(action.frame)) }
    case 'signal': return { ...state, signal: action.signal }
    case 'play': return { ...state, playing: action.playing }
  }
}
const Context = createContext<{ state: WorkspaceState; dispatch: Dispatch<Action> } | null>(null)
export function WorkspaceProvider({ children }: { children: ReactNode }) { const [state, dispatch] = useReducer(workspaceReducer, initialState); return <Context.Provider value={{ state, dispatch }}>{children}</Context.Provider> }
export function useWorkspace() { const context = useContext(Context); if (!context) throw new Error('WorkspaceProvider缺失'); return context }
