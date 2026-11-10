export type CampusID = 'LH' | 'SS'
export type PolicyID = 'static' | 'temporal' | 'regret'
export type PolicePolicy = 'fixed' | 'adaptive'
export type Domain = 'campus' | 'police'
export type XY = [number, number]
export interface GeoFeature { type: 'Feature'; properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } }
export interface FeatureCollection { type: 'FeatureCollection'; features: GeoFeature[] }
export interface Vehicle { id: string; cost: number; depart: number; arrival: number; duration: number; depart_delay: number; changed: boolean; candidate: boolean; event_exposed: boolean; path: XY[][]; source_group: string }
export interface CampusRun { metrics: { mean: number; p95: number; total: number; n: number }; vehicles: Vehicle[]; series: number[][]; actual_changed: number; exposed_count: number; sources: { run: string; routes: string } }
export interface CampusCase { policies: Record<PolicyID, CampusRun>; reference?: CampusRun | null; no_intervention_available: boolean; missing_reason?: string }
export interface Campus { name: string; bbox: [number, number, number, number]; roads: { id: string; name: string; xy: XY[] }[]; points: { xy: XY; kind: string; vehicle: string }[]; event: { name: string; source_centerline_wgs84: XY[]; event_edge: string }; gis: { buffer: GeoFeature['geometry']; teaching_roads: FeatureCollection; neighbor_records: number; records: number }; cases: Record<string, CampusCase> }
export interface CampusPackage { schema: number; protocol: { data_notes: string[]; time_basis: string; policies: Record<PolicyID, string>; campuses: Record<CampusID, { location: string }> }; bundle: { id: string; seed: number; campuses: Record<CampusID, Campus>; limitations: string[] }; context: Record<CampusID, Record<string, FeatureCollection>>; source: { bundle_id: string; bundle_sha256: string } }
export interface Movement { from: string; fromLane: string; to: string; toLane: string; linkIndex: string; dir: string; via: string }
export interface Phase { state: string; duration: number }
export interface Decision { action: 'extend' | 'hold'; executed: boolean; reasons: string[]; observation_time: number; current_pressure: number; rival_pressure: number; phase: number; phase_visit: number; red_max_wait: number; after_next_switch: number; before_next_switch: number }
export interface PoliceFrame { time: number; phase: number; state: string; remaining: number; confirmed_remaining: number; extra_green: number; queued_movements: { lane: string; signal_index: number; count: number; max_wait: number }[]; unknown_queued: string[]; incoming: Record<string, { count: number; halting: number; mean_speed: number }>; outgoing: Record<string, { density: number; halting: number; count: number }>; vehicle_positions: { id: string; xy: XY }[]; decision: Decision; ledger: { planned: number; inserted: number; arrived: number; inflight: number } }
export interface PoliceRun { frames: PoliceFrame[]; decisions: Decision[]; metrics: { completed: number; mean_completed_cost: number; p95_completed_cost: number; total_completed_cost: number; waiting_completed: number }; summary: { valid: boolean; extensions: number; ledger: { planned: number; arrived: number; inflight: number; undeparted: number; abnormal_removed: number } } }
export interface PolicePackage { schema: number; id: string; mode: string; pair_valid: boolean; closed_loop_verified: boolean; total_cost_delta: number | null; limitations: string[]; case: { focus: string; scope: string; begin: number; end: number; junction_xy: XY; lanes: Record<string, { id: string; xy: XY[]; wgs84: XY[] }>; programs: Record<string, { phases: Phase[]; connections: Movement[] }> }; runs: Record<PolicePolicy, PoliceRun> }
export const names: Record<PolicyID, string> = { static: '静态绕行', temporal: '有限时窗', regret: '区间决策' }
export const turnNames: Record<string, string> = { s: '直行', l: '左转', r: '右转', t: '掉头', L: '半左转', R: '半右转' }
export const fmt = (value: number | null | undefined, digits = 1) => value == null ? '—' : value.toFixed(digits)
export const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
export function downloadJSON(name: string, data: unknown) { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1500) }
