import{describe,it,expect}from'vitest'
import{eventVehicleSummary,validateSpatialEvent,type FrozenSpatialEvent}from'./dualCampusEvents'
import type{NetworkFrame,NetworkLane}from'./connectedCampusTypes'
const event=()=>({schema:'dual_campus_event_overlay_v1',region:'LH',network_sha256:'lh',run_id:'q',id:'E',node:'A',name:'event',center:[0,0],radius_m:100,roads:[{id:'road',name:'road',source_id:'1',shape:[[0,0],[300,0]],sdk_intersects:true}],nodes_in_circle:[],applied_to_run:false,measured_event:false,traffic_effect_verified:false,source:{registry_sha256:'r',relations_sha256:'s',manifest_sha256:'m'},notes:[]} as FrozenSpatialEvent)
describe('event layer is separate from traffic response',()=>{
 it('keeps circle occupancy distinct from intersecting road occupancy',()=>{
  const frame={vehicles:[{id:'farOnRoad',center:[250,0],lane:'road_0'},{id:'internalInside',center:[1,0],lane:':inside_0'},{id:'boundary',center:[100,0],lane:'other_0'},{id:'outside',center:[100.001,0],lane:'other_0'}]} as NetworkFrame
  const lanes=[{id:'road_0',edge:'road',internal:false},{id:':inside_0',edge:':inside',internal:true},{id:'other_0',edge:'other',internal:false}] as NetworkLane[]
  const before=JSON.stringify(frame);expect(eventVehicleSummary(frame,lanes,event())).toEqual({inside:['internalInside','boundary'],onRoad:['farOnRoad']});expect(JSON.stringify(frame)).toBe(before)
 })
 it('rejects cross-region, stale run, fake event response and unbound edges',()=>{
  expect(validateSpatialEvent(event(),'LH','lh','q',['road']).id).toBe('E')
  for(const patch of [{region:'SS'},{run_id:'old'},{network_sha256:'ss'},{applied_to_run:true},{center:[NaN,0]},{roads:[{...event().roads[0],id:'not-bound'}]}])expect(()=>validateSpatialEvent({...event(),...patch},'LH','lh','q',['road'])).toThrow()
 })
})
