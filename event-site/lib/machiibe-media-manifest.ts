export type MachiibeMediaManifestItem={
  pageNumber:number;
  pageCount:number;
  fileName:string;
  sha256:string;
  bytes:number;
  width:1080;
  height:1920;
  mimeType:'image/png';
  r2Key:string;
};

export type MachiibeMediaManifest={
  version:'machiibe-media-manifest-v1';
  productionType:'CAROUSEL';
  items:MachiibeMediaManifestItem[];
};

const safeId=/^[A-Za-z0-9._:-]{1,160}$/;
const hash=/^[a-f0-9]{64}$/;

function cleanId(value:string,label:string){
  if(!safeId.test(value)) throw new Error(label+' is invalid');
  return value;
}

export function machiibeR2ObjectKey(postSetId:string,revisionId:string,fileName:string){
  cleanId(postSetId,'postSetId');
  cleanId(revisionId,'revisionId');
  if(!/^[A-Za-z0-9._-]+\.png$/.test(fileName)) throw new Error('fileName is invalid');
  return 'production/machiibe/'+postSetId+'/'+revisionId+'/'+fileName;
}

export function buildMachiibeMediaManifest(
  postSetId:string,
  revisionId:string,
  files:Array<{pageNumber:number;pageCount:number;fileName:string;sha256:string;bytes:number}>
):MachiibeMediaManifest{
  if(!files.length) throw new Error('media manifest requires files');
  const ordered=[...files].sort((a,b)=>a.pageNumber-b.pageNumber);
  const pageCount=ordered[0].pageCount;
  if(pageCount<5||pageCount>8||ordered.length!==pageCount) throw new Error('media manifest page count is invalid');
  ordered.forEach((file,index)=>{
    if(file.pageCount!==pageCount||file.pageNumber!==index+1) throw new Error('media manifest pages must be contiguous');
    if(!hash.test(file.sha256)||!Number.isInteger(file.bytes)||file.bytes<=0) throw new Error('media manifest file metadata is invalid');
  });
  return {
    version:'machiibe-media-manifest-v1',
    productionType:'CAROUSEL',
    items:ordered.map((file)=>({
      pageNumber:file.pageNumber,
      pageCount:file.pageCount,
      fileName:file.fileName,
      sha256:file.sha256,
      bytes:file.bytes,
      width:1080,
      height:1920,
      mimeType:'image/png',
      r2Key:machiibeR2ObjectKey(postSetId,revisionId,file.fileName)
    }))
  };
}

export function canonicalMachiibeMediaManifest(manifest:MachiibeMediaManifest){
  return JSON.stringify({
    version:manifest.version,
    productionType:manifest.productionType,
    items:manifest.items.map((item)=>({
      pageNumber:item.pageNumber,
      pageCount:item.pageCount,
      fileName:item.fileName,
      sha256:item.sha256,
      bytes:item.bytes,
      width:item.width,
      height:item.height,
      mimeType:item.mimeType,
      r2Key:item.r2Key
    }))
  });
}

export async function hashMachiibeMediaManifest(manifest:MachiibeMediaManifest){
  const bytes=new TextEncoder().encode(canonicalMachiibeMediaManifest(manifest));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest)).map((value)=>value.toString(16).padStart(2,'0')).join('');
}
