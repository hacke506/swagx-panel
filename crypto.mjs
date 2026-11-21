const encoder=new TextEncoder(),decoder=new TextDecoder();let cached;
export function base64(bytes){let text='';for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(text)}
export function unbase64(text){return Uint8Array.from(atob(text),c=>c.charCodeAt(0))}
async function key(secret){if(!cached||cached.secret!==secret)cached={secret,promise:crypto.subtle.digest('SHA-256',encoder.encode(secret)).then(hash=>crypto.subtle.importKey('raw',hash,'AES-GCM',false,['encrypt','decrypt']))};return cached.promise}
export async function seal(value,secret,aad){const iv=crypto.getRandomValues(new Uint8Array(12));const bytes=encoder.encode(JSON.stringify(value));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(aad)},await key(secret),bytes);return JSON.stringify({iv:base64(iv),data:base64(new Uint8Array(data))})}
export async function open(value,secret,aad){const envelope=JSON.parse(value);const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(envelope.iv),additionalData:encoder.encode(aad)},await key(secret),unbase64(envelope.data));return JSON.parse(decoder.decode(data))}
