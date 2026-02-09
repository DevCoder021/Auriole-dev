// public/js/audio.js - Gestionnaire de lecteur audio corrigé
document.addEventListener('DOMContentLoaded', () => {
    const players = [];

    document.querySelectorAll('.audio-player').forEach((playerElement, index) => {
        // --- Nettoyage du chemin source ---
        let audioSrc = playerElement.dataset.src;
        if (audioSrc && audioSrc.startsWith('public/')) {
            audioSrc = audioSrc.replace('public/', '/');
        }

        const isMissing = playerElement.dataset.missing === 'true';

        // Éléments du DOM
        const playBtn = playerElement.querySelector('.play-pause-btn');
        const playIcon = playerElement.querySelector('.play-icon');
        const pauseIcon = playerElement.querySelector('.pause-icon');
        const progressFill = playerElement.querySelector('.progress-fill');
        const timeDisplay = playerElement.querySelector('.time-display');
        
        // Création de l'objet Audio
        const audio = new Audio(audioSrc);

        const showPlayIcon = () => {
            if (playIcon) playIcon.classList.remove('hidden');
            if (pauseIcon) pauseIcon.classList.add('hidden');
        };

        const showPauseIcon = () => {
            if (playIcon) playIcon.classList.add('hidden');
            if (pauseIcon) pauseIcon.classList.remove('hidden');
        };

        // --- LA CORRECTION EST ICI : GESTION DU CLIC ---
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (isMissing) return;

                if (audio.paused) {
                    // Arrêter les autres lecteurs avant de lancer celui-ci
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

        // Mise à jour de la barre de progression
        audio.addEventListener('timeupdate', () => {
            const percent = (audio.currentTime / audio.duration) * 100;
            if (progressFill) progressFill.style.width = `${percent}%`;
            
            // Mise à jour du temps (format 0:00)
            const mins = Math.floor(audio.currentTime / 60);
            const secs = Math.floor(audio.currentTime % 60);
            if (timeDisplay) timeDisplay.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        });

        // Reset à la fin de la musique
        audio.addEventListener('ended', () => {
            showPlayIcon();
            if (progressFill) progressFill.style.width = '0%';
        });

        // Stocker les références
        players.push({ audio, showPlayIcon });
    });
});