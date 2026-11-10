import {MemoryRouter} from 'react-router-dom'
import{TrafficSessionProvider}from'../state/TrafficSessionContext'
import{act,cleanup,fireEvent,render,screen,waitFor}from'@testing-library/react'
import{afterEach,expect,it,vi}from'vitest'
vi.mock('./ConnectedCampusScene',()=>({default:({common,eventOverlay}:any)=><div data-testid="event-scene">{common.campus}:{eventOverlay?.region??'off'}</div>}))
import DualCampusWorkspace from'./DualCampusWorkspace'
import{WorkspaceProvider}from'../state/WorkspaceContext'
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
const event=(r:string)=>({schema:'dual_campus_event_overlay_v1',region:r,run_id:r+'_q',network_sha256:r,id:r+'_event',node:'J',name:r+' event',center:[0,0],radius_m:100,roads:[{id:r+'_road',name:'road',shape:[[0,0],[100,0]],source_id:'x',sdk_intersects:true}],nodes_in_circle:[{id:'J',name:'J',center:[0,0]}],applied_to_run:false,measured_event:false,traffic_effect_verified:false,source:{},notes:[]})
function setup(fail=false,lateLH=false){let resolveLH!:(v:any)=>void
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
  const key=url.replace('/api/dual-campus/','')
  if(key.startsWith('events/')){const r=key.split('/')[1];if(fail)throw Error('event service unavailable');if(r==='LH'&&lateLH)return new Promise(resolve=>{resolveLH=resolve});return{ok:true,json:async()=>event(r)}}
  if(key==='index')return{ok:true,json:async()=>({campuses:Object.fromEntries(['LH','SS'].map(r=>[r,{name:r,run_id:r+'_q',network_sha256:r,planned:1,source:r,policy:'q',metrics:null}]))})}
  const[r,k]=key.split('/');const payload=k==='common'?{campus:r,source_hashes:{network:r},vehicles:[{id:'v',edges:[]}],geometry:{junctions:{},edges:[{id:r+'_road'}],lanes:[]}}:k==='run'?{run_id:r+'_q',policy:'pressure',duration:10,step:.2,frames:[{time:.2,vehicles:[],junctions:{}}]}:k==='context'?{campus:r,network_sha256:r}:{edges:[]}
  return{ok:true,json:async()=>payload}
 }));return{resolveLate:()=>resolveLH({ok:true,json:async()=>event('LH')})}
}
it('event service failure keeps original traffic playback available',async()=>{
 setup(true);render(<MemoryRouter><WorkspaceProvider><TrafficSessionProvider><DualCampusWorkspace/></TrafficSessionProvider></WorkspaceProvider></MemoryRouter>)
 await waitFor(()=>expect(screen.getByTestId('event-scene').textContent).toBe('LH:off'))
 await waitFor(()=>expect(screen.getByText(/原基线回放保留/)).toBeTruthy())
 expect((screen.getByLabelText('叠加100米事件范围') as HTMLInputElement).disabled).toBe(true)
 expect(screen.getByRole('button',{name:'播放'})).toBeTruthy()
})
it('late old-campus event cannot appear on the new campus',async()=>{
 const delayed=setup(false,true);render(<MemoryRouter><WorkspaceProvider><TrafficSessionProvider><DualCampusWorkspace/></TrafficSessionProvider></WorkspaceProvider></MemoryRouter>)
 await waitFor(()=>expect(screen.getByTestId('event-scene').textContent).toBe('LH:off'))
 fireEvent.click(screen.getByRole('button',{name:'嵩山路校区'}))
 await waitFor(()=>expect((screen.getByLabelText('叠加100米事件范围') as HTMLInputElement).disabled).toBe(false))
 fireEvent.click(screen.getByLabelText('叠加100米事件范围'))
 expect(screen.getByTestId('event-scene').textContent).toBe('SS:SS')
 await act(async()=>delayed.resolveLate())
 expect(screen.getByTestId('event-scene').textContent).toBe('SS:SS')
})
