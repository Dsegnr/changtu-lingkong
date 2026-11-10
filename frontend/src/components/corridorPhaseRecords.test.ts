import {describe,it,expect} from 'vitest'
import {buildPhaseTracks,currentQueue,phaseWindow,seekInWindow} from './corridorPhaseRecords'
import type {ConnectedRun,NetworkFrame,NetworkJunction} from './connectedCampusTypes'
const frame=(t:number,stage='green',approach='N'):NetworkFrame=>({time:t,action_time:t-.2,vehicles:[],junctions:{A:{state:stage==='green'?'Gr':stage==='yellow'?'yr':'rr',stage,approach,pending:null,raw_candidate:approach,reason:'hold',veto:null,observation:[]}}})
const run=(frames:NetworkFrame[])=>({frames,step:.2} as ConnectedRun)
describe('recorded corridor stages',()=>{
 it('retains transitions, serving direction and final sample boundary',()=>{
  const tracks=buildPhaseTracks(run([frame(.2),frame(.4),frame(.6,'yellow'),frame(.8,'all_red'),frame(1,'green','S'),frame(1.2,'green','S')]),['A'])
  expect(tracks[0].segments.map(s=>[s.start,s.end,s.stage,s.approach])).toEqual([[.2,.6,'green','N'],[.6,.8,'yellow','N'],[.8,1,'all_red','N'],[1,1.2,'green','S']])
 })
 it('does not bridge missing time or extend a lone last sample',()=>{
  const s=buildPhaseTracks(run([frame(.2),frame(.4),frame(1),frame(1.2)]),['A'])[0].segments
  expect(s.map(s=>[s.start,s.end])).toEqual([[.2,.4],[1,1.2]])
 })
 it('missing node records stay blank even when its next state is equal',()=>{
  const missing={...frame(.6),junctions:{}}
  expect(buildPhaseTracks(run([frame(.2),frame(.4),missing,frame(.8),frame(1)]),['A'])[0].segments.map(s=>[s.start,s.end])).toEqual([[.2,.4],[.8,1]])
 })
 it('rejects duplicate and reversed time rather than inventing a phase',()=>{
  expect(()=>buildPhaseTracks(run([frame(.4),frame(.2)]),['A'])).toThrow()
  expect(()=>buildPhaseTracks(run([frame(.2),frame(.2)]),['A'])).toThrow()
 })
 it('a change in serving direction is visible even if aggregate stage stays green',()=>{
  expect(buildPhaseTracks(run([frame(.2),frame(.4,'green','S'),frame(.6,'green','S')]),['A'])[0].segments).toHaveLength(2)
 })
 it('clamps early/end windows and requires a meaningful range',()=>{
  expect(phaseWindow(.2,.2,1800)).toEqual({start:.2,end:90.2})
  expect(phaseWindow(1800,.2,1800)).toEqual({start:1710,end:1800})
  expect(()=>phaseWindow(0,2,1)).toThrow()
 })
 it('seeks in absolute time on the native grid with boundary clamping',()=>{
  expect(seekInWindow(50,100,250,340)).toBe(295)
  expect(seekInWindow(-2,100,250,340)).toBe(250)
  expect(seekInWindow(120,100,250,340)).toBe(340)
  expect(seekInWindow(2,0,250,340)).toBeNull()
 })
 it('counts current stopped vehicles once and excludes internal/outgoing lanes',()=>{
  const j={approaches:[{lanes:['in','shared']},{lanes:['shared']}]}as NetworkJunction
  const f={...frame(10),vehicles:[{lane:'in',speed:0},{lane:'shared',speed:.09},{lane:'in',speed:3},{lane:':internal',speed:0},{lane:'out',speed:0}]}as NetworkFrame
  expect(currentQueue(f,[j,j])).toBe(2)
 })
})
