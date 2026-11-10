import {MemoryRouter,Routes,Route} from 'react-router-dom'
import {cleanup,render,screen,fireEvent,waitFor,act} from '@testing-library/react'
import {afterEach,it,expect,vi} from 'vitest'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {TrafficSessionProvider,useTrafficSession} from '../state/TrafficSessionContext'
vi.mock('../components/dualCampusData',async original=>({...await original<typeof import('../components/dualCampusData')>(),loadTrafficBundle:vi.fn()}))
import {loadTrafficBundle} from '../components/dualCampusData'
import EvaluationPage from './EvaluationPage'
const common=JSON.parse(readFileSync(resolve(process.cwd(),'../../outputs/g4_lh_full_product_20261029_01/LH_common.json'),'utf8'))
const bundle=(region='LH')=>({meta:{name:region,planned:268,network_sha256:region},data:{common:region==='LH'?common:{...common,baseline_comparison:undefined},run:{run_id:region+'_pressure',frames:[{time:186,vehicles:[{id:'LH_SinD_104'}]}]}}})
function Probe(){const s=useTrafficSession();return <pre data-testid="bookmark">{JSON.stringify(s.current.bookmarks['LH:pressure'])}</pre>}
function mount(){render(<MemoryRouter initialEntries={['/evaluation']}><TrafficSessionProvider><Routes><Route path="/evaluation" element={<EvaluationPage/>}/><Route path="/police" element={<Probe/>}/></Routes></TrafficSessionProvider></MemoryRouter>)}
afterEach(()=>{cleanup();vi.clearAllMocks()})
it('retains individual harm and binds vehicle navigation to the actual pressure run',async()=>{
 vi.mocked(loadTrafficBundle).mockResolvedValue(bundle() as never);mount()
 await screen.findByText('42,881.2');expect(screen.getByText(/辆受损/).textContent).toContain('47')
 fireEvent.click(screen.getByText('受损车辆明细（47辆）'))
 fireEvent.click(screen.getByRole('button',{name:'定位受损车辆 LH_SinD_104'}))
 const saved=JSON.parse((await screen.findByTestId('bookmark')).textContent!)
 expect(saved).toEqual({run_id:'LH_pressure',time:186,chosen:'LH_SinD_104',focus:null})
})
it('a late other-campus result cannot replace the visible assessment',async()=>{
 let done!:(value:never)=>void
 vi.mocked(loadTrafficBundle).mockImplementationOnce(()=>new Promise(resolve=>{done=resolve})).mockResolvedValue(bundle('SS') as never)
 mount();fireEvent.click(screen.getByRole('button',{name:'嵩山路校区'}))
 await screen.findByText('暂无同批全量固定对照')
 await act(async()=>done(bundle() as never))
 expect(screen.getByText('暂无同批全量固定对照')).toBeTruthy();expect(screen.queryByText('42,881.2')).toBeNull()
})
it('a failed assessment can be retried without changing the comparison domain',async()=>{
 vi.mocked(loadTrafficBundle).mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(bundle() as never)
 mount();await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'重新加载'}))
 await waitFor(()=>expect(screen.getByText('42,881.2')).toBeTruthy());expect(vi.mocked(loadTrafficBundle).mock.calls.every(c=>c[1]==='LH'&&c[2]==='pressure')).toBe(true)
})
