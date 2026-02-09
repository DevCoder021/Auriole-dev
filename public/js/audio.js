document.addEventListener('DOMContentLoaded', () => {
    const players = [];

    document.querySelectorAll('.audio-player').forEach((playerElement) => {
        // 1. Préparation de la source
        let audioSrc = playerElement.dataset.src;
        if (audioSrc && audioSrc.startsWith('public/')) {
            audioSrc = audioSrc.replace('public/', '/');
        }

        const isMissing = playerElement.dataset.missing === 'true';
        const playBtn = playerElement.querySelector('.play-pause-btn');
        const playIcon = playerElement.querySelector('.play-icon');
        const pauseIcon = playerElement.querySelector('.pause-icon');
        const progressFill = playerElement.querySelector('.progress-fill');
        const timeDisplay = playerElement.querySelector('.time-display');
        
        // Création de l'instance Audio unique pour ce lecteur
        const audio = new Audio(audioSrc);

        // --- GESTION DES ICÔNES ET DU STYLE ---
        const updateUI = () => {
            if (audio.paused) {
                // Mode STOPPED (affiche l'icône pause pour inviter à jouer)
                if (playIcon) playIcon.classList.add('hidden');
                if (pauseIcon) pauseIcon.classList.remove('hidden');
                playerElement.classList.remove('is-playing', 'ring-2', 'ring-mint-green');
                playBtn.classList.remove('scale-90', 'bg-opacity-70');
            } else {
                // Mode PLAYING (affiche l'icône play pour inviter à arrêter)
                if (playIcon) playIcon.classList.remove('hidden');
                if (pauseIcon) pauseIcon.classList.add('hidden');
                playerElement.classList.add('is-playing', 'ring-2', 'ring-mint-green');
                playBtn.classList.add('scale-90', 'bg-opacity-70');
            }
        };

        // --- ÉVÉNEMENT DE CLIC UNIQUE (Solution au bug) ---
        if (playBtn) {
            // On s'assure qu'aucun autre événement (pointerdown/up) ne vient polluer
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (isMissing) return;

                if (audio.paused) {
                    // Arrêter les autres sons avant de jouer
                    players.forEach(p => {
                        if (p.audio !== audio) {
                            p.audio.pause();
                            p.updateUI();
                        }
                    });
                    audio.play().catch(err => console.error("Erreur de lecture:", err));
                } else {
                    audio.pause();
                }
                updateUI();
            });
        }

        // Mise à jour barre de progression
        audio.addEventListener('timeupdate', () => {
            if (audio.duration) {
                const percent = (audio.currentTime / audio.duration) * 100;
                if (progressFill) progressFill.style.width = `${percent}%`;
                
                const mins = Math.floor(audio.currentTime / 60);
                const secs = Math.floor(audio.currentTime % 60);
                if (timeDisplay) timeDisplay.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            }
        });

        // Reset quand la musique finit
        audio.addEventListener('ended', () => {
            updateUI();
            if (progressFill) progressFill.style.width = '0%';
        });

        // Ajouter à la liste globale
        players.push({ audio, updateUI });
    });
});