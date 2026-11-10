import{createFluidRepository}from'../components/fluidJointData'
import type{FluidDate,FluidArm,FluidSource}from'../components/fluidJointTypes'
import{createTrafficRepository}from'./trafficRepository'
import{createContext,useContext,useRef,type ReactNode,type MutableRefObject}from'react'
import type{ConnectedPolicy}from'../components/connectedCampusTypes'
export type Region='LH'|'SS'
export type Bookmark={run_id?:string;time:number;focus:string|null;chosen:string|null}
export type FluidSession={date:FluidDate;arm:FluidArm;bookmarks:Record<string,Bookmark>}
export type ConnectedViewDomain='dual'|'fluid_joint'|'regional'|'micro'|'receiving'|'g4'
export type Session={controlDomain?:'dual'|'fluid_joint';connectedDomain?:ConnectedViewDomain;fluid?:FluidSession;fluidSessions?:Record<string,FluidSession>;fluidSource?:FluidSource;lastNativeSource?:Extract<FluidSource,{kind:'native_job'}>;fluidRepository?:ReturnType<typeof createFluidRepository>;region:Region;arm:ConnectedPolicy;bookmarks:Record<string,Bookmark>;repository:ReturnType<typeof createTrafficRepository>}
export const runKey=(region:Region,arm:ConnectedPolicy)=>region+':'+arm
export function checkedBookmark(b:Bookmark|undefined,duration:number,junctions:string[],vehicles:string[],runID?:string):Bookmark{if(runID&&b?.run_id!==runID)b=undefined;return{time:b&&Number.isFinite(b.time)?Math.max(.2,Math.min(duration,Math.round(b.time*5)/5)):.2,focus:b?.focus&&junctions.includes(b.focus)?b.focus:null,chosen:b?.chosen&&vehicles.includes(b.chosen)?b.chosen:null}}
const C=createContext<MutableRefObject<Session>|null>(null)
export function TrafficSessionProvider({children}:{children:ReactNode}){const value=useRef<Session>({region:'LH',arm:'pressure',bookmarks:{},repository:createTrafficRepository()});return <C.Provider value={value}>{children}</C.Provider>}
export function useTrafficSession(){const c=useContext(C);if(!c)throw Error('TrafficSessionProvider缺失');return c}

export function useFluidSession(){const session=useTrafficSession();session.current.fluid??={date:session.current.fluidSource?.dates[0]??'20250525_video',arm:'joint',bookmarks:{}};session.current.fluidRepository??=createFluidRepository(undefined,session.current.fluidSource);return session}
export function setFluidSource(session:MutableRefObject<Session>,source?:Extract<FluidSource,{kind:'native_job'}>){
 const key=source?.key??'archive'
 const previousKey=session.current.fluidSource?.key??'archive'
 if(previousKey===key){if(source){session.current.controlDomain='fluid_joint';session.current.connectedDomain='fluid_joint'}return}
 session.current.fluidSessions??={}
 if(session.current.fluid)session.current.fluidSessions[previousKey]=session.current.fluid
 if(source)session.current.lastNativeSource=source
 session.current.fluidSource=source;session.current.fluidRepository=createFluidRepository(undefined,source)
 session.current.fluid=session.current.fluidSessions[key]??{date:source?.dates[0]??'20250525_video',arm:'joint',bookmarks:{}}
 if(source){session.current.controlDomain='fluid_joint';session.current.connectedDomain='fluid_joint'}
}
export function fluidPath(session:MutableRefObject<Session>,path:string){const source=session.current.fluidSource;return source?.kind==='native_job'?path+'?task='+source.jobId:path}
