import{useState}from'react'
import{useNavigate,useLocation}from'react-router-dom'
import{setFluidSource,useTrafficSession}from'../state/TrafficSessionContext'
import DualCampusWorkspace from'./DualCampusWorkspace'
import FluidJointWorkspace from'./FluidJointWorkspace'
import WorkspaceSourceMenu from'./WorkspaceSourceMenu'
export default function ActiveTrafficWorkspace({view}:{view:'overview'|'junction'|'control'}){
 const navigate=useNavigate(),location=useLocation(),session=useTrafficSession(),[domain,setDomain]=useState(session.current.controlDomain??'dual')
 const change=(next:string)=>{setFluidSource(session);session.current.controlDomain=next==='fluid_joint'?'fluid_joint':'dual';session.current.connectedDomain=session.current.controlDomain;setDomain(session.current.controlDomain);navigate(location.pathname,{replace:true})}
 const sourceControls=<WorkspaceSourceMenu domain={domain} onChange={change}/>
 return domain==='fluid_joint'?<FluidJointWorkspace sourceControls={sourceControls} key={session.current.fluidSource?.key??'archive'} view={view} onBaseline={region=>{session.current.region=region;session.current.arm='pressure';change('dual')}}/>:<DualCampusWorkspace sourceControls={sourceControls} view={view}/>
}
