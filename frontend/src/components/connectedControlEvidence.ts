import type{ConnectedCommon,ConnectedRun,NetworkAction,NetworkFrame}from'./connectedCampusTypes'
import{networkFrameAt}from'./connectedCampusPlayback'

export const controlStages:Record<string,string>={green:'绿灯放行',yellow:'黄灯保护',all_red:'全红清空',priority:'优先通行'}
export const controlReasons:Record<string,string>={hold:'保持当前放行',fixed_cycle:'固定周期轮换',maximum_shared_lane_pressure:'上下游压力选择',red_age_priority:'有车进口等待优先',maximum_green:'达到最长绿灯',yellow_clearance:'黄灯过渡锁定',all_red_clearance:'全红过渡锁定',enter_green:'执行目标放行',enter_all_red:'执行全红清空',priority_yield:'道路优先关系让行'}
export const controlVetos:Record<string,string>={minimum_green:'最短绿灯保护',decision_interval:'等待下一评估时点',transition_locked:'过渡阶段锁定',fixed_green_duration:'固定时长保护'}
export interface ControlEvent{id:string;junction:string;time:number;actionTime:number;kind:'evaluation'|'switch'|'phase';stage:string;reason:string;queue:number;approach:string;pending:string|null}
export function queueTotal(frame:NetworkFrame,junction:string|null){return Object.entries(frame.junctions).filter(([id])=>!junction||id===junction).reduce((n,[,a])=>n+a.observation.reduce((s,o)=>s+o.queue,0),0)}
export function controlEvents(run:ConnectedRun):ControlEvent[]{
 const previous=new Map<string,NetworkAction>(),events:ControlEvent[]=[]
 for(const f of run.frames)for(const[id,a]of Object.entries(f.junctions)){
  const last=previous.get(id);previous.set(id,a);if(a.stage==='priority')continue
  const phase=!last||last.stage!==a.stage||last.approach!==a.approach
  const evaluation=a.stage==='green'&&a.reason==='maximum_shared_lane_pressure'&&a.metadata_availability?.veto!==false&&a.veto!==null&&!a.veto.length
  if(!phase&&!evaluation)continue
  events.push({id:`${run.run_id}:${id}:${f.time}`,junction:id,time:f.time,actionTime:f.action_time,kind:a.stage==='yellow'&&phase?'switch':evaluation?'evaluation':'phase',stage:a.stage,reason:a.reason,queue:a.observation.reduce((s,o)=>s+o.queue,0),approach:a.approach,pending:a.pending})
 }
 return events.sort((a,b)=>a.time-b.time||a.junction.localeCompare(b.junction))
}
export function controlSnapshot(run:ConnectedRun,common:ConnectedCommon,time:number,junction:string|null){
 const frame=networkFrameAt(run.frames,Math.min(time,run.duration));if(!frame)return null
 return{frame,time:frame.time,actionTime:frame.action_time,ended:time>=run.duration,queue:queueTotal(frame,junction),inflight:frame.vehicles.length,arrived:common.vehicles.filter(v=>v.runs[run.policy].arrival<=time).length}
}
export function queueHistory(run:ConnectedRun,junction:string|null,time:number){
 const start=Math.max(run.frames[0]?.time??0,time-60),end=Math.min(time,run.duration),last=networkFrameAt(run.frames,end)
 return run.frames.filter((f,i)=>f.time>=start&&f.time<=end&&(i%5===0||f===last)).map(f=>({time:f.time,queue:queueTotal(f,junction)}))
}
export function eventWindow(events:ControlEvent[],time:number){const next=events.findIndex(e=>e.time>time+1e-7),at=next<0?events.length:next,start=Math.max(0,Math.min(Math.max(0,events.length-8),at-4));return events.slice(start,start+8)}
