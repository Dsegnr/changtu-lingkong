import {describe,it,expect} from 'vitest'
import {networkFrameAt} from './connectedCampusPlayback'
import {initialState,workspaceReducer} from '../state/WorkspaceContext'
import type {NetworkFrame} from './connectedCampusTypes'
const frames=[.2,.4,.6].map(time=>({time,action_time:time-.2,vehicles:[],junctions:{}} as NetworkFrame))
describe('connected campus clock and identity',()=>{
 it('never borrows a future observation at a step boundary',()=>{
  expect(networkFrameAt(frames,.199)).toBeUndefined()
  expect(networkFrameAt(frames,.399)?.time).toBe(.2)
  expect(networkFrameAt(frames,.4)?.time).toBe(.4)
  expect(networkFrameAt(frames,100)?.time).toBe(.6)
  expect(networkFrameAt([],.4)).toBeUndefined()
 })
 it('keeps the same car and time when zooming or changing control policy',()=>{
  const s={...initialState,connectedTime:226.4,connectedVehicle:'SS_NET_16',playing:true}
  const zoom=workspaceReducer(s,{type:'connectedJunction',junction:'B'})
  const policy=workspaceReducer(zoom,{type:'connectedPolicy',policy:'fixed'})
  expect(policy).toMatchObject({connectedTime:226.4,connectedVehicle:'SS_NET_16',connectedJunction:'B',connectedPolicy:'fixed',playing:false})
 })
 it('keeps connected replay identity across unrelated data domain transitions',()=>{
  const s={...initialState,connectedTime:226.4,connectedVehicle:'SS_NET_16',connectedJunction:'C'}
  const a=workspaceReducer(s,{type:'domain',domain:'police'})
  const b=workspaceReducer(a,{type:'domain',domain:'campus'})
  expect(b).toMatchObject({connectedTime:226.4,connectedVehicle:'SS_NET_16',connectedJunction:'C'})
 })
})
