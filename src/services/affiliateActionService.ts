import { prisma } from '../modules/mercadoLivre/lib/prisma';

export const affiliateActionService={
 async list(status?:string){return prisma.affiliateAction.findMany({where:status?{status}:undefined,orderBy:{createdAt:'desc'},take:200,include:{network:{select:{name:true,slug:true}},campaign:{select:{name:true,id:true}}}});},
 async approve(id:string){const a=await prisma.affiliateAction.findUnique({where:{id}});if(!a)throw new Error('ACTION_NOT_FOUND');if(a.status!=='PENDING_APPROVAL'&&a.status!=='READY')throw new Error('ACTION_NOT_APPROVABLE');return prisma.affiliateAction.update({where:{id},data:{status:'APPROVED'}});},
 async reject(id:string,reason?:string){const a=await prisma.affiliateAction.findUnique({where:{id}});if(!a)throw new Error('ACTION_NOT_FOUND');return prisma.affiliateAction.update({where:{id},data:{status:'REJECTED',result:reason||'Rejeitada pelo supervisor'}});},
 async markExecuted(id:string,result?:unknown){const a=await prisma.affiliateAction.findUnique({where:{id}});if(!a)throw new Error('ACTION_NOT_FOUND');if(a.status!=='APPROVED')throw new Error('ACTION_NOT_APPROVED');return prisma.affiliateAction.update({where:{id},data:{status:'EXECUTED',executedAt:new Date(),result:result?JSON.stringify(result):'Executada'}});}
};