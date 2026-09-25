/* ==========================================================================
   Navegação da apresentação: palco fixo de 1920 x 1080 escalado para a tela,
   um slide por vez, teclado / toque / botões, e o link (#n) acompanha.
   Vídeos só tocam no slide em que estão:
     data-auto        → laço normal
     data-seg="a,b"   → laço só no trecho [a, b] do vídeo de gameplay
   ========================================================================== */
(function () {
  const palco = document.getElementById('palco');
  const slides = [...document.querySelectorAll('.slide')];
  const contador = document.getElementById('contador');
  const barra = document.getElementById('barra');
  let atual = -1;

  /* ------------------------------------------------ escala */
  function escala() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    palco.style.transform = `scale(${s})`;
    palco.style.left = (innerWidth - 1920 * s) / 2 + 'px';
    palco.style.top = (innerHeight - 1080 * s) / 2 + 'px';
  }
  addEventListener('resize', escala); escala();

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

  /* ------------------------------------------------ troca de slide */
  function vai(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === atual) return;
    const antes = atual;
    slides.forEach((s, j) => {
      s.classList.toggle('ativo', j === i);
      s.classList.toggle('antes', j < i);
    });
    if (antes >= 0) ligaVideos(slides[antes], false);
    ligaVideos(slides[i], true);
    atual = i;
    contador.textContent = `${i + 1} / ${slides.length}`;
    barra.style.width = ((i + 1) / slides.length) * 100 + '%';
    history.replaceState(null, '', '#' + (i + 1));
    document.title = `${slides[i].dataset.titulo} · O Semáforo`;
  }
  const prox = () => vai(atual + 1), ant = () => vai(atual - 1);

  addEventListener('keydown', (e) => {
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); prox(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); ant(); }
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

  // deslizar o dedo (tablet / celular)
  let x0 = null;
  addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 60) (dx < 0 ? prox : ant)();
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
  const n = parseInt(location.hash.slice(1), 10);
  vai(Number.isFinite(n) ? n - 1 : 0);
  setTimeout(() => { document.getElementById('dica').style.opacity = 0; }, 6000);
})();
