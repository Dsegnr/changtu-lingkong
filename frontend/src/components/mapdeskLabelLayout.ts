export type LabelAnchor={id:string;x:number;y:number;width:number;height:number}
export function layoutMapLabels(items:LabelAnchor[],width:number,height:number){
 const placed:{id:string;x:number;y:number;width:number;height:number}[]=[]
 for(const a of [...items].sort((a,b)=>a.x-b.x||a.y-b.y)){
  const x=Math.max(8,Math.min(a.x+12,width-8-a.width)),ideal=a.y-12-a.height
  const candidates=[ideal,...placed.flatMap(p=>[p.y-a.height-6,p.y+p.height+6])].map(y=>Math.max(8,Math.min(y,height-8-a.height)))
  const overlaps=(y:number)=>placed.some(p=>x<p.x+p.width+4&&x+a.width+4>p.x&&y<p.y+p.height+4&&y+a.height+4>p.y)
  const y=candidates.filter(y=>!overlaps(y)).sort((a,b)=>Math.abs(a-ideal)-Math.abs(b-ideal))[0]??Math.max(8,Math.min(ideal,height-8-a.height))
  placed.push({...a,x,y})
 }
 return placed.map(p=>{const a=items.find(v=>v.id===p.id)!;return{id:p.id,offset:[p.x-a.x,p.y+p.height-a.y] as [number,number]}})
}
