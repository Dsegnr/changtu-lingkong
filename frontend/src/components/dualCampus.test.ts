import {describe,it,expect} from 'vitest'
import {validateRegion} from './DualCampusWorkspace'
import {signalTime} from './connectedSignalTiming'
import type {ConnectedRun} from './connectedCampusTypes'
describe('dual-region evidence isolation',()=>{
 const meta={name:'LH',run_id:'LH_q',network_sha256:'lh-net',planned:23,source:'source',policy:'q',metrics:null}
 const fixture=()=>({common:{campus:'LH',source_hashes:{network:'lh-net'},vehicles:Array.from({length:23},(_,i)=>({id:String(i)}))},context:{campus:'LH',network_sha256:'lh-net'},run:{run_id:'LH_q',frames:[{}]}} as any)
 it('rejects stale campus, network, run and population',()=>{
  expect(validateRegion('LH',meta,fixture())).toBeTruthy()
  for(const mutate of [(d:any)=>d.common.campus='SS',(d:any)=>d.run.run_id='SS_q',(d:any)=>d.context.network_sha256='ss-net',(d:any)=>d.common.vehicles.pop()]){const d=fixture();mutate(d);expect(()=>validateRegion('LH',meta,d)).toThrow()}
 })
 it('shows future recorded transition only with explicit offline flag',()=>{
  const run={policy:'pressure',recorded_signal_timeline:true,changes:{LHA:[{time:.2,state:'Gr',stage:'green'},{time:10.2,state:'yr',stage:'yellow'},{time:13.2,state:'rr',stage:'all_red'},{time:15.2,state:'rG',stage:'green'}]}} as unknown as ConnectedRun
  expect(signalTime(run,'LHA',0,8.2,'LH-contract')?.label).toBe('回放余2s')
  expect(signalTime({...run,recorded_signal_timeline:false},'LHA',0,8.2,'LH-contract')?.remaining).toBeNull()
  expect(signalTime(run,'LHA',0,10.2,'LH-contract')?.light).toBe('y')
 })
})
