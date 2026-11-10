import {currentQueue} from './corridorPhaseRecords'
import{layoutMapLabels}from'./mapdeskLabelLayout'
import type{FrozenSpatialEvent}from'./dualCampusEvents'
import type{G4SceneRun}from'./g4ClosedLoopTypes'
import{g4Color}from'./g4ClosedLoopPlayback'
import type{ReceivingSceneRun}from'./receivingRecordingTypes'
import{receivingColor}from'./receivingRecordingPlayback'
import{useEffect,useRef,useState,type RefObject}from'react'
import{presentationTime,type PresentationClock}from'./connectedPresentation'
import{networkFrameAt}from'./connectedCampusPlayback'
import{recordedPhaseRemaining}from'./connectedSignalTiming'
import{controlStages}from'./connectedControlEvidence'
import type{ConnectedCommon,ConnectedContext,NetworkFrame,ConnectedBasemap,BasemapMode,ConnectedRun,NetworkVehicle}from'./connectedCampusTypes'
import{screenImageTransform,imageContains}from'./connectedBasemapMath'
import type{MicroSceneRun}from'./microRecordingTypes'
import{sceneVehicles,sceneLight,sceneTiming,isMicroRun,isReceivingRun,isRecordedRun,isG4Run}from'./microRecordingPlayback'
declare const ol:any
const colors:Record<string,string>={left:'#ac9be9',straight:'#58b9e7',right:'#e5b75d',unknown:'#91a5b3'}
export type SceneCommon=Pick<ConnectedCommon,'geometry'|'source_hashes'|'campus'>&{vehicles:{id:string;edges:string[]}[]}
const signal=(s?:string)=>!s?'#91a3ad':s.toLowerCase()==='g'?'#1aad83':s==='y'?'#efba4f':'#ed726b'
export default function ConnectedCampusScene(props:{closedLane?:string|null;compactLabels?:boolean;eventOverlay?:FrozenSpatialEvent;selectedEventRoad?:string|null;common:SceneCommon;context:ConnectedContext;basemap:ConnectedBasemap|null;basemapMode:BasemapMode;laneDetail:boolean;viewRevision:number;viewExtent?:number[];run:ConnectedRun<string>|MicroSceneRun|ReceivingSceneRun|G4SceneRun;clock:RefObject<PresentationClock>;frame:NetworkFrame;focus:string|null;chosen:string|null;follow:boolean;onJunction:(id:string|null)=>void;onVehicle:(id:string)=>void;onFollowEnd:()=>void}){
 const host=useRef<HTMLDivElement>(null),scene=useRef<any>(null),latest=useRef(props);latest.current=props
 const[error,setError]=useState(''),mapBuilds=useRef(0)
 const[baseStatus,setBaseStatus]=useState(''),[covered,setCovered]=useState(false),[sourceImage,setSourceImage]=useState<string|null>(null)
 useEffect(()=>{
  const target=host.current;if(!target)return
  let map:any,observer:ResizeObserver|undefined
  const c=props.common,g=c.geometry
  try{
   const projection=new ol.proj.Projection({code:'CAMPUS_TM_LOCAL',units:'m'}),background=new ol.source.Vector(),roads=new ol.source.Vector(),polygons=new ol.source.Vector(),borders=new ol.source.Vector(),details=new ol.source.Vector(),route=new ol.source.Vector(),labels=new ol.source.Vector()
   const line=(xy:number[][],data:object)=>new ol.Feature({geometry:new ol.geom.LineString(xy),...data})
   const named=new Map<string,any>()
   g.references.forEach(r=>{const f=line(r.shape,{name:r.name});background.addFeature(f);if(r.name&&(!named.has(r.name)||f.getGeometry().getLength()>named.get(r.name).getGeometry().getLength()))named.set(r.name,f)})
   named.forEach((f,name)=>labels.addFeature(new ol.Feature({geometry:new ol.geom.Point(f.getGeometry().getCoordinateAt(.5)),name})))
   g.lanes.filter(l=>!l.internal).forEach(l=>{roads.addFeature(line(l.shape,{width:l.width}));l.borders.forEach((b,side)=>borders.addFeature(line(b,{median:side===1&&l.index===l.lane_count-1,dashed:side===1&&l.index<l.lane_count-1||side===0&&l.index>0})))})
   Object.values(g.junctions).forEach(j=>{
    polygons.addFeature(new ol.Feature({geometry:new ol.geom.Polygon([[...j.polygon,j.polygon[0]]])}))
    j.stop_lines.forEach(s=>details.addFeature(line(s.points,{kind:'stop'})))
    j.links.forEach(l=>details.addFeature(line(l.shape,{kind:'link',junction:j.id,index:l.index})))
    j.heads.forEach(h=>details.addFeature(new ol.Feature({geometry:new ol.geom.Point(h.position),kind:'head',junction:j.id,head:h})))
    j.arrows.forEach(a=>{const local:number[][][]=[];if(a.turns.includes('straight'))local.push([[0,2],[0,-2]],[[-.6,-1.3],[0,-2],[.6,-1.3]]);if(a.turns.includes('left'))local.push([[0,2],[0,-1],[-1.3,-1]],[[-.6,-1.7],[-1.3,-1],[-.6,-.3]]);if(a.turns.includes('right'))local.push([[0,2],[0,-1],[1.3,-1]],[[.6,-1.7],[1.3,-1],[.6,-.3]]);const rad=a.angle*Math.PI/180;local.forEach(part=>details.addFeature(line(part.map(([x,y])=>[a.position[0]+x*Math.cos(rad)-y*Math.sin(rad),a.position[1]-x*Math.sin(rad)-y*Math.cos(rad)]),{kind:'arrow'})))})
   })
   const layers=[new ol.layer.Vector({updateWhileInteracting:true,updateWhileAnimating:true,renderBuffer:160,source:background,style:new ol.style.Style({stroke:new ol.style.Stroke({color:'#cbd8df',width:1.2})})}),new ol.layer.Vector({updateWhileInteracting:true,updateWhileAnimating:true,renderBuffer:160,source:polygons,style:new ol.style.Style({fill:new ol.style.Fill({color:'#405460'})})}),
    new ol.layer.Vector({updateWhileInteracting:true,updateWhileAnimating:true,renderBuffer:160,source:roads,style:(f:any,res:number)=>new ol.style.Style({stroke:new ol.style.Stroke({color:'#405460',width:Math.max(2.5,f.get('width')/res)})})}),
    new ol.layer.Vector({updateWhileInteracting:true,updateWhileAnimating:true,renderBuffer:160,source:borders,style:(f:any,res:number)=>res>.7?null:new ol.style.Style({stroke:new ol.style.Stroke({color:f.get('median')?'#d6b168':'#edf4f5',width:Math.max(.6,.11/res),lineDash:f.get('dashed')?[1.4/res,1.5/res]:undefined})})}),
    new ol.layer.Vector({updateWhileInteracting:true,updateWhileAnimating:true,renderBuffer:160,source:route,style:new ol.style.Style({stroke:new ol.style.Stroke({color:'#d98e34',width:3,lineDash:[7,5]})})}),
    new ol.layer.Vector({updateWhileInteracting:true,updateWhileAnimating:true,renderBuffer:160,source:labels,declutter:true,style:()=>new ol.style.Style({text:new ol.style.Text({text:'',font:'12px "Microsoft YaHei",sans-serif'})})}),
    new ol.layer.Vector({updateWhileInteracting:true,updateWhileAnimating:true,renderBuffer:160,source:details,style:(f:any,res:number)=>{
     if(res>1)return null
     const kind=f.get('kind');if(kind==='head'){const h=f.get('head'),state=sceneLight(latest.current.run,scene.current?.presentedFrame??latest.current.frame,f.get('junction'),h.indices[0]),arrow=h.type==='arrow_left'?'M22 14H6 M12 7L5 14L12 21':h.type==='arrow_right'?'M6 14H22 M16 7L23 14L16 21':'M14 22V6 M7 12L14 5L21 12';const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><rect x="1" y="1" width="26" height="26" rx="4" fill="#163747" stroke="white"/>${h.type==='circle'?`<circle cx="14" cy="14" r="8" fill="${signal(state)}"/>`:`<path d="${arrow}" fill="none" stroke="${signal(state)}" stroke-width="4"/>`}</svg>`;return new ol.style.Style({image:new ol.style.Icon({src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),scale:Math.max(.45,Math.min(1,2.7/res/28)),rotation:h.angle*Math.PI/180})})}
     const state=sceneLight(latest.current.run,scene.current?.presentedFrame??latest.current.frame,f.get('junction'),f.get('index'));return new ol.style.Style({stroke:new ol.style.Stroke({color:kind==='link'?(state?signal(state):'#a2b9c4'):'#fff',width:kind==='stop'?Math.max(1,.4/res):kind==='arrow'?Math.max(1,.24/res):Math.max(.5,.15/res),lineDash:kind==='link'?[.6/res,.8/res]:undefined}),zIndex:kind==='link'?0:1})
    }})]
   const roadLabels=layers[5],referenceRoads=layers[0]
   roadLabels.setStyle((f:any)=>new ol.style.Style({text:new ol.style.Text({text:f.get('name'),font:'12px "Microsoft YaHei",sans-serif',fill:new ol.style.Fill({color:'#668294'}),stroke:new ol.style.Stroke({color:'#f3f7f9',width:3}),overflow:true})}))
   const staticSource=new ol.source.Vector({features:new ol.format.GeoJSON().readFeatures({type:'FeatureCollection',features:props.context.features},{dataProjection:projection,featureProjection:projection})})
   const areas=new ol.layer.Vector({updateWhileInteracting:true,updateWhileAnimating:true,renderBuffer:160,source:staticSource,style:(f:any,res:number)=>{
    const kind=f.get('kind');if(kind==='poi')return null
    const fills:Record<string,string>={building:'#d4dfe5',green:'#deeadb',education:'#ebe7db',water:'#c7e2ec',landuse:'#e7edeb'}
    const strokes:Record<string,string>={building:'#b8cad4',green:'#c3d7bd',education:'#d6cfbc',water:'#afcfde',landuse:'#d8e2de'}
    const building=kind==='building';return new ol.style.Style({fill:new ol.style.Fill({color:fills[kind]??'#e7edeb'}),stroke:new ol.style.Stroke({color:strokes[kind]??'#d8e2de',width:building?Math.min(1.2,.18/res):.8})})
   }})
   const places=new ol.layer.Vector({updateWhileInteracting:true,updateWhileAnimating:true,renderBuffer:160,source:staticSource,declutter:true,style:(f:any,res:number)=>{
    const kind=f.get('kind'),name=f.get('name'),geometry=f.getGeometry();if(!name||kind==='education'&&name.includes('河南工业大学')||kind==='building'&&res>1||kind==='landuse'||kind==='water'&&geometry.getType()!=='Point')return null
    const point=geometry.getType()==='Point'?geometry:geometry.getType()==='Polygon'?geometry.getInteriorPoint():geometry.getType()==='MultiPolygon'?geometry.getInteriorPoints():null
    if(!point)return null
    const education=kind==='education';return new ol.style.Style({geometry:point,image:kind==='poi'?new ol.style.Circle({radius:2.5,fill:new ol.style.Fill({color:'#6a95ab'}),stroke:new ol.style.Stroke({color:'#fff',width:1})}):undefined,text:new ol.style.Text({text:name,font:(education?'12':'10')+'px "Microsoft YaHei",sans-serif',offsetY:kind==='poi'?-9:0,fill:new ol.style.Fill({color:education?'#8b8066':'#7c919e'}),stroke:new ol.style.Stroke({color:'#f6fafbdd',width:3}),overflow:false})})
   }})
   const campusNames=new ol.layer.Vector({source:staticSource,declutter:false,style:(f:any)=>{
    const name=f.get('name')||'',geometry=f.getGeometry();if(f.get('kind')!=='education'||!name.includes('河南工业大学'))return null
    const point=geometry.getType()==='Polygon'?geometry.getInteriorPoint():geometry.getType()==='Point'?geometry:null;if(!point)return null
    return new ol.style.Style({geometry:point,text:new ol.style.Text({text:name,offsetY:-28,font:'bold 13px "Microsoft YaHei",sans-serif',fill:new ol.style.Fill({color:'#256b88'}),stroke:new ol.style.Stroke({color:'#ffffff',width:4}),overflow:true}),zIndex:20})
   }})
   layers.unshift(areas);layers.splice(6,0,places);layers.push(campusNames)
   map=new ol.Map({target:host.current,layers,view:new ol.View({projection,center:[0,0],resolution:2,maxResolution:10,minResolution:.06})})
   const eventSource=new ol.source.Vector(),eventLayer=new ol.layer.Vector({source:eventSource,updateWhileInteracting:true,updateWhileAnimating:true,renderBuffer:160,style:(f:any)=>f.get('eventKind')==='range'?new ol.style.Style({stroke:new ol.style.Stroke({color:'#c98525',width:2,lineDash:[8,5]}),fill:new ol.style.Fill({color:'#f4c16a22'})}):new ol.style.Style({stroke:new ol.style.Stroke({color:f.get('selected')?'#865bc4':'#d98d25',width:f.get('selected')?6:3}),zIndex:f.get('selected')?3:2})});map.addLayer(eventLayer)
   map.addControl(new ol.control.ScaleLine({units:'metric'}))
   const overlays:any[]=[]
   Object.values(g.junctions).forEach(j=>{const button=document.createElement('button');button.type='button';button.className='connected-map-junction';button.setAttribute('aria-label','放大路口 '+j.id+' '+j.name);button.onclick=()=>latest.current.onJunction(j.id);const overlay=new ol.Overlay({element:button,position:j.center,positioning:'bottom-left',offset:[12,-12],stopEvent:true});map.addOverlay(overlay);overlays.push({button,j,overlay})})
   const timers:any[]=[]
   Object.values(g.junctions).filter(j=>j.control==='signal_scenario').forEach(j=>j.approaches.forEach(a=>{
    const heads=j.heads.filter(h=>h.indices.some(i=>a.indices.includes(i)));if(!heads.length)return
    const position=[0,1].map(i=>heads.reduce((n,h)=>n+h.position[i],0)/heads.length),dx=position[0]-j.center[0],dy=position[1]-j.center[1],distance=Math.hypot(dx,dy)||1
    const badge=document.createElement('div');badge.className='connected-signal-time';badge.setAttribute('aria-label',j.id+' '+a.label+' 灯组时间');badge.dataset.junction=j.id
    map.addOverlay(new ol.Overlay({element:badge,position,positioning:'center-center',offset:[dx/distance*37,-dy/distance*37],stopEvent:false}));timers.push({badge,junction:j.id,index:a.indices[0],label:a.label})
   }))
   const graphics=Object.values(g.junctions).map(j=>{const graphic=new ol.Graphic(new ol.geom.Point(j.center),{junction:j.id});graphic.setStyle(new ol.style.Circle({radius:4,fill:new ol.style.Fill({color:'#fff'}),stroke:new ol.style.Stroke({color:'#2489bd',width:2})}));return graphic})
   const graphicSource=new ol.source.Graphic({graphics,render:'canvas',map});map.addLayer(new ol.layer.Image({source:graphicSource}))
   scene.current={map,eventSource,route,details,overlays,timers,roadLabels,referenceRoads,places,extent:g.extent};target.dataset.gisGraphics=String(graphics.length);target.dataset.contextFeatures=String(staticSource.getFeatures().length);target.dataset.mapBuilds=String(++mapBuilds.current)
   map.on('singleclick',(e:any)=>{
    const resolution=map.getView().getResolution();let closest:NetworkVehicle|undefined,distance=Infinity
    for(const v of scene.current?.displayed??[]){const pixel=map.getPixelFromCoordinate(v.center),d=Math.hypot(pixel[0]-e.pixel[0],pixel[1]-e.pixel[1]);if(d<Math.max(8,4.5/resolution/2+4)&&d<distance){closest=v;distance=d}}
    if(closest)latest.current.onVehicle(closest.id)
   })
   map.on('pointerdrag',()=>latest.current.onFollowEnd())
   const vehicleCanvas=document.createElement('canvas');vehicleCanvas.setAttribute('aria-hidden','true');vehicleCanvas.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:0';map.getViewport().appendChild(vehicleCanvas)
   const ctx=vehicleCanvas.getContext('2d')!;let animation=0,dirty=true,lastTime=-1,lastChosen:string|null=null,lastFrame:NetworkFrame|null=null,lastRun:ConnectedRun<string>|MicroSceneRun|ReceivingSceneRun|G4SceneRun|null=null,drawCount=0,lastTimerKey='',lastEvent:FrozenSpatialEvent|undefined
   target.dataset.renderer='independent-canvas-interpolated'
   const invalidate=()=>{dirty=true};map.on('postrender',invalidate)
   const draw=(now:number)=>{
    if(!scene.current)return
    const value=latest.current,size=map.getSize(),time=presentationTime(value.clock.current,now,value.run.duration)
    if(size&&(dirty||time!==lastTime||value.chosen!==lastChosen||value.frame!==lastFrame||value.run!==lastRun||value.eventOverlay!==lastEvent)){
     dirty=false;lastTime=time;lastChosen=value.chosen;lastFrame=value.frame;lastRun=value.run;lastEvent=value.eventOverlay;const dpr=Math.min(window.devicePixelRatio||1,2),w=Math.round(size[0]*dpr),h=Math.round(size[1]*dpr)
     if(vehicleCanvas.width!==w||vehicleCanvas.height!==h){vehicleCanvas.width=w;vehicleCanvas.height=h;vehicleCanvas.style.width=size[0]+'px';vehicleCanvas.style.height=size[1]+'px'}
     ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,size[0],size[1]);const vehicles=value.clock.current.playing?sceneVehicles(value.run,time):value.frame.vehicles
     scene.current.displayed=vehicles
     const observed=value.clock.current.playing?networkFrameAt(value.run.frames,time)??value.frame:value.frame;scene.current.presentedFrame=observed
     const signature=value.run.run_id+':'+Object.keys(g.junctions).map(id=>sceneLight(value.run,observed,id,0)===undefined?'unrecorded':isRecordedRun(value.run)?(observed as any).recordedLights?.[id]:observed.junctions[id]?.state).join('|');if(signature!==scene.current.signalSignature){scene.current.signalSignature=signature;scene.current.details.changed();target.dataset.signalRevisions=String((Number(target.dataset.signalRevisions)||0)+1)}
     target.dataset.recordingDomain=isG4Run(value.run)?'g4':isReceivingRun(value.run)?'receiving':isMicroRun(value.run)?'micro':'regional'
     target.dataset.presentationSignalTime=String(observed.time)
     const resolution=map.getView().getResolution(),rotation=map.getView().getRotation()
     const timerKey=[Math.floor(time*5+1e-7),value.run.run_id,resolution<=.9,size[0]<450].join('|')
     if(timerKey!==lastTimerKey){lastTimerKey=timerKey;timers.forEach(({badge,junction,index,label}:any)=>{
      const timing=sceneTiming(value.run,junction,index,time,value.common.source_hashes.contract);badge.style.display=resolution<=.9&&timing?'block':'none'
      if(timing){if(badge.textContent!==timing.label)badge.textContent=timing.label;badge.dataset.signal=timing.light;badge.dataset.kind=timing.kind;badge.title=isG4Run(value.run)?label+' · 完整离线记录的下一次实际灯组转换余量，非在线预测':label+' · '+(('recorded_signal_timeline' in value.run&&value.run.recorded_signal_timeline)?'完整离线记录的下一灯色变化余量，非在线预测':(timing.kind==='remaining'?'已确认阶段剩余时间':'本灯色已持续时间，非转绿倒计时'))}
     })
      overlays.forEach(({button,j,overlay}:any)=>{
       if(isG4Run(value.run)){const a=observed.junctions[j.id],timing=sceneTiming(value.run,j.id,j.approaches[0]?.indices[0]??0,time,value.common.source_hashes.contract);button.textContent=j.id+' '+j.name+'\n'+(a?(controlStages[a.stage]??a.stage)+' · '+(timing?.label??'未记录'):'让行参照 · 未记录灯态');button.title=button.textContent;button.dataset.stage=a?.stage??'priority';button.dataset.time=String(observed.time);return}
       if(isRecordedRun(value.run)){const recorded=isReceivingRun(value.run)?!!value.run.programs[j.id]:j.id==='C';button.textContent=j.id+' '+j.name+'\n'+(recorded?'固定信号 · 已记录':'本片段未记录信号');button.title=button.textContent;button.dataset.stage=recorded?'recorded':'unrecorded';button.dataset.time=String(observed.time);return}
       const a=observed.junctions[j.id],index=j.approaches.find((p:any)=>p.id===a.approach)?.indices[0]??0
       const timing=sceneTiming(value.run,j.id,index,time,value.common.source_hashes.contract),queue=(value.compactLabels||value.run.schema==='connected_campus_run_v2')?currentQueue(observed,[j]):a.observation.reduce((n:number,o:any)=>n+o.queue,0)
       const phaseRemaining=recordedPhaseRemaining(value.run as ConnectedRun<string>,j.id,time),phaseLabel=phaseRemaining===null?'':('回放阶段余'+Math.ceil(phaseRemaining-1e-7)+'s')
       const compact=size[0]<450||value.compactLabels
       button.textContent=size[0]<450?j.id+(phaseRemaining===null?'':' · 余'+Math.ceil(phaseRemaining-1e-7)+'s')+'\n排队 '+queue:compact?j.id+' · '+(phaseLabel||timing?.label||'让行')+'\n排队 '+queue:j.id+' '+j.name+'\n'+(controlStages[a.stage]??a.stage)+(phaseLabel?' · '+phaseLabel:timing?' · '+timing.label:'')+' · 排队 '+queue
       button.title=j.name+' · '+(controlStages[a.stage]??a.stage)+' · 排队 '+queue
       button.dataset.stage=a.stage;button.dataset.time=String(observed.time);button.dataset.queue=String(queue)
      })
     }

     // Keep visible-node summaries inside the viewport while dragging a paused map.
     if(value.compactLabels){
      const anchors=overlays.flatMap(({button,j}:any)=>{const p=map.getPixelFromCoordinate(j.center);return p&&p[0]>=0&&p[0]<=size[0]&&p[1]>=0&&p[1]<=size[1]?[{id:j.id,x:p[0],y:p[1],width:button.offsetWidth,height:button.offsetHeight}]:[]})
      for(const placed of layoutMapLabels(anchors,size[0],size[1])){const item=overlays.find(v=>v.j.id===placed.id),old=item.overlay.getOffset();if(Math.abs(old[0]-placed.offset[0])>.1||Math.abs(old[1]-placed.offset[1])>.1)item.overlay.setOffset(placed.offset)}
     }else{overlays.forEach(({button,j,overlay}:any)=>{const pixel=map.getPixelFromCoordinate(j.center);if(pixel&&pixel[0]>=0&&pixel[0]<=size[0]){const x=Math.max(8-pixel[0],Math.min(12,size[0]-8-pixel[0]-button.offsetWidth));if(Math.abs(overlay.getOffset()[0]-x)>.1)overlay.setOffset([x,-12])}})}

     for(const v of vehicles){const pixel=map.getPixelFromCoordinate(v.center);if(!pixel||pixel[0]<-40||pixel[1]<-40||pixel[0]>size[0]+40||pixel[1]>size[1]+40)continue
      const chosen=value.chosen===v.id,micro=isMicroRun(value.run),receiving=isReceivingRun(value.run),g4=isG4Run(value.run),recorded=micro||receiving||g4,len=Math.max(recorded?8:6,(receiving||g4?4.6:micro?5:4.5)/resolution),width=Math.max(recorded?4.5:3,1.8/resolution),rear=recorded?0:-len/2
      ctx.save();ctx.translate(pixel[0],pixel[1]);ctx.rotate(v.angle*Math.PI/180-rotation);ctx.fillStyle=g4?g4Color(v.id):receiving?receivingColor(v.id):micro?(v.id==='ego'?'#e5b34e':'#58b9e7'):chosen?'#e59036':colors[v.turn]??colors.straight;ctx.strokeStyle=chosen?'#fff0ba':'#d9edf5';ctx.lineWidth=chosen?(width<6?1.2:2):1;ctx.fillRect(-width/2,rear,width,len);ctx.strokeRect(-width/2,rear,width,len);ctx.restore()
      if(value.eventOverlay&&Math.hypot(v.center[0]-value.eventOverlay.center[0],v.center[1]-value.eventOverlay.center[1])<=value.eventOverlay.radius_m){ctx.beginPath();ctx.arc(pixel[0],pixel[1],Math.max(5,width+2),0,Math.PI*2);ctx.strokeStyle='#bd731b';ctx.lineWidth=1.5;ctx.stroke()}
      if(recorded&&resolution<.9){ctx.font='11px "Microsoft YaHei",sans-serif';ctx.lineWidth=3;ctx.strokeStyle='#f7fbfd';ctx.strokeText(v.id,pixel[0]+7,pixel[1]-5);ctx.fillStyle='#25546c';ctx.fillText(v.id,pixel[0]+7,pixel[1]-5)}
     }
     if(value.follow&&value.chosen){const v=vehicles.find(v=>v.id===value.chosen);if(v)map.getView().setCenter(v.center)}
     target.dataset.presentationTime=String(time);target.dataset.presentationDraws=String(++drawCount)
     // Only diagnostic coordinates at presentation cadence; no React state or vector invalidation.
     target.dataset.presentationVehicles=JSON.stringify(vehicles.map(v=>({id:v.id,center:v.center,lane:v.lane})))
    }
    animation=requestAnimationFrame(draw)
   };animation=requestAnimationFrame(draw)
   scene.current.disposeVehicles=()=>{cancelAnimationFrame(animation);map.un('postrender',invalidate);vehicleCanvas.remove()}
   const apply=()=>{const currentSize=map?.getSize();if(!currentSize||latest.current.common!==c)return;const value=latest.current,view=map.getView();view.cancelAnimations();map.updateSize();const narrow=map.getSize()[0]<450;if(value.viewExtent){view.fit(value.viewExtent,{padding:[25,25,25,25],duration:0})}else if(value.focus){const j=g.junctions[value.focus];view.fit([j.center[0]-(latest.current.laneDetail?52:150),j.center[1]-(latest.current.laneDetail?52:150),j.center[0]+(latest.current.laneDetail?52:150),j.center[1]+(latest.current.laneDetail?52:150)],{padding:narrow?[18,18,18,18]:[38,38,38,38],duration:0})}else view.fit(g.extent,{padding:narrow?[35,25,35,25]:[75,90,75,90],duration:0})}
   observer=new ResizeObserver(apply);observer.observe(host.current!);scene.current.initialViewFrame=requestAnimationFrame(apply)
   map.on('moveend',()=>{const res=map.getView().getResolution();overlays.forEach(({button}:any)=>button.style.display=res<.8?'none':'block');target.dataset.resolution=String(res);target.dataset.viewCenter=JSON.stringify(map.getView().getCenter())})
  }catch(e){setError(String(e))}
  return()=>{observer?.disconnect();if(scene.current?.initialViewFrame)cancelAnimationFrame(scene.current.initialViewFrame);scene.current?.disposeVehicles?.();scene.current?.reference?.dispose?.();if(map){for(const listener of [...(map.getListeners('change:size')||[])])map.un('change:size',listener);map.setTarget(undefined);map.dispose()}scene.current=null}
 },[props.common,props.context])
 useEffect(()=>{
  const s=scene.current,b=props.basemap,target=host.current;if(!s||!b||!target)return
  let disposed=false
  const resources=b.images.map(def=>({def,image:new Image(),loaded:false,failed:false})),canvas=document.createElement('canvas'),container=document.createElement('div')
  container.className='ol-layer connected-geographic-layer';container.style.cssText='position:absolute;inset:0;pointer-events:none';container.appendChild(canvas)
  let version=0,lastKey='',draws=0
  const layer=new ol.layer.Layer({render:(frame:any)=>{
   if(disposed||!host.current)return container
   const ratio=Math.min(frame.pixelRatio,2),size=frame.size,view=frame.viewState,key=[...size,ratio,...view.center,view.resolution,view.rotation,version].join('|')
   container.style.opacity=String(Math.min(.95,Math.max(.16,(view.resolution-.15)/.45)))
   if(key!==lastKey){
    lastKey=key;const width=Math.round(size[0]*ratio),height=Math.round(size[1]*ratio)
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;canvas.style.width=size[0]+'px';canvas.style.height=size[1]+'px'}
    const context=canvas.getContext('2d')!;context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,width,height)
    for(const r of resources){if(!r.loaded)continue;context.setTransform(...screenImageTransform(r.def.image_to_local,frame.coordinateToPixelTransform,ratio));context.drawImage(r.image,0,0)}
    context.setTransform(1,0,0,1,0,0);target.dataset.basemapDraws=String(++draws)
   }
   target.dataset.basemapCamera=JSON.stringify(view.center);target.dataset.basemapRenderer='current-frame-canvas';return container
  }})
  layer.setVisible(latest.current.basemapMode==='amap');s.map.getLayers().insertAt(1,layer);s.reference={layer,resources}
  const update=()=>{
   if(disposed)return
   const center=s.map.getView().getCenter(),active=latest.current.basemapMode==='amap'
   const matching=resources.find(r=>r.loaded&&imageContains(r.def,center)),has=!!matching,failed=resources.filter(r=>r.failed).length,pending=resources.filter(r=>!r.loaded&&!r.failed).length
   layer.setVisible(active);s.roadLabels.setVisible(!active||!has);s.places.setVisible(!active||!has);s.referenceRoads.setVisible(!active||!has)
   setCovered(has);setSourceImage(matching?.def.url??null);setBaseStatus(pending?'地理底图载入中':failed?'部分底图载入失败，保留离线环境':has?'已归档地理底图':'当前视野超出已归档图幅')
   target.dataset.basemap=active?'amap':'offline';target.dataset.basemapLoaded=String(resources.filter(r=>r.loaded).length);target.dataset.basemapCovered=String(has)
   s.map.render()
  }
  s.reference.update=update
  resources.forEach(r=>{r.image.onload=()=>{r.loaded=true;version++;update()};r.image.onerror=()=>{r.failed=true;version++;update()};r.image.src=r.def.url})
  s.map.getView().on('change:center',update);s.map.getView().on('change:resolution',update);update()
  const dispose=()=>{if(disposed)return;disposed=true;resources.forEach(r=>{r.image.onload=null;r.image.onerror=null});s.map.getView().un('change:center',update);s.map.getView().un('change:resolution',update);s.map.removeLayer(layer);layer.dispose();container.remove();s.reference=null}
  s.reference.dispose=dispose
  return dispose
 },[props.common,props.context,props.basemap])
 useEffect(()=>{scene.current?.reference?.update()},[props.basemapMode,props.focus])
 useEffect(()=>{const s=scene.current,target=host.current;if(!s||!target)return;
  s.overlays.forEach(({button,j}:any)=>{button.dataset.junction=j.id;button.classList.toggle('selected',props.focus===j.id)})
  target.dataset.frameTime=String(props.frame.time);target.dataset.vehicleCount=String(props.frame.vehicles.length)
  target.dataset.renderedVehicles=JSON.stringify(props.frame.vehicles.map(v=>({id:v.id,center:v.center,lane:v.lane})))
 },[props.frame,props.chosen,props.follow,props.focus])
 useEffect(()=>{const s=scene.current,target=host.current;if(!s||!target)return;target.dataset.closedEntryLane=props.closedLane??'';const lane=props.common.geometry.lanes.find(l=>l.id===props.closedLane);if(!lane)return;const source=new ol.source.Vector({features:[new ol.Feature({geometry:new ol.geom.LineString(lane.shape)})]}),layer=new ol.layer.Vector({source,zIndex:25,style:new ol.style.Style({stroke:new ol.style.Stroke({color:'#bd5144',width:4,lineDash:[7,4]})})});s.map.addLayer(layer);return()=>{s.map.removeLayer(layer);source.clear()}},[props.closedLane,props.common])
 useEffect(()=>{const s=scene.current,target=host.current;if(!s||!target)return;s.eventSource.clear();const e=props.eventOverlay
  target.dataset.eventOverlay=e?.id??'';target.dataset.eventRoads=e?e.roads.map(r=>r.id).join(','):''
  if(!e)return
  s.eventSource.addFeature(new ol.Feature({geometry:new ol.geom.Circle(e.center,e.radius_m),eventKind:'range'}))
  for(const road of e.roads)s.eventSource.addFeature(new ol.Feature({geometry:new ol.geom.LineString(road.shape),eventKind:'road',selected:props.selectedEventRoad===road.id}))
 },[props.eventOverlay,props.selectedEventRoad,props.common])
 useEffect(()=>{const s=scene.current;if(s&&props.follow)s.map.getView().setResolution(.28)},[props.follow])
 useEffect(()=>{const s=scene.current;if(!s)return;const view=s.map.getView(),narrow=s.map.getSize()[0]<450;view.cancelAnimations();if(props.viewExtent){view.fit(props.viewExtent,{padding:[25,25,25,25],duration:0})}else if(props.focus){const j=props.common.geometry.junctions[props.focus];view.fit([j.center[0]-(latest.current.laneDetail?52:150),j.center[1]-(latest.current.laneDetail?52:150),j.center[0]+(latest.current.laneDetail?52:150),j.center[1]+(latest.current.laneDetail?52:150)],{padding:narrow?[18,18,18,18]:[30,30,30,30],duration:0})}else view.fit(s.extent,{padding:narrow?[35,25,35,25]:[75,90,75,90],duration:0})},[props.focus,props.common,props.laneDetail,props.viewRevision,props.viewExtent])
 useEffect(()=>{const s=scene.current;if(!s)return;s.route.clear();if(props.chosen){const record=props.common.vehicles.find(v=>v.id===props.chosen);record?.edges.forEach(id=>{const edge=props.common.geometry.edges.find(e=>e.id===id),lane=props.common.geometry.lanes.find(l=>l.id===edge?.lanes[0]);if(lane)s.route.addFeature(new ol.Feature({geometry:new ol.geom.LineString(lane.shape)}))})}},[props.chosen,props.common])
 return <div className="connected-canvas-wrap">{error&&<p role="alert">{error}</p>}<div ref={host} className="connected-canvas" role="region" aria-label={isG4Run(props.run)?"多路口联合控制闭环记录地图":isReceivingRun(props.run)?"B至C接收与恢复记录地图":isMicroRun(props.run)?"B至C换道跟驰记录地图":(props.common.campus==='LH'?'莲花街校区三路口连通交通地图':'嵩山路校区四路口连通交通地图')} data-focus={props.focus??'network'}/>{props.basemapMode==='amap'&&props.basemap&&<><div className={'connected-basemap-status '+(!covered?'uncovered':'')}><span>{baseStatus}</span><small>深色道路：仿真车道</small></div><div className="connected-basemap-attribution">{props.basemap.attribution} · 获取于 {props.basemap.capture_date}{sourceImage&&<a href={sourceImage} target="_blank" rel="noreferrer">查看原图</a>}</div></>}<div className="connected-map-legend" title={('recorded_signal_timeline' in props.run&&props.run.recorded_signal_timeline)?'车色：蓝直行、黄右转、紫左转、灰无后续运动记录；橙为选中。路口摘要为回放阶段剩余，灯旁为该灯下一次变化余量，均非在线预测。':isG4Run(props.run)?"车色按身份固定；倒计时仅用于完整仿真记录复盘，非在线预测。":isReceivingRun(props.run)?"车色按车队身份固定；空间证据与灯态独立。":isMicroRun(props.run)?"车色按身份固定；灰灯表示本片段未录制。阶段余量不是红灯转绿倒计时。":"车色表示当前路段转向意图；橙色为选中车辆。已为持续时间，余为确认阶段剩余。"}>{isG4Run(props.run)?<><span><i style={{background:g4Color("blocker")}}/>入口观测车</span><span><i style={{background:g4Color("target0_0")}}/>车队A</span><span><i style={{background:g4Color("target1_0")}}/>车队B</span></>:isReceivingRun(props.run)?<><span><i style={{background:receivingColor("blocker")}}/>入口车辆</span><span><i style={{background:receivingColor("target0_0")}}/>北进口车队</span><span><i style={{background:receivingColor("target1_0")}}/>东进口车队</span></>:isMicroRun(props.run)?<><span><i style={{background:'#e5b34e'}}/>ego 研究车辆</span><span><i style={{background:'#58b9e7'}}/>相邻车辆</span><span>灰灯：未录制</span></>:<><span><i style={{background:'#58b9e7'}}/>直行</span><span><i style={{background:'#e5b75d'}}/>右转</span><span><i style={{background:'#ac9be9'}}/>左转</span>{(props.run.schema==='connected_campus_run_v2'||props.run.schema==='fluid_joint_native_run_v1')&&<span><i style={{background:'#91a5b3'}}/>无后续记录</span>}{props.chosen&&<><span><i style={{background:'#e59036'}}/>选中车辆</span><span>虚线：路线</span></>}</>}</div></div>
}
