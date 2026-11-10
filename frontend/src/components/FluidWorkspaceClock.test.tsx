import{useEffect}from'react'
import{render,screen,fireEvent,waitFor,cleanup}from'@testing-library/react'
import{afterEach,expect,it,vi}from'vitest'
import{readFileSync}from'node:fs'
import{resolve}from'node:path'
import{TrafficSessionProvider}from'../state/TrafficSessionContext'
const probe=vi.hoisted(()=>({latest:null as any,dispatch:vi.fn()}))
vi.mock('../state/WorkspaceContext',()=>({useWorkspace:()=>({dispatch:probe.dispatch})}))
vi.mock('./MapDeskView',()=>({default:(props:any)=>{useEffect(()=>{probe.latest=props});return <div><output data-testid="display-time">{props.time}</output><button onClick={()=>props.onSeek(25)}>定位25秒</button>{props.contextControls}</div>}}))
import FluidJointWorkspace from'./FluidJointWorkspace'
import{fluidNetwork}from'./fluidJointTypes'
const read=(name:string)=>JSON.parse(readFileSync(resolve(process.cwd(),'../../outputs/fluid_joint_product_20261029_01/'+name+'.json'),'utf8'))
afterEach(()=>{cleanup();vi.unstubAllGlobals();probe.latest=null})
it('restores the same paused vehicle and signal clock after moving to another date',async()=>{
 vi.stubGlobal('fetch',vi.fn(async(path:string)=>{const tail=path.replace('/api/fluid-joint/','');let payload:unknown;if(tail==='context')payload={campus:'SS',network_sha256:fluidNetwork,features:[]};else if(tail==='gis')payload={edges:[]};else if(tail==='index')payload=read('index');else{const[date,kind,arm]=tail.split('/');payload=read(date+'_'+(kind==='run'?arm:kind))}return new Response(JSON.stringify(payload))}))
 render(<TrafficSessionProvider><FluidJointWorkspace onBaseline={()=>{}}/></TrafficSessionProvider>)
 await waitFor(()=>expect(probe.latest?.data.run.scenario).toBe('20250525_video'))
 fireEvent.click(screen.getByRole('button',{name:'定位25秒'}))
 await waitFor(()=>expect(screen.getByTestId('display-time').textContent).toBe('25'))
 expect(probe.latest.clock.current.time).toBe(25)
 fireEvent.change(screen.getByRole('combobox',{name:'联合需求日期'}),{target:{value:'20250526_video'}})
 await waitFor(()=>expect(probe.latest?.data.run.scenario).toBe('20250526_video'))
 await waitFor(()=>expect(screen.getByTestId('display-time').textContent).toBe('20'))
 expect(probe.latest.clock.current.time).toBe(20)
 expect(probe.latest.frame.time).toBe(20)
})
