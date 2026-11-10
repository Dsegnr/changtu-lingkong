import{describe,it,expect}from'vitest'
import{signalTime,controlContract}from'./connectedSignalTiming'
import type{ConnectedRun}from'./connectedCampusTypes'
const run={policy:'pressure',changes:{A:[{time:.2,state:'Gr',stage:'green'},{time:10.2,state:'yr',stage:'yellow'},{time:13.2,state:'rr',stage:'all_red'},{time:15.2,state:'rG',stage:'green'}]}} as unknown as ConnectedRun
describe('signal timing from past records and confirmed duration only',()=>{
 it('does not show a predicted adaptive green or red countdown',()=>{
  expect(signalTime(run,'A',0,8.8,controlContract)).toMatchObject({label:'已绿8s',remaining:null})
  expect(signalTime(run,'A',1,8.8,controlContract)).toMatchObject({label:'已红8s',remaining:null})
 })
 it('handles yellow, all-red and new green boundaries without negative countdowns',()=>{
  expect(signalTime(run,'A',0,10.2,controlContract)?.label).toBe('余3s')
  expect(signalTime(run,'A',0,13.2,controlContract)?.label).toBe('清空余2s')
  expect(signalTime(run,'A',1,15.2,controlContract)?.label).toBe('已绿0s')
  expect(signalTime(run,'A',0,15.2,controlContract)?.label).toBe('已红2s')
 })
 it('uses fixed green duration only under the verified source contract',()=>{
  expect(signalTime({...run,policy:'fixed'},'A',0,3.2,controlContract)?.label).toBe('余27s')
  expect(signalTime({...run,policy:'fixed'},'A',0,3.2,'other')?.remaining).toBeNull()
 })
 it('cannot change an earlier display by altering future phase records',()=>{
  const changed={...run,changes:{A:[...run.changes.A.slice(0,1),{time:99,state:'rG',stage:'green'}]}}
  expect(signalTime(changed,'A',1,8,controlContract)).toEqual(signalTime(run,'A',1,8,controlContract))
  expect(signalTime(run,'missing',0,8,controlContract)).toBeNull();expect(signalTime(run,'A',0,.1,controlContract)).toBeNull()
 })
})
