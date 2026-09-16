const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const source=html.slice(html.indexOf('    let postSubmitting = false;'),html.indexOf('    async function submitPostDraft'));
test('a saved post with failed image still refreshes map; retry state remains',async()=>{
 const calls=[],visible=new Set(),els={postSubmitButton:{},aiLoading:{style:{}}};let pending={result:{id:42},kind:'camera',payload:{category:'danger'}};
 const ctx={document:{getElementById:id=>els[id]},window:{MachimamoPostOutbox:{pending:async()=>pending,refresh:()=>calls.push('retryUI')}},
 submitPostDraft:async()=>{throw Error('image offline');},visibleMapCategories:visible,syncFilterChips(){},loadAuthenticatedProfile:async()=>{},loadSpots:async()=>calls.push('reload'),alert:()=>{}};
 vm.createContext(ctx);vm.runInContext(source,ctx);await ctx.handlePostSubmit({preventDefault(){}});
 assert(visible.has('danger'));assert(calls.includes('reload'));assert(calls.includes('retryUI'));assert.equal(els.postSubmitButton.disabled,false);
});
test('double submit is refused before authentication or any server write',async()=>{
 let resolve,n=0;const ctx={document:{getElementById:()=>({style:{}})},window:{MachimamoPostOutbox:{refresh(){}}},submitPostDraft:()=>{n++;return new Promise(r=>resolve=r);}};
 vm.createContext(ctx);vm.runInContext(source,ctx);const a=ctx.handlePostSubmit({preventDefault(){}});await ctx.handlePostSubmit({preventDefault(){}});assert.equal(n,1);resolve();await a;
});
