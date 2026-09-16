const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const code=html.slice(html.indexOf('    function renderAedReconsideration'),html.indexOf('    let myAppeals'));
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function render(item,appeals=[]){const context={appealsOwnerId:'me',currentAuthUserId:'me',myAppeals:appeals,Date,formatHistoryDate:x=>x,escapeHtml:x=>x};vm.createContext(context);vm.runInContext(code,context);return context.renderAedReconsideration({id,...item});}
test('eligible, expired, cleaning, pending, legacy display and same-id form',()=>{
 assert.match(render({reconsider_until:'2099-01-01T00:00:00Z'}),/再審査を申し込む/);
 assert.doesNotMatch(render({reconsider_until:'2020-01-01T00:00:00Z'}),/<button/);
 assert.doesNotMatch(render({cleanup_started_at:'2020-01-01'}),/<button/);
 assert.match(render({reconsider_until:'2020-01-01'},[{target_type:'aed_submission',target_id:id,status:'pending'}]),/確認中は期限による削除を行いません/);
 assert.match(render({}),/制度変更前/);
 assert.match(render({}),new RegExp(id));
});
