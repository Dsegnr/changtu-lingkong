import type{ConnectedCommon,ConnectedContext,ConnectedPolicy,ConnectedRun,NetworkFrame,ConnectedBasemap}from './connectedCampusTypes'
let commonPromise:Promise<ConnectedCommon>|null=null
const runs=new Map<ConnectedPolicy,Promise<ConnectedRun>>()
let contextPromise:Promise<ConnectedContext>|null=null
let basemapPromise:Promise<ConnectedBasemap>|null=null
async function get<T>(url:string):Promise<T>{const r=await fetch(url);if(!r.ok)throw new Error(`连通数据服务 ${r.status}`);return r.json()}
export function connectedCommon(){if(!commonPromise)commonPromise=get<ConnectedCommon>('/api/connected-campus').catch(e=>{commonPromise=null;throw e});return commonPromise}
export function connectedContext(){if(!contextPromise)contextPromise=get<ConnectedContext>('/api/connected-context').catch(e=>{contextPromise=null;throw e});return contextPromise}
export function connectedBasemap(){if(!basemapPromise)basemapPromise=get<ConnectedBasemap>('/api/connected-basemap').catch(e=>{basemapPromise=null;throw e});return basemapPromise}
export function connectedRun(policy:ConnectedPolicy){if(!runs.has(policy))runs.set(policy,get<ConnectedRun>('/api/connected-campus/'+policy).catch(e=>{runs.delete(policy);throw e}));return runs.get(policy)!}
export function networkFrameAt(frames:NetworkFrame[],time:number){if(!frames.length||time<frames[0].time-1e-7)return undefined;let a=0,b=frames.length-1;while(a<b){const m=Math.ceil((a+b)/2);if(frames[m].time<=time+1e-7)a=m;else b=m-1}return frames[a]}
