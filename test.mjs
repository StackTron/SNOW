const BASE='http://127.0.0.1:3000';
const fetch=globalThis.fetch;
const log=(...a)=>console.log('[TEST]',...a);

async function req(method, path, body, cookie='', csrf=''){
  const headers={'Content-Type':'application/json'};
  if(cookie)headers['Cookie']=cookie;
  if(csrf)headers['X-CSRF-Token']=csrf;
  const opts={method,headers};
  if(body)opts.body=JSON.stringify(body);
  const r=await fetch(BASE+path,opts);
  const data=await r.json().catch(()=>({}));
  const setCookie=r.headers.get('set-cookie')||'';
  const sid=(setCookie.match(/santa_session=([^;]+)/)||[])[1]||'';
  return {ok:r.ok,status:r.status,data,sid};
}

async function run(){
  log('1. Testing /api/me (no session)');
  let r=await req('GET','/api/me');
  if(!r.ok||r.data.user!==null)throw Error('FAIL: me should be null');
  log('OK: user is null');

  log('2. Register user A');
  r=await req('POST','/api/register',{firstName:'Иван',lastName:'Петров',email:'ivan@example.com',password:'password123',passwordConfirm:'password123'});
  if(!r.ok)throw Error('FAIL register A: '+JSON.stringify(r.data));
  const userA=r.data.user, csrfA=r.data.csrf, cookieA=`santa_session=${r.sid}`, codeA=r.data.recoveryCode;
  log('OK: registered A, code='+codeA);

  log('3. Create event as A');
  r=await req('POST','/api/events',{title:'Семья 2027',description:'Новогодний розыгрыш',isPublic:true},cookieA,csrfA);
  if(!r.ok)throw Error('FAIL create event: '+JSON.stringify(r.data));
  const eventId=r.data.event.id, inviteToken=r.data.event.inviteToken;
  log('OK: event created id='+eventId+' invite='+inviteToken);

  log('4. Register user B');
  r=await req('POST','/api/register',{firstName:'Мария',lastName:'Сидорова',email:'maria@example.com',password:'password123',passwordConfirm:'password123'});
  if(!r.ok)throw Error('FAIL register B: '+JSON.stringify(r.data));
  const userB=r.data.user, csrfB=r.data.csrf, cookieB=`santa_session=${r.sid}`;
  log('OK: registered B');

  log('5. B joins event via invite link');
  r=await req('POST',`/api/events/${eventId}/join`,{inviteToken},cookieB,csrfB);
  if(!r.ok)throw Error('FAIL join: '+JSON.stringify(r.data));
  log('OK: B joined');

  log('6. A joins own event');
  r=await req('POST',`/api/events/${eventId}/join`,{},cookieA,csrfA);
  if(!r.ok)throw Error('FAIL A join: '+JSON.stringify(r.data));
  log('OK: A joined');

  log('7. A runs draw');
  r=await req('POST',`/api/events/${eventId}/draw`,{confirm:true},cookieA,csrfA);
  if(!r.ok)throw Error('FAIL draw: '+JSON.stringify(r.data));
  log('OK: draw completed');

  log('8. A views event and sees recipient');
  r=await req('GET',`/api/events/${eventId}`,null,cookieA);
  if(!r.ok||!r.data.recipient)throw Error('FAIL A recipient: '+JSON.stringify(r.data));
  log('OK: A recipient='+r.data.recipient.firstName+' '+r.data.recipient.lastName);
  const chatsA=r.data.chats;
  if(!chatsA||chatsA.length===0)throw Error('FAIL: no chats for A');
  log('OK: A has '+chatsA.length+' chat(s)');

  log('9. B views event and sees recipient');
  r=await req('GET',`/api/events/${eventId}`,null,cookieB);
  if(!r.ok||!r.data.recipient)throw Error('FAIL B recipient: '+JSON.stringify(r.data));
  log('OK: B recipient='+r.data.recipient.firstName+' '+r.data.recipient.lastName);
  const chatsB=r.data.chats;
  if(!chatsB||chatsB.length===0)throw Error('FAIL: no chats for B');
  log('OK: B has '+chatsB.length+' chat(s)');

  log('10. A sends message to recipient');
  const chatIdA=chatsA[0].id;
  r=await req('POST',`/api/chats/${chatIdA}/messages`,{body:'Привет! Что ты хочешь на Новый год?'},cookieA,csrfA);
  if(!r.ok)throw Error('FAIL send msg A: '+JSON.stringify(r.data));
  log('OK: A sent message');

  log('11. B reads messages (should see from Тайный Санта)');
  const chatIdB=chatsB.find(c=>c.role==='recipient')?.id;
  if(!chatIdB)throw Error('FAIL: B has no recipient chat');
  r=await req('GET',`/api/chats/${chatIdB}/messages`,null,cookieB);
  if(!r.ok)throw Error('FAIL B read: '+JSON.stringify(r.data));
  if(!r.data.messages||r.data.messages.length===0)throw Error('FAIL: no messages for B');
  const msg=r.data.messages[0];
  log('OK: B sees message from '+msg.author+': '+msg.body);
  if(msg.author!=='Тайный Санта')throw Error('FAIL: author should be Тайный Санта, got '+msg.author);

  log('12. B replies');
  r=await req('POST',`/api/chats/${chatIdB}/messages`,{body:'Хочу книгу!'},cookieB,csrfB);
  if(!r.ok)throw Error('FAIL send msg B: '+JSON.stringify(r.data));
  log('OK: B replied');

  log('13. A reads reply (should see from Тайный Санта for anonymity)');
  r=await req('GET',`/api/chats/${chatIdA}/messages`,null,cookieA);
  if(!r.ok)throw Error('FAIL A read: '+JSON.stringify(r.data));
  if(r.data.messages.length<2)throw Error('FAIL: A should see 2 messages');
  const reply=r.data.messages[1];
  log('OK: A sees reply from '+reply.author+': '+reply.body);
  if(reply.author!=='Тайный Санта')throw Error('FAIL: reply author should be Тайный Санта for anonymity, got '+reply.author);

  log('14. Verify public events list');
  r=await req('GET','/api/events');
  if(!r.ok)throw Error('FAIL public events: '+JSON.stringify(r.data));
  if(!r.data.events||r.data.events.length===0)throw Error('FAIL: no public events');
  log('OK: '+r.data.events.length+' public event(s)');

  log('15. Test password reset with recovery code');
  r=await req('POST','/api/reset-password',{email:'ivan@example.com',recoveryCode:codeA,password:'newpass123',passwordConfirm:'newpass123'});
  if(!r.ok)throw Error('FAIL reset: '+JSON.stringify(r.data));
  log('OK: password reset');

  log('16. Login with new password');
  r=await req('POST','/api/login',{email:'ivan@example.com',password:'newpass123'});
  if(!r.ok)throw Error('FAIL login new pass: '+JSON.stringify(r.data));
  log('OK: logged in with new password');

  log('\n✓ ALL TESTS PASSED');
}

run().catch(e=>{console.error('TEST FAILED:',e.message);process.exit(1)});
