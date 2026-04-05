
(function(){
  // Scroll-driven animations
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('ncui-visible');
      }
    });
  },{threshold:0.1,rootMargin:'0px 0px -40px 0px'});

  document.querySelectorAll('[class*=ncui-anim-] .ncui-container>*,[class*=ncui-anim-] .ncui-grid>.ncui-card').forEach(function(el){
    obs.observe(el);
  });

  // Nav scroll effect
  var nav=document.querySelector('.ncui-nav');
  if(nav){
    window.addEventListener('scroll',function(){
      nav.classList.toggle('ncui-nav-compact',window.scrollY>50);
    },{passive:true});
  }

  // Form handler
  document.querySelectorAll('.ncui-form').forEach(function(form){
    if(form.hasAttribute('data-ncui-submit') || form.hasAttribute('data-ncui-action-url'))return;
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var btn=form.querySelector('.ncui-btn');
      if(btn){var orig=btn.textContent;btn.textContent='Sent!';btn.classList.add('ncui-btn-busy');setTimeout(function(){btn.textContent=orig;btn.classList.remove('ncui-btn-busy')},2000);}
    });
  });

  document.addEventListener('click',function(e){
    var navToggle=e.target.closest('[data-ncui-nav-toggle]');
    if(navToggle){
      var navInner=navToggle.closest('.ncui-nav-inner');
      if(navInner)navInner.classList.toggle('open');
      return;
    }

    var modalOpen=e.target.closest('[data-ncui-modal-open]');
    if(modalOpen){
      var modalId=modalOpen.getAttribute('data-ncui-modal-open');
      var modal=document.getElementById(modalId);
      if(modal)modal.classList.add('ncui-modal-open');
      return;
    }

    var modalClose=e.target.closest('[data-ncui-modal-close]');
    if(modalClose){
      var modalRoot=modalClose.closest('[data-ncui-modal]');
      if(modalRoot)modalRoot.classList.remove('ncui-modal-open');
      return;
    }

    var modalBackdrop=e.target.matches('[data-ncui-modal]') ? e.target : null;
    if(modalBackdrop){
      modalBackdrop.classList.remove('ncui-modal-open');
      return;
    }

    var tabButton=e.target.closest('[data-ncui-tab-btn]');
    if(tabButton){
      var groupId=tabButton.getAttribute('data-ncui-tab-btn');
      var idx=tabButton.getAttribute('data-ncui-tab-index');
      var panels=document.querySelectorAll('[data-tab-group="'+groupId+'"]');
      var tabsEl=document.getElementById(groupId);
      if(!tabsEl)return;
      var btns=tabsEl.querySelectorAll('.ncui-tab-btn');
      for(var i=0;i<panels.length;i++){
        panels[i].classList.toggle('ncui-tab-panel-hidden',String(i)!==String(idx));
      }
      for(var j=0;j<btns.length;j++){
        btns[j].classList.toggle('ncui-tab-active',String(j)===String(idx));
      }
    }
  });
})();


(function(){
var _state={};
var _stores={};
_state["query"]="";
_state["result"]="";
_state["loading"]=false;
_state["agentLog"]=null;
var _ssrPayload=(function(){var el=document.getElementById('ncui-ssr-data');if(!el)return null;try{return JSON.parse(el.textContent||'null');}catch(_){return null;}})();
if(_ssrPayload&&_ssrPayload.state&&typeof _ssrPayload.state==='object'){for(var _ssrKey in _ssrPayload.state){_state[_ssrKey]=_ssrPayload.state[_ssrKey];}}
if(_ssrPayload&&_ssrPayload.stores&&typeof _ssrPayload.stores==='object'){for(var _ssrStoreKey in _ssrPayload.stores){_stores[_ssrStoreKey]=_ssrPayload.stores[_ssrStoreKey];}}
var _listeners=[];
var _computed={};
var _routes=[];
var _authConfig={"type":"bearer","sessionMode":"backend","loginEndpoint":"/api/auth/login","logoutEndpoint":"/api/auth/logout","refreshEndpoint":"/api/auth/refresh","verifyEndpoint":"/api/auth/verify","callbackEndpoint":"/api/auth/callback","tokenStore":"session","tokenHeader":"Authorization","tokenPrefix":"Bearer","onLoginNavigateTo":"/dashboard","onLogoutNavigateTo":"/login","authEndpoint":null,"tokenEndpoint":null,"clientId":null,"redirectUri":null,"scope":"openid profile email","audience":null,"allowDirectProviderTokens":false};
var _securityHeaders={"X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","X-XSS-Protection":"1; mode=block","Strict-Transport-Security":"max-age=31536000; includeSubDomains; preload","Referrer-Policy":"strict-origin-when-cross-origin","Permissions-Policy":"camera=(), microphone=(), geolocation=()","Content-Security-Policy":"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'","X-Permitted-Cross-Domain-Policies":"none","Cross-Origin-Embedder-Policy":"require-corp","Cross-Origin-Opener-Policy":"same-origin","Cross-Origin-Resource-Policy":"same-origin"};
var _guards=[];
var _security=window.NCUISecurity||null;
window.NCUISecurityHeaders=_securityHeaders;
function _get(k){return _state[k]}
function _set(k,v){_state[k]=v;_notify()}
function _toggle(k){_state[k]=!_state[k];_notify()}
function _addTo(k,v){if(Array.isArray(_state[k]))_state[k].push(v);_notify()}
function _readPath(obj,path){
  if(path==null||path==='')return obj;
  var cur=obj;
  var parts=String(path).split('.');
  for(var i=0;i<parts.length;i++){
    if(cur==null)return undefined;
    cur=cur[parts[i]];
  }
  return cur;
}
function _writePath(obj,path,value){
  if(path==null||path==='')return value;
  var parts=String(path).split('.');
  var cur=obj;
  for(var i=0;i<parts.length-1;i++){
    var part=parts[i];
    if(cur[part]==null||typeof cur[part]!=='object')cur[part]={};
    cur=cur[part];
  }
  cur[parts[parts.length-1]]=value;
  return value;
}
function _storeGet(path){
  return _readPath(_stores,path);
}
function _setStorePath(path,value){
  _writePath(_stores,path,value);
  _notify();
}
function _toggleStorePath(path){
  _writePath(_stores,path,!_readPath(_stores,path));
  _notify();
}
function _addToStorePath(path,value){
  var current=_readPath(_stores,path);
  if(!Array.isArray(current)){
    current=[];
    _writePath(_stores,path,current);
  }
  current.push(value);
  _notify();
}
function _exprValue(expr,row){
  if(expr==null)return '';
  var raw=String(expr).trim();
  if(raw==='')return '';
  if(raw==='true')return true;
  if(raw==='false')return false;
  if(/^[-]?\d+(\.\d+)?$/.test(raw))return Number(raw);
  if((raw[0]==='"'&&raw[raw.length-1]==='"')||(raw[0]==="'"&&raw[raw.length-1]==="'"))return raw.slice(1,-1);
  if(row && raw.indexOf('item.')===0)return _readPath(row, raw.slice(5));
  if(row && Object.prototype.hasOwnProperty.call(row, raw))return row[raw];
  if(raw.indexOf('store.')===0)return _readPath(_stores, raw.slice(6));
  if(raw.indexOf('stores.')===0)return _readPath(_stores, raw.slice(7));
  if(raw.indexOf('state.')===0)return _readPath(_state, raw.slice(6));
  if(Object.prototype.hasOwnProperty.call(_computed, raw))return _computed[raw]();
  var fromStores=_readPath(_stores, raw);
  if(fromStores!==undefined)return fromStores;
  var fromState=_readPath(_state, raw);
  if(fromState!==undefined)return fromState;
  return '';
}
function _hasRole(role){
  var user=_state.user||{};
  var roles=user.roles||_state.roles||[];
  if(typeof roles==='string')roles=[roles];
  return Array.isArray(roles)&&roles.indexOf(role)!==-1;
}
function _audit(event,details){
  if(_security&&_security.audit&&typeof _security.audit.log==='function'){
    try{_security.audit.log(event,details||{});}catch(_){}
  }
}
function _mergeState(snapshot){
  if(!snapshot||typeof snapshot!=='object')return;
  for(var key in snapshot){_state[key]=snapshot[key];}
}
function _routeContext(path,params,route){
  _state.currentRoute=path||window.location.pathname||'/';
  _state.routeParams=params||{};
  _state.currentRouteName=route&&route.component?route.component:null;
  if(_ssrPayload&&_ssrPayload.path===_state.currentRoute&&_ssrPayload.state){
    _mergeState(_ssrPayload.state);
  }
}
function _csrfToken(){
  if(_security&&_security.csrf&&typeof _security.csrf.getToken==='function'){
    return _security.csrf.getToken()||'';
  }
  var meta=document.querySelector('meta[name="csrf-token"]');
  return meta?meta.getAttribute('content')||'':'';
}
function _usesBackendSession(){
  return String(_authConfig.sessionMode||'backend').toLowerCase()==='backend';
}
function _isSameOriginEndpoint(url){
  if(!url)return false;
  if(url.charAt(0)==='/')return true;
  try{
    var parsed=new URL(url, window.location.origin);
    return parsed.origin===window.location.origin;
  }catch(_){
    return false;
  }
}
function _assertBackendEndpoint(url,name){
  if(!_usesBackendSession())return;
  if(!_isSameOriginEndpoint(url)){
    var message=(name||'Auth endpoint')+' must be same-origin when auth session mode is "backend".';
    _audit('auth.backend_endpoint_rejected',{endpoint:url,name:name||null});
    throw new Error(message);
  }
}
function _applyAuthResult(data){
  data=data||{};
  var token=null;
  var refresh=null;
  if(_usesBackendSession()){
    token=data.session_token||data.app_token||data.token||null;
    refresh=data.session_refresh_token||null;
  } else {
    token=data.token||data.access_token||data.session_token||data.app_token||null;
    refresh=data.refresh_token||data.session_refresh_token||null;
  }
  if(token)_authStore.setToken(token);
  if(refresh)_authStore.setRefresh(refresh);
  if(data.user)_state.user=data.user;
  _state.authenticated=!!token||!!_state.user||!!data.authenticated||!!data.sessionEstablished;
  _state.roles=_state.user&&Array.isArray(_state.user.roles)?_state.user.roles:[];
  return { token: token, refresh: refresh };
}
function _authStorage(){
  var mode=(_authConfig.tokenStore||'session').toLowerCase();
  if(mode==='memory'){
    var memToken=null;
    var memRefresh=null;
    return {
      getToken:function(){return memToken;},
      setToken:function(v){memToken=v;},
      getRefresh:function(){return memRefresh;},
      setRefresh:function(v){memRefresh=v;},
      clear:function(){memToken=null;memRefresh=null;}
    };
  }
  if(mode==='local'){
    return {
      getToken:function(){try{return localStorage.getItem('ncui_auth_token');}catch(_){return null;}},
      setToken:function(v){try{if(v==null)localStorage.removeItem('ncui_auth_token');else localStorage.setItem('ncui_auth_token',v);}catch(_){}},
      getRefresh:function(){try{return localStorage.getItem('ncui_refresh_token');}catch(_){return null;}},
      setRefresh:function(v){try{if(v==null)localStorage.removeItem('ncui_refresh_token');else localStorage.setItem('ncui_refresh_token',v);}catch(_){}},
      clear:function(){try{localStorage.removeItem('ncui_auth_token');localStorage.removeItem('ncui_refresh_token');}catch(_){}}
    };
  }
  if(mode==='cookie'){
    return {
      getToken:function(){var m=document.cookie.match(/(?:^|; )ncui_auth_token=([^;]+)/);return m?decodeURIComponent(m[1]):null;},
      setToken:function(v){document.cookie='ncui_auth_token='+(v?encodeURIComponent(v):'')+'; path=/; SameSite=Strict; Secure';},
      getRefresh:function(){var m=document.cookie.match(/(?:^|; )ncui_refresh_token=([^;]+)/);return m?decodeURIComponent(m[1]):null;},
      setRefresh:function(v){document.cookie='ncui_refresh_token='+(v?encodeURIComponent(v):'')+'; path=/; SameSite=Strict; Secure';},
      clear:function(){document.cookie='ncui_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';document.cookie='ncui_refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';}
    };
  }
  return {
    getToken:function(){try{return sessionStorage.getItem('ncui_auth_token');}catch(_){return null;}},
    setToken:function(v){try{if(v==null)sessionStorage.removeItem('ncui_auth_token');else sessionStorage.setItem('ncui_auth_token',v);}catch(_){}},
    getRefresh:function(){try{return sessionStorage.getItem('ncui_refresh_token');}catch(_){return null;}},
    setRefresh:function(v){try{if(v==null)sessionStorage.removeItem('ncui_refresh_token');else sessionStorage.setItem('ncui_refresh_token',v);}catch(_){}},
    clear:function(){try{sessionStorage.removeItem('ncui_auth_token');sessionStorage.removeItem('ncui_refresh_token');}catch(_){}}
  };
}
var _authStore=_authStorage();
var _refreshTimer=null;
function _decodeJwt(token){
  if(!token)return null;
  if(_security&&_security.jwt&&typeof _security.jwt.decode==='function')return _security.jwt.decode(token);
  try{
    var parts=token.split('.');
    if(parts.length!==3)return null;
    var payload=parts[1].replace(/-/g,'+').replace(/_/g,'/');
    while(payload.length%4!==0)payload+='=';
    return JSON.parse(atob(payload));
  }catch(_){return null;}
}
function _isJwtExpired(token){
  if(!token)return true;
  if(_security&&_security.jwt&&typeof _security.jwt.isExpired==='function')return _security.jwt.isExpired(token);
  var payload=_decodeJwt(token);
  return !payload||!payload.exp||Date.now()>=payload.exp*1000;
}
function _scheduleRefresh(){
  if(_refreshTimer){clearTimeout(_refreshTimer);_refreshTimer=null;}
  var token=_authStore.getToken();
  var payload=_decodeJwt(token);
  if(!payload||!payload.exp)return;
  var delay=(payload.exp*1000)-Date.now()-60000;
  if(delay<=0)return;
  _refreshTimer=setTimeout(function(){
    _auth.refresh().catch(function(err){_audit('auth.refresh_failed',{message:err&&err.message?err.message:String(err)})});
  }, delay);
}
async function _requestWithTimeout(url, options){
  options=options||{};
  var timeoutMs=options.timeoutMs||15000;
  var controller=typeof AbortController!=='undefined'?new AbortController():null;
  var timer=null;
  if(controller){
    options.signal=controller.signal;
    timer=setTimeout(function(){controller.abort();}, timeoutMs);
  }
  try{
    return await fetch(url, options);
  } finally {
    if(timer)clearTimeout(timer);
  }
}
function _collectFormData(form){
  var data={};
  Array.prototype.forEach.call(form.querySelectorAll('[data-ncui-bind]'), function(field){
    var key=field.getAttribute('data-ncui-bind');
    if(!key)return;
    if(field.type==='checkbox'){
      data[key]=!!field.checked;
      return;
    }
    data[key]=field.value;
  });
  if(typeof FormData!=='undefined'){
    var formData=new FormData(form);
    formData.forEach(function(value,key){
      if(!(key in data))data[key]=value;
    });
  }
  return data;
}
function _syncBoundInputs(){
  document.querySelectorAll('[data-ncui-bind]').forEach(function(field){
    var key=field.getAttribute('data-ncui-bind');
    if(!key)return;
    var value=_exprValue(key);
    if(field.type==='checkbox'){
      field.checked=!!value;
      return;
    }
    if(document.activeElement===field)return;
    field.value=value==null?'':value;
  });
}
function _validatorMessage(rule){
  if(rule.rule==='required')return 'This field is required.';
  if(rule.rule==='email')return 'Enter a valid email address.';
  if(rule.rule==='url')return 'Enter a valid URL.';
  if(rule.rule==='minLength')return 'Use at least '+rule.value+' characters.';
  if(rule.rule==='maxLength')return 'Use no more than '+rule.value+' characters.';
  if(rule.rule==='strongPassword')return 'Use upper, lower, number, and symbol characters.';
  if(rule.rule==='pattern')return 'Use the expected format.';
  return 'Invalid value.';
}
function _validateValue(value, rules){
  var text=value==null?'':String(value);
  for(var i=0;i<rules.length;i++){
    var rule=rules[i];
    if(rule.rule==='required' && !text.trim())return _validatorMessage(rule);
    if(!text.trim())continue;
    if(rule.rule==='email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))return _validatorMessage(rule);
    if(rule.rule==='url'){try{new URL(text);}catch(_){return _validatorMessage(rule);}}
    if(rule.rule==='minLength' && text.length<Number(rule.value||0))return _validatorMessage(rule);
    if(rule.rule==='maxLength' && text.length>Number(rule.value||0))return _validatorMessage(rule);
    if(rule.rule==='strongPassword' && !(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(text)))return _validatorMessage(rule);
    if(rule.rule==='pattern'){try{if(!(new RegExp(rule.value)).test(text))return _validatorMessage(rule);}catch(_){}}
  }
  return '';
}
function _showFieldError(field,message){
  var key=field.getAttribute('data-ncui-field')||field.name||field.id;
  var target=document.querySelector('[data-ncui-error-for="'+key+'"]');
  field.setAttribute('data-invalid', message ? 'true' : 'false');
  field.setAttribute('aria-invalid', message ? 'true' : 'false');
  if(target)target.textContent=message||'';
}
function _validateFieldElement(field){
  var raw=field.getAttribute('data-ncui-validators');
  if(!raw){_showFieldError(field,'');return '';}
  var rules=[];
  try{rules=JSON.parse(raw)||[];}catch(_){}
  var value=field.type==='checkbox' ? (field.checked ? 'true' : '') : field.value;
  var message=_validateValue(value,rules);
  _showFieldError(field,message);
  return message;
}
function _validateForm(form){
  var fields=form.querySelectorAll('[data-ncui-field]');
  var messages=[];
  for(var i=0;i<fields.length;i++){
    var message=_validateFieldElement(fields[i]);
    if(message)messages.push(message);
  }
  var status=form.querySelector('[data-ncui-form-status]');
  if(status)status.textContent=messages[0]||'';
  return messages.length===0;
}
var _auth={
  config:_authConfig,
  token:function(){return _authStore.getToken();},
  refreshToken:function(){return _authStore.getRefresh();},
  isAuthenticated:function(){
    if(_usesBackendSession())return !!_state.authenticated||!!_state.user;
    var token=_authStore.getToken();
    return !!token&&!_isJwtExpired(token);
  },
  getUser:function(){
    if(_state.user)return _state.user;
    var token=_authStore.getToken();
    if(!token)return _state.user||null;
    var claims=_decodeJwt(token);
    if(!claims)return _state.user||null;
    var roles=claims.roles||claims.role||[];
    if(typeof roles==='string')roles=[roles];
    return {id:claims.sub||claims.id||null,name:claims.name||claims.preferred_username||null,email:claims.email||null,roles:roles,claims:claims};
  },
  hasRole:function(role){return _hasRole(role);},
  headers:function(extra){
    var headers=Object.assign({'Accept':'application/json'}, extra||{});
    var csrf=_csrfToken();
    if(csrf)headers['X-CSRF-Token']=csrf;
    var token=_authStore.getToken();
    if(token)headers[_authConfig.tokenHeader||'Authorization']=((_authConfig.tokenPrefix||'Bearer')+' '+token).trim();
    return headers;
  },
  syncState:function(){
    var user=this.getUser();
    _state.user=user;
    _state.authenticated=this.isAuthenticated();
    _state.roles=user&&Array.isArray(user.roles)?user.roles:[];
    _scheduleRefresh();
    _notify();
  },
  async login:function(credentials){
    if((_authConfig.type||'').toLowerCase()==='oauth'||(_authConfig.type||'').toLowerCase()==='pkce'){
      if(!credentials||Object.keys(credentials).length===0)return this.startLogin();
    }
    if(_usesBackendSession())_assertBackendEndpoint(_authConfig.loginEndpoint,'login endpoint');
    _state.authPending=true;
    _state.authError=null;
    _notify();
    var body=JSON.stringify(credentials||{});
    var res=await _requestWithTimeout(_authConfig.loginEndpoint,{method:'POST',credentials:'same-origin',headers:this.headers({'Content-Type':'application/json'}),body:body});
    if(!res.ok){
      var err={message:'Login failed'};
      try{err=await res.json();}catch(_){}
      _state.authPending=false;
      _state.authError=err.message||('Login failed ('+res.status+')');
      _audit('auth.login_failed',{status:res.status,message:_state.authError});
      _notify();
      throw new Error(err.message||('Login failed ('+res.status+')'));
    }
    var data=await res.json();
    _applyAuthResult(data);
    if(_usesBackendSession()){
      try{await this.verify();}catch(_){}
    } else {
      _state.user=data.user||this.getUser();
      _state.authenticated=this.isAuthenticated();
      _state.roles=_state.user&&Array.isArray(_state.user.roles)?_state.user.roles:[];
    }
    _state.authPending=false;
    _state.authError=null;
    _scheduleRefresh();
    _audit('auth.login_success',{user:_state.user&&(_state.user.id||_state.user.email||_state.user.name||null)});
    _notify();
    if(_authConfig.onLoginNavigateTo&&window.location.pathname!==_authConfig.onLoginNavigateTo){
      history.pushState(null,'',_authConfig.onLoginNavigateTo);
      if(typeof _resolve==='function')_resolve();
    }
    return data;
  },
  async logout:function(){
    _state.authPending=true;
    _notify();
    try{
      if(_usesBackendSession())_assertBackendEndpoint(_authConfig.logoutEndpoint,'logout endpoint');
      await _requestWithTimeout(_authConfig.logoutEndpoint,{method:'POST',credentials:'same-origin',headers:this.headers({'Content-Type':'application/json'})});
    }catch(_){}
    _authStore.clear();
    if(_refreshTimer){clearTimeout(_refreshTimer);_refreshTimer=null;}
    _state.user=null;
    _state.roles=[];
    _state.authenticated=false;
    _state.authPending=false;
    _state.authError=null;
    _audit('auth.logout',{});
    _notify();
    if(_authConfig.onLogoutNavigateTo&&window.location.pathname!==_authConfig.onLogoutNavigateTo){
      history.pushState(null,'',_authConfig.onLogoutNavigateTo);
      if(typeof _resolve==='function')_resolve();
    }
    return true;
  },
  async refresh:function(){
    _state.authPending=true;
    _notify();
    var payload={};
    var refreshToken=_authStore.getRefresh();
    if(refreshToken&&!_usesBackendSession())payload.refresh_token=refreshToken;
    if(_usesBackendSession())_assertBackendEndpoint(_authConfig.refreshEndpoint,'refresh endpoint');
    var res=await _requestWithTimeout(_authConfig.refreshEndpoint,{method:'POST',credentials:'same-origin',headers:this.headers({'Content-Type':'application/json'}),body:JSON.stringify(payload)});
    if(!res.ok){
      _state.authPending=false;
      _state.authError='Refresh failed';
      _audit('auth.refresh_failed',{status:res.status});
      _notify();
      throw new Error('Refresh failed');
    }
    var data=await res.json();
    _applyAuthResult(data);
    _state.authPending=false;
    _state.authError=null;
    _audit('auth.refresh_success',{});
    if(_usesBackendSession()) await this.verify();
    else this.syncState();
    return data;
  },
  async fetch:function(url,options){
    options=options||{};
    var headers=this.headers(options.headers||{});
    var req=Object.assign({}, options, {headers:headers, credentials:options.credentials||'same-origin'});
    var res=await _requestWithTimeout(url, req);
    if(res.status===401&&(this.refreshToken()||_usesBackendSession())){
      try{
        await this.refresh();
        req.headers=this.headers(options.headers||{});
        res=await _requestWithTimeout(url, req);
      }catch(_){}
    }
    return res;
  },
  async startLogin:function(){
    if((_authConfig.type||'').toLowerCase()!=='oauth'&&(_authConfig.type||'').toLowerCase()!=='pkce')return false;
    if(!_authConfig.authEndpoint||!_authConfig.clientId||!_authConfig.redirectUri)throw new Error('OAuth auth config missing authEndpoint/clientId/redirectUri');
    var oauthSecurity=_security&&_security.oauth?_security.oauth:null;
    var state='ncui_'+Math.random().toString(36).slice(2);
    sessionStorage.setItem('ncui_oauth_state',state);
    var verifier=oauthSecurity&&oauthSecurity.generateCodeVerifier?oauthSecurity.generateCodeVerifier(64):state+state;
    sessionStorage.setItem('ncui_oauth_verifier',verifier);
    var challenge=oauthSecurity&&oauthSecurity.generateCodeChallenge?await oauthSecurity.generateCodeChallenge(verifier):verifier;
    var params=new URLSearchParams({response_type:'code',client_id:_authConfig.clientId,redirect_uri:_authConfig.redirectUri,scope:_authConfig.scope||'openid profile email',state:state,code_challenge:challenge,code_challenge_method:'S256'});
    if(_authConfig.audience)params.set('audience',_authConfig.audience);
    window.location.href=_authConfig.authEndpoint+'?'+params.toString();
    return true;
  },
  async exchangeCode:function(code,state){
    var expectedState=sessionStorage.getItem('ncui_oauth_state');
    if(expectedState&&state&&state!==expectedState){
      _audit('auth.oauth_state_mismatch',{expected:expectedState,received:state});
      throw new Error('OAuth state mismatch');
    }
    var exchangeEndpoint=_usesBackendSession()?(_authConfig.callbackEndpoint||''):(_authConfig.tokenEndpoint||'');
    if(_usesBackendSession()){
      _assertBackendEndpoint(exchangeEndpoint,'callback endpoint');
    } else if(!_authConfig.allowDirectProviderTokens&&(!_isSameOriginEndpoint(exchangeEndpoint))){
      _audit('auth.direct_provider_exchange_blocked',{endpoint:exchangeEndpoint});
      throw new Error('Direct provider token exchange in the browser is disabled. Exchange the code through your backend and issue an app session.');
    }
    if(!exchangeEndpoint)throw new Error('OAuth callback endpoint is required for code exchange');
    var verifier=sessionStorage.getItem('ncui_oauth_verifier')||'';
    var body={
      grant_type:'authorization_code',
      code:code,
      redirect_uri:_authConfig.redirectUri,
      client_id:_authConfig.clientId,
      code_verifier:verifier
    };
    var res=await _requestWithTimeout(exchangeEndpoint,{method:'POST',credentials:'same-origin',headers:this.headers({'Content-Type':'application/json'}),body:JSON.stringify(body)});
    if(!res.ok)throw new Error('OAuth code exchange failed');
    var data=await res.json();
    _applyAuthResult(data);
    sessionStorage.removeItem('ncui_oauth_state');
    sessionStorage.removeItem('ncui_oauth_verifier');
    if(_usesBackendSession()) await this.verify();
    else this.syncState();
    _audit('auth.oauth_exchange_success',{});
    return data;
  },
  async verify:function(){
    var token=_authStore.getToken();
    if((!token&&!_usesBackendSession())||!_authConfig.verifyEndpoint)return false;
    if(_usesBackendSession())_assertBackendEndpoint(_authConfig.verifyEndpoint,'verify endpoint');
    var res=await _requestWithTimeout(_authConfig.verifyEndpoint,{method:'GET',credentials:'same-origin',headers:this.headers()});
    if(!res.ok){
      _authStore.clear();
      _state.user=null;
      _state.roles=[];
      _state.authenticated=false;
      _audit('auth.verify_failed',{status:res.status});
      _notify();
      return false;
    }
    var data=await res.json();
    if(data.user)_state.user=data.user;
    _audit('auth.verify_success',{});
    this.syncState();
    return data;
  },
  async init:function(){
    if(_security&&_security.csrf&&typeof _security.csrf.injectMeta==='function'&&!document.querySelector('meta[name="csrf-token"]')){
      _security.csrf.injectMeta();
    }
    if(typeof window!=='undefined'&&window.location&&window.location.search&&((_authConfig.type||'').toLowerCase()==='oauth'||(_authConfig.type||'').toLowerCase()==='pkce')){
      try{
        var params=new URLSearchParams(window.location.search);
        var code=params.get('code');
        var state=params.get('state');
        if(code){
          await this.exchangeCode(code,state);
          if(window.history&&typeof window.history.replaceState==='function'){
            var cleanPath=window.location.pathname+(window.location.hash||'');
            window.history.replaceState(null,'',cleanPath);
          }
        }
      }catch(err){
        _state.authError=err&&err.message?err.message:String(err);
        _audit('auth.oauth_exchange_failed',{message:_state.authError});
      }
    }
    try{
      await this.verify();
    }catch(err){
      _audit('auth.verify_failed',{message:err&&err.message?err.message:String(err)});
    }
    this.syncState();
  }
};
window.NCUIAuth=_auth;
window.NCUIRBAC={
  can:function(action,resource){
    var user=_auth.getUser()||{};
    var perms=user.permissions||[];
    if(!Array.isArray(perms))return false;
    return perms.indexOf('*')!==-1||perms.indexOf(action+':'+resource)!==-1||perms.indexOf(action+':*')!==-1;
  },
  hasRole:function(role){return _auth.hasRole(role);}
};
function _guardByName(name){
  for(var i=0;i<_guards.length;i++){if(_guards[i].name===name)return _guards[i];}
  return null;
}
function _routeAllowed(route){
  if(route.guard){
    var guard=_guardByName(route.guard);
    if(guard){
      if(guard.requireAuth && !_auth.isAuthenticated()) return {ok:false, redirect:guard.redirect||_authConfig.onLogoutNavigateTo||'/login'};
      if(guard.requireRole && !_auth.hasRole(guard.requireRole)) return {ok:false, redirect:guard.redirect||'/403'};
    }
  }
  if(route.requireAuth && !_auth.isAuthenticated()) return {ok:false, redirect:route.redirect||_authConfig.onLogoutNavigateTo||'/login'};
  if(route.requireRole && !_auth.hasRole(route.requireRole)) return {ok:false, redirect:route.redirect||'/403'};
  return {ok:true};
}
function _renderTables(){
  document.querySelectorAll('[data-ncui-table]').forEach(function(table){
    var source=table.getAttribute('data-ncui-table');
    var cols=[];
    try{cols=JSON.parse(table.getAttribute('data-ncui-columns')||'[]')}catch(_){}
    var rows=_exprValue(source);
    var body=table.querySelector('tbody');
    if(!body)return;
    if(!Array.isArray(rows)||rows.length===0){
      var colspan=Math.max(cols.length,1);
      body.innerHTML='<tr class="ncui-table-empty"><td class="ncui-table-cell" colspan="'+colspan+'">No data available</td></tr>';
      return;
    }
    body.innerHTML=rows.map(function(row){
      return '<tr>'+cols.map(function(col){
        var value=_exprValue(col.expr,row);
        if(value==null)value='';
        return '<td class="ncui-table-cell">'+String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</td>';
      }).join('')+'</tr>';
    }).join('');
  });
}
function _markdownToHtml(raw){
  var escaped=String(raw==null?'':raw)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
  function inline(text){
    return String(text||'')
      .replace(/`([^`]+)`/g,'<code>$1</code>')
      .replace(/**([^*]+)**/g,'<strong>$1</strong>')
      .replace(/*([^*]+)*/g,'<em>$1</em>')
      .replace(/[([^]]+)](([^)]+))/g,'<a href="$2">$1</a>');
  }
  return escaped.split(/
{2,}/).map(function(block){
    block=block.trim();
    if(!block)return '';
    if(/^###s+/.test(block))return '<h4>'+inline(block.replace(/^###s+/,''))+'</h4>';
    if(/^##s+/.test(block))return '<h3>'+inline(block.replace(/^##s+/,''))+'</h3>';
    if(/^#s+/.test(block))return '<h2>'+inline(block.replace(/^#s+/,''))+'</h2>';
    if(/^[-*]s+/m.test(block)){
      var items=block.split(/
/).map(function(line){return line.trim();}).filter(Boolean).map(function(line){return '<li>'+inline(line.replace(/^[-*]s+/,''))+'</li>';}).join('');
      return '<ul>'+items+'</ul>';
    }
    return '<p>'+inline(block.replace(/
/g,'<br>'))+'</p>';
  }).join('');
}
function _mountExternalNodes(){
  document.querySelectorAll('[data-ncui-external]').forEach(function(node){
    if(node.getAttribute('data-ncui-external-mounted')==='true')return;
    var name=node.getAttribute('data-ncui-external');
    var props={};
    try{props=JSON.parse(node.getAttribute('data-ncui-external-props')||'{}');}catch(_){}
    if(window.NCUIInterop&&typeof window.NCUIInterop.mountExternal==='function'){
      var mounted=window.NCUIInterop.mountExternal(name,node,props);
      if(mounted)node.setAttribute('data-ncui-external-mounted','true');
    }
  });
}
window.NCUISSR={
  payload:function(){return _ssrPayload;},
  routeParams:function(){return _state.routeParams||{};},
  path:function(){return _state.currentRoute||window.location.pathname||'/';},
  revalidate:function(path){
    var target=path||window.location.pathname||'/';
    if(target===window.location.pathname){window.location.reload();return true;}
    if(window.NCUIInterop&&typeof window.NCUIInterop.navigate==='function'){window.NCUIInterop.navigate(target);return true;}
    return false;
  }
};
window.NCUIStores={
  get:function(path){return _storeGet(path||'');},
  set:function(path,value){_setStorePath(path||'',value);return value;},
  toggle:function(path){_toggleStorePath(path||'');return true;},
  add:function(path,value){_addToStorePath(path||'',value);return true;},
  snapshot:function(){return JSON.parse(JSON.stringify(_stores));}
};
var _socketRegistry={};
function _assignCollectionTarget(target,value){
  target=String(target||'');
  if(/^stores?./.test(target)){_setStorePath(target.replace(/^stores?./,''),value);return;}
  if(Object.prototype.hasOwnProperty.call(_stores,target)){_setStorePath(target,value);return;}
  _set(target,value);
}
function _safeJsonText(value){
  return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function _renderDragDrop(){
  document.querySelectorAll('[data-ncui-drag-source]').forEach(function(node){
    var source=node.getAttribute('data-ncui-drag-source')||'';
    var items=_exprValue(source);
    if(!Array.isArray(items))items=[];
    var body=node.querySelector('.ncui-drag-items');
    if(!body)return;
    body.innerHTML=items.map(function(item,index){
      var payload={source:source,index:index,item:item};
      var label=(item&&typeof item==='object')?(item.label||item.name||item.title||item.id||('Item '+(index+1))):String(item);
      return '<div class="ncui-drag-item" draggable="true" data-ncui-drag-payload="'+encodeURIComponent(JSON.stringify(payload))+'">'+_safeJsonText(label)+'</div>';
    }).join('');
  });
  document.querySelectorAll('[data-ncui-drop-target]').forEach(function(node){
    var target=node.getAttribute('data-ncui-drop-target')||'';
    var items=_exprValue(target);
    if(!Array.isArray(items))items=[];
    var body=node.querySelector('.ncui-drop-items');
    if(!body)return;
    body.innerHTML=items.map(function(item,index){
      var label=(item&&typeof item==='object')?(item.label||item.name||item.title||item.id||('Item '+(index+1))):String(item);
      return '<div class="ncui-drag-item">'+_safeJsonText(label)+'</div>';
    }).join('');
  });
}
function _renderGraphs(){
  document.querySelectorAll('[data-ncui-graph-kind]').forEach(function(node){
    var source=node.getAttribute('data-ncui-graph-source')||'';
    var kind=node.getAttribute('data-ncui-graph-kind')||'graph';
    var canvas=node.querySelector('.ncui-graph-canvas');
    if(!canvas)return;
    var data=source?_exprValue(source):null;
    if(window.NCUIInterop&&typeof window.NCUIInterop.mountExternal==='function'){
      var mounted=window.NCUIInterop.mountExternal('graph:'+kind, canvas, { kind: kind, data: data });
      if(mounted)return;
    }
    var nodes=[];
    if(Array.isArray(data))nodes=data;
    else if(data&&Array.isArray(data.nodes))nodes=data.nodes;
    else if(data&&typeof data==='object')nodes=Object.keys(data).map(function(key){return { id:key, label:key, meta:data[key] };});
    if(!nodes.length){
      canvas.innerHTML='<div class="ncui-graph-node"><div class="ncui-graph-node-title">No graph data</div><div class="ncui-graph-node-meta">Bind graph data with graph "name" from state_name.</div></div>';
      return;
    }
    canvas.innerHTML=nodes.map(function(entry,index){
      var title=entry.label||entry.name||entry.id||('Node '+(index+1));
      var meta=entry.meta||entry.status||entry.type||'';
      return '<div class="ncui-graph-node"><div class="ncui-graph-node-title">'+String(title).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div><div class="ncui-graph-node-meta">'+String(meta||kind).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div></div>';
    }).join('');
  });
}
function _renderFlows(){
  document.querySelectorAll('[data-ncui-flow-kind]').forEach(function(node){
    var source=node.getAttribute('data-ncui-flow-source')||'';
    var canvas=node.querySelector('.ncui-flow-canvas');
    var svg=node.querySelector('.ncui-flow-edges');
    if(!canvas||!svg)return;
    var data=source?_exprValue(source):null;
    var flow=data&&typeof data==='object'?data:{};
    var nodes=Array.isArray(flow.nodes)?flow.nodes:[];
    var edges=Array.isArray(flow.edges)?flow.edges:[];
    if(!nodes.length){
      canvas.innerHTML='<div class="ncui-flow-node" style="left:24px;top:24px;"><div class="ncui-flow-node-title">No flow data</div><div class="ncui-flow-node-meta">Bind a flow source with nodes and edges.</div></div>';
      svg.innerHTML='';
      return;
    }
    canvas.innerHTML=nodes.map(function(entry,index){
      var x=Number(entry.x!=null?entry.x:(40+(index%4)*200));
      var y=Number(entry.y!=null?entry.y:(40+Math.floor(index/4)*120));
      var title=entry.label||entry.name||entry.id||('Node '+(index+1));
      var meta=entry.meta||entry.status||entry.type||'';
      return '<div class="ncui-flow-node" data-ncui-flow-node="'+_safeJsonText(entry.id||String(index))+'" style="left:'+x+'px;top:'+y+'px;"><div class="ncui-flow-node-title">'+_safeJsonText(title)+'</div><div class="ncui-flow-node-meta">'+_safeJsonText(meta)+'</div></div>';
    }).join('');
    svg.innerHTML=edges.map(function(edge){
      var from=nodes.find(function(item){return String(item.id)===String(edge.from);});
      var to=nodes.find(function(item){return String(item.id)===String(edge.to);});
      if(!from||!to)return '';
      var x1=Number(from.x!=null?from.x:40)+80;
      var y1=Number(from.y!=null?from.y:40)+26;
      var x2=Number(to.x!=null?to.x:240)+80;
      var y2=Number(to.y!=null?to.y:40)+26;
      return '<path class="ncui-flow-edge" d="M '+x1+' '+y1+' C '+(x1+70)+' '+y1+', '+(x2-70)+' '+y2+', '+x2+' '+y2+'"></path>';
    }).join('');
  });
}
function _initStreams(){
  document.querySelectorAll('[data-ncui-stream-url]').forEach(function(node){
    if(node.getAttribute('data-ncui-stream-mounted')==='true')return;
    node.setAttribute('data-ncui-stream-mounted','true');
    var url=node.getAttribute('data-ncui-stream-url');
    var saveAs=node.getAttribute('data-ncui-stream-save')||'';
    var useAuth=node.getAttribute('data-ncui-stream-auth')==='true';
    var status=node.querySelector('.ncui-live-status');
    var body=node.querySelector('.ncui-live-body');
    var readerRequest=useAuth ? _auth.fetch(url,{method:'GET'}) : _requestWithTimeout(url,{method:'GET',credentials:'same-origin'});
    Promise.resolve(readerRequest).then(function(res){
      if(!res||!res.ok||!res.body)throw new Error('Stream connection failed');
      if(status)status.textContent='Live stream connected';
      var reader=res.body.getReader();
      var decoder=new TextDecoder();
      var buffer='';
      var items=[];
      function pump(){
        reader.read().then(function(result){
          if(result.done)return;
          buffer+=decoder.decode(result.value,{stream:true});
          var lines=buffer.split('
');
          buffer=lines.pop()||'';
          lines.forEach(function(line){
            var trimmed=String(line||'').trim();
            if(!trimmed)return;
            items.push(trimmed);
          });
          if(saveAs)_set(saveAs,items.slice());
          if(body)body.innerHTML=items.slice(-12).map(function(item){return '<div class="ncui-live-event">'+String(item).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div>';}).join('');
          pump();
        }).catch(function(err){
          if(status)status.textContent=(err&&err.message)?err.message:'Stream closed';
        });
      }
      pump();
    }).catch(function(err){
      if(status)status.textContent=(err&&err.message)?err.message:'Unable to connect to stream';
    });
  });
}
function _initSockets(){
  document.querySelectorAll('[data-ncui-socket-url]').forEach(function(node){
    if(node.getAttribute('data-ncui-socket-mounted')==='true')return;
    node.setAttribute('data-ncui-socket-mounted','true');
    var url=node.getAttribute('data-ncui-socket-url');
    var saveAs=node.getAttribute('data-ncui-socket-save')||'';
    var channel=node.getAttribute('data-ncui-socket-channel')||'';
    var status=node.querySelector('.ncui-live-status');
    var body=node.querySelector('.ncui-live-body');
    if(typeof WebSocket==='undefined'){
      if(status)status.textContent='WebSocket is not available in this browser';
      return;
    }
    try{
      var socket=new WebSocket(url);
      _socketRegistry[url]=socket;
      socket.onopen=function(){
        if(status)status.textContent='Realtime socket connected';
        if(channel)socket.send(JSON.stringify({ subscribe: channel }));
      };
      socket.onmessage=function(event){
        var current=saveAs?_exprValue(saveAs):[];
        if(!Array.isArray(current))current=[];
        current=current.concat([event.data]);
        if(saveAs)_set(saveAs,current.slice(-50));
        if(body)body.innerHTML=current.slice(-12).map(function(item){return '<div class="ncui-live-event">'+String(item).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div>';}).join('');
      };
      socket.onerror=function(){ if(status)status.textContent='Socket error'; };
      socket.onclose=function(){ if(status)status.textContent='Socket disconnected'; };
    }catch(err){
      if(status)status.textContent=(err&&err.message)?err.message:'Unable to connect to socket';
    }
  });
}
function _initDragDrop(){
  document.querySelectorAll('.ncui-drag-item[draggable="true"]').forEach(function(item){
    if(item.getAttribute('data-ncui-drag-ready')==='true')return;
    item.setAttribute('data-ncui-drag-ready','true');
    item.addEventListener('dragstart',function(event){
      if(!event.dataTransfer)return;
      event.dataTransfer.effectAllowed='move';
      event.dataTransfer.setData('application/x-ncui-drag', item.getAttribute('data-ncui-drag-payload')||'');
    });
  });
  document.querySelectorAll('[data-ncui-drop-target]').forEach(function(zone){
    if(zone.getAttribute('data-ncui-drop-ready')==='true')return;
    zone.setAttribute('data-ncui-drop-ready','true');
    zone.addEventListener('dragover',function(event){
      event.preventDefault();
      zone.classList.add('ncui-drop-hover');
    });
    zone.addEventListener('dragleave',function(){ zone.classList.remove('ncui-drop-hover'); });
    zone.addEventListener('drop',function(event){
      event.preventDefault();
      zone.classList.remove('ncui-drop-hover');
      var raw=event.dataTransfer?event.dataTransfer.getData('application/x-ncui-drag'):'';
      if(!raw)return;
      try{
        var payload=JSON.parse(decodeURIComponent(raw));
        var sourceItems=_exprValue(payload.source);
        var targetName=zone.getAttribute('data-ncui-drop-target')||'';
        var targetItems=_exprValue(targetName);
        if(!Array.isArray(sourceItems)||!Array.isArray(targetItems))return;
        var nextSource=sourceItems.slice();
        var moved=nextSource.splice(Number(payload.index),1)[0];
        var nextTarget=targetItems.slice();
        nextTarget.push(moved);
        _assignCollectionTarget(payload.source,nextSource);
        _assignCollectionTarget(targetName,nextTarget);
        _notify();
      }catch(_){}
    });
  });
}
function _initFlowInteractions(){
  document.querySelectorAll('.ncui-flow-node').forEach(function(node){
    if(node.getAttribute('data-ncui-flow-ready')==='true')return;
    node.setAttribute('data-ncui-flow-ready','true');
    node.addEventListener('pointerdown',function(event){
      var host=node.closest('[data-ncui-flow-kind]');
      if(!host)return;
      var source=host.getAttribute('data-ncui-flow-source')||'';
      var id=node.getAttribute('data-ncui-flow-node');
      var startX=event.clientX;
      var startY=event.clientY;
      var originLeft=parseFloat(node.style.left||'0');
      var originTop=parseFloat(node.style.top||'0');
      function move(ev){
        var left=originLeft+(ev.clientX-startX);
        var top=originTop+(ev.clientY-startY);
        node.style.left=left+'px';
        node.style.top=top+'px';
      }
      function up(ev){
        window.removeEventListener('pointermove',move);
        window.removeEventListener('pointerup',up);
        var flow=_exprValue(source);
        if(flow&&Array.isArray(flow.nodes)){
          var next=Object.assign({},flow,{nodes:flow.nodes.map(function(entry){
            if(String(entry.id)!==String(id))return entry;
            return Object.assign({},entry,{x:parseFloat(node.style.left||'0'),y:parseFloat(node.style.top||'0')});
          })});
          _assignCollectionTarget(source,next);
          _notify();
        }
      }
      window.addEventListener('pointermove',move);
      window.addEventListener('pointerup',up);
    });
  });
}
function _notify(){
  _listeners.forEach(function(fn){fn(_state)});
  document.querySelectorAll('[data-ncui-text]').forEach(function(el){
    var tpl=el.getAttribute('data-ncui-text');
    el.textContent=tpl.replace(/\{\{([^}]+)\}\}/g,function(_,e){
      var v=_exprValue(e);
      return v!=null?v:'';
    });
  });
  document.querySelectorAll('[data-ncui-if]').forEach(function(el){
    var k=el.getAttribute('data-ncui-if');
    var neg=k.charAt(0)==='!';
    var rk=neg?k.slice(1):k;
    var show=neg?!_exprValue(rk):!!_exprValue(rk);
    el.classList.toggle('ncui-hidden',!show);
  });
  _syncBoundInputs();
  _renderTables();
  _renderGraphs();
  _renderFlows();
  _renderDragDrop();
  _initStreams();
  _initSockets();
  _initDragDrop();
  _initFlowInteractions();
  document.querySelectorAll('[data-ncui-markdown]').forEach(function(el){
    var tpl=el.getAttribute('data-ncui-markdown')||'';
    var text=tpl.replace(/{{([^}]+)}}/g,function(_,e){
      var v=_exprValue(e);
      return v!=null?v:'';
    });
    el.innerHTML=_markdownToHtml(text);
  });
  _mountExternalNodes();
}
window.NCUIProviders=window.NCUIProviders||{
  configs:{},
  handlers:{},
  register:function(name,handler){this.handlers[name]=handler;return true;},
  mount:function(name,target,props){
    if(typeof this.handlers[name]==='function')return this.handlers[name](target,props||{},this.configs[name]||{});
    return false;
  }
};
window.NCUIServices=window.NCUIServices||{};
document.querySelectorAll('[data-ncui-bind]').forEach(function(field){
  var handler=function(){
    var key=field.getAttribute('data-ncui-bind');
    if(!key)return;
    var value=field.type==='checkbox'?!!field.checked:field.value;
    _state[key]=value;
    _validateFieldElement(field);
    var changeAction=field.getAttribute('data-ncui-change');
    if(changeAction){
      var changeFn=window['action_'+changeAction];
      if(typeof changeFn==='function')changeFn(value);
    }
    _notify();
  };
  field.addEventListener('input',handler);
  field.addEventListener('change',handler);
});
document.querySelectorAll('[data-ncui-click]').forEach(function(el){
  el.addEventListener('click',function(e){
    e.preventDefault();
    var name=el.getAttribute('data-ncui-click');
    var fn=window['action_'+name];
    if(typeof fn==='function')fn();
  });
});
document.querySelectorAll('.ncui-form').forEach(function(form){
  form.addEventListener('submit',async function(e){
    e.preventDefault();
    if(!_validateForm(form)){
      form.setAttribute('data-ncui-status','error');
      return;
    }
    var name=form.getAttribute('data-ncui-submit');
    var fn=name?(window['action_'+name]):null;
    var payload=_collectFormData(form);
    var submitBtn=form.querySelector('button[type="submit"], .ncui-btn');
    var originalLabel=submitBtn?submitBtn.textContent:null;
    var status=form.querySelector('[data-ncui-form-status]');
    if(submitBtn){submitBtn.disabled=true;submitBtn.setAttribute('aria-busy','true');}
    if(status)status.textContent='';
    try{
      if(typeof fn==='function'){
        await fn(payload);
      } else {
        var actionUrl=form.getAttribute('data-ncui-action-url')||form.getAttribute('action')||'';
        if(actionUrl && actionUrl !== '#'){
          var method=(form.getAttribute('method')||'POST').toUpperCase();
          var requestOptions={method:method,headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)};
          var res=form.getAttribute('data-ncui-auth')==='true' ? await _auth.fetch(actionUrl,requestOptions) : await _requestWithTimeout(actionUrl,Object.assign({credentials:'same-origin'},requestOptions));
          var contentType=res.headers&&res.headers.get?res.headers.get('content-type')||'':'';
          var data=contentType.indexOf('application/json')!==-1 ? await res.json() : await res.text();
          if(!res.ok)throw new Error((data&&data.message)||('Request failed ('+res.status+')'));
          var saveAs=form.getAttribute('data-ncui-save-response');
          if(saveAs)_set(saveAs,data);
          var redirectTo=form.getAttribute('data-ncui-redirect');
          if(redirectTo){
            history.pushState(null,'',redirectTo);
            if(typeof _resolve==='function')_resolve();
          }
        }
      }
      form.setAttribute('data-ncui-status','success');
      if(status)status.textContent='Saved successfully.';
    }catch(err){
      _state.lastError=err&&err.message?err.message:String(err);
      form.setAttribute('data-ncui-status','error');
      if(status)status.textContent=_state.lastError;
      _audit('action.submit_failed',{action:name||'form_submit',message:_state.lastError});
      _notify();
    }finally{
      if(submitBtn){submitBtn.disabled=false;submitBtn.removeAttribute('aria-busy');if(originalLabel!=null)submitBtn.textContent=originalLabel;}
    }
  });
});
async function action_runAgent(text){
  _set("loading",true);
  _addTo(":","step");
  _addTo(":","step");
  _addTo(":","step");
  _addTo(":","step");
  _set("result",Agent completed research on:  + text);
  _set("loading",false);
}
window.action_runAgent=action_runAgent;
window.NCUIInterop=window.NCUIInterop||{
  renderComponent:function(name,params){
    var fn=window['_render_'+name];
    return typeof fn==='function'?fn(params||{}):'';
  },
  mountComponent:function(name,target,params){
    var host=typeof target==='string'?document.querySelector(target):target;
    if(!host)return false;
    host.innerHTML=this.renderComponent(name,params);
    return true;
  },
  renderRoute:function(path){
    if(!_routes||!_routes.length)return '';
    for(var i=0;i<_routes.length;i++){
      var match=String(path||'/').match(_routes[i].regex);
      if(match){
        var fn=window['_render_'+_routes[i].component];
        return typeof fn==='function'?fn(match.groups||{}):'';
      }
    }
    return '';
  },
  mountRoute:function(path,target){
    var host=typeof target==='string'?document.querySelector(target):target;
    if(!host)return false;
    host.innerHTML=this.renderRoute(path);
    return true;
  },
  navigate:function(path){
    history.pushState(null,'',path);
    if(typeof _resolve==='function')_resolve();
  },
  snapshot:function(){
    return {state:Object.assign({},_state), stores:JSON.parse(JSON.stringify(_stores)), ssr:_ssrPayload, path:window.location.pathname};
  },
  registerExternal:function(name,renderer){
    window.NCUIExternal=window.NCUIExternal||{};
    window.NCUIExternal[name]=renderer;
  },
  mountExternal:function(name,target,props){
    var host=typeof target==='string'?document.querySelector(target):target;
    if(!host||!window.NCUIExternal||typeof window.NCUIExternal[name]!=='function')return false;
    window.NCUIExternal[name](host, props||{});
    return true;
  }
};
if(typeof window!=='undefined'&&window.customElements&&!window.customElements.get('ncui-route')){
  window.customElements.define('ncui-route', class extends HTMLElement{
    connectedCallback(){
      var path=this.getAttribute('path')||window.location.pathname||'/';
      window.NCUIInterop.mountRoute(path,this);
    }
  });
}
if(typeof window!=='undefined'&&window.customElements&&!window.customElements.get('ncui-component')){
  window.customElements.define('ncui-component', class extends HTMLElement{
    connectedCallback(){
      var name=this.getAttribute('name');
      var props={};
      Array.prototype.forEach.call(this.attributes,function(attr){
        if(attr.name==='name')return;
        props[attr.name]=attr.value;
      });
      window.NCUIInterop.mountComponent(name,this,props);
    }
  });
}
Promise.resolve(_auth.init()).catch(function(err){
  _state.authError=err&&err.message?err.message:String(err);
  _audit('auth.init_failed',{message:_state.authError});
}).finally(async function(){
  if(typeof _runMountTasks==='function'){await _runMountTasks();}
  if(typeof _resolve==='function')_resolve();
  _notify();
});
})();
