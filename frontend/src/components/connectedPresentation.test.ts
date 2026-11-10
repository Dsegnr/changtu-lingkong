import{describe,it,expect}from'vitest'
import{presentationTime,presentationVehicles}from'./connectedPresentation'
import type{NetworkFrame,NetworkVehicle}from'./connectedCampusTypes'
const car=(id:string,x:number,angle=0):NetworkVehicle=>({id,center:[x,0],geo:[0,0],angle,speed:10,lane:'a',turn:'straight'})
const frame=(time:number,vehicles:NetworkVehicle[]):NetworkFrame=>({time,action_time:time-.2,vehicles,junctions:{}})
describe('display interpolation preserves recorded evidence',()=>{
 it('interpolates at fractional times and takes shortest angular arc',()=>{
  const frames=[frame(.2,[car('a',0,359)]),frame(.4,[car('a',2,1)])],before=JSON.stringify(frames)
  const result=presentationVehicles(frames,.3)[0];expect(result.center[0]).toBeCloseTo(1);expect(result.angle).toBeCloseTo(0);expect(JSON.stringify(frames)).toBe(before)
 })
 it('does not invent entering cars, extrapolate exits or connect teleports',()=>{
  const frames=[frame(.2,[car('a',0),car('exit',2)]),frame(.4,[car('a',100),car('new',0)])]
  expect(presentationVehicles(frames,.3).map(v=>v.id)).toEqual(['a','exit']);expect(presentationVehicles(frames,.3)[0].center).toEqual([0,0]);expect(presentationVehicles(frames,.4).map(v=>v.id)).toEqual(['a','new']);expect(presentationVehicles(frames,.1)).toEqual([])
 })
 it('keeps pauses exact and bounds the presentation clock at run end',()=>{
  expect(presentationTime({time:120,stamp:1000,speed:2,playing:true},1050,1000)).toBeCloseTo(120.1)
  expect(presentationTime({time:120,stamp:1000,speed:2,playing:false},3000,1000)).toBe(120)
  expect(presentationTime({time:999,stamp:0,speed:8,playing:true},1000,1000)).toBe(1000)
 })
})
