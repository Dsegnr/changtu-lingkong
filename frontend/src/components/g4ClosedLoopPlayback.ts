import type {G4Case,G4Policy,G4Product,G4SceneRun} from './g4ClosedLoopTypes'
export const policyLabels:Record<G4Policy,string>={P:'网络压力规则',G3:'接收约束规则',G4:'联合控制 · 尾部约束'}
export const g4Color=(id:string)=>id==='blocker'?'#bb8735':id.startsWith('target0_')?'#b98ace':'#43a2c1'
export function g4FrameAt(run:G4SceneRun,time:number){
 if(!Number.isFinite(time)||time<run.first_sample-1e-7)return undefined
 return run.frames[Math.min(run.frames.length-1,Math.max(0,Math.floor((time-run.first_sample+1e-7)/run.step)))]
}
export function g4Timing(run:G4SceneRun,junction:string,index:number,time:number){
 const frame=g4FrameAt(run,time),light=frame?.recordedLights[junction]?.[index]
 if(!light)return null
 const value=frame!.recordedRemaining[junction],remaining=value===null||value===undefined?null:Math.max(0,value-(time-frame!.time))
 const name=light.toLowerCase()==='g'?'绿':light.toLowerCase()==='y'?'黄':'红'
 return {light,elapsed:0,remaining,kind:'remaining' as const,label:name+' · 组余'+(remaining===null?'后续未记录':Math.ceil(remaining-1e-7)+'s')}
}
export function decisionAt(c:G4Case,time:number){return c.decisions.filter(d=>d.time<=time-.2+1e-7).at(-1)}
export function validateG4Product(value:unknown,network:string):G4Product {
 const p=value as G4Product,fail=()=>{throw Error('闭环记录索引未通过网络、身份或结果校验')}
 if(!p||p.schema!=='g4_closed_loop_product_v1'||p.network_sha256!==network||p.step!==.2||p.live_connected!==false||p.real_campus_traffic!==false||p.simulation_control_executed!==true||p.real_device_actions!==false||p.cases?.length!==2||new Set(p.cases.map(c=>c.id)).size!==2)fail()
 for(const c of p.cases){
  if(!['H0','H60'].includes(c.id)||c.identities?.length!==14||new Set(c.identities).size!==14||c.vehicles?.length!==14||new Set(c.vehicles.map(v=>v.id)).size!==14)fail()
  for(const policy of ['P','G3','G4'] as const){const r=c.runs[policy];if(!r||r.run_id!==`g4-local:${c.id}:${policy}`||r.file!==`runs/${c.id}_${policy}.json`||!/^[a-f0-9]{64}$/.test(r.sha256)||r.first_sample!==.2||r.frames!==Math.round(r.duration/.2)||r.metrics.arrived!==14||r.metrics.inserted!==14||r.metrics.censored.length||r.metrics.ids.length!==14||r.metrics.ids.some(id=>!c.identities.includes(id)))fail()
   let sum=0;for(const v of c.vehicles){if(!c.identities.includes(v.id)||v.color!==g4Color(v.id)||!Number.isFinite(v.runs[policy]?.speed_loss_s))fail();sum+=v.runs[policy].speed_loss_s}
   if(Math.abs(sum-r.metrics.normalized_speed_loss_vehicle_s)>1e-6)fail()
  }
  if(!Array.isArray(c.decisions)||c.decisions.some(d=>!Number.isFinite(d.time)||!d.receipt_confirmed||!d.tail_guard||d.tail_guard.limit_s!==.2))fail()
 }
 return p
}
export function validateG4Run(value:unknown,c:G4Case,policy:G4Policy,network:string):G4SceneRun {
 const r=value as G4SceneRun,info=c.runs[policy],fail=()=>{throw Error('闭环执行记录未通过时钟、车辆或灯态校验')}
 if(!r||r.schema!=='g4_closed_loop_run_v1'||r.case!==c.id||r.policy!==policy||r.run_id!==info.run_id||r.network_sha256!==network||r.step!==.2||r.first_sample!==.2||r.duration!==info.duration||r.frames?.length!==info.frames||r.countdown_online_prediction!==false||r.data_kind!=='recorded_engineering_simulation'||r.real_campus_traffic!==false)fail()
 r.frames.forEach((f,i)=>{
  if(Math.abs(f.time-(i+1)*.2)>1e-6||Math.abs(f.action_time-i*.2)>1e-6||!Array.isArray(f.vehicles)||new Set(f.vehicles.map(v=>v.id)).size!==f.vehicles.length)fail()
  for(const j of ['A','B','C']){const s=f.recordedLights?.[j],n=f.recordedRemaining?.[j];if(!s||!/^[rRgGyYoOuUs]+$/.test(s)||s!==f.junctions[j]?.state||!(n===null||Number.isFinite(n)&&n>=0))fail()}
  for(const v of f.vehicles){if(!c.identities.includes(v.id)||v.color!==g4Color(v.id)||v.length!==4.6||!v.lane||v.center.length!==2||![...v.center,v.angle,v.speed].every(Number.isFinite)||v.speed<0)fail();v.geo=[];v.turn='recorded'}
 })
 return {...r,kind:'g4'}
}
async function checkedJSON(url:string,sha?:string){const res=await fetch(url);if(!res.ok)throw Error(`闭环记录读取失败（${res.status}）`);const bytes=await res.arrayBuffer();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');if(sha&&hash!==sha)throw Error('闭环记录签名不匹配');return JSON.parse(new TextDecoder().decode(bytes))}
export async function loadG4Product(network:string){const binding=await checkedJSON('/api/research/g4/binding');if(binding.network_sha256!==network||!/^[a-f0-9]{64}$/.test(binding.sha256))throw Error('闭环记录绑定无效');return validateG4Product(await checkedJSON('/api/research/g4',binding.sha256),network)}
const cache=new Map<string,Promise<G4SceneRun>>()
export async function loadG4Run(c:G4Case,policy:G4Policy,network:string){const info=c.runs[policy],key=info.sha256;let p=cache.get(key);if(!p){p=checkedJSON(`/api/research/g4/run/${c.id}_${policy}`,info.sha256).then(v=>validateG4Run(v,c,policy,network));cache.set(key,p);p.catch(()=>cache.delete(key))}return p}
