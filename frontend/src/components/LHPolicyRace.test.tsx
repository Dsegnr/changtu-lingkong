import {MemoryRouter} from 'react-router-dom'
import{TrafficSessionProvider}from'../state/TrafficSessionContext'
import{act,cleanup,fireEvent,render,screen,waitFor}from'@testing-library/react'
import{afterEach,expect,it,vi}from'vitest'
vi.mock('./ConnectedCampusScene',()=>({default:({run}:any)=><div data-testid="selected-run">{run.run_id}</div>}))
import DualCampusWorkspace,{loadErrorMessage}from'./DualCampusWorkspace'
import{WorkspaceProvider}from'../state/WorkspaceContext'
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('network failure has actionable wording without implementation jargon',()=>{expect(loadErrorMessage(new TypeError('Failed to fetch'))).toBe('交通记录未能加载，请检查本地服务后重试。');expect(loadErrorMessage(new Error('基线策略与执行记录不一致'))).toBe('基线策略与执行记录不一致')})
it('late fixed replay cannot overwrite a newer pressure selection',async()=>{
 let done!:(x:any)=>void
 const meta={name:'LH',planned:1,network_sha256:'LH',run_id:'pressure',source:'source',policy:'q',metrics:null,available_runs:{fixed:{run_id:'fixed',label:'固定',metrics:null},pressure:{run_id:'pressure',label:'压力',metrics:null}}}
 const run=(arm:string)=>({schema:'connected_campus_run_v2',run_id:arm,policy:arm,step:.2,duration:1,metadata_availability:{own_pending:true,veto:false},frames:[{time:.2,vehicles:[],junctions:{}}]})
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{const key=url.replace('/api/dual-campus/','');if(key==='index')return{ok:true,json:async()=>({campuses:{LH:meta}})};if(key==='LH/run/fixed')return new Promise(resolve=>{done=resolve});const value=key==='LH/common'?{campus:'LH',source_hashes:{network:'LH'},vehicles:[{id:'v',edges:[]}],geometry:{junctions:{},edges:[],lanes:[]}}:key==='LH/run/pressure'?run('pressure'):key==='LH/context'?{campus:'LH',network_sha256:'LH'}:{edges:[]};return{ok:true,json:async()=>value}}))
 render(<MemoryRouter><WorkspaceProvider><TrafficSessionProvider><DualCampusWorkspace/></TrafficSessionProvider></WorkspaceProvider></MemoryRouter>);await waitFor(()=>expect(screen.getByTestId('selected-run').textContent).toBe('pressure'))
 fireEvent.click(screen.getByRole('button',{name:'固定配时'}));await waitFor(()=>expect(done).toBeTypeOf('function'));expect(screen.queryByTestId('selected-run')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'压力基线'}));await waitFor(()=>expect(screen.getByTestId('selected-run').textContent).toBe('pressure'))
 await act(async()=>done({ok:true,json:async()=>run('fixed')}));expect(screen.getByTestId('selected-run').textContent).toBe('pressure')
})
