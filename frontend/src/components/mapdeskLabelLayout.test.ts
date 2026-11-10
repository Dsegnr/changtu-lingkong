import{describe,it,expect}from'vitest'
import{layoutMapLabels}from'./mapdeskLabelLayout'
describe('map label placement',()=>{
 it('separates adjacent nodes without shifting map coordinates',()=>{const a=[{id:'B',x:250,y:210,width:60,height:40},{id:'C',x:290,y:220,width:60,height:40}];const p=layoutMapLabels(a,320,410);const rect=p.map(v=>{const n=a.find(a=>a.id===v.id)!;return{x:n.x+v.offset[0],y:n.y+v.offset[1]-n.height,w:n.width,h:n.height}});expect(rect[0].y+rect[0].h<=rect[1].y||rect[1].y+rect[1].h<=rect[0].y).toBe(true);expect(a[0].x).toBe(250)})
 it('keeps edge labels within viewport',()=>{const a={id:'C',x:319,y:5,width:60,height:40},p=layoutMapLabels([a],320,410)[0];expect(a.x+p.offset[0]+a.width).toBeLessThanOrEqual(312);expect(a.y+p.offset[1]-a.height).toBeGreaterThanOrEqual(8)})
 it('keeps natural preferred offset in open space',()=>{expect(layoutMapLabels([{id:'A',x:100,y:200,width:60,height:40}],800,600)[0].offset).toEqual([12,-12])})
})
