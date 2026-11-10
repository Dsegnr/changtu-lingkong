import{describe,it,expect}from'vitest'
import{signalRecordRows}from'./signalRecordRows'
const action={state:'Grr',stage:'green',approach:'east',pending:null,reason:'hold',observation:[{queue:0}]}
const run=(frames:any[])=>({frames})as any
describe('actual signal change records',()=>{
 it('collapses duplicate samples without calling them new decisions',()=>{expect(signalRecordRows(run([{time:.2,junctions:{A:action}},{time:.4,junctions:{A:{...action,observation:[{queue:2}]}}}]))).toHaveLength(1)})
 it('retains pending, reason and accepted stage changes',()=>{const rows=signalRecordRows(run([{time:.2,junctions:{A:action}},{time:10.2,junctions:{A:{...action,pending:'north',reason:'maximum_shared_lane_pressure'}}},{time:10.4,junctions:{A:{...action,pending:'north',stage:'yellow',state:'yrr'}}}]));expect(rows.map(r=>r.time)).toEqual([.2,10.2,10.4]);expect(rows[1].pending).toBe('north')})
 it('preserves simultaneous per-node receipts without mixing identity',()=>{expect(signalRecordRows(run([{time:2,junctions:{A:action,B:{...action,state:'rGr'}}}])).map(r=>[r.node,r.state])).toEqual([['A','Grr'],['B','rGr']])})
})
