// Gestion du formulaire de contact
function handleContactForm(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Récupérer les valeurs
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const message = formData.get('message');
    
    // Validation simple
    const errors = [];
    if (!name || name.trim() === '') errors.push('Le nom est requis');
    if (!email || email.trim() === '') errors.push('L\'email est requis');
    if (!message || message.trim() === '') errors.push('Le message est requis');
    
    // Afficher les erreurs ou le succès
    const errorFeedback = document.getElementById('error-feedback');
    const successFeedback = document.getElementById('success-feedback');
    
    if (errors.length > 0) {
        // Afficher les erreurs
        const errorList = document.getElementById('error-list');
        errorList.innerHTML = '';
        errors.forEach(err => {
            const li = document.createElement('li');
            li.textContent = err;
            errorList.appendChild(li);
        });
        errorFeedback.classList.remove('hidden');
        successFeedback.classList.add('hidden');
    } else {
        // Afficher le succès
        const successText = document.getElementById('success-text');
        successText.textContent = 'Votre message a été envoyé avec succès ! Merci de nous avoir contactés.';
        successFeedback.classList.remove('hidden');
        errorFeedback.classList.add('hidden');
        
        // Réinitialiser le formulaire
        form.reset();
        
        // Masquer le message après 5 secondes
        setTimeout(() => {
            successFeedback.classList.add('hidden');
        }, 5000);
    }
}

window.handleContactForm = handleContactForm;