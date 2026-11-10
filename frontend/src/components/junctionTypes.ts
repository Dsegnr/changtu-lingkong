export const policies = ['fixed', 'actuated', 'pressure', 'advanced_shared'] as const
export type Policy = typeof policies[number]
export const armNames: Record<string, string> = { N: '北进口', E: '东进口', S: '南进口', W: '西进口' }
export const turnNames: Record<string, string> = { left: '左转', straight: '直行', right: '右转' }
export const stageNames: Record<string, string> = { green: '绿灯放行', yellow: '黄灯过渡', all_red: '全红清空' }
export const reasons: Record<string, string> = { hold: '保持当前相位', fixed_cycle: '固定周期', gap_out: '检测间隙触发切换', detected_hold: '当前进口仍有检测需求', maximum_shared_lane_pressure: '选择最大车道压力', effective_running_hold: '接近车辆请求保持绿灯', red_age_priority: '红龄服务优先', maximum_green: '达到最长绿灯', yellow_clearance: '黄灯过渡锁定', enter_all_red: '进入全红清空', all_red_clearance: '全红过渡锁定', enter_green: '执行目标进口绿灯' }
export const vetoNames: Record<string, string> = { decision_interval: '尚未到10秒决策点', minimum_green: '最短绿灯保护', fixed_green_duration: '固定30秒绿灯', transition_locked: '过渡期间目标锁定' }
export interface JunctionVehicle { id: string; center: number[]; angle: number; length: number; width: number; speed: number; lane: string; next_link: number | null; turn: string }
export interface ApproachObservation { queue: number; running: number; count: number; pressure: number; effective_range_m: number }
export interface JunctionFrame { time: number; action_time: number; state: string; vehicles: JunctionVehicle[]; decision: { approach: string; stage: string; pending: string | null; raw_pressure_candidate: string; requested: string; reason: string; veto: string[]; observation: ApproachObservation[] } }
export interface Geometry { center: number[]; lanes: { id: string; internal: boolean; width: number; shape: number[][] }[]; links: { index: number; approach: string; turn: string; shape: number[][] }[]; heads: { id: string; approach: string; type: string; indices: number[]; position: number[]; angle: number }[]; stop_lines: { approach: string; points: number[][] }[]; arrows: { lane: string; kind: string; angle: number; position: number[] }[]; junction_shape: number[][] }
export interface Metrics { mean_scheduled_cost_s: number; p95_scheduled_cost_s: number; mean_waiting_s: number }
export interface Change { time: number; state: string; reason: string; approach: string }
export interface JunctionRun { schema: string; policy: Policy; run_id: string; step: number; duration: number; frames: JunctionFrame[]; changes: Change[]; metrics: Metrics }
export interface VehicleLedger { id: string; source_id: string; approach: string; turn: string; turn_synthetic: boolean; depart_s: number; runs: Record<Policy, { cost_s: number; delta_s: number; entry_s: number; arrival_s: number; waiting_s: number; depart_s: number }> }
export interface JunctionComparison { schema: string; domain: string; geometry: Geometry; runs: Record<Policy, { label: string; run_id: string; duration: number; metrics: Metrics; paired: { benefited: number; harmed: number; unchanged: number; worst_harm_s: number } | null; arrived: number; planned: number }>; vehicles: VehicleLedger[]; source_hashes: Record<string, string>; config: { running_weight: number }; evidence: { car_count: number; source_turn_preserved: number; synthetic_turn_count: number } }
export const lightColor = (s: string) => s === 'G' ? '#19b98a' : s === 'y' ? '#f6be48' : '#ef7068'
export const clock = (t: number) => `${Math.floor(t / 60).toString().padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`
