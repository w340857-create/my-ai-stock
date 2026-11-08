const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function app(storage={}){
 const elements={},alerts=[];let failWrite=false;const el=id=>elements[id]??={value:'',style:{},textContent:'',innerHTML:'',hidden:false,events:{},addEventListener(name,fn){(this.events[name]??=[]).push(fn);},click(){this.onclick?.();}};
 const ctx=vm.createContext({document:{getElementById:el,addEventListener(){}},localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>{if(failWrite)throw Error('quota exceeded');storage[k]=v;}},alert:m=>alerts.push(m),confirm:()=>true,window:{},navigator:{},setTimeout,URL,Blob,console,crypto,structuredClone,Intl});
 vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../data/receipt-demo.js'),'utf8'),ctx);vm.runInContext(script,ctx);return {el,alerts,storage,run:s=>vm.runInContext(s,ctx),fail:()=>{failWrite=true;},unfail:()=>{failWrite=false;}};
}
const key='my_ai_stock_mobile_v1';
(async()=>{
 const a=app({[key]:JSON.stringify([{name:'water',barcode:'8850011100303',unit:'CAR',expected:1,counted:1}])});
 assert.equal(a.run('rows[0].packSize'),8);assert.equal(a.run('rows[0].counted'),1);assert.equal(a.run('receipts.length'),0);
 a.el('loadReceiptSample').onclick();assert.equal(a.run('draft.items.length'),345);assert.equal(a.run('receipts.length'),0);assert.equal(a.run('draft.items[0].barcode'),'08850002022867');
 a.el('postReceipt').onclick();assert.match(a.alerts.at(-1),/กรอกจำนวนรับจริง/);assert.equal(a.run('receipts.length'),0);
 a.el('receiptMode').onchange({target:{value:'live'}});assert.equal(a.run('draft.mode'),'test');
 a.el('fillSampleQty').onclick();a.el('postReceipt').onclick();assert.equal(a.run('receipts.length'),1);assert.equal(a.run('receiveStock("test").length'),337);assert.equal(a.run('receiveStock("live").length'),0);assert.equal(a.run('rows[0].counted'),1);assert.equal(a.run('draft.items.length'),0);
 const totals=a.run('JSON.stringify(receiveStock("test").reduce((s,x)=>({...s,[x.unit]:(s[x.unit]||0)+x.quantity}),{}))');assert.deepEqual(JSON.parse(totals),{CAR:96,PAC:261,SAC:3,PC:276});
 a.el('loadReceiptSample').onclick();a.el('fillSampleQty').onclick();a.run('draft.doc=" test-all12-001 "');a.el('postReceipt').onclick();assert.equal(a.run('receipts.length'),1);assert.match(a.alerts.at(-1),/บันทึกแล้ว/);
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
 const legacy=app();legacy.run(`receipts=[normalizeReceipt({...blankDraft(),sample:true,doc:'TEST-PAGE1-001',id:'legacy-page1',createdAt:new Date().toISOString(),items:samplePageOne.map(([name,code,barcode,expected])=>({name,code,barcode,expected,unit:'CAR',received:expected}))})];persistAll()`);
 legacy.el('loadReceiptSample').onclick();legacy.el('receiptPage').onchange({target:{value:'12'}});assert.match(legacy.el('receiptItems').innerHTML,/data-receive="344"/);assert.doesNotMatch(legacy.el('receiptItems').innerHTML,/data-receive="0"/);
 legacy.el('fillSampleQty').onclick();assert.equal(legacy.run('draft.items.every(x=>x.received===x.expected)'),true);
 legacy.fail();legacy.el('postReceipt').onclick();assert.equal(legacy.run('receipts.length'),1);assert.equal(legacy.run('receipts[0].voidedAt'),null);legacy.unfail();
 legacy.el('postReceipt').onclick();assert.equal(legacy.run('receipts.length'),2);assert.ok(legacy.run('receipts[0].voidedAt'));assert.equal(legacy.run('receipts[1].items.length'),345);assert.equal(legacy.run('receipts[1].items[344].sourcePage'),12);assert.equal(legacy.run('receipts[1].items[344].sourceRow'),'T35-1');assert.equal(legacy.run('receiveStock("test").filter(x=>x.unit==="CAR").reduce((s,x)=>s+x.quantity,0)'),96);assert.equal(legacy.run('receiveStock("live").length'),0);
 const loaded=app(legacy.storage);assert.equal(loaded.run('receipts[1].sampleSource'),'full12');assert.equal(loaded.run('receipts[1].items[344].sourceRow'),'T35-1');
 console.log('PASS: v4 migration; sample 345 rows/all 12 pages; explicit count required; test/live separation; duplicate prevention; atomic quota failure; loose conversion; reload; backup/restore; cancellation; count reset; malformed restore/import; CSV leading zeros; clear all; old backups.');
})();
