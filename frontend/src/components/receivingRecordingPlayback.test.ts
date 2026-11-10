import{readFileSync}from'node:fs'
import{resolve}from'node:path'
import{describe,it,expect,vi}from'vitest'
import{validateReceivingProduct,receivingFrameAt,receivingSceneRun,receivingColor,loadReceivingRecording,receivingPhase}from'./receivingRecordingPlayback'
import{sceneVehicles,sceneLight,sceneTiming}from'./microRecordingPlayback'
import type{ReceivingProduct}from'./receivingRecordingTypes'
const p=JSON.parse(readFileSync(resolve(process.cwd(),'../../outputs/react_receiving_integration_20261025_01/receiving_space_product.json'),'utf8'))as ReceivingProduct
const clone=()=>structuredClone(p),hash=p.network_sha256,t2=p.cases[2]
describe('receiving recording independent contract',()=>{
 it('accepts three complete independently sourced traces',()=>expect(validateReceivingProduct(p,hash).cases.length).toBe(3))
 it('rejects wrong geography',()=>expect(()=>validateReceivingProduct(p,'other')).toThrow())
 it('rejects counterfeit real traffic',()=>{const x=clone();(x as any).real_campus_traffic=true;expect(()=>validateReceivingProduct(x,hash)).toThrow()})
 it('rejects shifted timestamps',()=>{const x=clone();x.cases[0].frames[1].time=.1;expect(()=>validateReceivingProduct(x,hash)).toThrow()})
 it('rejects duplicate identities',()=>{const x=clone();x.cases[0].frames[0].vehicles.push(x.cases[0].frames[0].vehicles[0]);expect(()=>validateReceivingProduct(x,hash)).toThrow()})
 it('rejects other domain identities',()=>{const x=clone();x.cases[0].frames[0].vehicles[0].id='ego';expect(()=>validateReceivingProduct(x,hash)).toThrow()})
 it('rejects invented signal',()=>{const x=clone();x.cases[0].frames[0].lights.B='rrrr';expect(()=>validateReceivingProduct(x,hash)).toThrow()})
 it('rejects fabricated clear space on release',()=>{const x=clone();x.cases[2].frames[300].evidence[0].state='space_available';expect(()=>validateReceivingProduct(x,hash)).toThrow()})
 it('rejects fabricated current head',()=>{const x=clone();x.cases[1].frames[100].evidence[0].head_id='target0_2';expect(()=>validateReceivingProduct(x,hash)).toThrow()})
 it('rejects forged entry margin',()=>{const x=clone();x.cases[2].frames[300].evidence[0].entry_margin_m=100;expect(()=>validateReceivingProduct(x,hash)).toThrow()})
 it('rejects changing front-bumper vehicle length',()=>{const x=clone();x.cases[0].frames[0].vehicles[0].length=5;expect(()=>validateReceivingProduct(x,hash)).toThrow()})
 it('rejects fake source hash format',()=>{const x=clone();x.source_packet_sha256='fake';expect(()=>validateReceivingProduct(x,hash)).toThrow()})
 it('keeps no fake D program',()=>{const x=clone();x.programs.D=x.programs.B;expect(()=>validateReceivingProduct(x,hash)).toThrow()})
 it('rejects unknown reason instead of hiding it',()=>{const x=clone();x.cases[2].frames[300].evidence[0].reason='go_now';expect(()=>validateReceivingProduct(x,hash)).toThrow()})
 it('rejects missing frame',()=>{const x=clone();x.cases[0].frames.pop();expect(()=>validateReceivingProduct(x,hash)).toThrow()})
 it('returns API failure without fabricating data',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:503}));await expect(loadReceivingRecording(hash)).rejects.toThrow('503');vi.unstubAllGlobals()})
 it('rejects modified response bytes before JSON validation',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,arrayBuffer:async()=>new TextEncoder().encode('{}').buffer}));await expect(loadReceivingRecording(hash)).rejects.toThrow('签名');vi.unstubAllGlobals()})
})
describe('causal discrete evidence and smooth presentation',()=>{
 const run=receivingSceneRun(t2,p)
 it('starts with three inserted vehicles, not all seven',()=>expect(run.frames[0].vehicles.length).toBe(3))
 it('has no regional queues/actions',()=>expect(run.frames[200].junctions).toEqual({}))
 it('keeps 60.8 evidence unknown until actual next sample',()=>{expect(receivingFrameAt(t2.frames,60.99)!.time).toBe(60.8);expect(receivingFrameAt(t2.frames,60.99)!.evidence[0].state).toBe('unknown');expect(receivingFrameAt(t2.frames,61)!.evidence[0].state).toBe('space_available')})
 it('receiver moving at 60 is not a clearance decision',()=>expect(receivingFrameAt(t2.frames,60)!.evidence[0].reason).toBe('moving_receiver_without_entry_gap'))
 it('does not close neighbor lane in T1',()=>expect(p.cases[1].frames.every(f=>f.evidence[1].state!=='blocked')).toBe(true))
 it('preserves 180 truncation distinct from final sample',()=>{expect(run.duration).toBe(179.8);expect(p.horizon).toBe(180);expect(t2.censored.length).toBe(3)})
 it('interpolates only positions and not evidence',()=>{const a=run.frames[300].vehicles.find(v=>v.id==='blocker')!,b=run.frames[301].vehicles.find(v=>v.id==='blocker')!,mid=sceneVehicles(run,60.1).find(v=>v.id==='blocker')!;expect(mid.center[0]).toBeCloseTo((a.center[0]+b.center[0])/2,7);expect(mid.center[1]).toBeCloseTo((a.center[1]+b.center[1])/2,7)})
 it('provides A B C lights and D unknown',()=>{for(const j of ['A','B','C'])expect(sceneLight(run,run.frames[0],j,0)).toBe(t2.frames[0].lights[j][0]);expect(sceneLight(run,run.frames[0],'D',0)).toBeUndefined();expect(sceneTiming(run,'D',0,61,'')).toBeNull()})
 it('B0 remains red when space appears',()=>{expect(sceneLight(run,run.frames[305],'B',0)).toBe('r');expect(sceneTiming(run,'B',0,61,'')!.label).toContain('阶段余')})
 it('all programs match actual recorded lamps',()=>{for(const c of p.cases)for(const f of c.frames)for(const j of ['A','B','C'])expect(receivingPhase(p.programs[j],f.time).state).toBe(f.lights[j])})
 it('uses stable identity colors',()=>{expect(receivingColor('target0_0')).toBe(receivingColor('target0_2'));expect(receivingColor('target0_0')).not.toBe(receivingColor('blocker'))})
})
