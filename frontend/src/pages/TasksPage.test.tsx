import{cleanup,fireEvent,render,screen,waitFor}from'@testing-library/react'
import{MemoryRouter}from'react-router-dom'
import{afterEach,expect,it,vi}from'vitest'
import TasksPage from'./TasksPage'
import{parseJob,parsePlan,type Job,type ReviewResult}from'../data/workflow'
const metrics={S:'2801.400',entry_wait:'72.600',duration:'2728.800',max_stop:'14.800',arrived:23,pending:0}
const result:ReviewResult={schema:'offline_review_result_v1',kind:'existing_native_pair_review',scenario:'20250525_video',network_sha256:'ab728b65d9d7238df7d5318181af3343d64e7a8ba5c411be396de17d5af2eca3',metrics:{q:metrics,joint:{...metrics,S:'2641.000',duration:'2568.400',max_stop:'13.000'}},delta:{S:'-160.400',entry_wait:'0.000',duration:'-160.400',max_stop:'-1.800'},harmed:[{id:'FLUID_20250525_video_75',delta_S:'13.000',delta_max_stop:'1.800'},{id:'FLUID_20250525_video_77',delta_S:'11.000',delta_max_stop:'4.400'}],benefited:17,unchanged:4,frames:{q:949,joint:879},development_checks:{S:true,stop:true},limitations:['既有执行复核，非新仿真。'],new_simulation_launches:0,production_admitted:false,unseen_holdout:false}
const completed:Job={id:'a'.repeat(32),scenario:'20250525_video',kind:'existing_native_pair_review',status:'completed',stage:'completed',created:1,updated:2,error:null,result_sha:'b'.repeat(64),result,events:[{sequence:1,time:1,stage:'completed',detail:{}}]}
const cap={schema:'offline_workflow_v2',token:'test-token',max_jobs:8,wall_seconds:45,max_bytes:33554432,single_concurrency:true,automatic_retry:false,new_simulation_launches:0,native_simulation_executor_available:false,scenarios:[{id:'20250525_video',label:'2025-05-25',cars:23,campus:'SS'},{id:'20250526_video',label:'2025-05-26',cars:23,campus:'SS'}]}
const plan={id:'c'.repeat(32),created:3,sha256:'d'.repeat(64),document:{schema:'offline_plan_draft_v1',name:'保存的测试方案',job_id:completed.id,scenario:'20250525_video',policy:'joint',run_id:'run-joint',metrics:result.metrics.joint,scope:'offline_review_draft',production_admitted:false,device_commands_emitted:0,limitations:result.limitations}}
function response(v:unknown,status=200){return new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}})}
function show(){render(<MemoryRouter><TasksPage/></MemoryRouter>)}
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('rejects another domain or an unfinished result and production claims',()=>{
 expect(parseJob(completed)).toBe(completed)
 for(const patch of [{scenario:'20250526_video'},{network_sha256:'f'.repeat(64)},{new_simulation_launches:1},{production_admitted:true}])expect(()=>parseJob({...completed,result:{...result,...patch}as ReviewResult})).toThrow()
 expect(()=>parseJob({...completed,status:'running'})).toThrow()
 expect(()=>parsePlan({...plan,document:{...plan.document,device_commands_emitted:1}}as any)).toThrow()
})
it('shows exact losses and saves a bound offline draft, then prevents overwrite',async()=>{
 const calls:{path:string;body:any}[]=[]
 vi.stubGlobal('fetch',vi.fn(async(path:string,init?:RequestInit)=>{if(init?.method==='POST'){calls.push({path,body:JSON.parse(init.body as string)});return response(plan)}return response(path.endsWith('/session')?cap:path.endsWith('/jobs')?{jobs:[completed]}:{plans:[]})}))
 show()
 await screen.findByText('原生结果重算')
 expect(screen.getByText('FLUID_20250525_video_75')).toBeTruthy()
 expect(screen.getByText('全程 +13.0 秒')).toBeTruthy()
 expect(document.querySelector('[data-workflow-metric="delta.S"]')?.textContent).toBe('-160.4')
 fireEvent.change(screen.getByLabelText('方案名称'),{target:{value:'保存的测试方案'}})
 fireEvent.click(screen.getByRole('button',{name:'保存离线方案'}))
 await screen.findByText('保存的测试方案')
 expect(calls,JSON.stringify(calls)).toEqual([{path:'/api/workflow/jobs/'+completed.id+'/plan',body:{name:'保存的测试方案',policy:'joint'}}])
 expect(screen.queryByRole('button',{name:'保存离线方案'})).toBeNull()
 expect(screen.getByRole('button',{name:'导出 JSON'})).toBeTruthy()
})
it('creates the explicit review job and displays observed completion, no made up percent',async()=>{
 let created=false,reads=0
 const calls:any[]=[]
 vi.stubGlobal('fetch',vi.fn(async(path:string,init?:RequestInit)=>{if(init?.method==='POST'){created=true;calls.push({body:JSON.parse(init.body as string),headers:init.headers});return response({...completed,status:'queued',stage:'queued',result:null,result_sha:null,events:[]})}if(path.endsWith('/session'))return response(cap);if(path.endsWith('/plans'))return response({plans:[]});reads++;return response({jobs:created?[completed]:[]})}))
 show();fireEvent.click(await screen.findByRole('button',{name:'开始复核'}))
 await screen.findByText('原生结果重算',{}, {timeout:2000})
 expect(calls[0].body).toEqual({kind:'existing_native_pair_review',scenario:'20250525_video'})
 expect(calls[0].headers['X-Workflow-Token']).toBe('test-token')
 expect(document.body.textContent).not.toContain('100%')
 await new Promise(r=>setTimeout(r,750));expect(reads).toBe(2)
})
it('keeps the idempotency key on ambiguous POST failure',async()=>{
 const keys:string[]=[]
 vi.stubGlobal('fetch',vi.fn(async(path:string,init?:RequestInit)=>{if(init?.method==='POST'){keys.push((init.headers as Record<string,string>)['Idempotency-Key']);if(keys.length===1)throw Error('连接中断');return response(completed)}return response(path.endsWith('/session')?cap:path.endsWith('/jobs')?{jobs:[]}:{plans:[]})}))
 show();fireEvent.click(await screen.findByRole('button',{name:'开始复核'}));await screen.findByText('连接中断')
 fireEvent.click(screen.getByRole('button',{name:'开始复核'}));await screen.findByText('原生结果重算')
 expect(keys.length).toBe(2);expect(keys[0]).toBe(keys[1])
})
it('reloads persisted plans without producing a new job',async()=>{
 const f=vi.fn(async(path:string)=>response(path.endsWith('/session')?cap:path.endsWith('/jobs')?{jobs:[completed]}:{plans:[plan]}));vi.stubGlobal('fetch',f)
 show();await screen.findByText('保存的测试方案');expect(screen.queryByRole('button',{name:'保存离线方案'})).toBeNull();expect(f.mock.calls).toHaveLength(3)
})
it('an interrupted task displays the reason and never silently retries execution',async()=>{
 const j={...completed,status:'interrupted',stage:'interrupted',error:'service_restarted',result:null,result_sha:null}
 const f=vi.fn(async(path:string)=>response(path.endsWith('/session')?cap:path.endsWith('/jobs')?{jobs:[j]}:{plans:[]}));vi.stubGlobal('fetch',f)
 show();await screen.findByText('服务重启中断了任务，未自动续跑。');await new Promise(r=>setTimeout(r,750));expect(f.mock.calls).toHaveLength(3)
})
