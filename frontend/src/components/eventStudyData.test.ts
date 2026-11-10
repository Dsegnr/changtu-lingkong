import{describe,it,expect}from'vitest'
import{validateStudy,curveAt,currentQueue,type Study}from'./eventStudyData'
const fixture=()=>{const domain='LH_lane_event_23',ids={reference:'r',incident:'i'};return{index:{schema:'lane_event_product_index_v1',domain,region:'LH',planned:23,network_sha256:'n',run_ids:ids,control_gain_claim:false},common:{domain,campus:'LH',source_hashes:{network:'n'},vehicles:Array.from({length:23},(_,id)=>({id:String(id)})),runs:{reference:{run_id:'r'},incident:{run_id:'i'}}},context:{campus:'LH',network_sha256:'n'},analysis:{domain,network_sha256:'n',run_ids:ids,planned:23,control_gain_claim:false},runs:Object.fromEntries(['reference','incident'].map(a=>[a,{domain,arm:a,run_id:ids[a as keyof typeof ids],policy:'pressure',event_applied:a==='incident',frames:Array(4500).fill({}),metadata_availability:{own_pending:true,veto:false}}]))}as unknown as Study}
describe('event domain isolation',()=>{
 it('accepts matching23 paired executions',()=>expect(validateStudy(fixture()).index.planned).toBe(23))
 it('refuses268 baseline',()=>{const v=fixture();v.index.planned=268;expect(()=>validateStudy(v)).toThrow()})
 it('refuseswrongarm',()=>{const v=fixture();v.runs.incident.arm='reference';expect(()=>validateStudy(v)).toThrow()})
 it('refusesothernetwork',()=>{const v=fixture();v.context.network_sha256='wrong';expect(()=>validateStudy(v)).toThrow()})
 it('refusesfalseeventclaim',()=>{const v=fixture();v.runs.incident.event_applied=false;expect(()=>validateStudy(v)).toThrow()})
 it('refusesduplicatecohort',()=>{const v=fixture();v.common.vehicles[1].id='0';expect(()=>validateStudy(v)).toThrow()})
 it('refusescrossrunanalysis',()=>{const v=fixture();v.analysis.run_ids={reference:'r',incident:'foreign'};expect(()=>validateStudy(v)).toThrow()})
})
describe('absolute current and post clocks',()=>{
 const rows=[{time_s:60,N_delta:2,queue_delta:{LHB:1}},{time_s:60.2,N_delta:3,queue_delta:{LHB:2}}]
 it('selects60currentfor60postwithoutoffset',()=>expect(curveAt(rows,60)?.N_delta).toBe(2))
 it('doesnotusethefollowingframe',()=>expect(curveAt(rows,60.2)?.N_delta).toBe(3))
 it('keepsmissingboundariesunknown',()=>expect(curveAt(rows,900)).toBeNull())
})

import type{NetworkFrame,NetworkJunction}from'./connectedCampusTypes'
describe('queue follows actual same-time vehicles',()=>{
 it('ignores action queue and internal/nonincoming stoppedcars',()=>{const f={vehicles:[{lane:'in',speed:0},{lane:'in',speed:2},{lane:':via',speed:0},{lane:'out',speed:0}],junctions:{J:{observation:[{queue:99}]}}}as unknown as NetworkFrame;const j={J:{approaches:[{lanes:['in']},{lanes:['in']}]}}as unknown as Record<string,NetworkJunction>;expect(currentQueue(f,j)).toBe(1)})
})

import {curveTimeFromSvgX} from './eventStudyData'
it('maps SVG coordinates to absolute plot time, independent of CSS letterboxing',()=>{expect(curveTimeFromSvgX(30)).toBe(0);expect(curveTimeFromSvgX(385)).toBe(225);expect(curveTimeFromSvgX(740)).toBe(450);expect(curveTimeFromSvgX(-10)).toBe(0);expect(curveTimeFromSvgX(900)).toBe(450);expect(()=>curveTimeFromSvgX(NaN)).toThrow()})
