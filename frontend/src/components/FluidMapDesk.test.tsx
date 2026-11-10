import{MemoryRouter}from'react-router-dom'
import{render,screen,fireEvent,cleanup}from'@testing-library/react'
import{afterEach,expect,it,vi}from'vitest'
import{readFileSync}from'node:fs'
import{resolve}from'node:path'
vi.mock('./ConnectedCampusScene',()=>({default:()=> <div data-testid="same-shared-map"/>}))
import MapDeskView from'./MapDeskView'
import FluidPairComparison from'./FluidPairComparison'
import FluidDecisionPanel from'./FluidDecisionPanel'
import type{FluidArm,FluidCommon,FluidRun,FluidAnalysis}from'./fluidJointTypes'
import type{PresentationClock}from'./connectedPresentation'
import type{ConnectedContext}from'./connectedCampusTypes'
const read=(name:string)=>JSON.parse(readFileSync(resolve(process.cwd(),'../../outputs/fluid_joint_product_20261029_01/'+name+'.json'),'utf8'))
const common:FluidCommon=read('20250525_video_common'),run:FluidRun=read('20250525_video_joint'),analysis:FluidAnalysis=read('20250525_video_analysis')
function create(){const onArm=vi.fn(),onSeek=vi.fn(),onVehicle=vi.fn(),frame=run.frames.find(f=>f.time===20)!,clock:{current:PresentationClock}={current:{time:20,stamp:0,speed:2,playing:false}};render(<MemoryRouter><MapDeskView<FluidArm> view="control" region="SS" arm="joint" data={{common,run,context:{}as ConnectedContext,gis:{edges:[]}}} meta={{name:'嵩山路',planned:23,policy:'联合候选',source:'FLUID时序迁移',network_sha256:common.network_sha256}} frame={frame} clock={clock} focus="B" chosen={null} revision={0} detail={false} playing={false} time={20} speed={2} event={null} eventError="" eventOn={false} selectedRoad={null} onRegion={()=>{}} onArm={onArm} onSeek={onSeek} onPlay={()=>{}} onSpeed={()=>{}} onDetail={()=>{}} onFocus={()=>{}} onChoose={()=>{}} onVehicle={onVehicle} onEvent={()=>{}} onRoad={()=>{}} policyOptions={[{value:'q',label:'压力参考 q'},{value:'joint',label:'联合候选 joint'}]} riskLabel="2辆受损 / 最差+13.0秒" comparisonView={locate=><FluidPairComparison common={common} onVehicle={locate}/>} decisionView={<FluidDecisionPanel common={common} analysis={analysis} run={run} frame={frame} arm="joint" time={20} onSeek={onSeek} onJoint={()=>{}}/>}/></MemoryRouter>);return{onArm,onSeek,onVehicle}}
afterEach(cleanup)
it('shows current signal first and reveals conditional model evidence on request',()=>{const{onArm}=create();expect(screen.getByTestId('same-shared-map')).toBeTruthy();expect(screen.getByRole('complementary',{name:'所选对象详情'})).toBeTruthy();expect(screen.queryByRole('region',{name:'联合规划与执行记录'})).toBeNull();expect(screen.queryByRole('button',{name:'固定配时'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'压力参考 q'}));expect(onArm).toHaveBeenCalledWith('q');fireEvent.click(screen.getByRole('button',{name:'联合决策'}));expect(screen.getByRole('region',{name:'联合规划与执行记录'})).toBeTruthy();expect(document.querySelector('.fluid-model-details')?.hasAttribute('open')).toBe(false)})
it('exposes both harmed native vehicles rather than treating modeled regret zero as actual no harm',()=>{create();fireEvent.click(screen.getByRole('button',{name:'2辆受损 / 最差+13.0秒'}));expect(screen.getByRole('region',{name:'联合候选同需求原生对照'})).toBeTruthy();expect(screen.getByRole('heading',{name:'FLUID_20250525_video_75'})).toBeTruthy();expect(screen.getByRole('heading',{name:'FLUID_20250525_video_77'})).toBeTruthy();expect(screen.getByText('+13.0秒')).toBeTruthy()})
it('links the stored request to the actual 25-second target green',()=>{const{onSeek}=create();fireEvent.click(screen.getByRole('button',{name:'联合决策'}));fireEvent.click(screen.getAllByRole('button',{name:'查看25.0秒实际绿灯'})[0]);expect(onSeek).toHaveBeenCalledWith(25,'B')})

it('closes inline comparison when locating a harmed vehicle on the same native arm',()=>{const{onVehicle}=create();fireEvent.click(screen.getByRole('button',{name:'2辆受损 / 最差+13.0秒'}));fireEvent.click(screen.getAllByRole('button',{name:'定位车辆'})[1]);expect(onVehicle).toHaveBeenCalledWith('FLUID_20250525_video_77');expect(screen.queryByRole('region',{name:'方案对照面板'})).toBeNull()})
