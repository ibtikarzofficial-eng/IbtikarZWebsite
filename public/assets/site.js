(function(){
'use strict';

const menu=document.querySelector('[data-menu]');
const mobile=document.querySelector('[data-mobile-nav]');
if(menu&&mobile){
  menu.addEventListener('click',()=>{
    const open=!mobile.classList.contains('open');
    mobile.classList.toggle('open',open);
    menu.setAttribute('aria-expanded',String(open));
  });
}

const cookie=document.querySelector('[data-cookie]');
function syncCookie(){
  if(!cookie||!window.IbtikarZConsent)return;
  const value=window.IbtikarZConsent.current();
  cookie.hidden=value!=='unknown';
  document.body.classList.toggle('cookie-open',value==='unknown');
}
const accept=document.querySelector('[data-accept]');
const decline=document.querySelector('[data-decline]');
if(accept)accept.addEventListener('click',()=>{window.IbtikarZConsent.grant();syncCookie();});
if(decline)decline.addEventListener('click',()=>{window.IbtikarZConsent.deny();syncCookie();});
syncCookie();

function track(name,params={}){
  if(window.IbtikarZConsent&&window.IbtikarZConsent.current()==='granted'&&typeof window.gtag==='function'){
    window.gtag('event',name,{page_path:location.pathname,...params});
  }
  if(typeof window.clarity==='function')window.clarity('event',name);
}
window.IbtikarZTrack=track;

const attrKeys=['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','msclkid'];
const turnstileSiteKey=(window.IBTIKARZ_TURNSTILE_SITEKEY||'').trim();
const leadForms=[...document.querySelectorAll('form[data-lead-form]')];
const turnstileWidgets=new Map();

function formMessage(form,text,isError=false){
  const msg=form.querySelector('[data-form-message]');
  if(!msg)return;
  msg.className='form-message';
  if(text){
    msg.textContent=text;
    msg.classList.add('show');
    if(isError)msg.classList.add('error');
  }else{
    msg.textContent='';
  }
}

function submitButton(form){return form.querySelector('button[type="submit"]');}
function setSubmitReady(form,ready){
  const button=submitButton(form);
  if(!button)return;
  button.disabled=!ready;
  if(ready)button.removeAttribute('aria-disabled');
  else button.setAttribute('aria-disabled','true');
}

function resetTurnstile(form){
  if(!turnstileSiteKey)return;
  const state=turnstileWidgets.get(form);
  setSubmitReady(form,false);
  if(state&&typeof window.turnstile==='object'){
    try{window.turnstile.reset(state.widgetId);}catch(error){console.warn('Turnstile reset failed',error);}
  }
}

function prepareTurnstileSlots(){
  if(!turnstileSiteKey)return;
  leadForms.forEach((form,index)=>{
    if(form.querySelector('[data-turnstile-slot]'))return;
    const slot=document.createElement('div');
    slot.dataset.turnstileSlot='';
    slot.id='ibtikarz-turnstile-'+index;
    slot.style.marginTop='16px';
    const actions=form.querySelector('.actions');
    if(actions)form.insertBefore(slot,actions);
    else form.appendChild(slot);
    setSubmitReady(form,false);
  });
}

window.__ibtikarzTurnstileReady=function(){
  if(!turnstileSiteKey||typeof window.turnstile!=='object')return;
  leadForms.forEach((form,index)=>{
    const slot=form.querySelector('[data-turnstile-slot]');
    if(!slot||turnstileWidgets.has(form))return;
    let widgetId=null;
    try{
      widgetId=window.turnstile.render(slot,{
        sitekey:turnstileSiteKey,
        theme:'light',
        size:'flexible',
        action:form.dataset.leadType||'lead_form',
        callback:function(){
          setSubmitReady(form,true);
          const msg=form.querySelector('[data-form-message]');
          if(msg&&msg.dataset.turnstileMessage==='1')formMessage(form,'');
        },
        'expired-callback':function(){
          setSubmitReady(form,false);
          formMessage(form,'Verification expired. Please wait a moment while it refreshes.',true);
          const msg=form.querySelector('[data-form-message]');
          if(msg)msg.dataset.turnstileMessage='1';
          if(widgetId!==null)window.turnstile.reset(widgetId);
        },
        'timeout-callback':function(){
          setSubmitReady(form,false);
          if(widgetId!==null)window.turnstile.reset(widgetId);
        },
        'error-callback':function(code){
          setSubmitReady(form,false);
          console.error('Turnstile error',code);
          formMessage(form,'Human verification could not load. Please refresh the page and try again.',true);
          const msg=form.querySelector('[data-form-message]');
          if(msg)msg.dataset.turnstileMessage='1';
        }
      });
      turnstileWidgets.set(form,{widgetId,index});
    }catch(error){
      console.error('Turnstile render failed',error);
      formMessage(form,'Human verification could not load. Please refresh the page and try again.',true);
    }
  });
};

if(turnstileSiteKey&&leadForms.length){
  prepareTurnstileSlots();
  const script=document.createElement('script');
  script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__ibtikarzTurnstileReady';
  script.defer=true;
  script.onerror=function(){
    leadForms.forEach(form=>{
      setSubmitReady(form,false);
      formMessage(form,'Human verification could not load. Please refresh the page and try again.',true);
    });
  };
  document.head.appendChild(script);
}

function attribution(){
  const query=new URLSearchParams(location.search);
  const key='ibtikarz_attr';
  try{
    const stored=JSON.parse(sessionStorage.getItem(key)||'null');
    if(stored&&stored.landing_page)return stored;
  }catch(_){}
  const data={
    landing_page:location.href.split('#')[0],
    referrer:document.referrer||'direct',
    first_touch_timestamp:new Date().toISOString()
  };
  attrKeys.forEach(k=>data[k]=query.get(k)||'');
  try{sessionStorage.setItem(key,JSON.stringify(data));}catch(_){}
  return data;
}
const attr=attribution();

function leadId(){
  return window.crypto&&crypto.randomUUID?crypto.randomUUID():'lead-'+Date.now()+'-'+Math.random().toString(36).slice(2);
}
function set(form,name,value){
  const element=form.elements.namedItem(name);
  if(element)element.value=value||'';
}

async function submitLead(form){
  const button=submitButton(form);
  const original=button?button.textContent:'';

  if(turnstileSiteKey){
    const state=turnstileWidgets.get(form);
    let token='';
    if(state&&typeof window.turnstile==='object'){
      try{token=window.turnstile.getResponse(state.widgetId)||'';}catch(_){}
    }
    if(!token){
      formMessage(form,'Please wait a moment for human verification to finish.',true);
      setSubmitReady(form,false);
      return;
    }
  }

  set(form,'lead_id',form.elements.namedItem('lead_id')?.value||leadId());
  set(form,'landing_page',attr.landing_page);
  set(form,'conversion_page',location.href.split('#')[0]);
  set(form,'referrer',attr.referrer);
  set(form,'submitted_at',new Date().toISOString());
  attrKeys.forEach(k=>set(form,k,attr[k]));

  if(button){button.disabled=true;button.textContent='Sending…';}
  formMessage(form,'');

  try{
    const payload=Object.fromEntries(new FormData(form).entries());
    const response=await fetch('/api/lead',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||'Could not send');

    track('form_submit',{form_name:form.getAttribute('name')||'lead-form',lead_type:form.dataset.leadType||'enquiry'});
    track('generate_lead',{
      form_name:form.getAttribute('name')||'lead-form',
      lead_type:form.dataset.leadType||'enquiry',
      service_name:payload.service||''
    });

    form.reset();
    set(form,'lead_id',leadId());
    formMessage(form,form.dataset.successMessage||'Thanks — your request is in. I’ll review it and reply shortly.');
    resetTurnstile(form);
  }catch(error){
    console.error('Lead submission error',error);
    formMessage(form,error.message||'Could not send right now. Email abdullah@ibtikarz.com or use WhatsApp.',true);
    track('form_error',{form_name:form.getAttribute('name')||'lead-form'});
    resetTurnstile(form);
  }finally{
    if(button){button.textContent=original; if(!turnstileSiteKey)button.disabled=false;}
  }
}

leadForms.forEach(form=>{
  set(form,'lead_id',leadId());
  let started=false;
  form.addEventListener('input',()=>{
    if(!started){
      started=true;
      track('form_start',{form_name:form.getAttribute('name')||'lead-form'});
    }
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!form.checkValidity()){
      form.reportValidity();
      return;
    }
    submitLead(form);
  });
});

document.addEventListener('click',event=>{
  const anchor=event.target.closest('a[href]');
  if(!anchor)return;
  const href=anchor.href||'';
  if(anchor.dataset.track)track(anchor.dataset.track,{cta_label:(anchor.textContent||'').trim().slice(0,80),cta_location:anchor.dataset.location||'page'});
  if(href.includes('wa.me'))track('whatsapp_click',{cta_location:anchor.dataset.location||'page'});
  else if(href.startsWith('mailto:'))track('email_click',{cta_location:anchor.dataset.location||'page'});
});

const year=document.querySelector('[data-year]');
if(year)year.textContent=new Date().getFullYear();
})();
