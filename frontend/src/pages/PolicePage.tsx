import{Link,useSearchParams}from'react-router-dom'
import ConnectedCampusWorkspace from '../components/ConnectedCampusWorkspace'
import LegacyPolicePage from './LegacyPolicePage'
import '../campusControl.css'
import {useState} from 'react'
import ScenarioImpactPanel from '../components/ScenarioImpactPanel'
export default function PolicePage(){
 const[params]=useSearchParams(),legacy=params.get('mode')==='legacy'
 const[domain,setDomain]=useState('dual')
 const[scenarioFocus,setScenarioFocus]=useState<{node:string;serial:number}|null>(null)
 return <div className={legacy?'police-legacy-shell':'campus-police-page'}><nav className="police-mode-tabs" aria-label="AI交警数据模式"><Link aria-current={!legacy?'page':undefined} to="/police">校园协同控制</Link><Link aria-current={legacy?'page':undefined} to="/police?mode=legacy">科隆历史基准</Link><Link to="/experiment">双时刻实验回放</Link><span>独立数据域 · 仿真回放</span></nav>{legacy?<LegacyPolicePage/>:<>{domain!=='dual'&&domain!=='fluid_joint'&&<ScenarioImpactPanel onLocate={node=>setScenarioFocus(v=>({node,serial:(v?.serial??0)+1}))}/>}<ConnectedCampusWorkspace view="control" scenarioFocus={scenarioFocus} onDomainChange={setDomain}/></>}</div>
}
