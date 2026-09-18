import 'server-only';
import { getAdminSupabase } from './supabase-admin';

export type AdminDashboard={
  summary:{pv:number;searches:number;calendarAdds:number;machimamoClicks:number;xShares:number;eventOpens:number;lineAuthUsers:number;linkedProfiles:number};
  searchTerms:Array<{term:string;count:number}>;
  popularEvents:Array<{id:number;slug:string;title:string;start_date:string;end_date:string;prefecture:string;municipality:string|null;venue_name:string|null;count:number}>;
  newDetected:Array<{
    id:number;source_title:string|null;source_url:string;normalization_status:string;fetched_at:string;
    event_id:number|null;slug:string|null;title:string|null;start_date:string|null;end_date:string|null;
    prefecture:string|null;municipality:string|null;venue_name:string|null;
    publication_status:string|null;verification_status:string|null;event_status:string|null;
    x_compose_count:number;x_last_opened_at:string|null;
  }>;
  pickups:Array<{event_id:number;rank:number;reason:string;updated_at:string;slug:string;title:string;start_date:string;end_date:string;prefecture:string;municipality:string|null;venue_name:string|null}>;
};

export async function getMachiibeAdminDashboard(days=30):Promise<AdminDashboard|null>{
  const db=getAdminSupabase();
  if(!db) return null;

  const {data,error}=await db.rpc('service_get_machiibe_admin_dashboard',{p_days:days});
  if(error){
    console.error('admin dashboard rpc failed',error.message);
    return null;
  }

  const base=(data||{}) as Omit<AdminDashboard,'summary'> & {summary?:Partial<AdminDashboard['summary']>};
  return {
    summary:{
      pv:Number(base.summary?.pv||0),
      searches:Number(base.summary?.searches||0),
      calendarAdds:Number(base.summary?.calendarAdds||0),
      machimamoClicks:Number(base.summary?.machimamoClicks||0),
      xShares:Number(base.summary?.xShares||0),
      eventOpens:Number(base.summary?.eventOpens||0),
      lineAuthUsers:Number(base.summary?.lineAuthUsers||0),
      linkedProfiles:Number(base.summary?.linkedProfiles||0)
    },
    searchTerms:Array.isArray(base.searchTerms)?base.searchTerms:[],
    popularEvents:Array.isArray(base.popularEvents)?base.popularEvents:[],
    newDetected:Array.isArray(base.newDetected)?base.newDetected:[],
    pickups:Array.isArray(base.pickups)?base.pickups:[]
  };
}
