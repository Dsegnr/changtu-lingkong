import{createBoundedJsonRepository}from'./boundedJsonRepository'
const allowed=(p:string)=>p==='index'||/^(LH|SS)\/(common|context|gis|run(?:\/(fixed|pressure))?)$/.test(p)||/^LH\/events\/(fixed|pressure)$/.test(p)||/^events\/(LH|SS)$/.test(p)
export function createTrafficRepository(fetcher?:(path:string)=>Promise<Response>){return createBoundedJsonRepository('/api/dual-campus/',allowed,fetcher)}
