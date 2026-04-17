document.addEventListener('DOMContentLoaded', () => {
  // Duplicate ticker items for seamless infinite loop
  document.querySelectorAll('.ticker-track').forEach(track => {
    track.innerHTML += track.innerHTML;
  });

  // Scroll-triggered fade-up animations
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.animationPlayState = 'running';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.fu').forEach(el => {
    el.style.animationPlayState = 'paused';
    obs.observe(el);
  });
});
