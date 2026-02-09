document.addEventListener('DOMContentLoaded', () => {
    const players = [];

    document.querySelectorAll('.audio-player').forEach((playerElement, index) => {
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
        
        const audio = new Audio(audioSrc);

        // --- Fonctions de mise à jour Visuelle (Dynamisme) ---
        const showPlayIcon = () => {
            if (playIcon) playIcon.classList.remove('hidden');
            if (pauseIcon) pauseIcon.classList.add('hidden');
            // On retire l'effet "en lecture"
            playerElement.classList.remove('is-playing');
            playBtn.classList.remove('scale-95', 'bg-opacity-80');
        };

        const showPauseIcon = () => {
            if (playIcon) playIcon.classList.add('hidden');
            if (pauseIcon) pauseIcon.classList.remove('hidden');
            // On ajoute les effets visuels (Scale et Shadow via CSS/Tailwind)
            playerElement.classList.add('is-playing');
            playBtn.classList.add('scale-95', 'bg-opacity-80');
        };

        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (isMissing) return;

                if (audio.paused) {
                    // Arrêter les autres
                    players.forEach(p => {
                        if (p.audio !== audio) {
                            p.audio.pause();
                            p.showPlayIcon();
                        }
                    });

                    audio.play().catch(err => console.error("Erreur lecture:", err));
                    showPauseIcon();
                } else {
                    audio.pause();
                    showPlayIcon();
                }
            });
        }

        audio.addEventListener('timeupdate', () => {
            const percent = (audio.currentTime / audio.duration) * 100;
            if (progressFill) progressFill.style.width = `${percent}%`;
            
            const mins = Math.floor(audio.currentTime / 60);
            const secs = Math.floor(audio.currentTime % 60);
            if (timeDisplay) timeDisplay.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        });

        audio.addEventListener('ended', () => {
            showPlayIcon();
            if (progressFill) progressFill.style.width = '0%';
        });

        players.push({ audio, showPlayIcon });
    });
});