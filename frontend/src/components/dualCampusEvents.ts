import type{NetworkFrame,NetworkLane}from'./connectedCampusTypes'
export interface FrozenSpatialEvent{schema:string;region:'LH'|'SS';network_sha256:string;run_id:string;id:string;node:string;name:string;center:number[];radius_m:number;roads:{id:string;name:string;source_id:string;shape:number[][];sdk_intersects:boolean}[];nodes_in_circle:{id:string;name:string;center:number[]}[];applied_to_run:false;measured_event:false;traffic_effect_verified:false;source:{registry_sha256:string;relations_sha256:string;manifest_sha256:string};notes:string[]}
export function validateSpatialEvent(value:unknown,region:string,network:string,run:string,edges:string[]):FrozenSpatialEvent{
 const e=value as FrozenSpatialEvent,point=(p:unknown):boolean=>Array.isArray(p)&&p.length===2&&p.every(v=>typeof v==='number'&&Number.isFinite(v))
 if(e?.schema!=='dual_campus_event_overlay_v1'||e.region!==region||e.network_sha256!==network||e.run_id!==run||e.applied_to_run!==false||e.measured_event!==false||e.traffic_effect_verified!==false||!point(e.center)||!Number.isFinite(e.radius_m)||e.radius_m<=0||!Array.isArray(e.roads)||!e.roads.length)throw Error('事件证据与当前校区或运行不匹配')
 const known=new Set(edges),unique=new Set<string>()
 for(const road of e.roads){if(unique.has(road.id)||!known.has(road.id)||road.sdk_intersects!==true||!Array.isArray(road.shape)||road.shape.length<2||!road.shape.every(point))throw Error('事件道路身份或几何无效');unique.add(road.id)}
 return e
}
export function eventVehicleSummary(frame:NetworkFrame,lanes:NetworkLane[],event:FrozenSpatialEvent){
 const roadIds=new Set(event.roads.map(r=>r.id)),byLane=new Map(lanes.map(l=>[l.id,l])),inside:string[]=[],onRoad:string[]=[]
 for(const vehicle of frame.vehicles){
  if(Math.hypot(vehicle.center[0]-event.center[0],vehicle.center[1]-event.center[1])<=event.radius_m)inside.push(vehicle.id)
  const lane=byLane.get(vehicle.lane);if(lane&&!lane.internal&&roadIds.has(lane.edge))onRoad.push(vehicle.id)
 }
 return{inside,onRoad}
}
