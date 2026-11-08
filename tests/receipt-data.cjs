const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'../data/receipt-demo.js'),'utf8'),ctx);const data=JSON.parse(vm.runInContext('JSON.stringify(receiptDemo)',ctx));
assert.equal(data.items.length,345);assert.deepEqual(data.metadata.linesPerPage,{'1':18,'2':33,'3':28,'4':32,'5':31,'6':31,'7':31,'8':30,'9':30,'10':31,'11':31,'12':19});
const refs=new Set(),pages={},totals={},codes=new Map();
for(const r of data.items){
 assert.ok(r.name&&r.code&&r.barcode);assert.equal(typeof r.code,'string');assert.equal(typeof r.barcode,'string');assert.ok([8,13,14].includes(r.barcode.length));
 const digits=[...r.barcode].map(Number),check=digits.pop();const weighted=digits.reverse().reduce((sum,n,i)=>sum+n*(i%2===0?3:1),0);assert.equal((weighted+check)%10,0,'GS1 check '+r.code);
 assert.ok(Number.isInteger(r.expected)&&r.expected>0);assert.ok(['CAR','PAC','PC','SAC'].includes(r.unit));
 const ref=r.sourcePage+'|'+r.sourceRow;assert.ok(!refs.has(ref),'duplicate source reference '+ref);refs.add(ref);
 pages[r.sourcePage]=(pages[r.sourcePage]||0)+1;totals[r.unit]=(totals[r.unit]||0)+r.expected;
 if(codes.has(r.code))assert.equal(codes.get(r.code),r.barcode);else codes.set(r.code,r.barcode);
}
assert.deepEqual(pages,data.metadata.linesPerPage);assert.deepEqual(totals,{CAR:96,PAC:261,SAC:3,PC:276});assert.deepEqual(data.metadata.totalsByUnit,{CAR:96,PAC:261,PC:276,SAC:3});
assert.equal(data.items.filter(x=>x.sourceRow.startsWith('C')).length,56);assert.equal(data.items.filter(x=>x.sourceRow.startsWith('C')).reduce((n,x)=>n+x.expected,0),101);
const groups=new Map();for(const r of data.items.filter(x=>x.sourceRow.startsWith('T'))){const [group,line]=r.sourceRow.split('-');if(!groups.has(group))groups.set(group,[]);groups.get(group).push(+line);}
assert.equal(groups.size,35);for(let i=1;i<=35;i++){const lines=groups.get('T'+i).sort((a,b)=>a-b);assert.deepEqual(lines,Array.from({length:lines.length},(_,i)=>i+1),'Tote '+i+' contiguous lines');}
assert.equal(data.items.find(x=>x.code==='20007818').packSize,8);assert.equal(data.items.find(x=>x.code==='20004105').packSize,15);
assert.equal(data.items.find(x=>x.sourcePage===6&&x.sourceRow==='T10-8').barcode,'8851111423378');
console.log('PASS: 345 lines across all 12 pages; 56 carton lines sum to printed 101; all 35 totes/contiguous line references; per-unit quantities; code/barcode consistency; all 345 GS1 checks; leading zeros; confirmed water pack sizes.');
