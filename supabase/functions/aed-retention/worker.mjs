const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function runAedRetention(service){
 const {data:items,error}=await service.rpc('aed_retention_claim',{p_limit:20});
 if(error||!Array.isArray(items))throw Error('claim_failed');
 let deleted=0,failed=0;
 for(const item of items){
  let success=false;
  try{
   if(!uuid.test(item.id)||!uuid.test(item.userId)||!uuid.test(item.token)||item.path!==`${item.userId}/${item.id}.jpg`)throw Error('invalid_item');
   const storage=service.storage.from('aed-submission-images');
   const {error:removeError}=await storage.remove([item.path]);if(removeError)throw Error('remove_failed');
   const {data:objects,error:listError}=await storage.list(item.userId,{search:`${item.id}.jpg`,limit:100});
   if(listError||!Array.isArray(objects)||objects.some(x=>x.name===`${item.id}.jpg`))throw Error('unconfirmed');
   success=true;
  }catch(_){success=false;}
  const {data:state,error:saveError}=await service.rpc('aed_retention_result',{p_id:item.id,p_token:item.token,p_success:success});
  if(saveError||!['deleted','missing','retry'].includes(state))throw Error('result_failed');
  if(state==='deleted')deleted++;else if(state==='retry')failed++;
 }
 return {status:failed?'retry_required':'completed',deleted,failed,claimed:items.length};
}
