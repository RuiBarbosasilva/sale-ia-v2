const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const required=['package.json','tsconfig.json','prisma/schema.prisma','src/app.ts'];
const failures=[];
for(const rel of required) if(!fs.existsSync(path.join(root,rel))) failures.push('missing:'+rel);
const env=process.env;
for(const [name,min] of [['AFFILIATE_ADMIN_KEY',16],['AFFILIATE_WEBHOOK_KEY',16],['AFFILIATE_CREDENTIALS_KEY',64]]){
  const v=env[name];
  if(v && v.length<min) failures.push('weak-secret:'+name);
}
if(env.AFFILIATE_CREDENTIALS_KEY && !/^[0-9a-fA-F]{64}$/.test(env.AFFILIATE_CREDENTIALS_KEY)) failures.push('invalid-key-format:AFFILIATE_CREDENTIALS_KEY');
console.log('Guardian verify');
if(failures.length){ failures.forEach(x=>console.error('FAIL '+x)); process.exit(1); }
console.log('PASS: estrutura e política de secrets verificadas.');
