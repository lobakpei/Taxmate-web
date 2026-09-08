'use strict';
// Local protocol double for normal workflows. This is NOT Stripe TEST evidence.
const http=require('node:http'),qs=require('qs');
const clone=v=>JSON.parse(JSON.stringify(v));
function createProvider(){
  if(process.env.GCLOUD_PROJECT!=='demo-taxmate')throw new Error('Demo project required');
  const data={customers:{},subscriptions:{},invoices:{},charges:{},refunds:{},schedules:{},sessions:{},requests:[]},keys=new Map();let serial=1,server;
  const prices={price_plus_monthly:{id:'price_plus_monthly',currency:'gbp',unit_amount:399,active:true,recurring:{interval:'month',interval_count:1}},price_plus_yearly:{id:'price_plus_yearly',currency:'gbp',unit_amount:2999,active:true,recurring:{interval:'year',interval_count:1}},price_pro_monthly:{id:'price_pro_monthly',currency:'gbp',unit_amount:999,active:true,recurring:{interval:'month',interval_count:1}},price_pro_yearly:{id:'price_pro_yearly',currency:'gbp',unit_amount:9999,active:true,recurring:{interval:'year',interval_count:1}}};
  const id=prefix=>prefix+'_'+serial++,list=(rows,p)=>{let values=rows;if(p.starting_after){const pos=values.findIndex(v=>v.id===p.starting_after);values=values.slice(pos+1);}const limit=Number(p.limit||10);return{object:'list',data:clone(values.slice(0,limit)),has_more:values.length>limit,url:'/v1/local'};};
  function seed(uid,tier='plus',options={}){
const customerId=options.customerId||id('cus'),subscriptionId=id('sub'),invoiceId=id('in'),chargeId=id('ch'),stamp=Math.floor(Date.now()/1000),end=options.end||stamp+20*86400,start=options.start||stamp-10*86400,price=prices['price_'+tier+'_'+(options.cadence||'monthly')];
    data.customers[customerId]={id:customerId,object:'customer',metadata:{firebaseUid:uid},email:uid+'@taxmate.local'};
    const sub={id:subscriptionId,object:'subscription',customer:customerId,status:'active',currency:'gbp',collection_method:'charge_automatically',metadata:{firebaseUid:uid},cancel_at_period_end:false,current_period_start:start,current_period_end:end,items:{object:'list',data:[{id:id('si'),price:clone(price),quantity:1,current_period_start:start,current_period_end:end}],has_more:false},latest_invoice:invoiceId,pending_update:null,schedule:null};
    const invoice={id:invoiceId,object:'invoice',customer:customerId,subscription:subscriptionId,parent:{subscription_details:{subscription:subscriptionId}},status:'paid',currency:'gbp',amount_paid:price.unit_amount,amount_due:price.unit_amount,amount_remaining:0,created:start,hosted_invoice_url:'https://invoice.stripe.com/i/local_'+invoiceId,lines:{object:'list',data:[{id:id('il'),amount:price.unit_amount,price:clone(price),pricing:{price_details:{price:price.id}},period:{start,end}}],has_more:false}};
    const charge={id:chargeId,object:'charge',customer:customerId,invoice:invoiceId,payment_intent:id('pi'),created:start,amount:price.unit_amount,currency:'gbp',paid:true,status:'succeeded',amount_refunded:0,refunded:false,receipt_url:'https://receipt.stripe.com/local/'+chargeId};
    data.subscriptions[subscriptionId]=sub;data.invoices[invoiceId]=invoice;data.charges[chargeId]=charge;
    return{customerId,subscriptionId,invoiceId,chargeId};
  }
  function preview(p){const sub=data.subscriptions[p.subscription],target=prices[p.subscription_details.items[0].price],item=sub.items.data[0],end=sub.current_period_end,start=sub.current_period_start,at=Number(p.subscription_details.proration_date),fraction=(end-at)/(end-start),credit=Math.round(item.price.unit_amount*fraction),charge=Math.round(target.unit_amount*fraction);return{id:'upcoming',object:'invoice',customer:sub.customer,currency:'gbp',amount_due:charge-credit,lines:{data:[{id:'credit',amount:-credit,price:item.price,period:{start:at,end}},{id:'new',amount:charge,price:target,period:{start:at,end}}],has_more:false}};}
  function completeUpgrade(subscriptionId){const sub=data.subscriptions[subscriptionId],invoice=data.invoices[sub.latest_invoice],target=prices[sub.pending_update.subscription_items[0].price];invoice.status='paid';invoice.amount_paid=invoice.amount_due;invoice.amount_remaining=0;sub.items.data[0].price=clone(target);sub.pending_update=null;const charge={id:id('ch'),customer:sub.customer,invoice:invoice.id,created:Math.floor(Date.now()/1000),amount:invoice.amount_paid,currency:'gbp',paid:true,status:'succeeded',payment_intent:id('pi'),amount_refunded:0,refunded:false};data.charges[charge.id]=charge;return clone(invoice);}
  function completeRefund(refundId,status='succeeded'){const r=data.refunds[refundId];r.status=status;const c=data.charges[r.charge],sum=Object.values(data.refunds).filter(v=>v.charge===c.id&&v.status==='succeeded').reduce((n,v)=>n+v.amount,0);c.amount_refunded=sum;c.refunded=sum>=c.amount;return clone(r);}
  function completeCheckout(sessionId){const session=data.sessions[sessionId],price=prices[session.line_items[0].price],tier=price.id.includes('_pro_')?'pro':'plus',uid=session.metadata.firebaseUid,seeded=seed(uid,tier,{customerId:session.customer});session.status='complete';session.payment_status='paid';session.subscription=seeded.subscriptionId;session.invoice=seeded.invoiceId;return clone(session);}
  async function route(method,path,p){
    const bits=path.split('/').filter(Boolean),kind=bits[1],objectId=bits[2],tail=bits[3];
    if(kind==='prices')return clone(prices[objectId]);
    if(kind==='customers'){if(method==='POST'&&!objectId){const c={id:id('cus'),object:'customer',...p};data.customers[c.id]=c;return c;}return clone(data.customers[objectId]);}
    if(kind==='charges')return objectId?clone(data.charges[objectId]):list(Object.values(data.charges).filter(c=>c.customer===p.customer).sort((a,b)=>b.created-a.created),p);
    if(kind==='refunds'){
      if(objectId)return clone(data.refunds[objectId]);
      if(method==='GET')return list(Object.values(data.refunds).filter(r=>r.charge===p.charge),p);
      const r={id:id('re'),object:'refund',charge:p.charge,amount:Number(p.amount),currency:data.charges[p.charge].currency,status:'pending',created:Math.floor(Date.now()/1000),metadata:p.metadata};data.refunds[r.id]=r;return clone(r);
    }
    if(kind==='invoice_payments')return list(Object.values(data.charges).filter(c=>c.payment_intent===p.payment?.payment_intent).map(c=>({id:'ip_'+c.id,status:'paid',invoice:c.invoice})),p);
    if(kind==='invoices'){
      if(objectId==='create_preview')return preview(p);
      if(tail==='lines')return list(data.invoices[objectId].lines.data,p);
      return objectId?clone(data.invoices[objectId]):list(Object.values(data.invoices).filter(i=>i.customer===p.customer&&(!p.status||i.status===p.status)),p);
    }
    if(kind==='subscriptions'){
      if(!objectId)return list(Object.values(data.subscriptions).filter(s=>s.customer===p.customer),p);
      const sub=data.subscriptions[objectId];
      if(method==='POST'){
        if(p.cancel_at_period_end!==undefined)sub.cancel_at_period_end=p.cancel_at_period_end==='true';
        if(p.items){const quote=preview({subscription:sub.id,subscription_details:{items:p.items,proration_date:p.proration_date}}),invoiceId=id('in');
          data.invoices[invoiceId]={...quote,id:invoiceId,subscription:sub.id,status:'open',amount_remaining:quote.amount_due,amount_paid:0,created:Math.floor(Date.now()/1000),hosted_invoice_url:'https://invoice.stripe.com/i/local_'+invoiceId};sub.latest_invoice=invoiceId;sub.pending_update={subscription_items:[{id:sub.items.data[0].id,price:p.items[0].price}],expires_at:Math.floor(Date.now()/1000)+86400};
        }
      }
      const result=clone(sub);if(p.expand)result.latest_invoice=clone(data.invoices[sub.latest_invoice]);return result;
    }
    if(kind==='subscription_schedules'){
      if(!objectId){const sub=data.subscriptions[p.from_subscription],schedule={id:id('sub_sched'),object:'subscription_schedule',subscription:sub.id,phases:[{start_date:sub.current_period_start,end_date:sub.current_period_end,items:[{price:sub.items.data[0].price.id,quantity:1}]}]};sub.schedule=schedule.id;data.schedules[schedule.id]=schedule;return clone(schedule);}
      const schedule=data.schedules[objectId];if(tail==='release'){data.subscriptions[schedule.subscription].schedule=null;schedule.status='released';}
      else if(method==='POST'){schedule.phases=p.phases.map(phase=>({...phase,start_date:Number(phase.start_date),end_date:phase.end_date?Number(phase.end_date):undefined,items:phase.items.map(i=>({...i,quantity:Number(i.quantity)}))}));schedule.end_behavior=p.end_behavior;}
      return clone(schedule);
    }
    if(kind==='billing_portal')return{id:id('bps'),url:'https://billing.stripe.com/p/session/local'};
    if(kind==='checkout'){
      if(method==='GET')return clone(data.sessions[tail]);
      const session={id:id('cs'),object:'checkout.session',status:'open',payment_status:'unpaid',customer:p.customer,url:'https://checkout.stripe.com/c/pay/local',metadata:p.metadata,line_items:p.line_items};data.sessions[session.id]=session;return session;
    }
    throw new Error('Unimplemented normal provider route: '+method+' '+path);
  }
  return{data,seed,completeUpgrade,completeRefund,completeCheckout,prices,async start(port=32777){server=http.createServer(async(req,res)=>{try{let body='';for await(const chunk of req)body+=chunk;const url=new URL(req.url,'http://127.0.0.1'),p=req.method==='GET'?qs.parse(url.search.slice(1)):qs.parse(body),key=req.headers['idempotency-key'];data.requests.push({method:req.method,path:url.pathname,params:clone(p),key:key||null});let result;if(key&&keys.has(key))result=keys.get(key);else{result=await route(req.method,url.pathname,p);if(key)keys.set(key,clone(result));}res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(result));}catch(e){res.writeHead(400,{'content-type':'application/json'});res.end(JSON.stringify({error:{type:'invalid_request_error',message:e.message}}));}});await new Promise(r=>server.listen(port,'127.0.0.1',r));},async close(){if(server)await new Promise(r=>server.close(r));}};
}
module.exports={createProvider};
