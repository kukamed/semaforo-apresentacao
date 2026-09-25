/* ==========================================================================
   Navegação da apresentação. Dois modos:
     palco  — tela larga: palco fixo de 1920 x 1080 escalado, um slide por vez;
     fluido — celular em pé / tela estreita: os slides viram seções empilhadas
              que se rolam com o dedo (css/fluido.css), e o slide "atual" é o
              que está no meio da tela.
   Teclado, botões e o link (#n) funcionam nos dois.
   Vídeos só tocam no slide atual:
     data-auto        → laço normal
     data-seg="a,b"   → laço só no trecho [a, b] do vídeo de gameplay
   ========================================================================== */
(function () {
  const palco = document.getElementById('palco');
  const slides = [...document.querySelectorAll('.slide')];
  const contador = document.getElementById('contador');
  const barra = document.getElementById('barra');
  const dica = document.getElementById('dica');
  let atual = -1, fluido = null;

  /* ------------------------------------------------ modo e escala */
  const querFluido = () => innerWidth < 900 || innerWidth / innerHeight < 0.9;
  function ajusta() {
    const f = querFluido();
    if (f !== fluido) {
      fluido = f;
      document.documentElement.classList.toggle('fluido', f);
      document.body.classList.toggle('fluido', f);
      dica.textContent = f ? 'deslize para cima para avançar' : '← → navegar · F tela cheia';
      if (atual >= 0) {
        if (f) slides[atual].scrollIntoView({ block: 'start' });
        else { scrollTo(0, 0); marca(atual, true); }
      }
    }
    if (fluido) { palco.style.transform = ''; palco.style.left = palco.style.top = ''; return; }
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    palco.style.transform = `scale(${s})`;
    palco.style.left = (innerWidth - 1920 * s) / 2 + 'px';
    palco.style.top = (innerHeight - 1080 * s) / 2 + 'px';
  }
  addEventListener('resize', ajusta);

  /* ------------------------------------------------ vídeos por slide */
  function trechos(v) {
    const [a, b] = v.dataset.seg.split(',').map(Number);
    return { a, b };
  }
  function ligaVideos(slide, liga) {
    slide.querySelectorAll('video[data-auto], video[data-seg]').forEach((v) => {
      if (!liga) { v.pause(); return; }
      if (v.dataset.seg) {
        const { a } = trechos(v);
        const vai = () => { v.currentTime = a; v.play().catch(() => {}); };
        if (v.readyState >= 1) vai(); else v.addEventListener('loadedmetadata', vai, { once: true });
      } else {
        v.play().catch(() => {});
      }
    });
    if (!liga) { const f = slide.querySelector('#filme'); if (f) f.pause(); }
  }
  // o trecho volta ao começo quando chega ao fim
  document.querySelectorAll('video[data-seg]').forEach((v) => {
    v.addEventListener('timeupdate', () => {
      const { a, b } = trechos(v);
      if (v.currentTime >= b || v.currentTime < a - 0.5) v.currentTime = a;
    });
  });
  // se o navegador recusar ou interromper o play inicial, tenta de novo enquanto o slide estiver na tela
  setInterval(() => {
    const s = slides[atual]; if (!s) return;
    s.querySelectorAll('video[data-auto], video[data-seg]').forEach((v) => { if (v.paused && v.readyState >= 2) v.play().catch(() => {}); });
  }, 1000);

  /* ------------------------------------------------ slide atual */
  function marca(i, forca) {
    if (i === atual && !forca) return;
    const antes = atual;
    slides.forEach((s, j) => {
      s.classList.toggle('ativo', j === i);
      s.classList.toggle('antes', j < i);
    });
    if (antes >= 0 && antes !== i) ligaVideos(slides[antes], false);
    if (antes !== i || forca) ligaVideos(slides[i], true);
    atual = i;
    contador.textContent = `${i + 1} / ${slides.length}`;
    barra.style.width = ((i + 1) / slides.length) * 100 + '%';
    history.replaceState(null, '', '#' + (i + 1));
    document.title = `${slides[i].dataset.titulo} · O Semáforo`;
  }
  function vai(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (fluido) { slides[i].scrollIntoView({ behavior: 'smooth', block: 'start' }); marca(i); }
    else marca(i);
  }
  const prox = () => vai(atual + 1), ant = () => vai(atual - 1);

  // no modo fluido, o atual é o slide que cruza o meio da tela
  const vigia = new IntersectionObserver((es) => {
    if (!fluido) return;
    es.forEach((e) => { if (e.isIntersecting) marca(slides.indexOf(e.target)); });
  }, { rootMargin: '-50% 0px -50% 0px' });
  slides.forEach((s) => vigia.observe(s));

  addEventListener('keydown', (e) => {
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key) || (fluido && e.key === 'ArrowDown')) { e.preventDefault(); prox(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key) || (fluido && e.key === 'ArrowUp')) { e.preventDefault(); ant(); }
    else if (e.key === 'Home') vai(0);
    else if (e.key === 'End') vai(slides.length - 1);
    else if (e.key === 'f' || e.key === 'F') telaCheia();
  });
  document.getElementById('prox').addEventListener('click', prox);
  document.getElementById('ant').addEventListener('click', ant);
  document.getElementById('tela').addEventListener('click', telaCheia);
  function telaCheia() {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
  }

  // deslizar para o lado (só no modo palco; no fluido o dedo rola a página)
  let x0 = null, y0 = null;
  addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', (e) => {
    if (x0 === null || fluido) { x0 = null; return; }
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? prox : ant)();
  });

  /* ------------------------------------------------ sala de vídeo */
  const filme = document.getElementById('filme');
  const caps = [...document.querySelectorAll('#capitulos button')];
  caps.forEach((b) => b.addEventListener('click', () => {
    filme.currentTime = Number(b.dataset.t);
    filme.muted = false;
    filme.play().catch(() => {});
  }));
  document.getElementById('tocar').addEventListener('click', () => {
    filme.muted = false;
    if (filme.paused) filme.play().catch(() => {}); else filme.pause();
  });
  filme.addEventListener('timeupdate', () => {
    const t = filme.currentTime;
    let k = 0; caps.forEach((b, j) => { if (t >= Number(b.dataset.t) - 0.05) k = j; });
    caps.forEach((b, j) => b.classList.toggle('agora', j === k));
  });
  filme.addEventListener('play', () => { document.getElementById('tocar').textContent = '❚❚ Pausar'; });
  filme.addEventListener('pause', () => { document.getElementById('tocar').textContent = '▶ Assistir com som'; });

  /* ------------------------------------------------ início */
  ajusta();
  const n = parseInt(location.hash.slice(1), 10);
  const i0 = Number.isFinite(n) ? Math.max(0, Math.min(slides.length - 1, n - 1)) : 0;
  marca(i0, true);
  if (fluido && i0 > 0) slides[i0].scrollIntoView({ block: 'start' });
  setTimeout(() => { dica.style.opacity = 0; }, 6000);
})();
