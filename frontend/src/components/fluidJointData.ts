import{createBoundedJsonRepository}from'../state/boundedJsonRepository'
import type{ConnectedContext}from'./connectedCampusTypes'
import{fluidDates,fluidNetwork,type FluidSource,type FluidDate,type FluidArm,type FluidIndex,type FluidCommon,type FluidRun,type FluidAnalysis}from'./fluidJointTypes'
export const archiveSource:FluidSource={kind:'archive',key:'archive',prefix:'/api/fluid-joint/',dates:fluidDates}
export const createFluidRepository=(fetcher?:(path:string)=>Promise<Response>,source:FluidSource=archiveSource)=>{
 if(source.kind==='native_job'&&(!/^[a-f0-9]{32}$/.test(source.jobId)||source.prefix!=='/api/native-artifacts/'+source.jobId+'/'||source.key!=='native-job:'+source.jobId))throw Error('任务来源路径不匹配')
 if(!source.dates.length||source.dates.some(d=>!/^\d{8}_video$/.test(d)))throw Error('来源日期未登记')
 const repo=createBoundedJsonRepository(source.prefix,p=>['index','context','gis'].includes(p)||source.dates.some(d=>['common','analysis','run/q','run/joint'].some(s=>p===d+'/'+s)),fetcher)
 return{...repo,source}
}
const fail=():never=>{throw Error('联合控制记录身份或时钟不匹配，请重新加载该日期记录。')}
export function validateFluidBundle(index:FluidIndex,common:FluidCommon,run:FluidRun,analysis:FluidAnalysis,date:FluidDate,arm:FluidArm){
 if(!/^\d{8}_video$/.test(date)||!Object.hasOwn(index.scenarios,date)||!['q','joint'].includes(arm)||index.schema!=='fluid_joint_index_v1'||index.network_sha256!==fluidNetwork||index.production_admitted!==false||index.date_is_unseen_holdout!==false)fail()
 const meta=index.scenarios[date],ids=common.vehicles?.map(v=>v.id)
 if(!meta||meta.scenario!==date||meta.planned!==23||common.schema!=='fluid_joint_common_v1'||common.domain!=='fluid_joint_development'||common.campus!=='SS'||common.scenario!==date||common.cohort_id!==meta.cohort_id||common.network_sha256!==fluidNetwork||common.source_hashes.network!==fluidNetwork||common.production_admitted!==false||common.full_cohort_admitted!==false||common.source_is_local_measured!==false||ids.length!==23||new Set(ids).size!==23)fail()
 const nodes=Object.keys(common.geometry.junctions),idSet=new Set(ids)
 for(const v of common.vehicles){if(v.recording!==date||!v.id.startsWith('FLUID_'+date+'_')||!v.edges.length)fail();for(const a of ['q','joint']as const){const trip=v.runs[a];if(!trip||![trip.cost,trip.entry_wait,trip.duration,trip.arrival,trip.depart,trip.delta].every(Number.isFinite)||Math.abs(trip.cost-trip.entry_wait-trip.duration)>.00001||Math.abs(trip.cost-(trip.arrival-v.depart_s))>.00001)fail()}}
 for(const a of ['q','joint']as const){if(common.runs[a].run_id!==meta.runs[a].run_id||analysis.run_ids[a]!==meta.runs[a].run_id||common.runs[a].arrived!==23)fail()}
 if(run.schema!=='fluid_joint_native_run_v1'||run.policy!==arm||run.scenario!==date||run.cohort_id!==common.cohort_id||run.network_sha256!==fluidNetwork||run.run_id!==meta.runs[arm].run_id||run.first_sample!==0||run.step!==.2||run.duration!==meta.runs[arm].duration||run.planner_future_native_record_used!==false||!run.frames.length)fail()
 run.frames.forEach((f,i)=>{if(Math.abs(f.time-i*.2)>1e-6||Math.abs(f.action_time-f.time)>1e-6||Math.abs(f.api_post_time_s-f.time-.2)>1e-6)fail();if(new Set(f.vehicles.map(v=>v.id)).size!==f.vehicles.length)fail();for(const v of f.vehicles){if(!idSet.has(v.id)||v.center.length!==2||!v.center.every(Number.isFinite)||!Number.isFinite(v.speed))fail()}for(const node of nodes){const a=f.junctions[node];if(!a||a.observation.length!==common.geometry.junctions[node].approaches.length||a.veto!==null||a.metadata_availability?.veto!==false)fail()}})
 if(Math.abs(run.frames.at(-1)!.time-run.duration)>1e-6||analysis.schema!=='fluid_joint_analysis_v1'||analysis.scenario!==date||analysis.cohort_id!==common.cohort_id||analysis.network_sha256!==fluidNetwork||analysis.production_admitted!==false||analysis.same_state_model_reference_is_separate_native_reference!==false||analysis.current_model_is_full_S_predictor!==false)fail()
 for(const plan of analysis.plans.joint){if(!plan.nodes.length||plan.nodes.some(n=>!nodes.includes(n))||plan.selected.length!==plan.nodes.length||plan.same_state_q_suggestion.length!==plan.nodes.length||plan.conditional_regret_is_native_no_harm_guarantee!==false)fail()}
 for(const w of analysis.actual_coordination_windows){if(w.date!==date||!nodes.includes(w.node)||w.this_is_actual_record_not_online_prediction!==true||w.first_actual_target_green_s<w.request_time_s)fail()}
 return{index,common,run,analysis}
}
export async function loadFluidBundle(repository:ReturnType<typeof createFluidRepository>,date:FluidDate,arm:FluidArm){
 const[index,common,run,analysis,context,gis]=await Promise.all([repository.get<FluidIndex>('index'),repository.get<FluidCommon>(date+'/common'),repository.get<FluidRun>(date+'/run/'+arm),repository.get<FluidAnalysis>(date+'/analysis'),repository.get<ConnectedContext>('context'),repository.get<{edges:unknown[]}>('gis')])
 const valid=validateFluidBundle(index,common,run,analysis,date,arm)
 const source=repository.source
 if(source.kind==='native_job'){
  for(const v of [index,common,run,analysis]){const identity=v as unknown as {job_id:string;source_kind:string;source_id:string};if(identity.job_id!==source.jobId||identity.source_kind!=='native_job'||identity.source_id!==source.key)fail()}
  if(Object.keys(index.scenarios).some(d=>!source.dates.includes(d)))fail()
 }else if(index.job_id||index.source_kind||Object.keys(index.scenarios).some(d=>!fluidDates.some(known=>known===d)))fail()
 if(context.campus!=='SS'||context.network_sha256!==fluidNetwork||!Array.isArray(gis.edges))fail()
 return{...valid,context,gis,selectionKey:date+':'+arm,sourceKey:source.key}
}
export type FluidData=Awaited<ReturnType<typeof loadFluidBundle>>
