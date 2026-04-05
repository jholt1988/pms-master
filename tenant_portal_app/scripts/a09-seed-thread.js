const API='http://127.0.0.1:3001/api';

async function login(username,password){
  const r=await fetch(`${API}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,password})});
  if(!r.ok) throw new Error(`login ${username} failed ${r.status}`);
  const j=await r.json();
  return j.access_token||j.accessToken;
}

(async()=>{
  const tenantToken=await login('tenant','Tenant123!@#');
  const resPm=await fetch(`${API}/messaging/property-managers`,{headers:{Authorization:`Bearer ${tenantToken}`}});
  if(!resPm.ok) throw new Error(`property-managers failed ${resPm.status}`);
  const pms=await resPm.json();
  const pm = Array.isArray(pms)
    ? (pms.find((u)=>u.username==='admin') || pms.find((u)=>u.username==='morgan_pm') || pms[0])
    : null;
  if(!pm?.id) throw new Error('No property manager found');

  const uid=Date.now();
  const subject=`A09 Thread ${uid}`;
  const initial=`A09 initial message ${uid}`;

  const threadRes=await fetch(`${API}/messaging/threads`,{
    method:'POST',
    headers:{'content-type':'application/json',Authorization:`Bearer ${tenantToken}`},
    body:JSON.stringify({recipientId:pm.id,subject,content:initial})
  });
  if(!threadRes.ok){const t=await threadRes.text();throw new Error(`create thread failed ${threadRes.status} ${t}`)}
  const thread=await threadRes.json();

  console.log(JSON.stringify({subject,initial,conversationId:thread.id,pmId:pm.id},null,2));
})();