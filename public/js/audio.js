// public/js/audio.js - Gestionnaire de lecteur audio avec icônes play/pause
document.addEventListener('DOMContentLoaded', () => {
    const players = [];
    let currentPlaying = null;

    document.querySelectorAll('.audio-player').forEach((playerElement, index) => {
        const trackId = playerElement.dataset.trackId || `track-${index}`;
        const audioSrc = playerElement.dataset.src;
        const accentColor = playerElement.dataset.accentColor || '#7c3aed';
        const isMissing = playerElement.dataset.missing === 'true';

        // Éléments du DOM
        const playBtn = playerElement.querySelector('.play-pause-btn');
        const playIcon = playerElement.querySelector('.play-icon');
        const pauseIcon = playerElement.querySelector('.pause-icon');
        const progressBar = playerElement.querySelector('.progress-bar-container');
        const progressFill = playerElement.querySelector('.progress-fill');
        const progressHandle = playerElement.querySelector('.progress-handle');
        const timeDisplay = playerElement.querySelector('.time-display');
        const audioElement = playerElement.querySelector('.audio-element');
        const originalDuration = timeDisplay ? timeDisplay.dataset.duration || '0:00' : '0:00';

        // Fonction helper pour gérer l'affichage des icônes
        function showPlayIcon() {
            if (playIcon) {
                playIcon.classList.remove('hidden');
                playIcon.style.display = 'block';
            }
            if (pauseIcon) {
                pauseIcon.classList.add('hidden');
                pauseIcon.style.display = 'none';
            }
        }

        function showPauseIcon() {
            if (playIcon) {
                playIcon.classList.add('hidden');
                playIcon.style.display = 'none';
            }
            if (pauseIcon) {
                pauseIcon.classList.remove('hidden');
                pauseIcon.style.display = 'block';
            }
        }

        // Initialiser : afficher play, cacher pause
        showPlayIcon();

        // Si pas de fichier audio, désactiver le bouton
        if (!audioSrc || isMissing) {
            if (playBtn) {
                playBtn.disabled = true;
                playBtn.classList.add('opacity-50', 'cursor-not-allowed');
                showPlayIcon(); // Garder play visible mais désactivé
                const errorIcon = playerElement.querySelector('.error-icon');
                if (errorIcon) {
                    errorIcon.classList.remove('hidden');
                    errorIcon.style.display = 'block';
                    errorIcon.classList.add('text-yellow-500');
                }
            }
            return;
        }

        // Créer l'élément audio
        if (!audioElement) {
            const audio = document.createElement('audio');
            audio.className = 'audio-element hidden';
            audio.preload = 'metadata';
            audio.src = audioSrc;
            // Autoriser lecture inline sur iOS et anciens WebKit
            audio.playsInline = true;
            audio.setAttribute('playsinline', '');
            audio.setAttribute('webkit-playsinline', '');
            // Crossorigin utile si vous servez les fichiers depuis un CDN
            audio.setAttribute('crossorigin', 'anonymous');
            // Veiller à ne pas forcer le son coupé
            audio.muted = false;
            playerElement.appendChild(audio);
        } else {
            audioElement.src = audioSrc;
            // s'assurer des attributs pour mobile
            audioElement.playsInline = true;
            audioElement.setAttribute('playsinline', '');
            audioElement.setAttribute('webkit-playsinline', '');
            audioElement.setAttribute('crossorigin', 'anonymous');
            audioElement.muted = false;
        }

        const audio = playerElement.querySelector('.audio-element');

        // Log le chargement du fichier audio
        console.log(`[Audio] Init: ${trackId} | src=${audioSrc}`);

        // Fonction pour formater le temps (MM:SS)
        function formatTime(seconds) {
            if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }

        // Fonction pour mettre à jour la barre de progression
        function updateProgress() {
            if (!audio || !progressFill || !progressHandle) return;
            
            const currentTime = audio.currentTime || 0;
            const duration = audio.duration || 0;
            
            if (duration > 0) {
                const percent = (currentTime / duration) * 100;
                progressFill.style.width = `${percent}%`;
                progressHandle.style.left = `${percent}%`;
                
                // Mettre à jour le temps restant
                const remaining = duration - currentTime;
                if (timeDisplay) {
                    timeDisplay.textContent = `-${formatTime(remaining)}`;
                }
            }
        }

        // Fonction pour mettre à jour l'affichage du temps total
        function updateDuration() {
            if (!audio || !timeDisplay) return;
            const duration = audio.duration;
            if (duration && isFinite(duration)) {
                timeDisplay.dataset.duration = formatTime(duration);
                if (!audio.playing) {
                    timeDisplay.textContent = formatTime(duration);
                }
            }
        }

        // Gestion de l'interaction (click / touch / pointer) sur le bouton play/pause
        if (playBtn) {
            const handlePlayToggle = (e) => {
                // Empêcher double événements (touch + click)
                try { e.preventDefault(); e.stopPropagation(); } catch (err) {}

                // Mettre en pause tous les autres lecteurs avant de lancer celui-ci
                pauseAllExcept(audio);

                // Toggle play/pause
                if (audio.paused) {
                    console.log(`[Audio] Attempting play: ${trackId}`);
                    audio.play().catch(err => {
                        console.error(`[Audio] play() FAILED on ${trackId}:`, err.message || err);
                        showPlayIcon();
                    });
                } else {
                    console.log(`[Audio] Pausing: ${trackId}`);
                    audio.pause();
                }
            };

            // Pointer events couvrent souris et tactile modernes
            playBtn.addEventListener('pointerdown', handlePlayToggle);
            // Garder le click en fallback
            playBtn.addEventListener('click', handlePlayToggle);
        }

        // Gestion du clic sur la barre de progression
        if (progressBar) {
            progressBar.addEventListener('click', (e) => {
                if (!audio || !audio.duration) return;
                
                const rect = progressBar.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percent = (clickX / rect.width) * 100;
                const newTime = (percent / 100) * audio.duration;
                
                audio.currentTime = Math.max(0, Math.min(newTime, audio.duration));
                updateProgress();
            });
        }

        // Événements audio
        audio.addEventListener('loadedmetadata', () => {
            updateDuration();
        });

        audio.addEventListener('timeupdate', () => {
            updateProgress();
        });

        audio.addEventListener('play', () => {
            showPauseIcon();
            currentPlaying = audio;
        });

        audio.addEventListener('pause', () => {
            showPlayIcon();
            if (currentPlaying === audio) {
                currentPlaying = null;
            }
        });

        audio.addEventListener('ended', () => {
            showPlayIcon();
            audio.currentTime = 0;
            updateProgress();
            if (timeDisplay) {
                timeDisplay.textContent = originalDuration;
            }
            currentPlaying = null;
        });

        audio.addEventListener('error', (e) => {
            console.error(`[Audio] ERROR on ${trackId}:`, {
                code: audio.error?.code,
                message: audio.error?.message,
                src: audio.src,
                networkState: audio.networkState,
                readyState: audio.readyState
            });
            if (playBtn) {
                playBtn.disabled = true;
                playBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
            showPlayIcon(); // Afficher play même en cas d'erreur
            const errorIcon = playerElement.querySelector('.error-icon');
            if (errorIcon) {
                errorIcon.classList.remove('hidden');
                errorIcon.style.display = 'block';
                errorIcon.classList.add('text-red-500');
            }
        });

        // Stocker les références pour la gestion globale
        players.push({
            audio,
            playIcon,
            pauseIcon,
            playerElement,
            showPlayIcon,
            showPauseIcon
        });
    });
    
    console.log(`[Audio] Initialized ${players.length} players`);

    // --- Débloquer la lecture audio sur mobile :
    // Certains navigateurs mobiles exigent un geste utilisateur global pour activer
    // l'audio (AudioContext). On reprend simplement l'AudioContext et on marque
    // l'audio comme débloqué. On évite de lancer la lecture automatique de tous
    // les fichiers (cela provoquait plusieurs activations simultanées).
    function unlockAudioOnFirstGesture() {
        try {
            if (window.AudioContext || window.webkitAudioContext) {
                window._sharedAudioCtx = window._sharedAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
                if (window._sharedAudioCtx.state === 'suspended') {
                    window._sharedAudioCtx.resume().catch(()=>{});
                }
            }
            window._audioUnlocked = true;
        } catch (e) {}
        // On enlève l'écouteur pour éviter répétitions
        document.removeEventListener('pointerdown', unlockAudioOnFirstGesture);
    }

    // Exposer la fonction globalement pour que l'overlay puisse l'appeler si nécessaire
    window.unlockAudioOnFirstGesture = unlockAudioOnFirstGesture;

    // Attacher en capture pour capter le premier geste tactile/mouse
    document.addEventListener('pointerdown', unlockAudioOnFirstGesture, { once: true, capture: true });

    // Pause tous les autres players sauf celui passé en argument
    function pauseAllExcept(activeAudio) {
        players.forEach(p => {
            try {
                if (p.audio && p.audio !== activeAudio) {
                    p.audio.pause();
                    p.audio.currentTime = 0;
                    if (p.showPlayIcon) p.showPlayIcon();
                }
            } catch (e) {}
        });
    }
});
