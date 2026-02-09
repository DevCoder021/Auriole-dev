// Scroll reveal
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });
  
  document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(50px)';
    section.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
    observer.observe(section);
  });
  
  // Scroll to top button
  window.addEventListener('scroll', () => {
    const scrollTop = document.getElementById('scrollTop');
    if (window.scrollY > 500) {
      scrollTop.classList.remove('opacity-0', 'pointer-events-none');
      scrollTop.classList.add('opacity-100');
    } else {
      scrollTop.classList.add('opacity-0', 'pointer-events-none');
      scrollTop.classList.remove('opacity-100');
    }
  });
  
  document.addEventListener('DOMContentLoaded', function() {
    /* ----------  CAROUSEL 3D  ---------- */
    const slides = document.querySelectorAll('.carousel-slide');
    const prevButton = document.querySelector('.carousel-prev');
    const nextButton = document.querySelector('.carousel-next');
    const indicators = document.querySelectorAll('.carousel-indicator');
  
    if (slides.length && prevButton && nextButton && indicators.length) {
      let currentIndex = 0;
      const slideCount = slides.length;
      const wrapper = document.querySelector('.carousel-slide-wrapper');
      
      // Ajouter la perspective au wrapper
      if (wrapper) {
        wrapper.style.perspective = '1500px';
      }

      // Ajouter les styles CSS nécessaires pour l'effet 3D
      const style = document.createElement('style');
      style.textContent = `
        .perspective-1000 { perspective: 1500px; }
        .transform-style-3d { transform-style: preserve-3d; }`;
      document.head.appendChild(style);

      function updateCarousel() {
        slides.forEach((slide, index) => {
          const offset = index - currentIndex;
          const normalizedOffset = ((offset + slideCount) % slideCount <= slideCount / 2) ? offset : offset - slideCount;

          // Réinitialiser effets
          slide.style.filter = 'none';
          slide.classList.remove('glass');

          if (normalizedOffset === 0) {
            // Image du centre - au premier plan, face caméra
            slide.style.transform = 'translateX(0) rotateY(0deg) translateZ(500px) scale(1)';
            slide.style.opacity = '1';
            slide.style.zIndex = '30';
            slide.style.filter = 'blur(0px) brightness(1)';
          } else if (normalizedOffset === 1) {
            // Image à droite - tournée vers la droite
            slide.style.transform = 'translateX(70%) rotateY(-55deg) translateZ(150px) scale(0.9)';
            slide.style.opacity = '0.95';
            slide.style.zIndex = '15';
            slide.style.filter = 'blur(1px) brightness(0.97)';
            slide.classList.add('glass');
          } else if (normalizedOffset === -1) {
            // Image à gauche - tournée vers la gauche
            slide.style.transform = 'translateX(-70%) rotateY(55deg) translateZ(150px) scale(0.9)';
            slide.style.opacity = '0.95';
            slide.style.zIndex = '15';
            slide.style.filter = 'blur(1px) brightness(0.97)';
            slide.classList.add('glass');
          } else if (normalizedOffset === 2) {
            // Deuxième image à droite
            slide.style.transform = 'translateX(120%) rotateY(-75deg) translateZ(-100px) scale(0.75)';
            slide.style.opacity = '0.7';
            slide.style.zIndex = '5';
            slide.style.filter = 'blur(3px) brightness(0.85)';
            slide.classList.add('glass');
          } else if (normalizedOffset === -2) {
            // Deuxième image à gauche
            slide.style.transform = 'translateX(-120%) rotateY(75deg) translateZ(-100px) scale(0.75)';
            slide.style.opacity = '0.7';
            slide.style.zIndex = '5';
            slide.style.filter = 'blur(3px) brightness(0.85)';
            slide.classList.add('glass');
          } else {
            // Images très lointaines
            const direction = normalizedOffset > 0 ? 1 : -1;
            slide.style.transform = `translateX(${direction > 0 ? 150 : -150}%) rotateY(${direction > 0 ? -90 : 90}deg) translateZ(-300px) scale(0.6)`;
            slide.style.opacity = '0.4';
            slide.style.zIndex = '1';
            slide.style.filter = 'blur(6px) brightness(0.7)';
            slide.classList.add('glass');
          }
        });

        indicators.forEach((indicator, index) => {
          indicator.classList.toggle('bg-neon-green', index === currentIndex);
          indicator.classList.toggle('bg-white/30', index !== currentIndex);
        });
      }

      prevButton.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + slideCount) % slideCount;
        updateCarousel();
      });

      nextButton.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % slideCount;
        updateCarousel();
      });

      indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
          currentIndex = index;
          updateCarousel();
        });
      });

      // Lightbox simple
      const lightbox = document.createElement('div');
      lightbox.id = 'lightbox';
      lightbox.className = 'fixed inset-0 bg-black/90 z-50 hidden flex items-center justify-center';
      lightbox.innerHTML = '<img class="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl" />';
      document.body.appendChild(lightbox);

      const lightboxImg = lightbox.querySelector('img');
      slides.forEach(slide => {
        const img = slide.querySelector('img');
        img.addEventListener('click', () => {
          lightboxImg.src = img.src;
          lightbox.classList.remove('hidden');
        });
      });

      lightbox.addEventListener('click', () => {
        lightbox.classList.add('hidden');
      });

      updateCarousel();
    }
  
    /* ----------  AUDIO PLAYER  ---------- */
    let currentAudio = null;
    let currentPlayBtn = null;
  
    const formatTime = (seconds) => {
      const min = Math.floor(seconds / 60);
      const sec = Math.floor(seconds % 60);
      return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    };
  
    document.querySelectorAll('.audio-player').forEach(player => {
      const mp3Source = player.dataset.src;
      const accentColor = player.dataset.accentColor;
      const playBtn = player.querySelector('.play-pause-btn');
      const playIcon = player.querySelector('.play-icon');
      const pauseIcon = player.querySelector('.pause-icon');
      const timeDisplay = player.querySelector('.time-display');
      const originalDuration = timeDisplay.dataset.duration;
      const progressBarContainer = player.querySelector('.progress-bar-container');
      const progressFill = player.querySelector('.progress-fill');
      const progressHandle = player.querySelector('.progress-handle');
  
      const audio = new Audio(mp3Source);
  
      playBtn.addEventListener('click', () => {
        if (currentAudio && currentAudio !== audio) {
          currentAudio.pause();
          currentPlayBtn.querySelector('.play-icon').classList.remove('hidden');
          currentPlayBtn.querySelector('.pause-icon').classList.add('hidden');
        }
  
        if (audio.paused) {
          audio.play();
          playIcon.classList.add('hidden');
          pauseIcon.classList.remove('hidden');
          currentAudio = audio;
          currentPlayBtn = playBtn;
        } else {
          audio.pause();
          playIcon.classList.remove('hidden');
          pauseIcon.classList.add('hidden');
          currentAudio = null;
          currentPlayBtn = null;
        }
      });
  
      audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        const percentage = (audio.currentTime / audio.duration) * 100;
        const remainingTime = audio.duration - audio.currentTime;
        progressFill.style.width = `${percentage}%`;
        progressHandle.style.left = `${percentage}%`;
        timeDisplay.textContent = `-${formatTime(remainingTime)}`;
      });
  
      audio.addEventListener('loadedmetadata', () => {
        timeDisplay.textContent = formatTime(audio.duration);
        timeDisplay.dataset.duration = formatTime(audio.duration);
      });
  
      audio.addEventListener('ended', () => {
        audio.currentTime = 0;
        progressFill.style.width = '0%';
        progressHandle.style.left = '0%';
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        timeDisplay.textContent = originalDuration;
        currentAudio = null;
        currentPlayBtn = null;
      });
  
      progressBarContainer.addEventListener('click', (e) => {
        const rect = progressBarContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        if (audio.duration) audio.currentTime = audio.duration * percentage;
      });
    });
  
    /* ----------  MODAL TÉMOIGNAGE  ---------- */
    const modal = document.getElementById('testimonial-modal');
    const openButton = document.getElementById('testimonial-open');
    if (!modal || !openButton) {
      return;
    }
    const closeButton = document.getElementById('testimonial-close');
    const cancelButton = document.getElementById('testimonial-cancel');
    const backdrop = modal.querySelector('[data-modal-backdrop]');
    const form = document.getElementById('testimonial-form');
    const thanksMessage = document.getElementById('testimonial-thanks');
  
    if (!closeButton || !cancelButton || !backdrop || !form || !thanksMessage) {
      return;
    }

    function openModal() {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      modal.setAttribute('aria-hidden', 'false');
      openButton.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function closeModal() {
      modal.classList.remove('flex');
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      openButton.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      form.reset();
      form.classList.remove('hidden');
      thanksMessage.classList.add('hidden');
    }
  
    openButton.addEventListener('click', openModal);
    closeButton.addEventListener('click', closeModal);
    cancelButton.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('flex')) closeModal();
    });
  
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) return form.reportValidity();
      form.classList.add('hidden');
      thanksMessage.classList.remove('hidden');
      setTimeout(closeModal, 1400);
    });
  });