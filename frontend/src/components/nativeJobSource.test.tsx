import{afterEach,expect,it,vi}from'vitest'
import{readFileSync}from'node:fs'
import{resolve}from'node:path'
import{render,screen,waitFor,cleanup}from'@testing-library/react'
import{MemoryRouter}from'react-router-dom'
import{registeredJobSource,default as EvidenceSourceGate}from'./EvidenceSourceGate'
import{createFluidRepository,loadFluidBundle}from'./fluidJointData'
import{TrafficSessionProvider,setFluidSource,fluidPath,type Session}from'../state/TrafficSessionContext'
import{createTrafficRepository}from'../state/trafficRepository'
const job='9b22fe8289404446b66d26eae107984a',date='20250120_video'
const product=resolve(process.cwd(),'../../outputs/native_job_product_20261029_01')
const binding=JSON.parse(readFileSync(resolve(product,'transport_bindings.json'),'utf8'))
const read=(file:string)=>JSON.parse(readFileSync(['context','gis'].includes(file)?binding[file].raw_path:resolve(product,file+'.json'),'utf8'))
const index=read('index'),source=registeredJobSource(job,index)
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('requires registered native job, original network, date and nonproduction identity',()=>{
 expect(source.key).toBe('native-job:'+job);expect(source.dates).toEqual([date])
 for(const patch of [{job_id:'0'.repeat(32)},{network_sha256:'other'},{source_kind:'archive'},{source_id:'archive'},{production_admitted:true},{date_is_unseen_holdout:true},{scenarios:{[date]:{...index.scenarios[date],planned:268}}}])expect(()=>registeredJobSource(job,{...index,...patch})).toThrow()
})
it('loads January native records through an independent namespace and refuses May aliases',async()=>{
 const files:Record<string,string>={index:'index',context:'context',gis:'gis',[date+'/common']:date+'_common',[date+'/analysis']:date+'_analysis',[date+'/run/q']:date+'_q',[date+'/run/joint']:date+'_joint'}
 const fetcher=vi.fn(async(path:string)=>new Response(JSON.stringify(read(files[path.replace(source.prefix,'')]))))
 const repo=createFluidRepository(fetcher,source),data=await loadFluidBundle(repo,date,'joint')
 expect(data.sourceKey).toBe(source.key);expect(data.run.run_id).toMatch(/^NATIVE_JOB_SS_20250120/)
 expect(data.analysis.actual_coordination_windows.map(w=>w.first_actual_target_green_s)).toEqual([65,75])
 expect(fetcher.mock.calls.every(([p])=>p.startsWith(source.prefix))).toBe(true)
 await expect(repo.get('20250525_video/run/q')).rejects.toThrow('未授权')
 await expect(repo.get('../index')).rejects.toThrow('未授权')
 const alias=createFluidRepository(async(path:string)=>{const v=read(files[path.replace(source.prefix,'')]);return new Response(JSON.stringify({...v,job_id:'0'.repeat(32)}))},source)
 await expect(loadFluidBundle(alias,date,'q')).rejects.toThrow('身份')
})
it('preserves separate source bookmarks and task paths on round trips',()=>{
 const session={current:{region:'SS',arm:'pressure',bookmarks:{},repository:createTrafficRepository(),fluid:{date:'20250525_video',arm:'q',bookmarks:{'20250525_video:q':{time:32,focus:'C',chosen:null}}}} as Session}
 const archive=session.current.fluid
 setFluidSource(session,source);expect(session.current.fluid?.date).toBe(date)
 session.current.fluid!.bookmarks[date+':joint']={time:65,focus:'B',chosen:null}
 expect(fluidPath(session,'/decisions')).toBe('/decisions?task='+job)
 setFluidSource(session);expect(session.current.fluid).toBe(archive)
 expect(fluidPath(session,'/police')).toBe('/police')
 setFluidSource(session,source);expect(session.current.fluid?.bookmarks[date+':joint'].time).toBe(65)
 expect(session.current.connectedDomain).toBe('fluid_joint')
})
it('does not mount a fallback map for an unregistered job',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}',{status:404})))
 render(<MemoryRouter initialEntries={['/police?task='+job]}><TrafficSessionProvider><EvidenceSourceGate><div>map-content</div></EvidenceSourceGate></TrafficSessionProvider></MemoryRouter>)
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('没有载入其他任务替代'))
 expect(screen.queryByText('map-content')).toBeNull()
})
it('waits for native identity before mounting a deep-linked shared view',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(index))))
 render(<MemoryRouter initialEntries={['/evaluation?task='+job]}><TrafficSessionProvider><EvidenceSourceGate><div>registered-map</div></EvidenceSourceGate></TrafficSessionProvider></MemoryRouter>)
 await waitFor(()=>expect(screen.getByText('registered-map')).toBeTruthy())
 expect(screen.queryByRole('alert')).toBeNull()
})
