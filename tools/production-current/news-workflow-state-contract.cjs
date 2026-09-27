'use strict';
const d=require('../../news-production-domain.js');
module.exports=Object.freeze({SERVICE_ID:d.SERVICE_ID,STATES:d.STATES,validateWorkflowState:d.validateWorkflowState,readOnlyProjection:function(input){const v=d.validateWorkflowState(input);return Object.freeze(Object.assign({},input,{valid:v.valid,errors:Object.freeze(v.errors)}));},defaultWorkflow:d.defaultWorkflow});
