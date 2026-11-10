import type{NetworkFrame}from'./connectedCampusTypes'
export type MicroMode='natural'|'requested'
export interface MicroManeuver{id:string;start_s:number;center_cross_s:number|null;end_s?:number;from_lane:string;to_lane:string|null;observed_superseded_by_start_s?:number;status?:string}
export interface MicroVehicle{id:string;center:number[];angle:number;speed:number;acceleration:number;lane:string;lateral:number;lateral_speed:number;position:number;stage:'following'|'changing'|'completed'|'unresolved';active_maneuver:MicroManeuver|null;unmatched_start:MicroManeuver|null}
export interface MicroFrame{time:number;vehicles:MicroVehicle[];tls:string}
export interface MicroCase{id:string;case:string;mode:MicroMode;frames:MicroFrame[];audit:{maneuvers:MicroManeuver[];unfinished_maneuvers:MicroManeuver[];services:{id:string;entered_junction_s:number|null;censored:boolean}[];censored_vehicles:string[];requests:{id:string;time_s:number;api_ack:boolean}[];emergency_stops:unknown[];warnings:string[];min_acceleration_mps2:number;initial_insertion_adjustments:unknown[]}}
export interface FixedMicroProgram{junction:string;cycle_s:number;offset_s:number;phases:{duration_s:number;state:string}[];verified_frames:number}
export interface MicroProduct{schema:'micro_recording_product_v1';source_kind:'recorded_simulation';network_sha256:string;source_packet_sha256:string;live_connected:false;real_campus_traffic:false;time_origin:string;timestamp_rule:string;position_source:string;fixed_signal_program:FixedMicroProgram;cases:MicroCase[];additional_fixtures:{case:string;all_entry_deltas_zero:boolean;comparison:unknown[]}[];source_limits:string[];summary:Record<string,unknown>;full_prediction_allowed:false;action_ranking_allowed:false}
export interface MicroSceneFrame extends NetworkFrame{recordedLights:Record<string,string>}
export interface MicroSceneRun{kind:'micro';run_id:string;duration:number;step:number;frames:MicroSceneFrame[];recording:MicroCase;program:FixedMicroProgram}
