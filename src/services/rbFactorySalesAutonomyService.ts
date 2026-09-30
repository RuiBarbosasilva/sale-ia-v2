import { rbFactorySalesAgentService } from './rbFactorySalesAgentService';

type SellerStatus='RUNNING'|'STOPPED';
type Run={id:string;createdAt:string;status:string;message:string;result?:any};
type Alert={id:string;createdAt:string;message:string;status:'OPEN'|'ACKNOWLEDGED'|'RESOLVED'};

let status:SellerStatus='STOPPED';
let timer:NodeJS.Timeout|null=null;
const runs:Run[]=[];
const alerts:Alert[]=[];

function pushRun(run:Run){runs.unshift(run);if(runs.length>50)runs.length=50;}
async function cycle(){
  if(status!=='RUNNING') return;
  try{
    const result=await rbFactorySalesAgentService.prepareNextSellerAction();
    pushRun({id:crypto.randomUUID(),createdAt:new Date().toISOString(),status:'SUCCESS',message:result.hasAction?'Próxima ação comercial preparada.':'Fila comercial sem ação disponível.',result});
  }catch(error:any){
    const message=String(error?.message||error||'Erro no ciclo do vendedor');
    pushRun({id:crypto.randomUUID(),createdAt:new Date().toISOString(),status:'ERROR',message});
    alerts.unshift({id:crypto.randomUUID(),createdAt:new Date().toISOString(),message,status:'OPEN'});
    if(alerts.length>20)alerts.length=20;
  }
}
export const rbFactorySalesAutonomyService={
  status(){return {status,lastRun:runs[0]||null,intervalMs:5*60*1000};},
  history(limit=20){return {runs:runs.slice(0,Math.min(50,Math.max(1,limit)))};},
  alerts(limit=10){return {alerts:alerts.filter(a=>a.status!=='RESOLVED').slice(0,Math.min(20,Math.max(1,limit)))};},
  async start(){
    if(status==='RUNNING') return this.status();
    status='RUNNING';
    await cycle();
    timer=setInterval(()=>{void cycle();},5*60*1000);
    return this.status();
  },
  stop(){
    status='STOPPED';
    if(timer){clearInterval(timer);timer=null;}
    return this.status();
  },
  acknowledge(id:string){
    const alert=alerts.find(a=>a.id===id);if(!alert)throw new Error('SELLER_ALERT_NOT_FOUND');
    alert.status='ACKNOWLEDGED';return alert;
  },
  resolve(id:string){
    const alert=alerts.find(a=>a.id===id);if(!alert)throw new Error('SELLER_ALERT_NOT_FOUND');
    alert.status='RESOLVED';return alert;
  }
};
