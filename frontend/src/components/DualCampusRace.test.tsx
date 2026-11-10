import {MemoryRouter} from 'react-router-dom'
import{TrafficSessionProvider}from'../state/TrafficSessionContext'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
vi.mock('./ConnectedCampusScene',()=>({default:({common}:any)=><div data-testid="dual-map-region">{common.campus}</div>}))
import DualCampusWorkspace from './DualCampusWorkspace'
import {WorkspaceProvider} from '../state/WorkspaceContext'
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('rejects late other-campus response after switching back while loading',async()=>{
 let resolveSS!:(value:any)=>void
 const index={campuses:Object.fromEntries(['LH','SS'].map(r=>[r,{name:r,run_id:r+'_q',network_sha256:r,planned:1,source:r,policy:'q',metrics:null}]))}
 const payload=(region:string,kind:string)=>kind==='common'?{campus:region,source_hashes:{network:region},vehicles:[{id:region+'_1',edges:[]}],geometry:{junctions:{}}}:kind==='run'?{run_id:region+'_q',policy:'pressure',step:.2,duration:1,frames:[{time:.2,vehicles:[],junctions:{}}]}:kind==='context'?{campus:region,network_sha256:region}: {edges:[]}
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
  const key=url.replace('/api/dual-campus/','');if(key==='index')return{ok:true,json:async()=>index}
  const[region,kind]=key.split('/')
  if(region==='SS'&&kind==='run')return new Promise(resolve=>{resolveSS=resolve})
  return{ok:true,json:async()=>payload(region,kind)}
 }))
 render(<MemoryRouter><WorkspaceProvider><TrafficSessionProvider><DualCampusWorkspace/></TrafficSessionProvider></WorkspaceProvider></MemoryRouter>)
 await waitFor(()=>expect(screen.getByTestId('dual-map-region').textContent).toBe('LH'))
 fireEvent.click(screen.getByRole('button',{name:'嵩山路校区'}))
 await waitFor(()=>expect(resolveSS).toBeTypeOf('function'))
 expect(screen.queryByTestId('dual-map-region')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'莲花街校区'}))
 await waitFor(()=>expect(screen.getByTestId('dual-map-region').textContent).toBe('LH'))
 await act(async()=>resolveSS({ok:true,json:async()=>payload('SS','run')}))
 expect(screen.getByTestId('dual-map-region').textContent).toBe('LH')
 expect(screen.getByRole('button',{name:'播放'})).toBeTruthy()
})

