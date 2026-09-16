const pathPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/original\.jpg$/i;
export async function runRetention(service,maxBatches=5){
 let deleted=0,failed=0,throttled=false;
 for(let batchNo=0;batchNo<maxBatches;batchNo++){
  const {data:batch,error}=await service.rpc('camera_evidence_cleanup_batch',{p_limit:50});
  if(error||!batch||typeof batch.token!=='string'||!Array.isArray(batch.items))throw Error('cleanup_batch_failed');
  throttled=!!batch.throttled;
  if(!batch.items.length)break;
  for(const item of batch.items){
   let ok=false,errorCode='storage_delete_failed';
   try{
    if(!item||typeof item.id!=='string'||typeof item.path!=='string'||!pathPattern.test(item.path))throw Error('invalid_cleanup_item');
    const {error:removeError}=await service.storage.from('camera-evidence').remove([item.path]);
    if(removeError)throw Error('remove_failed');
    const slash=item.path.lastIndexOf('/'),folder=item.path.slice(0,slash),filename=item.path.slice(slash+1);
    const {data:list,error:listError}=await service.storage.from('camera-evidence').list(folder,{limit:10,search:filename});
    if(listError||!Array.isArray(list))throw Error('verify_failed');
    if(Array.isArray(list)&&list.some(x=>x.name===filename)){errorCode='storage_object_remaining';throw Error('remaining');}
    ok=true;
   }catch(_){ok=false;}
   const {error:resultError}=await service.rpc('camera_evidence_cleanup_result',{p_id:item.id,p_token:batch.token,p_success:ok,p_error_code:ok?null:errorCode});
   if(resultError)throw Error('cleanup_result_failed');
   if(ok)deleted++;else failed++;
  }
  if(batch.items.length<50)break;
 }
 const {error:finishError}=await service.rpc('camera_evidence_cleanup_finished');
 if(finishError)throw Error('cleanup_finish_failed');
 return {status:failed?'retry_required':throttled?'processing':'completed',deleted,failed,throttled};
}
