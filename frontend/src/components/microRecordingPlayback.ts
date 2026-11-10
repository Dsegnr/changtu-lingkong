import type{G4SceneRun}from'./g4ClosedLoopTypes'
import{g4Timing}from'./g4ClosedLoopPlayback'
import type{ReceivingSceneRun}from'./receivingRecordingTypes'
import{receivingPhase}from'./receivingRecordingPlayback'
import type{ConnectedRun,NetworkFrame,NetworkVehicle}from'./connectedCampusTypes'
import{networkFrameAt}from'./connectedCampusPlayback'
import{presentationVehicles}from'./connectedPresentation'
import{signalTime,type SignalTime}from'./connectedSignalTiming'
import type{FixedMicroProgram,MicroCase,MicroFrame,MicroProduct,MicroSceneRun,MicroVehicle}from'./microRecordingTypes'

export function fixedMicroPhase(program:FixedMicroProgram,time:number){
 let pos=((time+program.offset_s)%program.cycle_s+program.cycle_s)%program.cycle_s
 for(const phase of program.phases){if(pos<phase.duration_s-1e-7)return{state:phase.state,remaining:phase.duration_s-pos};pos-=phase.duration_s}
 return{state:program.phases[0].state,remaining:program.phases[0].duration_s}
}
export function validateMicroProduct(value:unknown,networkHash:string):MicroProduct{
 const p=value as MicroProduct
 const fail=()=>{throw Error('机制记录版本、网络签名或逐帧证据不匹配')}
 if(!p||p.schema!=='micro_recording_product_v1'||p.source_kind!=='recorded_simulation'||p.network_sha256!==networkHash||p.live_connected!==false||p.real_campus_traffic!==false||p.full_prediction_allowed!==false||p.action_ranking_allowed!==false||!p.source_packet_sha256||!Array.isArray(p.source_limits)||!Array.isArray(p.additional_fixtures))fail()
 const program=p.fixed_signal_program
 if(!program||program.junction!=='C'||!Number.isFinite(program.offset_s)||!Array.isArray(program.phases)||!program.phases.length||program.phases.some(x=>!Number.isFinite(x.duration_s)||x.duration_s<=0||!x.state||!/^[rRgGyYoOuUs]+$/.test(x.state))||Math.abs(program.phases.reduce((s,x)=>s+x.duration_s,0)-program.cycle_s)>1e-6)fail()
 if(!Array.isArray(p.cases)||p.cases.length!==2||new Set(p.cases.map(c=>c.mode)).size!==2)fail()
 let checked=0
 for(const c of p.cases){
  if(!['natural','requested'].includes(c.mode)||c.case!=='B_C_structure_capped'||c.id!==c.case+'/'+c.mode||!Array.isArray(c.frames)||c.frames.length!==1200||!c.audit||!Array.isArray(c.audit.maneuvers)||!Array.isArray(c.audit.services)||!Array.isArray(c.audit.requests)||!Array.isArray(c.audit.censored_vehicles))fail()
  c.frames.forEach((f,i)=>{
   if(!Number.isFinite(f.time)||Math.abs(f.time-i*.1)>1e-6||!Array.isArray(f.vehicles)||new Set(f.vehicles.map(v=>v.id)).size!==f.vehicles.length||f.tls!==fixedMicroPhase(program,f.time).state)fail()
   for(const v of f.vehicles){if(!['ego','lead','rear'].includes(v.id)||!Array.isArray(v.center)||v.center.length!==2||![...v.center,v.angle,v.speed,v.acceleration,v.lateral,v.lateral_speed,v.position].every(Number.isFinite)||v.speed<0||!v.lane||!['following','changing','completed','unresolved'].includes(v.stage))fail()
    const m=v.active_maneuver;if(m&&(v.stage!=='changing'||f.time<m.start_s||m.end_s===undefined||f.time>=m.end_s))fail()
    const expected=c.audit.maneuvers.find(a=>a.id===v.id&&a.end_s!==undefined&&a.start_s<=f.time&&f.time<a.end_s)
    if(expected&&(!m||v.stage!=='changing'||m.start_s!==expected.start_s||m.end_s!==expected.end_s))fail()
    if(v.stage==='completed'&&!c.audit.maneuvers.some(a=>a.id===v.id&&a.end_s!==undefined&&a.end_s<=f.time))fail()
    if(v.unmatched_start&&!m&&v.stage!=='unresolved')fail()
   }checked++
  })
 }
 if(checked!==program.verified_frames)fail()
 return p
}
export async function loadMicroRecording(networkHash:string){const response=await fetch('/api/research/lateral-micro');if(!response.ok)throw Error('机制记录读取失败（'+response.status+'），保留区域联动记录');return validateMicroProduct(await response.json(),networkHash)}
export function microFrameAt(frames:MicroFrame[],time:number){if(!Number.isFinite(time)||time<0)return undefined;let lo=0,hi=frames.length-1;if(hi<0)return undefined;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(frames[mid].time<=time+1e-7)lo=mid;else hi=mid-1}return frames[lo]}
export function microStageLabel(v?:MicroVehicle){return !v?'已离开记录区域':({following:'跟驰中',changing:'换道进行中',completed:'换道已完成',unresolved:'已开始 · 结束未配对'})[v.stage]}
export function microNetGaps(frame:MicroFrame,ego:MicroVehicle|undefined){
 const edge='gong_B_C_f';if(!ego||!ego.lane.startsWith(edge+'_'))return null
 const neighbors=frame.vehicles.filter(v=>v.id!==ego.id&&v.lane.startsWith(edge+'_')).filter(v=>{const center=Number(v.lane.slice(v.lane.lastIndexOf('_')+1))*3.2+v.lateral;return center-.9<1.6&&center+.9> -1.6})
 const front=neighbors.filter(v=>v.position>ego.position).sort((a,b)=>a.position-b.position)[0],rear=neighbors.filter(v=>v.position<=ego.position).sort((a,b)=>b.position-a.position)[0]
 return{front:front?front.position-5-ego.position:null,rear:rear?ego.position-5-rear.position:null}
}
export function microSceneRun(recording:MicroCase,program:FixedMicroProgram):MicroSceneRun{
 // Render adapter only: no synthetic queue, pressure, policy or other junction actions.
 return{kind:'micro',run_id:'micro:'+recording.id,duration:recording.frames.at(-1)!.time,step:.1,recording,program,
  frames:recording.frames.map(f=>({time:f.time,action_time:f.time,junctions:{},recordedLights:{C:f.tls},vehicles:f.vehicles.map(v=>({id:v.id,center:v.center,angle:v.angle,speed:v.speed,lane:v.lane,geo:[],turn:'recorded'}))}))}
}
export function isMicroRun(run:ConnectedRun<string>|MicroSceneRun|ReceivingSceneRun|G4SceneRun):run is MicroSceneRun{return'kind'in run&&run.kind==='micro'}
export function isReceivingRun(run:ConnectedRun<string>|MicroSceneRun|ReceivingSceneRun|G4SceneRun):run is ReceivingSceneRun{return'kind'in run&&run.kind==='receiving'}
export function isG4Run(run:ConnectedRun<string>|MicroSceneRun|ReceivingSceneRun|G4SceneRun):run is G4SceneRun{return'kind'in run&&run.kind==='g4'}
export function isRecordedRun(run:ConnectedRun<string>|MicroSceneRun|ReceivingSceneRun|G4SceneRun){return isMicroRun(run)||isReceivingRun(run)||isG4Run(run)}
export function sceneFrameAt(run:ConnectedRun<string>|MicroSceneRun|ReceivingSceneRun|G4SceneRun,time:number){return networkFrameAt(run.frames,time)}
export function sceneLight(run:ConnectedRun<string>|MicroSceneRun|ReceivingSceneRun|G4SceneRun,frame:NetworkFrame,junction:string,index:number):string|undefined{
 return isRecordedRun(run)?(frame as MicroSceneRun['frames'][number]).recordedLights?.[junction]?.[index]:frame.junctions[junction]?.state[index]
}
export function sceneTiming(run:ConnectedRun<string>|MicroSceneRun|ReceivingSceneRun|G4SceneRun,junction:string,index:number,time:number,contract:string):SignalTime|null{
 if(isG4Run(run))return g4Timing(run,junction,index,time)
 if(isReceivingRun(run)){const program=run.programs[junction];if(!program)return null;const phase=receivingPhase(program,Math.floor((time+1e-7)/.2)*.2),light=phase.state[index];if(!light)return null;return{light,elapsed:0,remaining:phase.remaining,kind:'remaining',label:(light.toLowerCase()==='g'?'绿':light==='y'?'黄':'红')+'·阶段余'+Math.ceil(phase.remaining-1e-7)+'s'}}
 if(!isMicroRun(run))return signalTime(run,junction,index,time,contract)
 if(junction!=='C')return null
 const phase=fixedMicroPhase(run.program,time),light=phase.state[index];if(!light)return null
 return{light,elapsed:0,remaining:phase.remaining,kind:'remaining',label:(light.toLowerCase()==='g'?'绿':light==='y'?'黄':'红')+'·阶段余'+Math.ceil(phase.remaining-1e-7)+'s'}
}
export function sceneVehicles(run:ConnectedRun<string>|MicroSceneRun|ReceivingSceneRun|G4SceneRun,time:number):NetworkVehicle[]{
 if(!isRecordedRun(run))return presentationVehicles(run.frames,time)
 const index=Math.min(run.frames.length-1,Math.max(0,Math.floor((time-(isG4Run(run)?run.first_sample:0)+1e-7)/run.step))),a=run.frames[index],b=run.frames[index+1]
 if(!b)return a.vehicles
 const u=Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time))),next=new Map(b.vehicles.map(v=>[v.id,v]))
 return a.vehicles.map(v=>{const n=next.get(v.id);if(!n||Math.hypot(n.center[0]-v.center[0],n.center[1]-v.center[1])>5)return v;const delta=((n.angle-v.angle+540)%360)-180;return{...v,center:v.center.map((x,i)=>x+(n.center[i]-x)*u),angle:(v.angle+delta*u+360)%360}})
}
