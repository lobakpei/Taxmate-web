const path=require('node:path');

const root=path.resolve(__dirname,'..');
const Stripe=require(path.join(root,'functions','node_modules','stripe'));

const required=['STRIPE_SECRET_KEY','TAXMATE_STRIPE_ACCOUNT_ID','STRIPE_PLUS_PRICE_ID','STRIPE_PRO_PRICE_ID'];
for(const name of required){if(!process.env[name])throw new Error(`Missing ${name}`);}

const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);

async function ensurePromotion({code,name,tier,days,active=true}){
  const existing=(await stripe.promotionCodes.list({code,limit:1})).data[0];
  if(existing){
    if(existing.metadata.taxmate_tier!==tier||Number(existing.metadata.taxmate_free_days)!==days)throw new Error(`${code} metadata mismatch`);
    if(existing.active!==active)await stripe.promotionCodes.update(existing.id,{active});
    return existing.id;
  }
  const coupon=await stripe.coupons.create({name,percent_off:100,duration:'once',metadata:{taxmate_fixture:'true',taxmate_tier:tier,taxmate_free_days:String(days)}});
  const promotion=await stripe.promotionCodes.create({coupon:coupon.id,code,active:true,metadata:{taxmate_fixture:'true',taxmate_tier:tier,taxmate_free_days:String(days)}});
  if(!active)await stripe.promotionCodes.update(promotion.id,{active:false});
  return promotion.id;
}

async function main(){
  const account=await stripe.accounts.retrieve();
  if(account.id!==process.env.TAXMATE_STRIPE_ACCOUNT_ID)throw new Error(`Stripe account mismatch: ${account.id}`);
  const [plus,pro]=await Promise.all([stripe.prices.retrieve(process.env.STRIPE_PLUS_PRICE_ID),stripe.prices.retrieve(process.env.STRIPE_PRO_PRICE_ID)]);
  if(plus.currency!=='gbp'||plus.unit_amount!==399||plus.recurring?.interval!=='month')throw new Error('Plus price mismatch');
  if(pro.currency!=='gbp'||pro.unit_amount!==849||pro.recurring?.interval!=='month')throw new Error('Pro price mismatch');
  if(plus.tax_behavior==='inclusive'||pro.tax_behavior==='inclusive')throw new Error('Prices must not claim VAT inclusion');
  const plusPromotion=await ensurePromotion({code:'TAXMATEPLUS30',name:'TaxMate Plus 30-day TEST fixture',tier:'plus',days:30});
  const proPromotion=await ensurePromotion({code:'TAXMATEPRO90',name:'TaxMate Pro 90-day TEST fixture',tier:'pro',days:90});
  const expiredPromotion=await ensurePromotion({code:'TAXMATEEXPIRED',name:'TaxMate expired TEST fixture',tier:'plus',days:30,active:false});
  console.log(JSON.stringify({accountId:account.id,plusProductId:plus.product,plusPriceId:plus.id,proProductId:pro.product,proPriceId:pro.id,plusPromotionId:plusPromotion,proPromotionId:proPromotion,expiredPromotionId:expiredPromotion},null,2));
}

main().catch(error=>{console.error(error.message);process.exitCode=1;});
