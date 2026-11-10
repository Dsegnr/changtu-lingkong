import{describe,it,expect}from'vitest'
import{corridorLinks,linkWindow}from'./connectedCorridorFlow'
import type{ConnectedCommon,ConnectedRun,NetworkVehicle}from'./connectedCampusTypes'
const common={geometry:{junctions:{A:{},B:{},C:{}},edges:[{id:'ab',from:'A',to:'B',name:'路',lanes:['ab0','ab1']},{id:'bc',from:'B',to:'C',name:'路',lanes:['bc0']},{id:'external',from:'C',to:'outside',lanes:['x']}]}}as unknown as ConnectedCommon
const vehicle=(id:string,lane:string,speed=2)=>({id,lane,speed})as NetworkVehicle
const run=(cars:NetworkVehicle[][])=>({step:.2,frames:cars.map((vehicles,i)=>({time:Number(((i+1)*.2).toFixed(1)),vehicles}))})as ConnectedRun
describe('causal road section accounting',()=>{
 it('does not count lane changes as a road entry or exit',()=>{
  const links=corridorLinks(common,run([[vehicle('v','ab0')],[vehicle('v','ab1')],[vehicle('v',':B')],[vehicle('v','bc0')]]))
  expect(links).toHaveLength(2)
  expect(linkWindow(links[0],.4)).toMatchObject({entered:1,exited:0,count:1,delta:1,balanced:true})
  expect(linkWindow(links[0],.8)).toMatchObject({entered:1,exited:1,count:0,balanced:true})
  expect(linkWindow(links[1],.8)).toMatchObject({entered:1,count:1,balanced:true})
 })
 it('uses an open left boundary and reports queue change independently',()=>{
  const links=corridorLinks(common,run([[vehicle('a','ab0')],[vehicle('a','ab0',0),vehicle('b','ab1')],[],[]]))
  expect(linkWindow(links[0],.4,.2)).toMatchObject({entered:1,exited:0,delta:1,stopped:1,queueDelta:1})
  expect(linkWindow(links[0],.6,.2)).toMatchObject({entered:0,exited:2,delta:-2,stopped:0,speed:null,balanced:true})
 })
 it('does not alter past statistics when future vehicles change',()=>{
  const a=corridorLinks(common,run([[vehicle('a','ab0')],[]]))[0]
  const b=corridorLinks(common,run([[vehicle('a','ab0')],[vehicle('x','ab0'),vehicle('y','ab1')]]))[0]
  expect(linkWindow(a,.2)).toEqual(linkWindow(b,.2))
 })
 it('rejects duplicate identities and missing frames',()=>{
  expect(()=>corridorLinks(common,run([[vehicle('a','ab0'),vehicle('a','ab1')]]))).toThrow()
  const bad=run([[],[]]);bad.frames[1].time=.6
  expect(()=>corridorLinks(common,bad)).toThrow()
 })
 it('retains zeros before data and clamps queries to observed last frame',()=>{
  const link=corridorLinks(common,run([[vehicle('a','ab0')]]))[0]
  expect(linkWindow(link,0)).toMatchObject({time:0,count:0,balanced:true})
  expect(linkWindow(link,9)).toMatchObject({time:.2,count:1})
 })
})
