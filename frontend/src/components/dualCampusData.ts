import type{SceneCommon}from'./ConnectedCampusScene'
import type{ConnectedRun,ConnectedContext,ConnectedPolicy}from'./connectedCampusTypes'
import{baselineEvidence,type BaselineMetrics}from'./LHBaselineComparison'
import type{createTrafficRepository}from'../state/trafficRepository'
export type Region='LH'|'SS'
export type Data={common:SceneCommon;run:ConnectedRun;context:ConnectedContext;gis:{event:{center_epsg4547:number[];radius_m:number};edges:unknown[]};selectionKey?:string}
export type Meta={name:string;run_id:string;network_sha256:string;planned:number;source:string;policy:string;metrics:null|{S_sum_s:number;max_observed_continuous_stop_s:number;source_schedule_entry_wait_s:number};available_runs?:Partial<Record<ConnectedPolicy,{run_id:string;label:string;metrics:BaselineMetrics}>>}
export function validateRegion(region:Region,meta:Meta,data:Data){
 if(data.common.campus!==region||data.context.campus!==region||data.run.run_id!==meta.run_id||data.common.source_hashes.network!==meta.network_sha256||data.context.network_sha256!==meta.network_sha256||!data.run.frames.length||data.common.vehicles.length!==meta.planned)throw Error('校区、网络或运行记录不匹配')
 baselineEvidence(data.common)
 if(data.run.schema==='connected_campus_run_v2'&&(data.run.metadata_availability?.own_pending!==true||data.run.metadata_availability?.veto!==false))throw Error('信号元数据可用性未明确')
 return {...data,run:{...data.run,recorded_signal_timeline:true}}
}

export async function loadTrafficBundle(repository:ReturnType<typeof createTrafficRepository>,region:Region,arm:ConnectedPolicy){
 const index=await repository.get<{campuses:Record<Region,Meta>}>('index'),base=index.campuses?.[region]
 if(!base)throw Error('校区未登记')
 const effective=region==='SS'&&!base.available_runs?'pressure':arm,selected=base.available_runs?.[effective]
 if(base.available_runs&&!selected)throw Error('所选基线尚无完整运行记录')
 const meta=selected?{...base,run_id:selected.run_id,policy:selected.label,metrics:selected.metrics}:base
 const[common,run,context,gis]=await Promise.all([repository.get<SceneCommon>(region+'/common'),repository.get<ConnectedRun>(region+'/run'+(selected?'/'+effective:'')),repository.get<ConnectedContext>(region+'/context'),repository.get<Data['gis']>(region+'/gis')])
 if(run.policy!==effective)throw Error('基线策略与执行记录不一致')
 return{meta,data:validateRegion(region,meta,{common,run,context,gis}),arm:effective}
}
