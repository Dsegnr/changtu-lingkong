type Entry={promise:Promise<unknown>;settled:boolean;used:number;run:boolean}
export function createBoundedJsonRepository(prefix:string,allowed:(path:string)=>boolean,fetcher:(path:string)=>Promise<Response>=(path)=>fetch(path)){
 const entries=new Map<string,Entry>(),waiting:(()=>void)[]=[];let active=0,tick=0,requests=0,hits=0
 const slot=async()=>{if(active>=2)await new Promise<void>(resolve=>waiting.push(resolve));else active++}
 const release=()=>{const next=waiting.shift();if(next)next();else active--}
 const prune=()=>{for(const isRun of [true,false]){const items=[...entries].filter(([,e])=>e.settled&&e.run===isRun).sort((a,b)=>a[1].used-b[1].used),limit=isRun?2:20;for(const[k]of items.slice(0,Math.max(0,items.length-limit)))entries.delete(k)}}
 return{
  get<T=any>(path:string):Promise<T>{if(!allowed(path))return Promise.reject(Error('交通数据路径未授权'));const previous=entries.get(path);if(previous){hits++;previous.used=++tick;return previous.promise as Promise<T>}
   const entry:Entry={promise:Promise.resolve(),settled:false,used:++tick,run:/\/run(?:\/|$)/.test(path)}
   entry.promise=(async()=>{await slot();try{requests++;const response=await fetcher(prefix+path);if(!response.ok)throw Error('交通记录暂不可用（'+response.status+'）');return await response.json()}finally{release()}})().then(v=>{entry.settled=true;prune();return v},e=>{if(entries.get(path)===entry)entries.delete(path);throw e});entries.set(path,entry);return entry.promise as Promise<T>
  },clearSettled:()=>{for(const[k,e]of entries)if(e.settled)entries.delete(k)},stats:()=>({requests,hits,active,queued:waiting.length,cached:[...entries.keys()]})
 }
}
