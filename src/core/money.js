(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.TaxMateMoney=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const MAX_MINOR=Number.MAX_SAFE_INTEGER;

  function assertMinor(value,label='Amount',options={}){
    if(!Number.isSafeInteger(value)) throw new Error(label+' must be an integer number of pence');
    if(options.nonNegative===true&&value<0) throw new Error(label+' must not be negative');
    return value;
  }

  function decimalStringToMinor(value){
    const text=String(value).trim();
    const match=/^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(text);
    if(!match) throw new Error('Amount must have no more than two decimal places');
    const sign=match[1]==='-'?-1n:1n;
    const pounds=BigInt(match[2]);
    const pence=BigInt((match[3]||'').padEnd(2,'0')||'0');
    const minor=sign*(pounds*100n+pence);
    if(minor>BigInt(MAX_MINOR)||minor<BigInt(-MAX_MINOR)) throw new Error('Amount exceeds the safe pence range');
    return Number(minor);
  }

  function poundsToMinorExact(value){
    if(typeof value==='string') return decimalStringToMinor(value);
    if(typeof value!=='number'||!Number.isFinite(value)) throw new Error('Amount must be a finite number or decimal string');
    const scaled=value*100;
    const rounded=Math.round(scaled);
    const tolerance=Number.EPSILON*Math.max(1,Math.abs(scaled))*4;
    if(!Number.isSafeInteger(rounded)||Math.abs(scaled-rounded)>tolerance) throw new Error('Amount must have no more than two decimal places');
    return rounded;
  }

  function minorToDecimal(value){
    assertMinor(value);
    const sign=value<0?'-':'';
    const absolute=Math.abs(value);
    return sign+Math.floor(absolute/100)+'.'+String(absolute%100).padStart(2,'0');
  }

  function sumMinor(values,label='Amount total'){
    let total=0;
    for(const value of values||[]){
      assertMinor(value,label+' item');
      total+=value;
      if(!Number.isSafeInteger(total)) throw new Error(label+' exceeds the safe pence range');
    }
    return total;
  }

  function allocateMinor(totalMinor,weights){
    assertMinor(totalMinor,'Allocation total',{nonNegative:true});
    if(!Array.isArray(weights)||weights.length===0) throw new Error('Allocation weights are required');
    const prepared=weights.map((weight,index)=>{
      if(!Number.isSafeInteger(weight)||weight<0) throw new Error('Allocation weights must be non-negative safe integers');
      return {index,weight:BigInt(weight)};
    });
    const totalWeight=prepared.reduce((sum,item)=>sum+item.weight,0n);
    if(totalWeight===0n) throw new Error('At least one allocation weight must be positive');
    const total=BigInt(totalMinor);
    const result=new Array(weights.length).fill(0);
    let assigned=0n;
    const remainders=[];
    prepared.forEach(item=>{
      const numerator=total*item.weight;
      const quotient=numerator/totalWeight;
      const remainder=numerator%totalWeight;
      result[item.index]=Number(quotient);
      assigned+=quotient;
      remainders.push({index:item.index,remainder});
    });
    let pennies=Number(total-assigned);
    remainders.sort((a,b)=>a.remainder===b.remainder?a.index-b.index:(a.remainder>b.remainder?-1:1));
    for(let index=0;index<pennies;index++) result[remainders[index].index]+=1;
    if(sumMinor(result,'Allocation total')!==totalMinor) throw new Error('Allocation did not preserve every penny');
    return result;
  }

  function assertAllocationTotal(sourceMinor,legs){
    assertMinor(sourceMinor,'Source amount',{nonNegative:true});
    if(!Array.isArray(legs)||legs.length===0) throw new Error('At least one allocation leg is required');
    const total=sumMinor(legs.map(leg=>{
      if(!leg||typeof leg!=='object') throw new Error('Allocation leg must be an object');
      return assertMinor(leg.amountMinor,'Allocation amount',{nonNegative:true});
    }),'Allocation total');
    if(total!==sourceMinor) throw new Error('Allocation legs must preserve 100% and every penny');
    return true;
  }

  return {MAX_MINOR,assertMinor,poundsToMinorExact,minorToDecimal,sumMinor,allocateMinor,assertAllocationTotal};
});
