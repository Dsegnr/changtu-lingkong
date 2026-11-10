import type {G4CaseId,G4Policy,G4Product} from './g4ClosedLoopTypes'
export const baseProductSHA='e3f38ddc58ce42f279a81e5bac2f37be0431939552bf3ca6c3960ef727953eae'
export interface WholeTripVehicle {id:string;planned_departure_s:number;actual_departure_s:number;arrival_s:number;pre_entry_wait_s:number;in_network_duration_s:number;whole_trip_s:number;speed_loss_s:number}
export interface WholeTripRun {run_id:string;run_sha256:string;vehicles:WholeTripVehicle[];arrived:number;total_whole_trip_s:number;total_pre_entry_wait_s:number;total_in_network_duration_s:number;total_speed_loss_s:number}
export interface TotalTimeCase {id:G4CaseId;identities:string[];runs:Record<G4Policy,WholeTripRun>}
export interface TotalTimeProduct {schema:'g4_total_time_product_v1';base_product_sha256:string;network_sha256:string;cases:TotalTimeCase[];complete_recording_statistics:true;online_controller_input:false;real_campus_traffic:false;real_device_actions:false;speed_loss_is_not_whole_trip:true;original_gates_unchanged:true;whole_trip_definition:string;identity:string}
const policies:G4Policy[]=['P','G3','G4']
export function validateTotalTime(value:unknown,product:G4Product):TotalTimeProduct {
 const p=value as TotalTimeProduct,fail=()=>{throw Error('全程耗时记录的绑定、身份或时钟核验失败')},near=(a:number,b:number)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-6
 if(!p||p.schema!=='g4_total_time_product_v1'||p.base_product_sha256!==baseProductSHA||p.network_sha256!==product.network_sha256||p.complete_recording_statistics!==true||p.online_controller_input!==false||p.real_campus_traffic!==false||p.real_device_actions!==false||p.speed_loss_is_not_whole_trip!==true||p.original_gates_unchanged!==true||p.whole_trip_definition!=='actual_arrival_minus_planned_departure'||p.identity!=='whole_trip_equals_pre_entry_wait_plus_in_network_duration'||p.cases?.length!==2||new Set(p.cases.map(c=>c.id)).size!==2)fail()
 for(const c of p.cases){
  const original=product.cases.find(v=>v.id===c.id);if(!original||c.identities?.length!==14||new Set(c.identities).size!==14||c.identities.some(id=>!original.identities.includes(id)))fail()
  for(const policy of policies){const r=c.runs?.[policy],old=original!.runs[policy]
   if(!r||r.run_id!==old.run_id||r.run_sha256!==old.sha256||r.arrived!==14||r.vehicles?.length!==14||new Set(r.vehicles.map(v=>v.id)).size!==14)fail()
   for(const v of r.vehicles){
    if(!c.identities.includes(v.id)||![v.planned_departure_s,v.actual_departure_s,v.arrival_s,v.pre_entry_wait_s,v.in_network_duration_s,v.whole_trip_s,v.speed_loss_s].every(x=>Number.isFinite(x)&&x>=0)||!near(v.whole_trip_s,v.arrival_s-v.planned_departure_s)||!near(v.pre_entry_wait_s,v.actual_departure_s-v.planned_departure_s)||!near(v.in_network_duration_s,v.arrival_s-v.actual_departure_s)||!near(v.whole_trip_s,v.pre_entry_wait_s+v.in_network_duration_s)||!near(v.speed_loss_s,old.metrics.by_vehicle[v.id]))fail()
   }
   const sum=(k:keyof WholeTripVehicle)=>r.vehicles.reduce((a,v)=>a+Number(v[k]),0)
   if(!near(r.total_whole_trip_s,sum('whole_trip_s'))||!near(r.total_pre_entry_wait_s,sum('pre_entry_wait_s'))||!near(r.total_in_network_duration_s,sum('in_network_duration_s'))||!near(r.total_speed_loss_s,sum('speed_loss_s'))||!near(r.total_speed_loss_s,old.metrics.normalized_speed_loss_vehicle_s))fail()
  }
 }
 return p
}
export async function loadTotalTime(product:G4Product){
 const binding=await fetch('/api/research/g4-total-time/binding');if(!binding.ok)throw Error('全程耗时绑定读取失败（'+binding.status+'）')
 const b=await binding.json();if(b.schema!=='g4_total_time_binding_v1'||b.base_product_sha256!==baseProductSHA||b.network_sha256!==product.network_sha256||b.simulation_only!==true||!/^[a-f0-9]{64}$/.test(b.sha256))throw Error('全程耗时绑定无效')
 const response=await fetch('/api/research/g4-total-time');if(!response.ok)throw Error('全程耗时记录读取失败（'+response.status+'）')
 const bytes=await response.arrayBuffer();const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('')
 if(sha!==b.sha256)throw Error('全程耗时签名不匹配')
 return validateTotalTime(JSON.parse(new TextDecoder().decode(bytes)),product)
}
export function tripDifference(c:TotalTimeCase,policy:G4Policy,baseline:G4Policy){const a=c.runs[policy],b=c.runs[baseline];return {whole:a.total_whole_trip_s-b.total_whole_trip_s,preEntry:a.total_pre_entry_wait_s-b.total_pre_entry_wait_s,inNetwork:a.total_in_network_duration_s-b.total_in_network_duration_s,speedLoss:a.total_speed_loss_s-b.total_speed_loss_s}}
export const signedTime=(x:number,digits=1)=>(x>1e-7?'+':'')+(Math.abs(x)<1e-7?0:x).toFixed(digits)
