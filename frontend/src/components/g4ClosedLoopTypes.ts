import type {NetworkFrame, NetworkVehicle} from './connectedCampusTypes'
export type G4Policy='P'|'G3'|'G4'
export type G4CaseId='H0'|'H60'
export interface G4Metrics {normalized_speed_loss_vehicle_s:number;max_stop_age_s:number;arrived:number;inserted:number;censored:string[];ids:string[];by_vehicle:Record<string,number>;BC:{inflow:number;outflow:number;final:number}}
export interface G4RunInfo {label:string;run_id:string;file:string;sha256:string;frames:number;first_sample:number;duration:number;metrics:G4Metrics}
export interface G4VehicleLedger {id:string;color:string;runs:Record<G4Policy,{speed_loss_s:number;max_stop_age_s:number;delta_vs_P_s:number}>}
export interface G4Decision {time:number;baseline:Record<string,string>;selected:Record<string,string>;changed:boolean;reason:string;receipt_confirmed:boolean;actual_lights:Record<string,string>;tail_guard:{limit_s:number;excluded:unknown[]};model_only_estimates:Record<string,{P_cost:number;selected_cost:number;P_max_stop:number;selected_max_stop:number}>}
export interface G4Case {id:G4CaseId;label:string;identities:string[];runs:Record<G4Policy,G4RunInfo>;vehicles:G4VehicleLedger[];decisions:G4Decision[];comparison:{vs_P:{harmed_ids:string[];benefited_ids:string[]};nonregression_gate:boolean;effective_improvement_gate:boolean}}
export interface G4Product {schema:'g4_closed_loop_product_v1';network_sha256:string;step:number;cases:G4Case[];live_connected:false;real_campus_traffic:false;simulation_control_executed:true;real_device_actions:false;limits:string[]}
export interface G4Frame extends NetworkFrame {vehicles:(NetworkVehicle&{color:string;length:number})[];recordedLights:Record<string,string>;recordedRemaining:Record<string,number|null>}
export interface G4SceneRun {kind:'g4';schema:string;case:G4CaseId;policy:G4Policy;run_id:string;network_sha256:string;step:number;first_sample:number;duration:number;frames:G4Frame[];countdown_online_prediction:false;data_kind:string;real_campus_traffic:false}
