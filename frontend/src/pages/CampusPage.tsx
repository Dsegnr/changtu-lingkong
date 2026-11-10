import{Link,useSearchParams}from'react-router-dom'
import ActiveTrafficWorkspace from'../components/ActiveTrafficWorkspace'
import ClassicCampusPage from'./ClassicCampusPage'
export default function CampusPage(){const[p]=useSearchParams();return p.get('mode')==='legacy'?<ClassicCampusPage/>:<div className="campus-police-page"><ActiveTrafficWorkspace view="overview"/></div>}
