import type{SceneCommon}from'./ConnectedCampusScene'
import type{ConnectedRun,ConnectedContext,NetworkFrame,NetworkJunction}from'./connectedCampusTypes'
export type EventArm='reference'|'incident'
export type Trip={cost:number;delta:number;arrival:number;depart:number;entry_wait:number;max_continuous_stop:number}
export type EventCommon=Omit<SceneCommon,'vehicles'>&{domain:string;vehicles:{id:string;edges:string[];runs:Record<EventArm,Trip>}[];runs:Record<EventArm,{run_id:string;label:string;metrics:{S_sum_s:number;source_schedule_entry_wait_s:number;max_observed_continuous_stop_s:number}} >}
export type EventRun=ConnectedRun&{domain:string;arm:EventArm;event_applied:boolean}
export type EventIndex={schema:string;domain:string;region:string;planned:number;network_sha256:string;run_ids:Record<EventArm,string>;control_gain_claim:boolean}
export type Curve={time_s:number;N_delta:number;queue_delta:Record<string,number>}
export type Analysis={domain:string;network_sha256:string;run_ids:Record<EventArm,string>;planned:number;control_gain_claim:boolean;event:{lane:string;edge:string;begin_s:number;end_s:number};curve:Curve[];comparison:{delta_S_sum_s:string;harmed:number;benefited:number;unchanged:number;worst_harm_s:number};recovery:{recovery:{window_s:number};window_cost_delta:{after:string}}}
export type Study={index:EventIndex;common:EventCommon;runs:Record<EventArm,EventRun>;analysis:Analysis;context:ConnectedContext}
export function validateStudy(s:Study){const{i,c,a}= {i:s.index,c:s.common,a:s.analysis};const D='LH_lane_event_23'
 if(i.schema!=='lane_event_product_index_v1'||i.domain!==D||i.region!=='LH'||i.planned!==23||i.control_gain_claim!==false||c.domain!==D||c.campus!=='LH'||c.vehicles.length!==23||new Set(c.vehicles.map(v=>v.id)).size!==23||c.source_hashes.network!==i.network_sha256||s.context.campus!=='LH'||s.context.network_sha256!==i.network_sha256||a.domain!==D||a.planned!==23||a.network_sha256!==i.network_sha256||a.control_gain_claim!==false)throw Error('事件场景、车辆集合或路网不匹配')
 for(const arm of ['reference','incident']as EventArm[]){const r=s.runs[arm];if(r.domain!==D||r.run_id!==i.run_ids[arm]||c.runs[arm].run_id!==r.run_id||a.run_ids[arm]!==r.run_id||r.arm!==arm||r.policy!=='pressure'||r.event_applied!==(arm==='incident')||r.frames.length!==4500||r.metadata_availability?.own_pending!==true||r.metadata_availability?.veto!==false)throw Error('事件执行与所选对照不匹配')}
 return s}
export function curveAt(curve:Curve[],postTime:number){return curve.find(r=>Math.abs(r.time_s-postTime)<1e-7)??null}
let cached:Promise<Study>|null=null
export function loadEventStudy(){if(!cached){const get=async<T,>(path:string):Promise<T>=>{const r=await fetch(path);if(!r.ok)throw Error('事件数据暂不可用');return r.json()};cached=Promise.all([get<EventIndex>('/api/lane-event/index'),get<EventCommon>('/api/lane-event/common'),get<EventRun>('/api/lane-event/run/reference'),get<EventRun>('/api/lane-event/run/incident'),get<Analysis>('/api/lane-event/analysis'),get<ConnectedContext>('/api/dual-campus/LH/context')]).then(([index,common,reference,incident,analysis,context])=>validateStudy({index,common,runs:{reference,incident},analysis,context})).catch(e=>{cached=null;throw e})}return cached}

export function currentQueue(frame:NetworkFrame,junctions:Record<string,NetworkJunction>){const lanes=new Set(Object.values(junctions).flatMap(j=>j.approaches.flatMap(a=>a.lanes)));return frame.vehicles.filter(v=>v.speed<.1&&lanes.has(v.lane)).length}

/** Plot x after client-to-SVG transformation; letterboxing must not shift absolute time. */
export function curveTimeFromSvgX(x:number){if(!Number.isFinite(x))throw Error('曲线坐标无效');return Math.max(0,Math.min(450,(x-30)/710*450))}
