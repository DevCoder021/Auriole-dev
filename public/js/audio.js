document.addEventListener('DOMContentLoaded', () => {
    const players = [];

    // Récupérer tous les éléments lecteurs
    const playerElements = document.querySelectorAll('.audio-player');

    playerElements.forEach((playerElement, index) => {
        // 1. Préparation de la source
        let audioSrc = playerElement.dataset.src;
        if (audioSrc && audioSrc.startsWith('public/')) {
            audioSrc = audioSrc.replace('public/', '/');
        }

        const isMissing = playerElement.dataset.missing === 'true';
        const playBtn = playerElement.querySelector('.play-pause-btn');
        // Nouveau sélecteur pour l'icône unique
        const icon = playBtn ? playBtn.querySelector('i') : null;
        
        const progressFill = playerElement.querySelector('.progress-fill');
        const progressContainer = playerElement.querySelector('.progress-bar-container'); // Nouveau: conteneur pour clic
        const timeDisplay = playerElement.querySelector('.time-display');
        const accentColor = playerElement.dataset.accentColor || '#10b981'; // Fallback mint-green
        
        // Création de l'instance Audio unique pour ce lecteur
        const audio = new Audio(audioSrc);

        // --- GESTION DES ICÔNES ET DU STYLE ---
        const updateUI = () => {
            if (audio.paused) {
                // Mode STOPPED
                if (icon) {
                    icon.classList.remove('fa-pause');
                    icon.classList.add('fa-play');
                }
                
                // Style inactif
                playerElement.classList.remove('bg-white/10', 'border-white/20', 'shadow-lg');
                // Retirer la bordure colorée active
                playerElement.style.borderColor = ''; 
                
                playBtn.classList.remove('scale-110');
            } else {
                // Mode PLAYING
                if (icon) {
                    icon.classList.remove('fa-play');
                    icon.classList.add('fa-pause');
                }
                
                // Style actif
                playerElement.classList.add('bg-white/10', 'shadow-lg');
                // Ajouter la bordure colorée active
                playerElement.style.borderColor = accentColor;
                
                playBtn.classList.add('scale-110');
            }
        };

        // Fonction de lecture encapsulée
        const playTrack = () => {
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
        };

        // --- ÉVÉNEMENT DE CLIC ---
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Empêcher la propagation si on ajoute un clic sur la row
                playTrack();
            });
        }

        // --- SEEK BAR (Navigation dans la piste) ---
        if (progressContainer) {
            progressContainer.addEventListener('click', (e) => {
                e.stopPropagation(); // Ne pas déclencher play/pause si on clique sur la barre
                const rect = progressContainer.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                const width = rect.width;
                const percent = offsetX / width;
                
                if (audio.duration) {
                    audio.currentTime = percent * audio.duration;
                }
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

        // Reset quand la musique finit et passer à la suivante
        audio.addEventListener('ended', () => {
            updateUI();
            if (progressFill) progressFill.style.width = '0%';
            
            // Passer à la piste suivante (Playlist logic)
            const nextIndex = index + 1;
            if (nextIndex < players.length) {
                players[nextIndex].playFn(); // Appeler la fonction de lecture du prochain
            }
        });

        // Ajouter à la liste globale
        players.push({ 
            audio, 
            updateUI, 
            playFn: () => {
                // Force play sans toggle (si déjà playing, ne fait rien, sinon joue)
                // Mais ici playTrack() est un toggle. On veut forcer PLAY.
                
                // 1. Stop others
                players.forEach(p => {
                    if (p.audio !== audio) {
                        p.audio.pause();
                        p.updateUI();
                    }
                });
                
                // 2. Play this one
                audio.currentTime = 0; // Repartir du début
                audio.play().catch(err => console.error("Autoplay error:", err));
                updateUI();
            }
        });
    });
});
