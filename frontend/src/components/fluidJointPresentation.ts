import{controlReasons}from'./connectedControlEvidence'
import type{FluidArm}from'./fluidJointTypes'
/** Native joint uses candidate-preference requests, not its displayed physical q pressure. */
export function fluidExecutionLabel(reason:string,arm:FluidArm){return arm==='joint'&&reason==='maximum_shared_lane_pressure'?'执行本步联合候选请求':controlReasons[reason]??reason}
