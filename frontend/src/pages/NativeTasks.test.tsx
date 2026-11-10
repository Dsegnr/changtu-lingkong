import{cleanup,fireEvent,render,screen}from'@testing-library/react'
import{MemoryRouter}from'react-router-dom'
import{afterEach,expect,it,vi}from'vitest'
import TasksPage from'./TasksPage'
import{parseJob,type Job,type ReviewResult}from'../data/workflow'
const metrics={S:'100.0',entry_wait:'1.0',duration:'99.0',max_stop:'2.0',arrived:23,pending:0}
const result:ReviewResult={schema:'native_signal_pair_result_v1',kind:'native_signal_pair',scenario:'20250120_video',network_sha256:'ab728b65d9d7238df7d5318181af3343d64e7a8ba5c411be396de17d5af2eca3',metrics:{q:metrics,joint:{...metrics,S:'110.0',duration:'109.0',max_stop:'3.0'}},delta:{S:'10.0',entry_wait:'0.0',duration:'10.0',max_stop:'1.0'},harmed:[{id:'unit_identity',delta_S:'10.0',delta_max_stop:'1.0'}],benefited:0,unchanged:22,frames:{q:10,joint:10},development_checks:{S:false,stop:false},candidate_checks_passed:false,limitations:['unit fixture only'],new_simulation_launches:2,production_admitted:false,unseen_holdout:false}
const job:Job={id:'1'.repeat(32),scenario:'20250120_video',kind:'native_signal_pair',status:'completed',stage:'completed',created:1,updated:2,error:null,result_sha:'2'.repeat(64),result,events:[{sequence:1,time:1,stage:'joint_simulation',detail:{simulation_s:100,arrived:20,in_network:3}},{sequence:2,time:2,stage:'completed',detail:{}}]}
const cap={schema:'offline_workflow_v2',token:'native-unit',max_jobs:8,wall_seconds:45,max_bytes:33554432,single_concurrency:true,automatic_retry:false,new_simulation_launches:0,native_simulation_executor_available:true,native:{scene:'20250120_video',maximum:2,used:0,job_id:null,closed:false,accepting:true,wall_s_per_arm:120,audit_wall_s_per_arm:90},scenarios:[{id:'20250525_video',label:'2025-05-25',cars:23,campus:'SS'}]}
const response=(v:unknown)=>new Response(JSON.stringify(v),{status:200})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('does not accept replay evidence or alias another date as new simulation',()=>{
 expect(parseJob(job)).toBe(job)
 expect(()=>parseJob({...job,result:{...result,new_simulation_launches:0}})).toThrow()
 expect(()=>parseJob({...job,scenario:'20250525_video'})).toThrow()
 expect(()=>parseJob({...job,result:{...result,schema:'offline_review_result_v1'}})).toThrow()
})
it('registers the new January simulation, displays actual sample counters, preserves negative checks',async()=>{
 let started=false;const requests:any[]=[]
 vi.stubGlobal('fetch',vi.fn(async(path:string,init?:RequestInit)=>{if(init?.method==='POST'){requests.push(JSON.parse(init.body as string));started=true;return response({...job,status:'queued',stage:'queued',result:null,result_sha:null,events:[]})}return response(path.endsWith('/session')?cap:path.endsWith('/jobs')?{jobs:started?[job]:[]}:{plans:[]})}))
 render(<MemoryRouter><TasksPage/></MemoryRouter>)
 fireEvent.click(await screen.findByRole('button',{name:'运行配对仿真'}))
 await screen.findByText('新仿真对照结果',{}, {timeout:2500})
 expect(requests).toEqual([{kind:'native_signal_pair',scenario:'20250120_video'}])
 expect(screen.getByText('任务执行完成 · 候选未通过验收')).toBeTruthy()
 expect(screen.queryByText('仿真 100 秒 / 已到达 20 辆 / 在途 3 辆')).toBeNull()
 expect(screen.getByText('全程 +10.0 秒')).toBeTruthy()
 expect(screen.getByRole('button',{name:'本批已登记'}).hasAttribute('disabled')).toBe(true)
 expect(document.body.textContent).not.toContain('100%')
})
it('shows observed samples during execution, without a finished result',async()=>{
 const running={...job,status:'running',stage:'joint_simulation',result:null,result_sha:null}
 vi.stubGlobal('fetch',vi.fn(async(path:string)=>response(path.endsWith('/session')?{...cap,native:{...cap.native,job_id:job.id,accepting:false}}:path.endsWith('/jobs')?{jobs:[running]}:{plans:[]})))
 render(<MemoryRouter><TasksPage/></MemoryRouter>)
 await screen.findByText('仿真 100 秒 / 已到达 20 辆 / 在途 3 辆')
 expect(screen.queryByText('新仿真对照结果')).toBeNull()
})
