import{describe,it,expect}from'vitest'
import{controlEvents,controlSnapshot,queueHistory,eventWindow}from'./connectedControlEvidence'
import type{ConnectedCommon,ConnectedRun,NetworkAction,NetworkFrame}from'./connectedCampusTypes'
const action=(stage:string,reason:string,queue=2):NetworkAction=>({stage,reason,state:stage==='green'?'G':'r',approach:'north',pending:stage==='yellow'?'south':null,raw_candidate:'south',veto:[],observation:[{queue,running:0,count:queue,pressure:queue-1}]})
const frame=(time:number,a:NetworkAction):NetworkFrame=>({time,action_time:time-.2,vehicles:[],junctions:{B:a,D:action('priority','priority_yield')}})
const run={run_id:'test',policy:'pressure',duration:20,frames:[frame(.2,action('green','hold')),frame(.4,action('green','hold')),frame(10.2,action('green','maximum_shared_lane_pressure')),frame(10.4,action('green','hold')),frame(15.2,action('yellow','maximum_shared_lane_pressure',5)),frame(15.4,action('yellow','yellow_clearance',4)),frame(18.2,action('all_red','enter_all_red')),frame(20,action('green','enter_green'))]}as ConnectedRun
describe('campus control evidence uses each frozen run separately',()=>{
 it('indexes genuine evaluations and transitions without per-frame hold noise or invented D lights',()=>{
  const events=controlEvents(run);expect(events.map(e=>e.time)).toEqual([.2,10.2,15.2,18.2,20]);expect(events.find(e=>e.time===15.2)).toMatchObject({kind:'switch',pending:'south',queue:5,actionTime:15});expect(events.every(e=>e.junction==='B')).toBe(true)
 })
 it('selects the last observation at or before a common clock and marks completed runs',()=>{
  const common={vehicles:[{runs:{pressure:{arrival:18}}}]}as ConnectedCommon
  expect(controlSnapshot(run,common,15.3,'B')).toMatchObject({time:15.2,queue:5,arrived:0,ended:false})
  expect(controlSnapshot(run,common,25,'B')).toMatchObject({time:20,arrived:1,ended:true})
  expect(controlSnapshot(run,common,.1,'B')).toBeNull()
 })
 it('does not put future observations into the history chart',()=>{
  expect(queueHistory(run,'B',15.3).every(p=>p.time<=15.3)).toBe(true)
  const events=Array.from({length:30},(_,i)=>({...controlEvents(run)[0],time:i,id:String(i)}));expect(eventWindow(events,15)).toHaveLength(8);expect(eventWindow(events,15).some(e=>e.time===15)).toBe(true);expect(eventWindow([],15)).toEqual([])
 })
})
