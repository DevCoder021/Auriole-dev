document.addEventListener('DOMContentLoaded', () => {
    const players = [];

    document.querySelectorAll('.audio-player').forEach((playerElement, index) => {
        let audioSrc = playerElement.dataset.src;
        if (audioSrc && audioSrc.startsWith('public/')) {
            audioSrc = audioSrc.replace('public/', '/');
        }

        const isMissing = playerElement.dataset.missing === 'true';
        const playBtn = playerElement.querySelector('.play-pause-btn');
        // On cible les icônes
        const playIcon = playerElement.querySelector('.play-icon');
        const pauseIcon = playerElement.querySelector('.pause-icon');
        const progressFill = playerElement.querySelector('.progress-fill');
        const timeDisplay = playerElement.querySelector('.time-display');
        
        const audio = new Audio(audioSrc);

        // --- Mise à jour précise des icônes ---
        const showPlayIcon = () => {
            if (playIcon) playIcon.classList.remove('hidden');
            if (pauseIcon) pauseIcon.classList.add('hidden');
            
            // État visuel du conteneur
            playerElement.classList.remove('is-playing', 'ring-2', 'ring-mint-green');
            playBtn.classList.remove('bg-opacity-80', 'scale-95');
        };

        const showPauseIcon = () => {
            if (playIcon) playIcon.classList.add('hidden');
            if (pauseIcon) pauseIcon.classList.remove('hidden');
            
            // État visuel actif (Dynamisme)
            playerElement.classList.add('is-playing', 'ring-2', 'ring-mint-green');
            playBtn.classList.add('bg-opacity-80', 'scale-95');
        };

        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (isMissing) return;

                if (audio.paused) {
                    // Arrêter tous les autres sons proprement
                    players.forEach(p => {
                        if (p.audio !== audio) {
                            p.audio.pause();
                            p.showPlayIcon();
                        }
                    });

                    audio.play().catch(err => console.error("Erreur:", err));
                    showPauseIcon();
                } else {
                    audio.pause();
                    showPlayIcon();
                }
            });
        }

        // Progression et temps
        audio.addEventListener('timeupdate', () => {
            if (audio.duration) {
                const percent = (audio.currentTime / audio.duration) * 100;
                if (progressFill) progressFill.style.width = `${percent}%`;
                
                const mins = Math.floor(audio.currentTime / 60);
                const secs = Math.floor(audio.currentTime % 60);
                if (timeDisplay) timeDisplay.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            }
        });

        // Reset auto à la fin
        audio.addEventListener('ended', () => {
            showPlayIcon();
            if (progressFill) progressFill.style.width = '0%';
        });

        // Stockage pour la gestion globale
        players.push({ audio, showPlayIcon });
    });
});