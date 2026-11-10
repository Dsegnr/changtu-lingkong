import { armNames, clock, reasons, stageNames, vetoNames, type JunctionFrame, type Change } from './junctionTypes'
export default function DecisionTrace({ frame, changes, runningWeight }: { frame: JunctionFrame; changes: Change[]; runningWeight: number }) {
  const d=frame.decision,current=d.observation['NESW'.indexOf(d.approach)],primary=d.veto.includes('minimum_green')?'最短绿灯保护':d.veto.includes('fixed_green_duration')?'固定绿灯时长保护':d.veto.includes('decision_interval')?'等待下一个决策时刻':reasons[d.reason]??d.reason,recent=changes.filter(c=>c.time<=frame.time).slice(-3).reverse()
  return <section className="junction-decision"><div className="junction-section-head"><h3>控制依据</h3><span>观测 {clock(frame.action_time)}</span></div>
    <p className="junction-decision-title">{primary}</p>
    <dl className="junction-decision-facts"><div><dt>压力最大进口</dt><dd>{armNames[d.raw_pressure_candidate]}</dd></div><div><dt>实际执行</dt><dd>{stageNames[d.stage]}{d.stage!=='all_red'&&` / ${armNames[d.approach]}`}</dd></div>{d.pending&&<div><dt>锁定切换目标</dt><dd>{armNames[d.pending]}</dd></div>}{d.reason==='effective_running_hold'&&<><div data-hold-request><dt>接近车辆保持请求</dt><dd>{(current.running*runningWeight).toFixed(1)}</dd></div><div><dt>最大车道压力</dt><dd>{Math.max(...d.observation.map(o=>o.pressure)).toFixed(1)}</dd></div></>}</dl>
    {!!d.veto.length&&<div className="junction-veto">{d.veto.map(v=><span key={v}>{vetoNames[v]??v}</span>)}</div>}
    <p className="junction-muted">该观测的动作应用于 {clock(frame.action_time)}—{clock(frame.time)}。车辆显示步后状态。</p>
    <details className="junction-trace-details"><summary>最近信号切换</summary><ol className="junction-trace">{recent.map(c=><li key={c.time}><time>{clock(c.time)}</time><span>{reasons[c.reason]??c.reason}</span></li>)}</ol></details>
  </section>
}

