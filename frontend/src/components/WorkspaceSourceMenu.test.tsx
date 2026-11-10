import{expect,it,vi,afterEach}from'vitest'
import{render,fireEvent,screen,cleanup}from'@testing-library/react'
import{MemoryRouter,useLocation}from'react-router-dom'
import{TrafficSessionProvider,useTrafficSession}from'../state/TrafficSessionContext'
import WorkspaceSourceMenu from'./WorkspaceSourceMenu'
afterEach(cleanup)
const job='9b22fe8289404446b66d26eae107984a'
function Fixture({change}:{change:(next:string)=>void}){
 const session=useTrafficSession(),location=useLocation()
 session.current.lastNativeSource={kind:'native_job',key:'native-job:'+job,jobId:job,prefix:'/api/native-artifacts/'+job+'/',dates:['20250120_video']}
 session.current.fluidSource=session.current.lastNativeSource
 return <><WorkspaceSourceMenu domain="fluid_joint" onChange={change}/><output data-testid="current-url">{location.pathname+location.search}</output></>
}
it('keeps source choices separate from the current policy and only delegates explicit source changes',()=>{
 const change=vi.fn();render(<MemoryRouter initialEntries={['/police?task='+job]}><TrafficSessionProvider><Fixture change={change}/></TrafficSessionProvider></MemoryRouter>)
 expect(screen.getByLabelText('选择数据场景').textContent).toContain('任务 9b22fe82 / 23车')
 fireEvent.click(screen.getByRole('button',{name:/跨日期联合验证/}));expect(change).toHaveBeenCalledWith('fluid_joint')
 fireEvent.click(screen.getByRole('button',{name:/双校区268车基线/}));expect(change).toHaveBeenCalledWith('dual')
 expect(screen.queryByRole('button',{name:'固定配时'})).toBeNull()
})
it('opens the saved task on the current shared-map route, preserving the task namespace',()=>{
 render(<MemoryRouter initialEntries={['/campus']}><TrafficSessionProvider><Fixture change={vi.fn()}/></TrafficSessionProvider></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:/任务车流/}))
 expect(screen.getByTestId('current-url').textContent).toBe('/campus?task='+job)
})
