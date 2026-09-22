import { searchIndexingAllowed } from './url-config';

export const POLICY_UPDATED='2026-09-22';

export function publicPolicyRobots(){
  return searchIndexingAllowed()
    ? {index:true,follow:true}
    : {index:false,follow:false};
}
