const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function app(storage={}){
 const elements={},alerts=[];let failWrite=false;const el=id=>elements[id]??={value:'',style:{},textContent:'',innerHTML:'',hidden:false,events:{},addEventListener(name,fn){(this.events[name]??=[]).push(fn);},click(){this.onclick?.();}};
 const ctx=vm.createContext({document:{getElementById:el,addEventListener(){}},localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>{if(failWrite)throw Error('quota exceeded');storage[k]=v;}},alert:m=>alerts.push(m),confirm:()=>true,window:{},navigator:{},setTimeout,URL,Blob,console,crypto,structuredClone,Intl});
 vm.runInContext(script,ctx);return {el,alerts,storage,run:s=>vm.runInContext(s,ctx),fail:()=>{failWrite=true;},unfail:()=>{failWrite=false;}};
}
const key='my_ai_stock_mobile_v1';
(async()=>{
 const a=app({[key]:JSON.stringify([{name:'water',barcode:'8850011100303',unit:'CAR',expected:1,counted:1}])});
 assert.equal(a.run('rows[0].packSize'),8);assert.equal(a.run('rows[0].counted'),1);assert.equal(a.run('receipts.length'),0);
 a.el('loadReceiptSample').onclick();assert.equal(a.run('draft.items.length'),18);assert.equal(a.run('receipts.length'),0);assert.equal(a.run('draft.items[0].barcode'),'08850002022867');
 a.el('postReceipt').onclick();assert.match(a.alerts.at(-1),/กรอกจำนวนรับจริง/);assert.equal(a.run('receipts.length'),0);
 a.el('receiptMode').onchange({target:{value:'live'}});assert.equal(a.run('draft.mode'),'test');
 a.el('fillSampleQty').onclick();a.el('postReceipt').onclick();assert.equal(a.run('receipts.length'),1);assert.equal(a.run('receiveStock("test").length'),18);assert.equal(a.run('receiveStock("live").length'),0);assert.equal(a.run('rows[0].counted'),1);assert.equal(a.run('draft.items.length'),0);
 const sum=a.run('receiveStock("test").reduce((s,x)=>s+x.quantity,0)');assert.equal(sum,25);
 a.el('loadReceiptSample').onclick();a.el('fillSampleQty').onclick();a.run('draft.doc=" test-page1-001 "');a.el('postReceipt').onclick();assert.equal(a.run('receipts.length'),1);assert.match(a.alerts.at(-1),/บันทึกแล้ว/);
 a.run('draft.doc="TEST-2";draft.items[0].received=2');a.fail();a.el('postReceipt').onclick();assert.equal(a.run('receipts.length'),1);assert.equal(a.run('draft.doc'),'TEST-2');a.unfail();
 a.run('draft={...blankDraft(),mode:"live",doc:"REAL-1",items:[{name:"water",code:"W",barcode:"0000123456789",unit:"CAR",expected:2,packSize:8,received:2,loose:3}]}');a.el('postReceipt').onclick();assert.equal(a.run('receiveStock("live")[0].pieces'),19);assert.equal(a.run('receiveStock("live")[0].quantity'),2);
 const b=app(a.storage);assert.equal(b.run('receipts.length'),2);assert.equal(b.run('receiveStock("live")[0].pieces'),19);
 const backup=b.run('JSON.stringify(stateSnapshot())');await b.el('restore').onchange({target:{files:[{text:async()=>backup}],value:''}});assert.equal(b.run('receipts.length'),2);
 b.run('draft={...blankDraft(),mode:"live"}');b.el('receiptHistory').events.click[0]({target:{closest:()=>({dataset:{voidReceipt:'1'}})}});assert.equal(b.run('receiveStock("live").length'),0);assert.equal(b.run('receipts.length'),2);assert.ok(b.run('receipts[1].voidedAt'));
 b.el('resetCounts').onclick();assert.equal(b.run('receipts.length'),2);
 const before=b.run('JSON.stringify(stateSnapshot())');await b.el('restore').onchange({target:{files:[{text:async()=>JSON.stringify({version:'4.1',rows:[],receipts:[{id:'bad'}]})}],value:''}});assert.equal(b.run('JSON.stringify(stateSnapshot())'),before);
 b.run('draft={...blankDraft(),doc:"new"}');await b.el('receiptCSV').onchange({target:{files:[{text:async()=> 'name,code,barcode,expected,unit\n"a,b",X,000123,2,CAR\nwrong,Y,000124,-1,CAR'}],value:''}});assert.equal(b.run('draft.items.length'),0);
 await b.el('receiptCSV').onchange({target:{files:[{text:async()=> 'name,code,barcode,expected,unit\n"a,b",X,000123,2,CAR'}],value:''}});assert.equal(b.run('draft.items[0].received'),null);assert.equal(b.run('draft.items[0].barcode'),'000123');
 b.el('clear').onclick();assert.equal(b.run('receipts.length'),0);assert.equal(b.run('rows.length'),0);assert.equal(b.run('draft.items.length'),0);
 await b.el('restore').onchange({target:{files:[{text:async()=> JSON.stringify({version:4,rows:[{name:'old',expected:2,counted:1}]})}],value:''}});assert.equal(b.run('rows[0].counted'),1);assert.equal(b.run('receipts.length'),0);
 assert.equal(b.run('isDifferent(normalizeRow({name:"unknown",expected:2,whole:2}))'),false);
 const stale=app(b.storage);b.el('loadReceiptSample').onclick();stale.el('loadReceiptSample').onclick();assert.equal(stale.run('draft.items.length'),0);assert.match(stale.alerts.at(-1),/แท็บอื่น/);
 console.log('PASS: v4 migration; sample 18 rows/25 CAR; explicit count required; test/live separation; duplicate prevention; atomic quota failure; loose conversion; reload; backup/restore; cancellation; count reset; malformed restore/import; CSV leading zeros; clear all; old backups.');
})();
