// Gestion du formulaire de contact
async function handleContactForm(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const errorFeedback = document.getElementById('error-feedback');
    const successFeedback = document.getElementById('success-feedback');
    const submitBtn = form.querySelector('button[type="submit"]');

    // On transforme les données en objet JSON pour Web3Forms
    const object = Object.fromEntries(formData);
    const json = JSON.stringify(object);

    // Validation simple
    const errors = [];
    if (!object.name || object.name.trim() === '') errors.push('Le nom est requis');
    if (!object.email || object.email.trim() === '') errors.push('L\'email est requis');
    if (!object.message || object.message.trim() === '') errors.push('Le message est requis');
    
    if (errors.length > 0) {
        const errorList = document.getElementById('error-list');
        errorList.innerHTML = '';
        errors.forEach(err => {
            const li = document.createElement('li');
            li.textContent = err;
            errorList.appendChild(li);
        });
        errorFeedback.classList.remove('hidden');
        successFeedback.classList.add('hidden');
        return; // On arrête tout s'il y a des erreurs
    }

    // --- ENVOI RÉEL À WEB3FORMS ---
    try {
        // Changement d'état du bouton pendant l'envoi
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner animate-spin mr-2"></i>Envoi en cours...';

        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: json
        });

        const result = await response.json();

        if (response.status === 200) {
            // Succès
            const successText = document.getElementById('success-text');
            successText.textContent = 'Votre message a été envoyé avec succès !';
            successFeedback.classList.remove('hidden');
            errorFeedback.classList.add('hidden');
            form.reset();
        } else {
            // Erreur venant de l'API
            throw new Error(result.message || "Erreur lors de l'envoi");
        }
    } catch (error) {
        // Erreur réseau ou autre
        const errorList = document.getElementById('error-list');
        errorList.innerHTML = '<li>Désolé, une erreur est survenue lors de l\'envoi. Réessayez plus tard.</li>';
        errorFeedback.classList.remove('hidden');
        successFeedback.classList.add('hidden');
    } finally {
        // On remet le bouton à son état normal
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Envoyer le Message';
        
        // Masquer les messages après 5 secondes
        setTimeout(() => {
            successFeedback.classList.add('hidden');
            errorFeedback.classList.add('hidden');
        }, 5000);
    }
}

window.handleContactForm = handleContactForm;