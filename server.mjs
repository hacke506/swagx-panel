import http from 'node:http';import {Readable} from 'node:stream';import fs from 'node:fs/promises';import {handle} from './worker.mjs';import {createEnvironment} from './runtime.mjs';
const token=process.env.AGENT_TOKEN,secret=process.env.BRIDGE_SECRET;if(!token||!secret||token.length<32||secret.length<32)throw Error('Set AGENT_TOKEN and BRIDGE_SECRET using private environment variables.');
const origin=new URL(process.env.PUBLIC_ORIGIN||process.env.RENDER_EXTERNAL_URL||'http://localhost:8789');if(origin.protocol!=='https:'&&origin.hostname!=='localhost')throw Error('HTTPS public origin required');
const {env}=await createEnvironment({AGENT_TOKEN:token,BRIDGE_SECRET:secret,GOOGLE_ENABLED:process.env.GOOGLE_ENABLED||'false'}),assets={};
for(const [route,file]of [['/','index.html'],['/app.js','app.js'],['/style.css','style.css']])assets[route]=await fs.readFile(new URL('./public/'+file,import.meta.url),'utf8');
const server=http.createServer(async(req,res)=>{try{
  if(req.url==='/healthz'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok');return}
  if(!req.url.startsWith('/')||req.url.startsWith('//')){res.writeHead(400);res.end();return}
  if(![origin.host,'localhost:'+process.env.PORT].includes(req.headers.host)){res.writeHead(403);res.end();return}
  const headers=new Headers();for(const name of ['origin','cookie','content-type','authorization','x-csrf-token','content-length']){const value=req.headers[name];if(typeof value==='string')headers.set(name,value)}
  // Render appends the client address through its trusted frontend proxy.
  const forwarded=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',').at(-1).trim();headers.set('cf-connecting-ip',forwarded);
  const options={method:req.method,headers};if(!['GET','HEAD'].includes(req.method)){options.body=Readable.toWeb(req);options.duplex='half'}
  const request=new Request(new URL(req.url,origin),options),ctx={waitUntil(p){void p.catch(e=>console.error('Cleanup failed:',e.name))}};
  const response=await handle(request,env,ctx,assets);res.statusCode=response.status;
  for(const [name,value]of response.headers)if(name!=='set-cookie')res.setHeader(name,value);
  const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);
  if(!response.body){res.end();return}const stream=Readable.fromWeb(response.body);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
}catch(e){console.error('Request failed:',e.name);if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Не удалось выполнить запрос'}))}});
server.requestTimeout=120000;server.headersTimeout=20000;server.listen(Number(process.env.PORT||8789),'0.0.0.0',()=>console.log('SwagX service ready at '+origin.origin));
