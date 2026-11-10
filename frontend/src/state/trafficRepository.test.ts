import{describe,it,expect,vi}from'vitest'
import{createTrafficRepository}from'./trafficRepository'
const ok=(data:unknown)=>({ok:true,json:async()=>data})as Response
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()}
describe('bounded same-origin traffic repository',()=>{
 it('shares a simultaneous request and parsed object across consumers',async()=>{const fetcher=vi.fn(async()=>ok({run_id:'q'})),r=createTrafficRepository(fetcher);const a=r.get('LH/run/pressure'),b=r.get('LH/run/pressure');expect(a).toBe(b);expect(await a).toBe(await r.get('LH/run/pressure'));expect(fetcher).toHaveBeenCalledTimes(1)})
 it('removes a failed entry so explicit retry can recover',async()=>{const f=vi.fn().mockResolvedValueOnce({ok:false,status:503}).mockResolvedValue(ok({a:1})),r=createTrafficRepository(f);await expect(r.get('index')).rejects.toThrow('503');expect(await r.get('index')).toEqual({a:1});expect(f).toHaveBeenCalledTimes(2)})
 it('explicit retry discards settled JSON but not shared inflight work',async()=>{const f=vi.fn(async()=>ok({})),r=createTrafficRepository(f);await r.get('index');r.clearSettled();await r.get('index');expect(f).toHaveBeenCalledTimes(2)})
 it('rejects foreign or arbitrary paths before any request',async()=>{const f=vi.fn(),r=createTrafficRepository(f);for(const path of ['https://example.com','../secret','LH/run/evil','index?key=secret'])await expect(r.get(path)).rejects.toThrow('未授权');expect(f).not.toHaveBeenCalled()})
 it('keeps completed runs bounded and refetches an evicted arm',async()=>{const f=vi.fn(async()=>ok({})),r=createTrafficRepository(f);await r.get('LH/run/fixed');await r.get('LH/run/pressure');await r.get('SS/run');expect(r.stats().cached.filter(p=>p.includes('/run'))).toHaveLength(2);await r.get('LH/run/fixed');expect(f).toHaveBeenCalledTimes(4)})
 it('limits concurrent transports to two while queued callers settle',async()=>{const finish:((r:Response)=>void)[]=[],f=vi.fn(()=>new Promise<Response>(res=>finish.push(res))),r=createTrafficRepository(f);const a=r.get('LH/common'),b=r.get('LH/context'),c=r.get('LH/gis');await flush();expect(f).toHaveBeenCalledTimes(2);expect(r.stats().queued).toBe(1);finish[0](ok({}));await a;await flush();expect(f).toHaveBeenCalledTimes(3);expect(r.stats().active).toBe(2);finish[1](ok({}));finish[2](ok({}));await Promise.all([b,c]);expect(r.stats().active).toBe(0)})
})
