import{describe,it,expect}from'vitest'
import{point,sample,type Lane,type Evidence}from'./twoEpoch'
describe('原生回放时钟与源道路几何',()=>{
 it('沿折线行驶，不跨弯直线插值',()=>{const l={length:20,points:[[0,0],[10,0],[10,10]]}as Lane;expect(point(l,15)).toEqual({x:10,y:5,angle:90})})
 it('以源长度映射形状长度',()=>expect(point({length:100,points:[[0,0],[20,0]]}as Lane,50).x).toBe(10))
 it('20秒使用20秒前沿灯态与20秒已观测车辆',()=>{const d={replay:{frames:Array.from({length:201},(_,i)=>({time_s:i/5})),phases:Array.from({length:200},(_,i)=>({applied_at_s:i/5}))}}as Evidence;expect(sample(d,20).frame.time_s).toBe(20);expect(sample(d,20).phase.applied_at_s).toBe(20);expect(sample(d,40).phase.applied_at_s).toBe(39.8)})
})
