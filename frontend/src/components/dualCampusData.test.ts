import{describe,it,expect,vi}from'vitest'
import{loadTrafficBundle}from'./dualCampusData'
import{createTrafficRepository}from'../state/trafficRepository'
function fixture(region='LH',policy='pressure'){
 const net=region+'-net',meta={name:region,run_id:region+'_'+policy,network_sha256:net,planned:1,source:'synthetic test',policy,metrics:null}
 return{'index':{campuses:{[region]:meta}},[region+'/common']:{campus:region,source_hashes:{network:net},vehicles:[{id:'one'}],geometry:{junctions:{}}},[region+'/run']:{run_id:meta.run_id,policy,schema:'connected_campus_run_v1',frames:[{time:.2}],duration:100},[region+'/context']:{campus:region,network_sha256:net},[region+'/gis']:{edges:[]}} as Record<string,any>
}
function make(table:Record<string,any>){const f=vi.fn(async(path:string)=>({ok:true,json:async()=>table[path.replace('/api/dual-campus/','')]} as Response));return{f,r:createTrafficRepository(f)}}
describe('shared typed traffic boundary',()=>{
 it('returns identical cached run object to maps and records without duplicate transport',async()=>{const{r,f}=make(fixture());const a=await loadTrafficBundle(r,'LH','pressure'),b=await loadTrafficBundle(r,'LH','pressure');expect(a.data.run.frames).toBe(b.data.run.frames);expect(f).toHaveBeenCalledTimes(5)})
 it('normalizes SS historical policy without inventing a fixed comparison',async()=>{const{r}=make(fixture('SS'));const a=await loadTrafficBundle(r,'SS','fixed');expect(a.arm).toBe('pressure');expect(a.data.run.policy).toBe('pressure')})
 it('loads both SS policies only when the index binds distinct complete records',async()=>{
  const t=fixture('SS'),base=t.index.campuses.SS
  base.available_runs={fixed:{run_id:'SS_fixed',label:'固定配时',metrics:null},pressure:{run_id:'SS_pressure',label:'压力基线',metrics:null}}
  t['SS/run/fixed']={...t['SS/run'],run_id:'SS_fixed',policy:'fixed'};t['SS/run/pressure']=t['SS/run']
  const{r,f}=make(t),fixed=await loadTrafficBundle(r,'SS','fixed'),pressure=await loadTrafficBundle(r,'SS','pressure')
  expect(fixed.arm).toBe('fixed');expect(fixed.data.run.run_id).toBe('SS_fixed');expect(pressure.data.run.run_id).toBe('SS_pressure')
  expect(fixed.data.run.frames).toBe(pressure.data.run.frames) // fixture shares frame array; real payloads remain separate records
  expect(f.mock.calls.map(x=>x[0])).toContain('/api/dual-campus/SS/run/fixed')
 })
 it('rejects an incomplete SS available-run registration rather than silently loading pressure',async()=>{
  const t=fixture('SS');t.index.campuses.SS.available_runs={pressure:{run_id:'SS_pressure'}}
  await expect(loadTrafficBundle(make(t).r,'SS','fixed')).rejects.toThrow('所选基线')
 })
 it('rejects a successful HTTP payload from another run',async()=>{const t=fixture();t['LH/run'].run_id='foreign';await expect(loadTrafficBundle(make(t).r,'LH','pressure')).rejects.toThrow('不匹配')})
 it('rejects mismatched network and policy separately',async()=>{const t=fixture();t['LH/context'].network_sha256='wrong';await expect(loadTrafficBundle(make(t).r,'LH','pressure')).rejects.toThrow('不匹配');const p=fixture();p['LH/run'].policy='fixed';await expect(loadTrafficBundle(make(p).r,'LH','pressure')).rejects.toThrow('策略')})
 it('requires v2 metadata to preserve unknown veto',async()=>{const t=fixture();t['LH/run'].schema='connected_campus_run_v2';t['LH/run'].metadata_availability={own_pending:true,veto:true};await expect(loadTrafficBundle(make(t).r,'LH','pressure')).rejects.toThrow('可用性')})
 it('can retry invalid 200 JSON after explicit cache invalidation',async()=>{const t=fixture();t['LH/run'].run_id='wrong';const{r,f}=make(t);await expect(loadTrafficBundle(r,'LH','pressure')).rejects.toThrow();t['LH/run']={...t['LH/run'],run_id:'LH_pressure'};r.clearSettled();expect((await loadTrafficBundle(r,'LH','pressure')).data.run.run_id).toBe('LH_pressure');expect(f).toHaveBeenCalledTimes(10)})
})
