
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
