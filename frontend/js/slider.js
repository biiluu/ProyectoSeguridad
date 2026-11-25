// Lógica de Carrusel / Slider de Novedades
function initSlider() {
  const root = document.getElementById('destacados');
  if (!root) return;

  const slider = root.querySelector('.slider');
  const track = root.querySelector('.track');
  const slides = root.querySelectorAll('.slide');
  const prev = root.querySelector('.prev');
  const next = root.querySelector('.next');
  const dotsContainer = root.querySelector('.dots');

  if (!slider || !track || slides.length === 0) return;

  let index = 0;
  let timer = null;
  const AUTOPLAY_MS = 5000;

  dotsContainer.innerHTML = '';
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = `dot ${i === 0 ? 'active' : ''}`;
    dot.type = 'button';
    dot.setAttribute('aria-label', `Ir al slide ${i + 1}`);
    dot.onclick = () => goTo(i, true);
    dotsContainer.appendChild(dot);
  });

  const dots = dotsContainer.querySelectorAll('.dot');

  function update() {
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === index);
    });
  }

  function goTo(i, fromUser = false) {
    index = (i + slides.length) % slides.length;
    update();
    if (fromUser) restart();
  }

  function nextSlide() { goTo(index + 1); }

  if (prev) prev.onclick = () => goTo(index - 1, true);
  if (next) next.onclick = () => goTo(index + 1, true);

  function start() { stop(); timer = setInterval(nextSlide, AUTOPLAY_MS); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function restart() { stop(); start(); }

  slider.addEventListener('mouseenter', stop);
  slider.addEventListener('mouseleave', start);

  update();
  start();

  // Cargar imágenes del backend para el slider (si existen en BD)
  fetch(`${window.API_URL}/api/Novedades/productosSlider`)
    .then(res => (res.ok ? res.json() : []))
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        slides.forEach((slide, idx) => {
          const img = slide.querySelector('.slide__img');
          if (img && data[idx] && data[idx].fotoBase64) {
            const raw = data[idx].fotoBase64;
            img.src = raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`;
          }
        });
      }
    })
    .catch(err => console.warn('Nota: Usando imágenes por defecto del slider:', err.message));
}

window.initSlider = initSlider;
