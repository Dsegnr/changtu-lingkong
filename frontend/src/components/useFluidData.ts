import{useEffect,useState}from'react'
import{useFluidSession}from'../state/TrafficSessionContext'
import{loadFluidBundle,type FluidData}from'./fluidJointData'
import type{FluidDate,FluidArm}from'./fluidJointTypes'
export function useFluidData(forceArm?:FluidArm){
 const session=useFluidSession(),[date,setDate]=useState<FluidDate>(session.current.fluid!.date),[arm,setArm]=useState<FluidArm>(forceArm??session.current.fluid!.arm),[data,setData]=useState<FluidData|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0)
 const sourceKey=session.current.fluidSource?.key??'archive',dates=session.current.fluidSource?.dates??['20250525_video','20250526_video']
 useEffect(()=>{let active=true;setData(null);setError('');loadFluidBundle(session.current.fluidRepository!,date,arm).then(value=>{if(active)setData(value)}).catch(e=>{if(active)setError(e instanceof Error?e.message:'联合记录暂不可用')});return()=>{active=false}},[date,arm,retry,session,sourceKey])
 const selectDate=(next:FluidDate)=>{session.current.fluid!.date=next;setDate(next)}
 const selectArm=(next:FluidArm)=>{session.current.fluid!.arm=next;setArm(next)}
 return{session,date,dates,arm,selectDate,selectArm,data:data?.selectionKey===date+':'+arm&&data.sourceKey===sourceKey?data:null,error,reload:()=>{session.current.fluidRepository!.clearSettled();setRetry(n=>n+1)}}
}
