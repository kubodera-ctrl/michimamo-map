import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {ADMIN_COOKIE,validateAdminSession} from '@/lib/admin-auth';
import {getAdminSupabase} from '@/lib/supabase-admin';
import {isSameOriginRequest} from '@/lib/request-security';
import {
  buildMachiibeMediaManifest,
  hashMachiibeMediaManifest,
  type MachiibeMediaManifest
} from '@/lib/machiibe-media-manifest';
import {
  getMachiibeMediaStorageAdapter,
  sha256Bytes,
  type MachiibeMediaStorageReceipt
} from '@/lib/machiibe-media-storage';

export const runtime='nodejs';

const idPattern=/^[A-Za-z0-9._:-]{1,160}$/;
const hashPattern=/^[a-f0-9]{64}$/;
const maxManifestBytes=64*1024;
const maxFileBytes=16*1024*1024;
const maxTotalBytes=96*1024*1024;
const mutableRevisionStates=new Set(['draft','collecting','validating','generated','edited']);

function parseManifest(postSetId:string,revisionId:string,value:unknown):MachiibeMediaManifest{
  if(!value||typeof value!=='object') throw new Error('manifest_object_required');
  const raw=value as Record<string,unknown>;
  if(raw.version!=='machiibe-media-manifest-v1'||raw.productionType!=='CAROUSEL'||!Array.isArray(raw.items)){
    throw new Error('manifest_header_invalid');
  }
  const files=raw.items.map((entry,index)=>{
    if(!entry||typeof entry!=='object') throw new Error('manifest_item_invalid');
    const item=entry as Record<string,unknown>;
    if(
      typeof item.pageNumber!=='number'||typeof item.pageCount!=='number'||
      typeof item.fileName!=='string'||typeof item.sha256!=='string'||
      typeof item.bytes!=='number'||item.width!==1080||item.height!==1920||
      item.mimeType!=='image/png'||typeof item.r2Key!=='string'
    ) throw new Error('manifest_item_invalid');
    if(!Number.isInteger(item.pageNumber)||!Number.isInteger(item.pageCount)||!Number.isInteger(item.bytes)){
      throw new Error('manifest_item_invalid');
    }
    if(item.bytes<=0||item.bytes>maxFileBytes||!hashPattern.test(item.sha256)){
      throw new Error('manifest_item_invalid');
    }
    return {
      pageNumber:item.pageNumber,
      pageCount:item.pageCount,
      fileName:item.fileName,
      sha256:item.sha256,
      bytes:item.bytes,
      suppliedR2Key:item.r2Key,
      sourceIndex:index
    };
  });
  const built=buildMachiibeMediaManifest(postSetId,revisionId,files);
  built.items.forEach((item,index)=>{
    if(item.r2Key!==files[index].suppliedR2Key) throw new Error('manifest_r2_key_invalid');
  });
  const total=built.items.reduce((sum,item)=>sum+item.bytes,0);
  if(total>maxTotalBytes) throw new Error('manifest_total_too_large');
  return built;
}

function formFile(value:FormDataEntryValue|null){
  if(!value||typeof value==='string'||typeof (value as File).arrayBuffer!=='function') return null;
  return value as File;
}

async function cleanup(adapter:ReturnType<typeof getMachiibeMediaStorageAdapter>,receipts:MachiibeMediaStorageReceipt[]){
  await Promise.allSettled(receipts.map((receipt)=>adapter.deletePrivateObject(receipt.key)));
}

export async function POST(request:Request){
  if(!isSameOriginRequest(request)) return new Response('Forbidden',{status:403});
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) return new Response('Unauthorized',{status:401});

  const form=await request.formData();
  const postSetId=String(form.get('post_set_id')||'').trim();
  const revisionId=String(form.get('revision_id')||'').trim();
  const manifestText=String(form.get('media_manifest')||'');
  const clientMediaHash=String(form.get('media_hash')||'').trim().toLowerCase();

  if(!idPattern.test(postSetId)||!idPattern.test(revisionId)||!hashPattern.test(clientMediaHash)){
    return NextResponse.json({error:'invalid_request',dbUpdated:false,storageWriteSent:false},{status:400});
  }
  if(!manifestText||Buffer.byteLength(manifestText,'utf8')>maxManifestBytes){
    return NextResponse.json({error:'manifest_size_invalid',dbUpdated:false,storageWriteSent:false},{status:400});
  }

  let manifest:MachiibeMediaManifest;
  try{
    manifest=parseManifest(postSetId,revisionId,JSON.parse(manifestText));
  }catch(error){
    return NextResponse.json({
      error:error instanceof Error?error.message:'manifest_invalid',
      dbUpdated:false,
      storageWriteSent:false
    },{status:400});
  }

  const serverMediaHash=await hashMachiibeMediaManifest(manifest);
  if(serverMediaHash!==clientMediaHash){
    return NextResponse.json({error:'media_hash_mismatch',dbUpdated:false,storageWriteSent:false},{status:409});
  }

  const db=getAdminSupabase();
  if(!db) return NextResponse.json({error:'db_unconfigured',dbUpdated:false,storageWriteSent:false},{status:503});

  const setResult=await db.from('publishing_post_sets')
    .select('id,service,production_type,status')
    .eq('id',postSetId).eq('service','machiibe').maybeSingle();
  if(setResult.error||!setResult.data) return NextResponse.json({error:'post_set_not_found',dbUpdated:false,storageWriteSent:false},{status:404});

  const revisionResult=await db.from('publishing_revisions')
    .select('id,post_set_id,production_type,status,page_plan,approval_status,publish_eligible,media_hash')
    .eq('id',revisionId).eq('post_set_id',postSetId).maybeSingle();
  if(revisionResult.error||!revisionResult.data) return NextResponse.json({error:'revision_not_found',dbUpdated:false,storageWriteSent:false},{status:404});

  const revision=revisionResult.data;
  const expectedPageCount=Number((revision.page_plan as any)?.pageCount||0);
  if(
    setResult.data.production_type!=='CAROUSEL'||revision.production_type!=='CAROUSEL'||
    !mutableRevisionStates.has(String(revision.status))||
    Boolean(revision.publish_eligible)||revision.approval_status==='approved'||
    expectedPageCount!==manifest.items.length
  ){
    return NextResponse.json({error:'revision_state_rejected',dbUpdated:false,storageWriteSent:false},{status:409});
  }

  const adapter=getMachiibeMediaStorageAdapter();
  if(!adapter.canWrite){
    return NextResponse.json({
      error:'media_storage_unconfigured',
      storageKind:adapter.kind,
      mediaHash:serverMediaHash,
      fileCount:manifest.items.length,
      dbUpdated:false,
      storageWriteSent:false
    },{status:503});
  }

  const receipts:MachiibeMediaStorageReceipt[]=[];
  try{
    for(const item of manifest.items){
      const file=formFile(form.get('file_'+String(item.pageNumber)));
      if(!file||file.type!=='image/png'||file.name!==item.fileName||file.size!==item.bytes){
        throw new Error('media_file_metadata_mismatch');
      }
      const bytes=new Uint8Array(await file.arrayBuffer());
      const actualHash=sha256Bytes(bytes);
      if(actualHash!==item.sha256) throw new Error('media_file_hash_mismatch');
      receipts.push(await adapter.putPrivateObject({
        key:item.r2Key,
        body:bytes,
        contentType:'image/png',
        sha256:item.sha256,
        bytes:item.bytes
      }));
    }
  }catch(error){
    await cleanup(adapter,receipts);
    return NextResponse.json({
      error:error instanceof Error?error.message:'media_storage_failed',
      dbUpdated:false,
      storageWriteSent:receipts.length>0
    },{status:502});
  }

  const commit=await db.rpc('admin_commit_machiibe_media',{
    p_post_set_id:postSetId,
    p_revision_id:revisionId,
    p_media_manifest:manifest,
    p_media_hash:serverMediaHash,
    p_actor:'admin'
  });
  if(commit.error){
    await cleanup(adapter,receipts);
    return NextResponse.json({error:'media_db_commit_failed',dbUpdated:false,storageWriteSent:true},{status:500});
  }

  return NextResponse.json({
    ok:true,
    postSetId,
    revisionId,
    mediaHash:serverMediaHash,
    fileCount:receipts.length,
    private:true,
    storageKind:adapter.kind,
    dbUpdated:true,
    storageWriteSent:true
  });
}
