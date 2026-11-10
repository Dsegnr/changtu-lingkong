import type{ReceivingCase,ReceivingFrame,ReceivingProduct,ReceivingProgram,ReceivingSceneRun,ReceivingState}from'./receivingRecordingTypes'
export const receivingProductHash='0d2a89a9553484d88192ea616eed298a4dd4057ecad78e779ef1a91f3867bada'
export const stateNames:Record<ReceivingState,string>={blocked:'入口受阻',space_available:'当前有空间',unknown:'证据不足'}
export const caseNames={T0:'无停车对照',T1:'持续入口受阻',T2:'解除与恢复'}
export const reasonNames:Record<string,string>={no_source_head:'当前进口无头车',head_outside_near_range:'头车尚在15米范围外',blocked_history_insufficient:'连续静止证据不足1秒',internal_resource_occupied:'路口内部有车占用',moving_receiver_without_entry_gap:'入口车已移动，尾部间隙不足',stopped_entrance_confirmed:'同一队首与入口车，连续受阻已确认',current_entry_space_only:'入口余量足够，内部资源无占用',sampling_warmup_or_gap:'初始采样或记录断档',head_movement_unresolved:'当前转向无法确认',ambiguous_connection:'连接映射不唯一',lane_change_unverified:'换道后本帧尚未核验'}
export function receivingPhase(p:ReceivingProgram,time:number){let u=((time+p.offset_s)%p.cycle_s+p.cycle_s)%p.cycle_s;for(const phase of p.phases){if(u<phase.duration_s-1e-7)return{state:phase.state,remaining:phase.duration_s-u};u-=phase.duration_s}return{state:p.phases[0].state,remaining:p.phases[0].duration_s}}
export function validateReceivingProduct(value:unknown,networkHash:string):ReceivingProduct{
 const p=value as ReceivingProduct,fail=()=>{throw Error('接收记录来源、时钟或空间证据校验失败')},hex=(s:unknown)=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s),ids=['blocker','target0_0','target0_1','target0_2','target1_0','target1_1','target1_2']
 if(!p||p.schema!=='receiving_space_product_v1'||p.network_sha256!==networkHash||p.source_kind!=='recorded_engineering_simulation'||p.live_connected!==false||p.real_campus_traffic!==false||p.control_actions_executed!==false||p.position_reference!=='front_bumper_body_extends_backward'||p.step!==.2||p.last_sample!==179.8||p.horizon!==180||JSON.stringify(p.identities)!==JSON.stringify(ids)||!hex(p.source_packet_sha256)||!hex(p.shadow_verification_sha256)||!Array.isArray(p.source_limits))fail()
 if(!p.programs||Object.keys(p.programs).sort().join()!=='A,B,C')fail()
 for(const prog of Object.values(p.programs)){if(!Number.isFinite(prog.offset_s)||!Array.isArray(prog.phases)||!prog.phases.length||prog.phases.some(x=>!Number.isFinite(x.duration_s)||x.duration_s<=0||!/^[rRgGyYoOuUs]+$/.test(x.state))||Math.abs(prog.phases.reduce((s,x)=>s+x.duration_s,0)-prog.cycle_s)>1e-6)fail()}
 if(!Array.isArray(p.cases)||p.cases.map(c=>c.id).join()!=='T0,T1,T2')fail()
 for(const c of p.cases){
  if(!hex(c.raw_sha256)||!hex(c.shadow_sha256)||!Array.isArray(c.frames)||c.frames.length!==900||!Array.isArray(c.censored)||new Set(c.censored).size!==c.censored.length||c.censored.some(id=>!ids.includes(id))||c.arrived+c.censored.length!==7||!Array.isArray(c.events)||c.events.some(e=>!e.label||e.time!==null&&(!Number.isFinite(e.time)||e.time<0||e.time>179.8)))fail()
  c.frames.forEach((f,i)=>{
   if(!Number.isFinite(f.time)||Math.abs(f.time-i*.2)>1e-6||!f.lights||Object.keys(f.lights).sort().join()!=='A,B,C'||!Array.isArray(f.vehicles)||new Set(f.vehicles.map(v=>v.id)).size!==f.vehicles.length||!Array.isArray(f.evidence)||f.evidence.length!==2||!Number.isInteger(f.unsupported_head_count)||f.unsupported_head_count<0)fail()
   for(const j of ['A','B','C'])if(f.lights[j]!==receivingPhase(p.programs[j],f.time).state)fail()
   for(const v of f.vehicles)if(!ids.includes(v.id)||!Array.isArray(v.center)||v.center.length!==2||![...v.center,v.angle,v.speed,v.acceleration,v.position].every(Number.isFinite)||v.speed<0||v.position<0||v.length!==4.6||!v.lane)fail()
   f.evidence.forEach((e,index)=>{
    if(e.movement!==(index===0?'B:0':'B:3')||e.source_lane!==(index===0?'gong_gong_start_B_f_0':'yi_D_B_r_1')||e.target_lane!=='gong_B_C_f_'+index||!['unknown','blocked','space_available'].includes(e.state)||!reasonNames[e.reason]||typeof e.opportunity!=='boolean'||e.signal_permission_inferred!==false||!Number.isFinite(e.blocked_history_s)||e.blocked_history_s<0||e.entry_margin_m!==null&&!Number.isFinite(e.entry_margin_m)||!Array.isArray(e.internal_occupants)||e.internal_occupants.some(id=>!f.vehicles.some(v=>v.id===id)))fail()
    const heads=f.vehicles.filter(v=>v.lane===e.source_lane).sort((a,b)=>b.position-a.position),head=heads[0]
    if(e.head_id!==(head?.id??null))fail()
    if(e.state!=='unknown'&&(!e.opportunity||!head||e.internal_occupants.length))fail()
    if(e.receiver_id!==null){const receiver=f.vehicles.find(v=>v.id===e.receiver_id);if(!receiver||receiver.lane!==e.target_lane||e.entry_margin_m===null||Math.abs(e.entry_margin_m-(receiver.position-receiver.length-2.5))>1e-6)fail()}
    if(e.state==='blocked'&&(e.reason!=='stopped_entrance_confirmed'||e.blocked_history_s<1-1e-7||e.entry_margin_m===null||e.entry_margin_m>=0||!f.vehicles.some(v=>v.id===e.receiver_id&&v.speed<.1)))fail()
    if(e.state==='space_available'&&(e.reason!=='current_entry_space_only'||e.entry_margin_m!==null&&e.entry_margin_m< -1e-7))fail()
   })
  })
  if(c.frames[0].vehicles.length!==3||c.frames[0].time!==0||c.frames.at(-1)!.time!==179.8)fail()
 }
 return p
}
export async function loadReceivingRecording(networkHash:string){const response=await fetch('/api/research/receiving-space');if(!response.ok)throw Error('接收记录读取失败（'+response.status+'）');const buffer=await response.arrayBuffer(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(n=>n.toString(16).padStart(2,'0')).join('');if(hash!==receivingProductHash)throw Error('接收记录签名不一致');return validateReceivingProduct(JSON.parse(new TextDecoder().decode(buffer)),networkHash)}
export function receivingFrameAt(frames:ReceivingFrame[],time:number){if(!Number.isFinite(time)||time<0)return undefined;return frames[Math.min(frames.length-1,Math.floor((time+1e-7)/.2))]}
export function receivingSceneRun(c:ReceivingCase,p:ReceivingProduct):ReceivingSceneRun{return{kind:'receiving',run_id:'receiving:'+c.id,duration:p.last_sample,step:p.step,programs:p.programs,frames:c.frames.map(f=>({time:f.time,action_time:f.time,junctions:{},recordedLights:f.lights,vehicles:f.vehicles.map(v=>({id:v.id,center:v.center,angle:v.angle,speed:v.speed,lane:v.lane,geo:[],turn:'recorded'}))}))}}
export function receivingColor(id:string){return id==='blocker'?'#bb8735':id.startsWith('target0')?'#b98ace':'#43a2c1'}
