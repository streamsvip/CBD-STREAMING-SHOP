/* Interruptor de Halloween. Guarda la elección del visitante en su navegador.
   Para activarlo/desactivarlo POR DEFECTO para todos, cambia DEFAULT_ON. */
(function(){
  var DEFAULT_ON=true,K='hw',d=document.documentElement,on=DEFAULT_ON;
  try{var v=localStorage.getItem(K);if(v!==null)on=v==='1'}catch(e){}
  function apply(){d.classList.toggle('hw',on);var b=document.getElementById('hwbtn');if(b){b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);b.innerHTML='🎃 <span>Halloween: '+(on?'ON':'OFF')+'</span>'}}
  apply();
  document.addEventListener('DOMContentLoaded',function(){
    var b=document.createElement('button');b.id='hwbtn';b.type='button';b.title='Activar / desactivar estilo Halloween';
    b.onclick=function(){on=!on;try{localStorage.setItem(K,on?'1':'0')}catch(e){}apply()};
    document.body.appendChild(b);apply();
  });
})();
