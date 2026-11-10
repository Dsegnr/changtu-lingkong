import type { CampusFrame } from '../lib/campusReplay'
import { useEffect, useRef, useState } from 'react'
import type { CampusID, CampusPackage, PolicePackage, PoliceFrame, Vehicle } from '../types'
import { turnNames } from '../types'

// Bundled legacy SuperMap/OpenLayers exposes a global SDK. Keep its untyped
// boundary here; application data and cross-page state remain strictly typed.
declare const ol: any
type Model = { kind: 'campus'; data: CampusPackage; campus: CampusID; vehicle?: Vehicle; baseline?: Vehicle; replay?: { frame: CampusFrame; ids: string[]; chosen: number | null } } | { kind: 'police'; data: PolicePackage; frame: PoliceFrame; signal: number | null; onSignal: (signal: number) => void }
type Scene = { map: any; roads: any; labels: any; context: any; routes: any; selection: any; movement: any; vehicles: any; graphic: any; neighbors: any[]; projection: string; search: any[] }
const signalColor = (state: string) => 'Gg'.includes(state) ? '#117768' : 'yY'.includes(state) ? '#c59842' : '#b74d3c'
const lineStyle = (color: string, width: number, dash?: number[]) => new ol.style.Style({ stroke: new ol.style.Stroke({ color, width, lineDash: dash }) })
export default function MapCanvas({ model }: { model: Model }) {
  const node = useRef<HTMLDivElement>(null), scene = useRef<Scene | null>(null), latest = useRef(model); latest.current = model
  const [query, setQuery] = useState(''), [selection, setSelection] = useState<string | null>(null), [error, setError] = useState<string | null>(null)
  const [neighbors, setNeighbors] = useState(true)
  const empirical = model.kind === 'campus' && !!model.replay
  const campusID = model.kind === 'campus' ? model.campus : null
  const fit = () => {
    const current = scene.current, value = latest.current
    if (!current || !node.current?.clientWidth) return
    current.map.updateSize()
    const extent = value.kind === 'campus' ? ol.proj.transformExtent(value.data.bundle.campuses[value.campus].bbox, 'EPSG:4326', 'EPSG:3857') : [value.data.case.junction_xy[0] - 180, value.data.case.junction_xy[1] - 180, value.data.case.junction_xy[0] + 180, value.data.case.junction_xy[1] + 180]
    current.map.getView().fit(extent, { padding: [60, 30, 40, 30], duration: 0 })
  }
  useEffect(() => {
    if (!node.current) return
    setSelection(null); setQuery(''); setError(null)
    let map: any, observer: ResizeObserver | undefined
    try {
      if (typeof ol === 'undefined' || typeof ol.Graphic !== 'function') throw new Error('本地SuperMap GIS资源未加载')
      const value = latest.current
      const roads = new ol.source.Vector(), labels = new ol.source.Vector(), context = new ol.source.Vector(), routes = new ol.source.Vector(), selected = new ol.source.Vector(), movement = new ol.source.Vector(), vehicles = new ol.source.Vector()
      const background = new ol.source.Vector(), water = new ol.source.Vector(), buffer = new ol.source.Vector(), nearby = new ol.source.Vector()
      const layers = [new ol.layer.Vector({ source: background, style: new ol.style.Style({ fill: new ol.style.Fill({ color: '#ebf0e7' }), stroke: new ol.style.Stroke({ color: '#c9d5c6', width: 1, lineDash: [6, 6] }) }) }), new ol.layer.Vector({ source: water, style: new ol.style.Style({ fill: new ol.style.Fill({ color: '#c9e1ed' }) }) }), new ol.layer.Vector({ source: roads, style: [lineStyle('#fff', 5), lineStyle('#aebfca', 1.6)] }), new ol.layer.Vector({ source: buffer, style: new ol.style.Style({ fill: new ol.style.Fill({ color: '#d9a03f25' }), stroke: new ol.style.Stroke({ color: '#c59842', width: 1, lineDash: [5, 4] }) }) }), new ol.layer.Vector({ source: nearby, style: lineStyle('#c59842', 3) }), new ol.layer.Vector({ source: routes, style: (f: any) => lineStyle(f.get('baseline') ? '#a98030' : '#176ba7', f.get('baseline') ? 5 : 3, f.get('baseline') ? [7, 6] : undefined) }), new ol.layer.Vector({ source: movement, style: (f: any) => lineStyle(f.get('event') ? '#b74d3c' : signalColor(f.get('light')), f.get('event') ? 6 : 4) }), new ol.layer.Vector({ source: vehicles, style: new ol.style.Style({ image: new ol.style.Circle({ radius: 3.5, fill: new ol.style.Fill({ color: '#176ba7' }), stroke: new ol.style.Stroke({ color: '#fff', width: 1 }) }) }) }), new ol.layer.Vector({ source: context, declutter: true, style: (f: any) => new ol.style.Style({ image: new ol.style.Circle({ radius: 2.5, fill: new ol.style.Fill({ color: '#77929e' }) }), text: new ol.style.Text({ text: f.get('name'), font: '10px "Microsoft YaHei",sans-serif', offsetY: 12, fill: new ol.style.Fill({ color: '#69818f' }), stroke: new ol.style.Stroke({ color: '#fff', width: 3 }) }) }) }), new ol.layer.Vector({ source: labels, declutter: true, style: (f: any) => new ol.style.Style({ text: new ol.style.Text({ text: f.get('name'), font: '12px "Microsoft YaHei",sans-serif', fill: new ol.style.Fill({ color: '#3d5d71' }), stroke: new ol.style.Stroke({ color: '#fff', width: 4 }), overflow: true }) }) }), new ol.layer.Vector({ source: selected, style: [lineStyle('#fff', 7), lineStyle('#68519c', 4)] })]
      const projection = value.kind === 'campus' ? 'EPSG:3857' : new ol.proj.Projection({ code: 'SUMO_LOCAL_METRES', units: 'm' })
      map = new ol.Map({ target: node.current, layers, view: new ol.View({ projection, center: [0, 0], zoom: 1, maxZoom: 25 }) })
      map.addControl(new ol.control.ScaleLine({ units: 'metric' }))
      const graphics: any[] = [], search: any[] = []
      if (value.kind === 'campus') {
        const campus = value.data.bundle.campuses[value.campus], ctx = value.data.context[value.campus]
        const read = (features: unknown) => new ol.format.GeoJSON().readFeatures(features, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' })
        const names = new Map<string, any>()
        campus.roads.forEach(road => { const feature = new ol.Feature({ geometry: new ol.geom.LineString(road.xy.map(p => ol.proj.fromLonLat(p))), name: road.name, source: '冻结OSM拓扑' }); roads.addFeature(feature); search.push(feature); if (road.name && road.name !== '未命名道路' && (!names.has(road.name) || feature.getGeometry().getLength() > names.get(road.name).getGeometry().getLength())) names.set(road.name, feature) })
        names.forEach((feature, name) => labels.addFeature(new ol.Feature({ geometry: new ol.geom.Point(feature.getGeometry().getCoordinateAt(.5)), name })))
        background.addFeatures(read(ctx.districts)); water.addFeatures(read(ctx.water)); context.addFeatures([...read(ctx.places), ...read(ctx.facilities)]); search.push(...context.getFeatures())
        if (!value.replay) movement.addFeature(new ol.Feature({ geometry: new ol.geom.LineString(campus.event.source_centerline_wgs84.map(p => ol.proj.fromLonLat(p))), event: true, name: campus.event.name, source: '合成事件 / 冻结源道路' }))
        if (!value.replay) buffer.addFeatures(read({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: campus.gis.buffer }] })); if (!value.replay) nearby.addFeatures(read({ type: 'FeatureCollection', features: campus.gis.teaching_roads.features.filter(feature => feature.properties.native_100m_neighbor) }))
        // The bundled Graphic renderer requires initialization before clear/add.
        // Create this static source once per map lifecycle, never per frame.
        const graphic = new ol.Graphic(new ol.geom.Point(ol.proj.fromLonLat(campus.event.source_centerline_wgs84[0])), { kind: 'event_reference' }); graphic.setStyle(new ol.style.Circle({ radius: 5, fill: new ol.style.Fill({ color: '#b74d3c' }), stroke: new ol.style.Stroke({ color: '#fff', width: 2 }) })); if (!value.replay) graphics.push(graphic)
      } else {
        Object.values(value.data.case.lanes).forEach(lane => { const feature = new ol.Feature({ geometry: new ol.geom.LineString(lane.xy), name: lane.id, source: 'RESCO / SUMO本地米制坐标' }); roads.addFeature(feature); search.push(feature) })
        const links = value.data.case.programs[value.data.case.focus].connections
        links.forEach(link => { const lane = value.data.case.lanes[link.from + '_' + link.fromLane], xy = new ol.geom.LineString(lane.xy).getCoordinateAt(.9); const graphic = new ol.Graphic(new ol.geom.Point(xy), { signal: +link.linkIndex }); graphic.setStyle(new ol.style.Circle({ radius: 2.5, fill: new ol.style.Fill({ color: '#77929e' }), stroke: new ol.style.Stroke({ color: '#fff', width: 1 }) })); graphics.push(graphic) })
      }
      const graphicSource = new ol.source.Graphic({ graphics, render: 'canvas', map }); const graphicLayer = new ol.layer.Image({ source: graphicSource }); map.addLayer(graphicLayer)
      scene.current = { map, roads, labels, context, routes, selection: selected, movement, vehicles, graphic: graphicSource, neighbors: [layers[3], layers[4]], projection: value.kind === 'campus' ? 'EPSG:3857' : 'SUMO_LOCAL_METRES', search }
      node.current.dataset.projection = scene.current.projection; node.current.dataset.labels = String(labels.getFeatures().length); node.current.dataset.graphics = String(graphics.length)
      map.on('singleclick', (event: any) => { const feature = map.forEachFeatureAtPixel(event.pixel, (f: any) => f.get('signal') != null || f.get('name') ? f : undefined, { hitTolerance: 7 }); if (!feature) return; const current = latest.current; if (current.kind === 'police' && feature.get('signal') != null) current.onSignal(feature.get('signal')); else { selected.clear(); selected.addFeature(feature.clone()); setSelection(`${feature.get('name')} / ${feature.get('source') || '配套教学数据'}，未经现场核验`) } })
      let size = ''; observer = new ResizeObserver(() => { if (!node.current) return; const next = `${node.current.clientWidth},${node.current.clientHeight}`; if (next !== size && node.current.clientWidth > 0) { size = next; fit() } }); observer.observe(node.current)
      requestAnimationFrame(fit)
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
    return () => {
      observer?.disconnect()
      if (map) {
        // This installed iClient renderer keeps a bound change:size listener
        // that dereferences getSize()[0] even after OpenLayers clears its target.
        // All listeners here belong to this disposable, component-owned map.
        for (const listener of [...(map.getListeners('change:size') || [])]) map.un('change:size', listener)
        map.setTarget(undefined); map.dispose()
      }
      scene.current = null
    }
  }, [model.kind, model.data, campusID, empirical])
  useEffect(() => {
    const current = scene.current; if (!current) return
    current.routes.clear(); current.selection.clear()
    if (model.kind === 'campus') {
      current.vehicles.clear()
      if (model.replay) {
        const replay = model.replay
        replay.frame.vehicles.forEach(v => {
          const color = v[0] === replay.chosen ? '#874aaa' : v[3] < .1 ? '#cc8425' : '#176ba7'
          const feature = new ol.Feature({ geometry: new ol.geom.Point(ol.proj.fromLonLat([v[1], v[2]])), name: replay.ids[v[0]], source: `校园仿真位置 / ${(v[3]*3.6).toFixed(1)} km/h` })
          feature.setStyle(new ol.style.Style({ image: new ol.style.Circle({ radius: v[0] === replay.chosen ? 7 : 4.5, fill: new ol.style.Fill({ color }), stroke: new ol.style.Stroke({ color: '#fff', width: 1.2 }) }) }))
          current.vehicles.addFeature(feature)
        })
        if (node.current) { node.current.dataset.movingVehicles = String(replay.frame.vehicles.length); node.current.dataset.replayTime = String(replay.frame.time) }
        setSelection(null)
      }
      for (const [vehicle, baseline] of [[model.baseline, true], [model.vehicle, false]] as const) if (vehicle) current.routes.addFeature(new ol.Feature({ geometry: new ol.geom.MultiLineString(vehicle.path.map(line => line.map(point => ol.proj.fromLonLat(point)))), baseline }))
    } else {
      current.movement.clear(); current.vehicles.clear()
      const links = model.data.case.programs[model.data.case.focus].connections
      links.forEach(link => { const from = model.data.case.lanes[link.from + '_' + link.fromLane], to = model.data.case.lanes[link.to + '_' + link.toLane]; current.movement.addFeature(new ol.Feature({ geometry: new ol.geom.LineString([from.xy.at(-1), to.xy[0]]), signal: +link.linkIndex, light: model.frame.state[+link.linkIndex] })) })
      model.frame.vehicle_positions.forEach(vehicle => current.vehicles.addFeature(new ol.Feature({ geometry: new ol.geom.Point(vehicle.xy) })))
      const selected = links.find(link => +link.linkIndex === model.signal)
      if (selected) { const from = model.data.case.lanes[selected.from + '_' + selected.fromLane], to = model.data.case.lanes[selected.to + '_' + selected.toLane]; current.selection.addFeature(new ol.Feature({ geometry: new ol.geom.LineString([...from.xy, ...to.xy]) })); setSelection(`连接${selected.linkIndex} / ${turnNames[selected.dir] || selected.dir} / ${selected.from}_${selected.fromLane} → ${selected.to}_${selected.toLane}`) }
      else setSelection(null)
    }
  }, [model])
  useEffect(() => { scene.current?.neighbors.forEach(layer => layer.setVisible(neighbors)) }, [neighbors, model.kind, campusID])
  const search = () => {
    const current = scene.current; if (!current || !query.trim()) return
    const found = current.search.find(feature => String(feature.get('name') || '').includes(query.trim()))
    if (!found) { setSelection('当前数据域未找到该名称；没有补造点位。'); return }
    current.selection.clear(); current.selection.addFeature(found.clone()); current.map.getView().fit(found.getGeometry().getExtent(), { padding: [100, 80, 80, 80], maxZoom: model.kind === 'campus' ? 17 : 25, duration: 0 }); setSelection(`${found.get('name')} / ${found.get('source') || '配套教学数据'}，参考位置未经现场核验`)
  }
  return <div className="map-stage"><div className="map-canvas" ref={node} data-testid="gis-map" />{error && <div className="map-error" role="alert">{error}</div>}<div className="map-title"><b>{model.kind === 'campus' ? model.data.protocol.campuses[model.campus].location : '科隆公开基准 / 受控路口'}</b><span>{model.kind === 'campus' ? (model.replay ? '数据驱动动态基线 · 无信号控制' : '河南工业大学 · 校园周边研究区') : '源车道与仿真位置 / 非校园实测'}</span></div><form className="map-search" onSubmit={event => { event.preventDefault(); search() }}><input aria-label="地图搜索" placeholder={model.kind === 'campus' ? '查询道路、地名或设施' : '查询源车道ID'} value={query} onChange={event => setQuery(event.target.value)} /><button>查询</button></form><div className="map-actions"><button onClick={fit}>区域全览</button>{model.kind === 'campus' && <label><input type="checkbox" checked={neighbors} onChange={event => setNeighbors(event.target.checked)} />100米空间关联</label>}</div>{selection && <div className="map-query" role="status">{selection}<button aria-label="关闭空间查询" onClick={() => { setSelection(null); scene.current?.selection.clear() }}>×</button></div>}<div className="map-attribution">{model.kind === 'campus' ? '配套教学数据 / 冻结OSM拓扑 · 研究框不是校界' : 'RESCO / SUMO本地米制坐标 · 转向线与入口点为示意'}</div></div>
}
