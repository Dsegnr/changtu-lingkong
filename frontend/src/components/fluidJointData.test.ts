import{fluidExecutionLabel}from'./fluidJointPresentation'
import{controlReasons}from'./connectedControlEvidence'
import{beforeAll,expect,it,vi}from'vitest'
import{readFileSync}from'node:fs'
import{resolve}from'node:path'
import{createFluidRepository,validateFluidBundle}from'./fluidJointData'
import{fluidDates,type FluidIndex,type FluidCommon,type FluidRun,type FluidAnalysis}from'./fluidJointTypes'
import{sceneTiming,sceneVehicles}from'./microRecordingPlayback'
const read=(name:string)=>JSON.parse(readFileSync(resolve(process.cwd(),'../../outputs/fluid_joint_product_20261029_01/'+name+'.json'),'utf8'))
let index:FluidIndex,common:FluidCommon,run:FluidRun,analysis:FluidAnalysis
beforeAll(()=>{index=read('index');common=read(fluidDates[0]+'_common');run=read(fluidDates[0]+'_joint');analysis=read(fluidDates[0]+'_analysis')})
it('binds real q and joint strategies, native clock zero and separate date cohorts',()=>{for(const date of fluidDates)for(const arm of ['q','joint']as const){const result=validateFluidBundle(index,read(date+'_common'),read(date+'_'+arm),read(date+'_analysis'),date,arm);expect(result.run.policy).toBe(arm);expect(result.run.frames[0].time).toBe(0);expect(result.run.frames[0].api_post_time_s).toBe(.2);expect(result.common.vehicles).toHaveLength(23)}})
it('rejects a different date or a renamed native policy',()=>{expect(()=>validateFluidBundle(index,common,run,analysis,fluidDates[1],'joint')).toThrow();expect(()=>validateFluidBundle(index,common,{...run,policy:'pressure'}as unknown as FluidRun,analysis,fluidDates[0],'joint')).toThrow()})
it('rejects shifted presentation, future-record admission and wrong run bindings',()=>{expect(()=>validateFluidBundle(index,common,{...run,first_sample:.2},analysis,fluidDates[0],'joint')).toThrow();expect(()=>validateFluidBundle(index,common,{...run,planner_future_native_record_used:true}as unknown as FluidRun,analysis,fluidDates[0],'joint')).toThrow();expect(()=>validateFluidBundle(index,common,run,{...analysis,run_ids:{...analysis.run_ids,joint:'other'}},fluidDates[0],'joint')).toThrow()})
it('keeps native time zero in shared timing and interpolated map paths',()=>{expect(sceneVehicles(run,0).map(v=>v.id)).toEqual(run.frames[0].vehicles.map(v=>v.id));const j=common.geometry.junctions.B;expect(sceneTiming(run,'B',j.approaches[0].indices[0],0,common.source_hashes.contract)?.light).toBe(run.frames[0].junctions.B.state[j.approaches[0].indices[0]])})
it('never merges native cache namespace or accepts arbitrary routes',async()=>{const fetcher=vi.fn(async(path:string)=>new Response(JSON.stringify({path})));const repository=createFluidRepository(fetcher);await repository.get(fluidDates[0]+'/run/q');await repository.get(fluidDates[0]+'/run/q');expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher).toHaveBeenCalledWith('/api/fluid-joint/'+fluidDates[0]+'/run/q');await expect(repository.get('SS/run/pressure')).rejects.toThrow('未授权');await expect(repository.get('../index')).rejects.toThrow('未授权')})

it('does not call a joint preference request physical pressure in either inspector or records',()=>{expect(fluidExecutionLabel('maximum_shared_lane_pressure','joint')).toBe('执行本步联合候选请求');expect(fluidExecutionLabel('maximum_shared_lane_pressure','q')).toBe(controlReasons.maximum_shared_lane_pressure)})
