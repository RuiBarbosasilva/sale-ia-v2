import {Request,Response} from 'express'; import {rbFactoryBenchmarkService} from '../services/rbFactoryBenchmarkService';
export const rbFactoryBenchmarkController={
 catalog(_req:Request,res:Response){res.json({success:true,totalDemos:100,niches:rbFactoryBenchmarkService.catalog()});},
 demo(req:Request,res:Response){const html=rbFactoryBenchmarkService.render(String(req.params.niche),Number(req.params.index));res.type('html').send(html);}
};
