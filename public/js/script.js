(function(){
  'use strict';

  const safeQuery = (sel, ctx = document) => {
    try { return ctx.querySelector(sel); } catch(e) { return null; }
  };

  document.addEventListener('DOMContentLoaded', () => {

    /* ----------  BURGER MENU  ---------- */
    const burger = document.getElementById('burger');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileClose = document.getElementById('mobile-close');
    const menuLinks = mobileMenu?.querySelectorAll('a[role="menuitem"]');

    function closeMobileMenu() {
      if (!burger) return;
      burger.classList.remove('burger-open');
      mobileMenu.classList.add('translate-x-full');
      mobileMenu.classList.remove('translate-x-0');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    function openMobileMenu() {
      if (!burger) return;
      burger.classList.add('burger-open');
      mobileMenu.classList.remove('translate-x-full');
      mobileMenu.classList.add('translate-x-0');
      burger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    if (burger && mobileMenu) {
      burger.addEventListener('click', () => {
        if (burger.classList.contains('burger-open')) {
          closeMobileMenu();
        } else {
          openMobileMenu();
        }
      });

      if (mobileClose) {
        mobileClose.addEventListener('click', closeMobileMenu);
      }

      if (menuLinks) {
        menuLinks.forEach(link => {
          link.addEventListener('click', closeMobileMenu);
        });
      }
    }

    /* ----------  SMOOTH SCROLL  ---------- */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href) return;
        if (href === '#') {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        if (href.startsWith('#')) {
          e.preventDefault();
          try {
            const target = document.querySelector(href);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } catch (err) {
            console.warn('Smooth scroll: invalid selector', href, err);
          }
        }
      });
    });

    /* ----------  NAVBAR HIDE/SHOW  ---------- */
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;
    const scrollTopBtn = document.getElementById('scrollTop');

    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      if (navbar) {
        if (currentScroll <= 0) navbar.style.transform = 'translateY(0)';
        else if (currentScroll > lastScroll) navbar.style.transform = 'translateY(-100%)';
        else navbar.style.transform = 'translateY(0)';
      }
      lastScroll = currentScroll;

      if (scrollTopBtn) {
        if (currentScroll > 500) {
          scrollTopBtn.classList.remove('opacity-0', 'pointer-events-none');
          scrollTopBtn.classList.add('opacity-100');
        } else {
          scrollTopBtn.classList.add('opacity-0', 'pointer-events-none');
          scrollTopBtn.classList.remove('opacity-100');
        }
      }
    }, { passive: true });

    /* ----------  REVEAL ANIMATIONS  ---------- */
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -100px 0px' };
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          revealObserver.unobserve(entry.target);
        }
      });
    }, observerOptions);

    document.querySelectorAll('section, .card-3d, .neon-hover').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = `opacity 0.6s ease-out, transform 0.6s ease-out`;
      revealObserver.observe(el);
    });

    /* ----------  PARALLAX  ---------- */
    if (window.matchMedia('(pointer: fine)').matches) {
      document.addEventListener('mousemove', (e) => {
        const pageX = e.pageX;
        const pageY = e.pageY;
        document.querySelectorAll('.parallax').forEach(el => {
          const speed = parseFloat(el.dataset.speed) || 2;
          const x = (window.innerWidth - pageX * speed) / 100;
          const y = (window.innerHeight - pageY * speed) / 100;
          el.style.transform = `translateX(${x}px) translateY(${y}px)`;
        });
      });
    }

    /* ----------  PARTICLES  ---------- */
    function createParticle() {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = Math.random() * 100 + '%';
      p.style.animationDelay = Math.random() * 10 + 's';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 10000);
    }
    let particleInterval = null;
    if (document.visibilityState === 'visible') particleInterval = setInterval(createParticle, 3000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (!particleInterval) particleInterval = setInterval(createParticle, 3000);
      } else {
        clearInterval(particleInterval);
        particleInterval = null;
      }
    });

    /* ----------  TYPING EFFECT  ---------- */
    const title = document.querySelector('h1');
    if (title && title.childElementCount === 0) {
      const text = title.textContent;
      title.textContent = '';
      let i = 0;
      function typeWriter() {
        if (i < text.length) {
          title.textContent += text.charAt(i++);
          setTimeout(typeWriter, 50);
        }
      }
      setTimeout(() => { title.style.opacity = '1'; typeWriter(); }, 500);
    }

    /* ----------  COUNTERS  ---------- */
    const animateCounter = (el, target) => {
      let current = 0;
      const increment = Math.max(1, Math.floor(target / 100));
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) { el.textContent = target + '+'; clearInterval(timer); }
        else el.textContent = Math.floor(current) + '+';
      }, 20);
    };
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const stat = entry.target;
          const value = parseInt(stat.textContent.replace(/\D/g, '')) || 0;
          if (value > 0) animateCounter(stat, value);
          statsObserver.unobserve(stat);
        }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.text-gradient').forEach(stat => {
      if (/\d+\+/.test(stat.textContent)) statsObserver.observe(stat);
    });

    /* ----------  SCROLL-PERCENT  ---------- */
    window.addEventListener('scroll', () => {
      const pct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      document.body.style.setProperty('--scroll-percent', pct);
    }, { passive: true });

    /* ----------  LOADED CLASS  ---------- */
    window.addEventListener('load', () => document.body.classList.add('loaded'));

    /* ----------  EASTER-EGG  ---------- */
    console.log('%c��� Développé par Auriole Dion', 'color: #26C6AA; font-size: 18px; font-weight: bold;');
    /* ----------  E-COMMERCE CAROUSEL AUTO-SCROLL  ---------- */
    const ecommerceCarouselContainer = document.querySelector('.ecommerce-carousel');
    if (ecommerceCarouselContainer) {
      const carouselImgs = ecommerceCarouselContainer.querySelectorAll('.ecommerce-carousel-img');
      if (carouselImgs.length > 1) {
        let currentImageIndex = 0;
        
        setInterval(() => {
          carouselImgs.forEach((img, index) => {
            img.style.opacity = index === currentImageIndex ? '1' : '0';
          });
          currentImageIndex = (currentImageIndex + 1) % carouselImgs.length;
        }, 3000); // Change image toutes les 3 secondes
      }
    }
    /* ----------  PROJECT CAROUSELS (auto-detect)  ---------- */
    // Detecte tout conteneur d'images dans les cartes de projet contenant >1 image
    const projectImageContainers = document.querySelectorAll('.card-3d .h-48');
    projectImageContainers.forEach(container => {
      // Ignore les carrousels déjà gérés explicitement
      if (container.classList.contains('ecommerce-carousel')) return;

      const imgs = Array.from(container.querySelectorAll('img'));
      if (imgs.length <= 1) return; // rien à faire

      // Prépare le conteneur
      container.style.position = container.style.position || 'relative';
      container.style.overflow = 'hidden';

      imgs.forEach((img, i) => {
        img.style.position = 'absolute';
        img.style.top = '0';
        img.style.left = '0';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.transition = 'opacity 0.6s ease';
        img.style.opacity = i === 0 ? '1' : '0';
        img.style.zIndex = i === 0 ? '2' : '1';
      });

      let idx = 0;
      const interval = setInterval(() => {
        imgs.forEach((img, i) => {
          if (i === idx) {
            img.style.opacity = '1';
            img.style.zIndex = '2';
          } else {
            img.style.opacity = '0';
            img.style.zIndex = '1';
          }
        });
        idx = (idx + 1) % imgs.length;
      }, 3000);

      // Nettoyage si la page change dynamiquement
      if (container.dataset.carouselIntervalId) clearInterval(Number(container.dataset.carouselIntervalId));
      container.dataset.carouselIntervalId = interval;
    });

    /* ----------  CAROUSEL 3D COVERFLOW  ---------- */

    const slides = document.querySelectorAll('.carousel-slide');
    const prevBtn = document.querySelector('.carousel-btn-prev');
    const nextBtn = document.querySelector('.carousel-btn-next');
    const dots = document.querySelectorAll('dot');
    
    if (slides.length) {
      let currentIndex = 0;
      const total = slides.length;

      function updateCarousel() {
        slides.forEach((slide, index) => {
          const offset = (index - currentIndex + total) % total;
          let transform = '';
          let opacity = 0.3;
          let zIndex = 1;

          if (offset === 0) {
            // Centre - image principale visible
            transform = 'translateX(0) rotateY(0deg) scale(1) translateZ(0)';
            opacity = 1;
            zIndex = 20;
          } else if (offset === 1 || offset === -(total - 1)) {
            // Droite - légèrement visible avec légère rotation
            transform = 'translateX(35%) rotateY(-35deg) scale(0.8) translateZ(-100px)';
            opacity = 0.8;
            zIndex = 10;
          } else if (offset === total - 1 || offset === -1) {
            // Gauche - légèrement visible avec rotation inverse
            transform = 'translateX(-35%) rotateY(35deg) scale(0.8) translateZ(-100px)';
            opacity = 0.8;
            zIndex = 10;
          } else if (offset === 2 || offset === -(total - 2)) {
            // Loin à droite
            transform = 'translateX(70%) rotateY(-55deg) scale(0.6) translateZ(-250px)';
            opacity = 0.5;
            zIndex = 5;
          } else if (offset === total - 2 || offset === -2) {
            // Loin à gauche
            transform = 'translateX(-70%) rotateY(55deg) scale(0.6) translateZ(-250px)';
            opacity = 0.5;
            zIndex = 5;
          } else {
            // Très loin
            const direction = offset > total / 2 ? 1 : -1;
            transform = `translateX(${direction * 100}%) rotateY(${direction * 70}deg) scale(0.4) translateZ(-400px)`;
            opacity = 0.2;
            zIndex = 1;
          }

          slide.style.transform = transform;
          slide.style.opacity = opacity;
          slide.style.zIndex = zIndex;
          slide.style.visibility = opacity > 0.1 ? 'visible' : 'hidden';
        });

        // Mettre à jour les dots
        dots.forEach((dot, i) => {
          const isActive = i === currentIndex;
          dot.style.background = isActive ? '#4d52ee' : 'rgba(77, 82, 238, 0.4)';
          dot.style.transform = isActive ? 'scale(1.3)' : 'scale(1)';
        });
      }

      prevBtn?.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + total) % total;
        updateCarousel();
      });

      nextBtn?.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % total;
        updateCarousel();
      });

      dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
          currentIndex = index;
          updateCarousel();
        });
      });

      updateCarousel();
    }

    /* ----------  PORTFOLIO CAROUSEL  ---------- */
    const portfolioSlides = document.querySelectorAll('.portfolio-carousel-slide');
    const portfolioPrevBtn = document.querySelector('.portfolio-carousel-btn-prev');
    const portfolioNextBtn = document.querySelector('.portfolio-carousel-btn-next');
    const portfolioDots = document.querySelectorAll('.portfolio-dot');
    
    if (portfolioSlides.length) {
      let portfolioCurrentIndex = 0;
      const portfolioTotal = portfolioSlides.length;
      
      const projectsData = [
        {
          category: 'Web',
          categoryColor: 'sky-cyan',
          title: 'Lewegri-Hôtel',
          description: 'Site web redisigner pour un hôtel.',
          technologies: ['TypeScript', 'React', 'JavaScript', 'Tailwind'],
          demoUrl: 'https://lewegri-hotel-mfim.vercel.app',
          githubUrl: 'https://github.com/DevCoder021'
        },
        {
          category: 'E-Commerce',
          categoryColor: 'sky-cyan',
          title: 'Plateforme E-Commerce',
          description: 'Solution e-commerce complète avec panier, paiement sécurisé et gestion d\'inventaire en temps réel.',
          technologies: ['HTML5', 'TailwindCSS', 'JavaScript', 'PHP', 'MySQL'],
          demoUrl: '#',
          githubUrl: 'https://github.com/DevCoder021'
        },
        {
          category: 'Réseau social',
          categoryColor: 'sky-cyan',
          title: 'UBR',
          description: 'Application de rencontre pour les chrétiens.',
          technologies: ['HTML5', 'TailwindCSS', 'JavaScript'],
          demoUrl: '#',
          githubUrl: 'https://github.com/DevCoder021'
        }
      ];

      function updatePortfolioCarousel() {
        // Mettre à jour les slides avec fade simple
        portfolioSlides.forEach((slide, index) => {
          if (index === portfolioCurrentIndex) {
            slide.style.opacity = '1';
            slide.style.pointerEvents = 'auto';
          } else {
            slide.style.opacity = '0';
            slide.style.pointerEvents = 'none';
          }
        });

        // Mettre à jour les dots
        portfolioDots.forEach((dot, i) => {
          const isActive = i === portfolioCurrentIndex;
          dot.style.background = isActive ? '#4d52ee' : 'rgba(77, 82, 238, 0.4)';
          dot.style.boxShadow = isActive ? '0 0 10px rgba(77, 82, 238, 0.5)' : 'none';
          dot.style.transform = isActive ? 'scale(1.2)' : 'scale(1)';
        });

        // Mettre à jour les informations du projet
        const currentProject = projectsData[portfolioCurrentIndex];
        const infoSection = document.querySelector('.portfolio-carousel-info');
        
        infoSection.querySelector('.portfolio-category').textContent = currentProject.category;
        infoSection.querySelector('.portfolio-title').textContent = currentProject.title;
        infoSection.querySelector('.portfolio-description').textContent = currentProject.description;
        
        const technologiesDiv = infoSection.querySelector('.portfolio-technologies');
        technologiesDiv.innerHTML = currentProject.technologies.map(tech => 
          `<span class="text-xs text-medium-gray bg-soft-gray px-2 py-0.5 rounded-lg border border-soft-gray">${tech}</span>`
        ).join('');
        
        const linksDiv = infoSection.querySelector('.portfolio-links');
        linksDiv.innerHTML = `
          <a href="${currentProject.demoUrl}" target="_blank" class="flex items-center text-electric-violet font-semibold transition-colors hover:text-sky-cyan">
            <i class="fas fa-desktop mr-2 text-sm"></i>
            Voir la démo
          </a>
          <a href="${currentProject.githubUrl}" target="_blank" class="flex items-center text-dark-gray/70 font-semibold transition-colors hover:text-dark-gray">
            <i class="fab fa-github mr-2 text-sm"></i>
            Code source
          </a>
        `;
      }

      portfolioPrevBtn?.addEventListener('click', () => {
        portfolioCurrentIndex = (portfolioCurrentIndex - 1 + portfolioTotal) % portfolioTotal;
        updatePortfolioCarousel();
      });

      portfolioNextBtn?.addEventListener('click', () => {
        portfolioCurrentIndex = (portfolioCurrentIndex + 1) % portfolioTotal;
        updatePortfolioCarousel();
      });

      portfolioDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
          portfolioCurrentIndex = index;
          updatePortfolioCarousel();
        });
      });

      updatePortfolioCarousel();
    }

    /* ----------  LIGHTBOX  ---------- */
    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    lightbox.className = 'fixed inset-0 bg-black/90 z-50 hidden flex items-center justify-center';
    lightbox.innerHTML = '<img class="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl">';
    document.body.appendChild(lightbox);
    const lbImg = lightbox.querySelector('img');
    document.querySelectorAll('.carousel-slide img').forEach(img => {
      img.addEventListener('click', () => { lbImg.src = img.src; lightbox.classList.remove('hidden'); });
    });
    lightbox.addEventListener('click', () => lightbox.classList.add('hidden'));


  });
})();
