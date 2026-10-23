/* Interruptor de Halloween.
   - Al ingresar a la web (login / portada) SIEMPRE arranca ENCENDIDO, incluso la pantalla de carga.
   - El botón 🎃 lo apaga/enciende; esa elección dura mientras la pestaña esté abierta.
   - Para que arranque apagado, cambia DEFAULT_ON a false. */
(function(){
  var DEFAULT_ON=true,K='hw',d=document.documentElement,on=DEFAULT_ON;
  var entry=/(^|\/)(login(\.html)?)?$/.test(location.pathname)||/(^|\/)index(\.html)?$/.test(location.pathname);
  try{localStorage.removeItem(K)}catch(e){}
  try{if(entry)sessionStorage.removeItem(K);var v=sessionStorage.getItem(K);if(v!==null)on=v==='1'}catch(e){}
  d.classList.toggle('hw',on);
  function apply(){d.classList.toggle('hw',on);var b=document.getElementById('hwbtn');if(b){b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);b.innerHTML='🎃 <span>Halloween: '+(on?'ON':'OFF')+'</span>'}}
  document.addEventListener('DOMContentLoaded',function(){
    var b=document.createElement('button');b.id='hwbtn';b.type='button';b.title='Activar / desactivar estilo Halloween';
    b.onclick=function(){on=!on;try{sessionStorage.setItem(K,on?'1':'0')}catch(e){}apply()};
    document.body.appendChild(b);apply();
  });
})();
