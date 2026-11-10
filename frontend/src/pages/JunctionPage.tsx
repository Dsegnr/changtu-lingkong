import{Link,useSearchParams}from'react-router-dom'
import ConnectedCampusWorkspace from'../components/ConnectedCampusWorkspace'
import ActiveTrafficWorkspace from'../components/ActiveTrafficWorkspace'
export default function JunctionPage(){const[p]=useSearchParams();return p.get('mode')==='research'?<article className="workspace-page"><ConnectedCampusWorkspace/></article>:<div className="campus-police-page"><Link className="traffic-research-link" to="/junction?mode=research">机制研究记录</Link><ActiveTrafficWorkspace view="junction"/></div>}
