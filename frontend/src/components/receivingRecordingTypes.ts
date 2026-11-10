import type{NetworkFrame}from'./connectedCampusTypes'
export type ReceivingState='blocked'|'space_available'|'unknown'
export interface ReceivingEvidence{movement:string;source_lane:string;target_lane:string;head_id:string|null;state:ReceivingState;reason:string;opportunity:boolean;receiver_id:string|null;entry_margin_m:number|null;blocked_history_s:number;internal_occupants:string[];signal_permission_inferred:false}
export interface ReceivingVehicle{id:string;center:number[];angle:number;speed:number;acceleration:number;position:number;lane:string;length:number}
export interface ReceivingFrame{time:number;lights:Record<string,string>;vehicles:ReceivingVehicle[];evidence:ReceivingEvidence[];unsupported_head_count:number}
export interface ReceivingProgram{cycle_s:number;offset_s:number;phases:{duration_s:number;state:string}[]}
export interface ReceivingCase{id:'T0'|'T1'|'T2';frames:ReceivingFrame[];events:{label:string;time:number|null}[];censored:string[];arrived:number;receives:number[];raw_sha256:string;shadow_sha256:string}
export interface ReceivingProduct{schema:'receiving_space_product_v1';network_sha256:string;source_kind:'recorded_engineering_simulation';live_connected:false;real_campus_traffic:false;control_actions_executed:false;step:number;last_sample:number;horizon:number;identities:string[];programs:Record<string,ReceivingProgram>;cases:ReceivingCase[];source_packet_sha256:string;shadow_verification_sha256:string;position_reference:string;source_limits:string[]}
export interface ReceivingSceneRun{kind:'receiving';run_id:string;duration:number;step:number;frames:(NetworkFrame&{recordedLights:Record<string,string>})[];programs:Record<string,ReceivingProgram>}
