<?php
// index.php (Version mise à jour avec vérification de maintenance)

require_once 'config/constants.php';

// ==============================================================================
// 1. INITIALISATION ET RÉCUPÉRATION DES DONNÉES
// ==============================================================================
require_once 'includes/Database.php';
require_once 'includes/Security.php'; 
require_once 'includes/RateLimiter.php';
require_once 'includes/Logger.php'; 
require_once 'includes/functions.php';

Security::startSession();

// ==============================================================================
// VÉRIFICATION DU MODE MAINTENANCE (unique, après toutes les inclusions)
// ==============================================================================
if (defined('MAINTENANCE_MODE') && MAINTENANCE_MODE === true) {
    // Si la maintenance est active ET que l'utilisateur n'est PAS un admin connecté
    if (!Security::isAuthenticated()) {
        http_response_code(503); // Code de statut "Service Indisponible"
        require_once 'maintenance.php'; // Affiche la page de maintenance
        exit; // Arrête l'exécution du script principal
    }
    // Si l'utilisateur est un admin, on continue l'exécution (il verra le site normalement)
}

$db = new Database();
// La génération du jeton est conservée car elle est utilisée dans le formulaire de contact, 
// mais la validation CSRF est omise ici pour éviter l'erreur Call to undefined method Security::CsrfToken().
$csrf_token = Security::generateCsrfToken(); 

// --- Variables d'état ---
$errors = [];
$success_message = $_SESSION['feedback_message'] ?? '';
unset($_SESSION['feedback_message']);

// NOUVEAU : Récupération des messages de session spécifiques aux témoignages
$testimonial_message = $_SESSION['testimonial_message'] ?? '';
$testimonial_success = $_SESSION['testimonial_success'] ?? false;
unset($_SESSION['testimonial_message']);
unset($_SESSION['testimonial_success']);

$contact_data = [
    'name' => '',
    'email' => '',
    'subject' => '',
    'message' => '',
];

// --- Données du Portfolio ---

// A. Compétences (Skills)
$query_skills = "SELECT name, icon_path, category, proficiency_level, description FROM skills WHERE status = 'actif' ORDER BY sort_order ASC";
$stmt_skills = $db->executeQuery($query_skills);
$raw_skills = $stmt_skills ? $stmt_skills->fetchAll(PDO::FETCH_ASSOC) : []; 

$skills = process_skills_for_display($raw_skills);

// B. Projets (Portfolio)
$query_projects = "SELECT title, description, cover_image_path, project_type AS category, technologies AS tags, url_live AS link_live, url_github AS link_github FROM projects WHERE status = 'publié' ORDER BY created_at DESC";
$stmt_projects = $db->executeQuery($query_projects);
$raw_projects = $stmt_projects ? $stmt_projects->fetchAll(PDO::FETCH_ASSOC) : [];

$projects = process_projects_for_display($raw_projects);

// C. Galerie de Projets (Gallery - Créations Graphiques)
$query_gallery = "SELECT title, image_path, description FROM gallery WHERE status = 'publié' ORDER BY sort_order ASC LIMIT 9";
$stmt_gallery = $db->executeQuery($query_gallery);
$raw_gallery_items = $stmt_gallery ? $stmt_gallery->fetchAll(PDO::FETCH_ASSOC) : [];

$gallery_items = process_gallery_for_display($raw_gallery_items);

// D. Données Production Musicale (Music) ---
$query_music = "SELECT id, title, artist, genre, description, audio_path, duration FROM music_tracks WHERE status = 'publié' ORDER BY sort_order ASC";
$stmt_music = $db->executeQuery($query_music);
$music_tracks = $stmt_music ? $stmt_music->fetchAll(PDO::FETCH_ASSOC) : [];

// E. Témoignages (Témoignages)
// La requête utilise maintenant le statut 'approuvé' en français.
$query_testimonials = "SELECT client_name, content, rating FROM testimonials WHERE status = 'approuvé' ORDER BY created_at DESC";
$stmt_testimonials = $db->executeQuery($query_testimonials);
$testimonials = $stmt_testimonials ? $stmt_testimonials->fetchAll(PDO::FETCH_ASSOC) : [];

// F. Lien du CV
$cv_download_url = UPLOAD_URL . 'cv/auriole_cv.pdf';


// ==============================================================================
// 2. TRAITEMENT DES FORMULAIRES (POST)
// ==============================================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'submit_contact') {
    
    // Utilisation de $errors déclaré en haut du fichier.
    $local_errors = []; 
    $submitted_token = $_POST['csrf_token'] ?? '';
    
    // 1. Vérification de sécurité (CSRF)
    if (!Security::checkCsrfToken($submitted_token)) {
        $local_errors[] = 'Erreur de sécurité : Jeton invalide ou session expirée. Veuillez réessayer.';
    }

    // 2. Récupération et Nettoyage des données
    $name = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    // Récupération et nettoyage de l'email puis correction heuristique
    $email_input = $_POST['email'] ?? '';
    $email = filter_var($email_input, FILTER_SANITIZE_EMAIL);
    // Si le domaine contient un '@' mais pas de point (ex: gmailcom), essayer d'ajouter '.com'
    if (!empty($email) && strpos($email, '@') !== false) {
        list($localPart, $domainPart) = explode('@', $email, 2) + [null, null];
        if (!empty($domainPart) && strpos($domainPart, '.') === false) {
            // n'ajouter '.com' que si le domaine est composé de caractères alphanumériques/traits
            if (preg_match('/^[A-Za-z0-9-]+$/', $domainPart)) {
                $candidate = $localPart . '@' . $domainPart . '.com';
                if (filter_var($candidate, FILTER_VALIDATE_EMAIL)) {
                    $email = $candidate;
                }
            }
        }
    }
    $phone = filter_input(INPUT_POST, 'phone', FILTER_SANITIZE_FULL_SPECIAL_CHARS); // Champ 'phone' non obligatoire mais récupéré
    $subject = filter_input(INPUT_POST, 'subject', FILTER_SANITIZE_FULL_SPECIAL_CHARS); // Le sujet est le message principal ici
    $message = filter_input(INPUT_POST, 'message', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

    // Maintien des données en cas d'erreur
    $contact_data = [
        'name' => $name,
        'email' => $email,
        'subject' => $subject, // Nous utilisons le champ 'subject' pour garder l'ancien comportement du formulaire
        'message' => $message,
    ];

    // 3. Validation des données
    if (empty($name)) {
        $local_errors[] = 'Votre nom est requis.';
    }
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $local_errors[] = 'Une adresse email valide est requise.';
    }
    // Votre HTML n'a pas de champ sujet séparé, mais il y a un champ pour le message.
    if (empty($message)) {
        $local_errors[] = 'Le message est requis.';
    }

    // 4. Insertion en BDD si aucune erreur
    if (empty($local_errors)) {
        try {
            // Requête d'insertion dans la table 'messages'. 
            // On utilise le champ 'name' pour le sujet si le champ 'subject' n'est pas utilisé dans le formulaire
            $final_subject = !empty($subject) ? $subject : 'Nouveau message de ' . $name;

            $sql = "INSERT INTO messages (name, email, subject, message, status, ip_address, created_at) 
                    VALUES (:name, :email, :subject, :message, 'non lu', :ip, NOW())";
            
            $params = [
                ':name' => $name,
                ':email' => $email,
                ':subject' => $final_subject,
                ':message' => $message,
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'
            ];
            
            $stmt = $db->executeQuery($sql, $params);

            if ($stmt && $stmt->rowCount() > 0) {
                // Succès
                $_SESSION['feedback_message'] = "Votre message a été envoyé avec succès ! Je vous répondrai rapidement.";
                // Réinitialiser les données du formulaire après succès
                $contact_data = ['name' => '', 'email' => '', 'subject' => '', 'message' => ''];
                
            } else {
                // Échec d'insertion
                $_SESSION['feedback_message'] = "Une erreur est survenue lors de l'enregistrement de votre message. (Vérifiez les logs SQL)";
            }

        } catch (Exception $e) {
            $_SESSION['feedback_message'] = 'Erreur serveur critique lors de l\'envoi. Veuillez réessayer plus tard.';
        }
        
        // Redirection PRG (Post-Redirect-Get)
        header('Location: index.php#contact');
        exit;
    } else {
        // En cas d'erreur, on stocke les erreurs dans $errors global pour l'affichage
        $errors = array_merge($errors, $local_errors);
    }
}

?>

<!DOCTYPE html>
<html lang="fr" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Auriole Dion – Portfolio Créatif & Développeur Full-Stack</title>

  <!-- Tailwind -->
  <link rel="stylesheet" href="src/output.css">
  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />
  <!-- (Palette Tailwind injectée via build, script retiré côté client) -->

  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Orbitron:wght@400;500;600;700;900&display=swap');

    :root {
      --bg: #fdfdfd;
      --text: #2d3748;
      --muted: #a0aec0;
      --primary: #26C6AA;
      --primary-200: #B9F0E4;
      --primary-700: #1FA891;
      --glass-bg: rgba(255, 255, 255, 0.6);
      --glass-border: rgba(0, 0, 0, 0.08);
    }

    body {
      font-family: 'Space Grotesk', sans-serif;
      background: var(--bg);
      color: var(--text);
    }

    .font-cyber {
      font-family: 'Orbitron', sans-serif;
    }

    /* Glass clair */
    .glass {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
    }

    /* Gradient animé */
    .animated-gradient {
      background: linear-gradient(-45deg, var(--primary-200), var(--primary), var(--primary-700));
      background-size: 400% 400%;
      animation: gradient 12s ease infinite;
    }

    @keyframes gradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    /* Particules */
    .particle {
      position: absolute;
      width: 4px;
      height: 4px;
      background: rgba(38, 198, 170, 0.3);
      border-radius: 50%;
      animation: float 10s infinite;
      pointer-events: none;
    }

    /* Amélioration de la visibilité des icônes audio */
    .play-pause-btn .play-icon,
    .play-pause-btn .pause-icon {
      color: white !important;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4), 0 0 8px rgba(0, 0, 0, 0.2);
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }

    .play-pause-btn:disabled .play-icon,
    .play-pause-btn:disabled .pause-icon {
      opacity: 0.5;
    }

    .play-pause-btn .error-icon {
      color: #f59e0b !important;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    /* animation icône burger */
    .burger-open span:nth-child(1) {
    transform: rotate(45deg) translate(5px, 5px);
    }
    .burger-open span:nth-child(2) {
    opacity: 0;
    }
    .burger-open span:nth-child(3) {
    transform: rotate(-45deg) translate(7px, -6px);
    }
  </style>
</head>

<body class="text-dark-gray overflow-x-hidden">

  <!-- Particules -->
  <div class="fixed inset-0 pointer-events-none overflow-hidden">
    <div class="particle" style="top: 10%; left: 20%; animation-delay: 0s;"></div>
    <div class="particle" style="top: 30%; left: 70%; animation-delay: 2s;"></div>
    <div class="particle" style="top: 60%; left: 40%; animation-delay: 4s;"></div>
    <div class="particle" style="top: 80%; left: 10%; animation-delay: 1s;"></div>
    <div class="particle" style="top: 50%; left: 90%; animation-delay: 3s;"></div>
  </div>

  <!-- Navbar -->
  <nav id="navbar" class="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="glass rounded-full mt-6 px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="text-2xl font-cyber font-bold text-electric-violet">
            <span class="inline-block">
              <span class="text-3xl font-bold text-blue-600">&lt;/&gt;</span>
              Auriole Dev
            </span>
          </div>
          <div class="hidden md:flex items-center space-x-8">
            <a href="#home" class="text-sm font-medium hover:text-electric-violet transition-colors">Accueil</a>
            <a href="#about" class="text-sm font-medium hover:text-electric-violet transition-colors">À propos</a>
            <a href="#skills" class="text-sm font-medium hover:text-electric-violet transition-colors">Compétences</a>
            <a href="#projects" class="text-sm font-medium hover:text-electric-violet transition-colors">Projets</a>
            <a href="#gallery" class="text-sm font-medium hover:text-electric-violet transition-colors">Galerie</a>
            <a href="#musique" class="text-sm font-medium hover:text-electric-violet transition-colors">Musique</a>
            <a href="#contact" class="px-6 py-2.5 bg-electric-violet text-white rounded-full font-semibold text-sm hover:bg-opacity-90 transition">Contact</a>
          </div>
          <!-- <button id="burger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="mobile-menu" title="Ouvrir le menu" class="md:hidden flex flex-col space-y-1 w-8 h-8 justify-center items-center">
            <span class="w-full h-0.5 bg-dark-gray block"></span>
            <span class="w-full h-0.5 bg-dark-gray block"></span>
            <span class="w-full h-0.5 bg-dark-gray block"></span>
          </button> -->
        </div>
      </div>
    </div>
  </nav>

  <!-- Mobile menu (hidden by default) -->
  <div id="mobile-menu" role="navigation" aria-label="Menu mobile" class="fixed inset-0 z-40 bg-white/95 transform translate-x-full transition-transform duration-300 md:hidden">
    <div class="flex flex-col items-center justify-center h-full space-y-8 px-6">
      <button id="mobile-close" aria-label="Fermer le menu" title="Fermer le menu" class="absolute top-6 right-6 p-3 rounded-full glass">
        <span aria-hidden="true">✕</span>
      </button>
      <a href="#home" class="text-2xl font-bold" role="menuitem">Accueil</a>
      <a href="#about" class="text-2xl font-bold" role="menuitem">À propos</a>
      <a href="#skills" class="text-2xl font-bold" role="menuitem">Compétences</a>
      <a href="#projects" class="text-2xl font-bold" role="menuitem">Projets</a>
      <a href="#gallery" class="text-2xl font-bold" role="menuitem">Galerie</a>
      <a href="#musique" class="text-2xl font-bold" role="menuitem">Musique</a>
      <a href="#contact" class="px-8 py-3 bg-electric-violet text-white rounded-full font-semibold" role="menuitem">Contact</a>
    </div>
  </div>

  <!-- Hero -->
  <section id="home" class="relative min-h-screen flex items-center pt-20 pb-19 overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-br from-electric-violet/10 via-transparent to-sky-cyan/10"></div>

    <div class="max-w-7xl mx-auto px-6 lg:px-12 relative z-10 w-full">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div class="space-y-8">
          <div class="inline-flex items-center space-x-4  glass px-6 py-3 rounded-full">
            <span class="relative flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint-green opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-mint-green"></span>
            </span>
            <span class="text-sm font-medium tracking-wide ">DISPONIBLE POUR DE NOUVEAUX PROJETS</span>
          </div>

          <h1 class="text-6xl md:text-5xl lg:text-7xl font-cyber font-black leading-tight mt-6">
            <span class="block text-gradient bg-gradient-to-r from-electric-violet to-sky-cyan bg-clip-text text-transparent">DION KELLY JOVIEN AURIOLE</span>
            <cite class="block text-3xl md:text-2xl font-light text-dark-gray/80 mt-2">‘‘Coder avec passion, concevoir avec précision’’</cite>
          </h1>

          <p class="text-lg md:text-xl text-dark-gray/80 leading-relaxed max-w-xl">
            Transforme vos idées en <span class="text-electric-violet font-semibold">expériences digitales immersives</span>. Développeur Full-Stack • Designer • Beat Maker.
          </p>

          <div class="flex flex-wrap gap-5">
            <a href="#projects" class="group px-10 py-5 bg-electric-violet text-white rounded-full font-bold text-base uppercase tracking-wider shadow-2xl hover:scale-105 transition-transform flex items-center space-x-3">
              <span>Explorer</span>
              <i class="fas fa-arrow-right group-hover:translate-x-2 transition-transform"></i>
            </a>
            <a href="#contact" class="px-10 py-5 glass rounded-full font-bold text-base uppercase tracking-wider hover:bg-white/10 transition-all border-2 border-sky-cyan/50 hover:border-sky-cyan">
              Contact
            </a>
          </div>
        </div>

        <div class="relative flex justify-center lg:justify-end">
          <div class="portrait-container relative w-full max-w-2xl">
            <img src="auriole/auriole.png" alt="Portrait" class="w-full h-auto rounded-2xl object-contain" />
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- À propos -->
  <section id="about" class="py-32">
    <div class="max-w-6xl mx-auto px-6 lg:px-6">
      <div class="grid lg:grid-cols-2 gap-16 items-center">
        <div class="relative group">
          <div class="absolute -inset-1 bg-gradient-to-r from-electric-violet to-sky-cyan rounded-3xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
          <div class="relative aspect-square glass rounded-3xl overflow-hidden">
            <video src="auriole/auriole.mp4" class="w-full h-full object-cover" autoplay muted loop></video>
          </div>
        </div>

        <div class="space-y-6">
          <span class="px-4 py-2 bg-mint-green/10 text-mint-green rounded-full text-sm font-bold border border-mint-green/30">À PROPOS</span>
          <h2 class="text-5xl lg:text-6xl font-cyber font-bold leading-tight">
            Créateur d'<span class="text-gradient bg-gradient-to-r from-electric-violet to-sky-cyan bg-clip-text text-transparent">expériences</span> digitales
          </h2>
          <p class="text-lg text-dark-gray/80 leading-relaxed">
            Passionné par l'intersection entre <span class="text-coral-pink font-semibold">technologie</span> et <span class="text-mint-green font-semibold">créativité</span>, je conçois des solutions web qui allient performance technique et esthétique moderne.
          </p>
          <a href="templates/aurioleCV.pdf" download class="inline-flex items-center gap-3 px-8 py-4 glass rounded-full hover:bg-white/10 border-2 border-coral-pink/50 hover:border-coral-pink transition-all">
            <i class="fas fa-download"></i>
            <span class="font-semibold">Télécharger mon CV</span>
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- Compétences -->
 <!-- // Section compétences - CORRIGÉE -->
<section id="skills" class="py-32 bg-soft-gray/50">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
        <div class="text-center mb-20">
        <span class="px-4 py-2 bg-sky-cyan/10 text-sky-cyan rounded-full text-sm font-bold border border-sky-cyan/30 -mt-4 inline-block">TECHNOLOGIES</span>
            <h2 class="text-5xl lg:text-6xl font-cyber font-bold mt-4">Arsenal <span class="text-gradient bg-gradient-to-r from-electric-violet to-sky-cyan bg-clip-text text-transparent">Technique</span></h2>
            <p class="text-xl text-dark-gray/70 max-w-2xl mx-auto mt-4">Des technologies de pointe pour créer des solutions modernes et performantes</p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <?php if (!empty($skills)): ?>
                <?php foreach ($skills as $skill): 
                    $display_name = htmlspecialchars($skill['name']);
                    $icon_path = htmlspecialchars($skill['icon_path']);
                    
                    // Vérification et correction du chemin
                    $correct_icon_path = '';
                    if ($icon_path) {
                        // Si le chemin commence déjà par public/, on l'enlève
                        if (strpos($icon_path, 'public/') === 0) {
                            $correct_icon_path = substr($icon_path, 7);
                        } else {
                            $correct_icon_path = $icon_path;
                        }
                        
                        // Construction du chemin complet pour vérification
                        $full_path = APP_ROOT . '/public/' . $correct_icon_path;
                        
                        // Si le fichier n'existe pas, on utilise une icône par défaut
                        if (!file_exists($full_path)) {
                            $correct_icon_path = 'image/icons/default-icon.png';
                        }
                    } else {
                        $correct_icon_path = 'image/icons/default-icon.png';
                    }
                ?>
                
                <div class="card-3d group glass rounded-2xl p-8 hover:border-<?= htmlspecialchars($skill['hover_border'] ?? 'electric-violet') ?> border-2 border-transparent transition-all">
                    <div class="text-center space-y-4">
                        
                        <?php if (!empty($correct_icon_path)): ?>
                            <img 
                                src="public/<?= $correct_icon_path ?>" 
                                alt="Icône <?= $display_name ?>" 
                                class="mx-auto w-12 h-12 object-contain" 
                                onerror="this.src='public/image/icons/default-icon.png'"
                            />
                        <?php else: ?>
                            <i class="fas fa-question-circle text-5xl text-medium-gray"></i>
                        <?php endif; ?>
                        
                        <div class="font-bold text-lg"><?= $display_name ?></div>
                    </div>
                </div>
                <?php endforeach; ?>
            <?php else: ?>
                <p class="col-span-full text-center text-dark-gray/70">Aucune compétence active n'a pu être chargée.</p>
            <?php endif; ?>
        </div>
    </div>
</section>

    <!-- projects -->
  <section id="portfolio" class="py-32 bg-off-white">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
        <div class="text-center mb-20">
            <span class="px-4 py-2 bg-electric-violet/10 text-electric-violet rounded-full text-sm font-bold border border-electric-violet/30">PORTFOLIO</span>
            <h2 class="text-5xl lg:text-6xl font-cyber font-bold mt-4">Mes <span class="text-gradient bg-gradient-to-r from-sky-cyan to-electric-violet bg-clip-text text-transparent">Réalisations</span></h2>
            <p class="text-xl text-dark-gray/70 max-w-2xl mx-auto mt-4">Une sélection de mes travaux récents, alliant design et performance technique.</p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            <?php if (!empty($projects)): ?>
                <?php foreach ($projects as $project): 
                    $title = htmlspecialchars($project['title']);
                    $category = htmlspecialchars($project['category']);
                    $description = htmlspecialchars($project['description']);
                    // Les liens sont maintenant préparés dans la fonction
                ?>
                
                <div class="card-3d group rounded-2xl overflow-hidden shadow-xl bg-white border border-soft-gray hover:shadow-2xl transition-all duration-300">
                    
                    <?php if (!empty($project['cover_image_url'])): ?>
                        <div class="h-48 overflow-hidden bg-gray-300 flex items-center justify-center">
                            <img 
                                src="<?= $project['cover_image_url'] ?>" 
                                alt="<?= htmlspecialchars($project['title']) ?>"
                                title="<?= htmlspecialchars($project['title']) ?>"
                                class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            >
                        </div>
                    <?php else: ?>
                        <div class="h-48 bg-soft-gray flex flex-col items-center justify-center text-medium-gray">
                            <i class="fas fa-image text-4xl mb-2"></i>
                            <p class="text-sm">Image non disponible</p>
                        </div>
                    <?php endif; ?>

                    <div class="p-6">
                        <span class="text-xs font-bold uppercase text-sky-cyan bg-sky-cyan/10 px-3 py-1 rounded-full mb-3 inline-block">
                            <?= $category ?>
                        </span>

                        <h3 class="text-2xl font-bold text-dark-gray mb-3"><?= $title ?></h3>
                        <p class="text-medium-gray text-base mb-4 line-clamp-3"><?= $description ?></p>

                        <div class="flex flex-wrap gap-2 mb-4">
                            <?php foreach ($project['tags_array'] as $tag): ?>
                                <span class="text-xs text-medium-gray bg-soft-gray px-2 py-0.5 rounded-lg border border-soft-gray hover:bg-medium-gray/10 transition-colors">
                                    <?= htmlspecialchars($tag) ?>
                                </span>
                            <?php endforeach; ?>
                        </div>
                        
                        <div class="flex space-x-4 mt-6">
                            <?php if (!empty($project['link_live_clean'])): ?>
                                <a 
                                    href="<?= $project['link_live_clean'] ?>" 
                                    target="_blank" 
                                    class="flex items-center text-electric-violet font-semibold transition-colors hover:text-sky-cyan"
                                    aria-label="Voir la démo du projet <?= $title ?>"
                                >
                                    <i class="fas fa-desktop mr-2 text-sm"></i>
                                    Voir la démo
                                </a>
                            <?php endif; ?>

                            <?php if (!empty($project['link_github_clean'])): ?>
                                <a 
                                    href="<?= $project['link_github_clean'] ?>" 
                                    target="_blank" 
                                    class="flex items-center text-dark-gray/70 font-semibold transition-colors hover:text-dark-gray"
                                    aria-label="Voir le code source du projet <?= $title ?> sur GitHub"
                                >
                                    <i class="fab fa-github mr-2 text-sm"></i>
                                    Code source
                                </a>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
            <?php else: ?>
                <p class="col-span-full text-center text-dark-gray/70">Aucune réalisation publiée pour l'instant.</p>
            <?php endif; ?>
        </div>
    </div>
</section>

  <!-- Galerie -->
  <section id="gallery" class="py-20 bg-transparent">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
        <div class="text-center mb-20">
        <span class="px-4 py-2 bg-coral-pink/10 text-coral-pink rounded-full text-sm font-bold border border-coral-pink/30 -mt-4 inline-block">GALLERIE</span>
            <h2 class="text-5xl lg:text-6xl font-cyber font-bold mb-6">Gallerie de <span class="text-gradient bg-gradient-to-r from-electric-violet to-sky-cyan bg-clip-text text-transparent">Créations Graphiques</span></h2>
            <p class="text-xl text-dark-gray/70 max-w-2xl mx-auto">Des réalisations marquantes et variées</p>
        </div>

        <div class="carousel-container relative overflow-hidden py-10">
            <div class="carousel-controls absolute inset-0 z-30 flex items-center justify-between pointer-events-none">
                <button class="carousel-prev pointer-events-auto w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-dark-gray hover:bg-electric-violet/20 transition-all duration-300 ml-4 border border-black/10" aria-label="Précédent">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="carousel-next pointer-events-auto w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-dark-gray hover:bg-electric-violet/20 transition-all duration-300 mr-4 border border-black/10" aria-label="Suivant">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>

            <div class="carousel-track flex justify-center items-center h-[60vh] perspective-1000">
                <div class="carousel-slide-wrapper relative w-full h-full flex justify-center items-center">
                    
                    <?php if (!empty($gallery_items)): ?>
                        <?php foreach ($gallery_items as $index => $item): ?>
                            <?php 
                                $is_active = ($index === 0);
                                
                                // **CORRECTION : RETRAIT DES PROPRIÉTÉS EN CONFLIT**
                                // Le slide actif a opacity: 1 et transform: none (pas de transformation 3D appliquée).
                                if ($is_active) {
                                    $initial_style = 'opacity: 1; transform: none;';
                                    $z_class = 'z-20';
                                } else {
                                    // Cache les autres slides hors-champ
                                    $initial_style = 'opacity: 0; transform: translateX(100%) scale(0.8);';
                                    $z_class = 'z-10';
                                }
                            ?>
                            <div 
                                class="carousel-slide absolute transform-style-3d transition-all duration-500 w-[60%] h-[90%] flex items-center justify-center <?= $z_class ?>" 
                                data-index="<?= $index ?>"
                                style="<?= $initial_style ?>"
                            >
                                <img 
                                    src="<?= $item['image_full_url'] ?>" 
                                    alt="<?= $item['alt_text_clean'] ?>" 
                                    class="object-contain w-auto h-auto max-w-full max-h-full rounded-xl shadow-2xl cursor-zoom-in" 
                                />
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div class="text-center text-xl text-dark-gray/70">
                            <i class="fas fa-palette text-5xl mb-4 text-medium-gray"></i><br>
                            Aucune création graphique publiée pour l'instant.
                        </div>
                    <?php endif; ?>

                </div>
            </div>

            <div class="carousel-indicators flex justify-center gap-3 mt-8">
                <?php if (!empty($gallery_items)): ?>
                    <?php foreach ($gallery_items as $index => $item): ?>
                        <button 
                            class="carousel-indicator w-3 h-3 rounded-full bg-black/20 hover:bg-electric-violet transition-all duration-300 <?= ($index === 0) ? 'bg-electric-violet/80' : '' ?>" 
                            data-slide="<?= $index ?>" 
                            aria-label="Slide <?= $index + 1 ?>"
                        ></button>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
    </div>
</section>

  <!-- Musique -->
 <section id="music" class="py-20 bg-soft-gray">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
        <div class="text-center mb-16">
        <span class="px-4 py-2 bg-mint-green/10 text-mint-green rounded-full text-sm font-bold border border-mint-green/30 -mt-4 inline-block">MUSIQUE</span>
            <h2 class="text-5xl lg:text-6xl font-cyber font-bold mb-6 text-dark-gray">Mes <span class="text-gradient bg-gradient-to-r from-sunset-orange to-coral-pink bg-clip-text text-transparent">Compositions</span></h2>
            <p class="text-xl text-medium-gray max-w-2xl mx-auto">Une sélection de mes créations réalisées en composition et arrangement.</p>
        </div>  
        
        <?php if (!empty($music_tracks)): ?>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <?php foreach ($music_tracks as $index => $track): ?>
                    <?php
                        // Logique de couleur basée sur le genre principal
                        $genre_name = htmlspecialchars($track['genre']) ?? 'Général';
                        $color_map = [
                            'Hip-Hop' => ['bg_tag' => 'bg-mint-green/10', 'text_tag' => 'text-mint-green', 'btn_bg' => 'bg-mint-green', 'accent' => '#10b981'],
                            'Trap' => ['bg_tag' => 'bg-coral-pink/10', 'text_tag' => 'text-coral-pink', 'btn_bg' => 'bg-coral-pink', 'accent' => '#f43f5e'],
                            'Lo-Fi' => ['bg_tag' => 'bg-indigo-500/10', 'text_tag' => 'text-indigo-500', 'btn_bg' => 'bg-indigo-500', 'accent' => '#6366f1'],
                            'Electronic' => ['bg_tag' => 'bg-sky-cyan/10', 'text_tag' => 'text-sky-cyan', 'btn_bg' => 'bg-sky-cyan', 'accent' => '#06b6d4'],
                            'Classical' => ['bg_tag' => 'bg-purple-500/10', 'text_tag' => 'text-purple-500', 'btn_bg' => 'bg-purple-500', 'accent' => '#a855f7'],
                        ];
                        // Récupère la couleur basée sur le genre principal ou utilise une couleur par défaut
                        $colors = $color_map[trim($genre_name)] ?? ['bg_tag' => 'bg-electric-violet/10', 'text_tag' => 'text-electric-violet', 'btn_bg' => 'bg-electric-violet', 'accent' => '#7c3aed'];
                        // Pour le troisième morceau (index 2), forcer des couleurs orange
                        if ($index === 2) {
                            $colors['btn_bg'] = 'bg-indigo-500';
                            $colors['accent'] = '#f97316';
                            $colors['bg_tag'] = 'bg-indigo-500/10';
                            $colors['text_tag'] = 'text-indigo-500';
                        }
                        $trackId = 'track-' . ($track['id'] ?? $index);
                        $hasAudio = !empty($track['audio_path']) && file_exists(APP_ROOT . '/public/' . $track['audio_path']);
                    ?>
                    
                    <div class="audio-player glass rounded-2xl p-6 bg-red-600/80 dark:bg-slate-800/80 backdrop-blur-lg shadow-xl hover:shadow-2xl border border-gray-200 dark:border-slate-700 transition-all duration-300 group" 
                         data-track-id="<?= $trackId ?>"
                         <?php if ($hasAudio): ?>
                            data-src="<?= BASE_URL . 'public/' . htmlspecialchars($track['audio_path']) ?>"
                         <?php else: ?>
                            data-src=""
                            data-missing="true"
                         <?php endif; ?>
                         data-accent-color="<?= $colors['accent'] ?>">

                        <!-- En-tête de la carte -->
                        <div class="flex items-start justify-between mb-5">
                            <div class="flex-1 min-w-0">
                                <h3 class="text-xl font-bold text-red-600 dark:text-red-500 mb-1 truncate"><?= htmlspecialchars($track['title']) ?></h3>
                                <p class="text-dark-gray/60 dark:text-slate-400 text-sm truncate"><?= htmlspecialchars($track['artist']) ?></p>
                            </div>
                            <span class="px-3 py-1 <?= $colors['bg_tag'] ?> <?= $colors['text_tag'] ?> rounded-full text-xs font-semibold ml-2 flex-shrink-0"><?= $genre_name ?></span>
                        </div>
                        
                        <!-- Contrôles audio -->
                        <div class="flex items-center gap-3">
                            <button class="play-pause-btn w-14 h-14 rounded-xl <?= $colors['btn_bg'] ?> flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 group/btn relative overflow-hidden border-2 border-white/20" 
                                    aria-label="Lire <?= htmlspecialchars($track['title']) ?>"
                                    <?= !$hasAudio ? 'disabled' : '' ?>>
                                <i class="fas fa-play play-icon text-lg" aria-hidden="true"></i>
                                <i class="fas fa-pause pause-icon hidden text-lg" aria-hidden="true"></i>
                                <?php if (!$hasAudio): ?>
                                    <i class="fas fa-exclamation-triangle error-icon hidden text-lg" aria-hidden="true"></i>
                                <?php endif; ?>
                            </button>
                            
                            <div class="flex-1 min-w-0">
                                <div class="progress-bar-container h-2 bg-gray-200 dark:bg-slate-700 rounded-full cursor-pointer relative group/progress" role="slider" aria-label="Temps de lecture">
                                    <div class="progress-fill absolute top-0 left-0 h-full rounded-full transition-all duration-100 ease-linear" 
                                         style="width: 0%; background: linear-gradient(90deg, <?= $colors['accent'] ?>, <?= $colors['accent'] ?>dd);"></div>
                                    <div class="progress-handle absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-md transition-all duration-100 ease-linear opacity-0 group-hover/progress:opacity-100" 
                                         style="left: 0%; background-color: <?= $colors['accent'] ?>; transform: translate(-50%, -50%);"></div>
                                </div>
                            </div>
                            
                            <span class="time-display text-sm text-dark-gray/70 dark:text-slate-400 w-14 text-right font-mono tabular-nums" 
                                  data-duration="<?= htmlspecialchars($track['duration'] ?? '0:00') ?>"><?= htmlspecialchars($track['duration'] ?? '0:00') ?></span>
                        </div>
                        
                        <!-- Audio élément caché -->
                        <audio class="audio-element hidden" preload="metadata"></audio>
                    </div>
                <?php endforeach; ?>

            </div>

        <?php else: ?>
            <div class="text-center py-16">
                <i class="fas fa-music text-6xl text-gray-300 dark:text-slate-600 mb-4"></i>
                <p class="text-xl text-medium-gray dark:text-slate-400">Aucune composition disponible pour le moment.</p>
            </div>
        <?php endif; ?>
    </div>
</section>

  <!-- Contact -->
  <section id="contact" class="py-32 bg-soft-gray/30">
    <div class="text-center mb-12">
    <span class="px-4 py-2 bg-electric-violet/10 text-electric-violet rounded-full text-sm font-bold border border-electric-violet/30 -mt-10">CONTACT</span>
        <h2 class="text-4xl lg:text-5xl font-cyber font-bold mt-4">Lançons votre <span class="text-gradient bg-gradient-to-r from-electric-violet to-sky-cyan bg-clip-text text-transparent">projet</span></h2>
        <p class="text-xl text-dark-gray/70 max-w-2xl mx-auto mt-4">Discutons de vos idées et donnons vie à votre vision</p>
    </div>

    <div class="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
        <div class="glass rounded-3xl p-8 sm:p-10 card-hover">
            <h3 class="text-2xl font-bold text-dark-gray mb-6">Envoyez-nous un message</h3>

            <?php if (!empty($success_message)): ?>
                <div id="success-feedback" class="p-4 mb-6 rounded-lg bg-mint-green/20 text-mint-green border border-mint-green/50 font-semibold">
                    <i class="fas fa-check-circle mr-2"></i> <?= htmlspecialchars($success_message) ?>
                </div>
                <script>
                document.addEventListener('DOMContentLoaded', function(){
                    var el = document.getElementById('success-feedback');
                    if (!el) return;
                    // Masque progressivement puis supprime l'élément après 5s
                    setTimeout(function(){
                        el.style.transition = 'opacity 0.6s, max-height 0.6s';
                        el.style.opacity = '0';
                        el.style.maxHeight = '0';
                        setTimeout(function(){ if (el && el.parentNode) el.parentNode.removeChild(el); }, 700);
                    }, 5000);
                });
                </script>
            <?php endif; ?>

            <?php if (!empty($errors)): ?>
                <div class="p-4 mb-6 rounded-lg bg-neon-red/20 text-neon-red border border-neon-red/50 font-semibold">
                    <i class="fas fa-exclamation-triangle mr-2"></i> Erreurs de validation :
                    <ul class="list-disc list-inside mt-1">
                        <?php foreach ($errors as $error): ?>
                            <li><?= htmlspecialchars($error) ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>

            <form action="#contact" method="POST" class="space-y-6">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrf_token) ?>">
                <input type="hidden" name="action" value="submit_contact"> <div>
                    <label for="name" class="block text-sm font-semibold text-dark-gray mb-2">
                        <i class="fas fa-user text-mint-green mr-2"></i>Nom Complet
                    </label>
                    <input 
                        type="text" 
                        id="name"
                        name="name"
                        value="<?= htmlspecialchars($contact_data['name']) ?>"
                        class="w-full px-4 py-3 border-2 border-mint-green/30 rounded-xl focus:outline-none focus:border-mint-green transition-all bg-white text-dark-gray"
                        placeholder="Votre nom"
                        required
                    >
                </div>

                <div>
                    <label for="email" class="block text-sm font-semibold text-dark-gray mb-2">
                        <i class="fas fa-envelope text-mint-green mr-2"></i>Email
                    </label>
                    <input 
                        type="email" 
                        id="email"
                        name="email"
                        value="<?= htmlspecialchars($contact_data['email']) ?>"
                        class="w-full px-4 py-3 border-2 border-mint-green/30 rounded-xl focus:outline-none focus:border-mint-green transition-all bg-white text-dark-gray"
                        placeholder="votre@email.com"
                        required
                    >
                </div>

                <div>
                    <label for="phone" class="block text-sm font-semibold text-dark-gray mb-2">
                        <i class="fas fa-phone text-mint-green mr-2"></i>Téléphone
                    </label>
                    <input 
                        type="tel" 
                        id="phone"
                        name="phone"
                        value="" class="w-full px-4 py-3 border-2 border-mint-green/30 rounded-xl focus:outline-none focus:border-mint-green transition-all bg-white text-dark-gray"
                        placeholder="+225 XX XX XX XX XX"
                    >
                </div>

                <div>
                    <label for="message" class="block text-sm font-semibold text-dark-gray mb-2">
                        <i class="fas fa-message text-mint-green mr-2"></i>Message
                    </label>
                    <textarea 
                        rows="4"
                        id="message"
                        name="message"
                        class="w-full px-4 py-3 border-2 border-mint-green/30 rounded-xl focus:outline-none focus:border-mint-green transition-all bg-white text-dark-gray"
                        placeholder="Votre message..."
                        required
                    ><?= htmlspecialchars($contact_data['message']) ?></textarea>
                </div>

                <button 
                    type="submit" 
                    class="w-full bg-mint-green text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all"
                >
                    <i class="fas fa-paper-plane mr-2"></i>
                    Envoyer le Message
                </button>
            </form>
        </div>

        <div class="space-y-6">
            <div class="glass rounded-2xl p-6 card-hover">
                <div class="flex items-start">
                    <div class="w-14 h-14 bg-mint-green rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                        <i class="fas fa-map-marker-alt text-2xl text-white"></i>
                    </div>
                    <div>
                        <h4 class="text-xl font-bold text-dark-gray mb-2">Adresse</h4>
                        <p class="text-dark-gray/70">Bouaké<br>Côte d'Ivoire</p>
                    </div>
                </div>
            </div>

            <div class="glass rounded-2xl p-6 card-hover">
                <div class="flex items-start">
                    <div class="w-14 h-14 bg-sky-cyan rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                        <i class="fas fa-phone text-2xl text-white"></i>
                    </div>
                    <div>
                        <h4 class="text-xl font-bold text-dark-gray mb-2">Téléphone</h4>
                        <p class="text-dark-gray/70">+225 07 05 59 51 86<br>+225 01 50 17 07 24</p>
                    </div>
                </div>
            </div>

            <div class="glass rounded-2xl p-6 card-hover">
                <div class="flex items-start">
                    <div class="w-14 h-14 bg-electric-violet rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                        <i class="fas fa-envelope text-2xl text-white"></i>
                    </div>
                    <div>
                        <h4 class="text-xl font-bold text-dark-gray mb-2">Email</h4>
                        <p class="text-dark-gray/70">aurioledev@gmail.com<br>jovienauriole@gmail.com</p>
                    </div>
                </div>
            </div>

            <div class="glass rounded-2xl p-6 card-hover">
                <h4 class="text-xl font-bold text-dark-gray mb-4 text-center">Suivez-moi</h4>
                <div class="flex justify-center space-x-4">
                    <a href="https://wa.me/2250705595186" class="w-12 h-12 bg-mint-green rounded-full flex items-center justify-center hover:bg-mint-green/80 transition-all transform hover:scale-110">
                        <i class="fab fa-whatsapp text-white text-xl"></i>
                    </a>
                    <a href="https://www.facebook.com/profile.php?id=61553416418279" class="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center hover:bg-blue-700/80 transition-all transform hover:scale-110">
                        <i class="fab fa-facebook-f text-white text-xl"></i>
                    </a>
                    <a href="https://x.com/AurioleDion" class="w-12 h-12 bg-black rounded-full flex items-center justify-center hover:bg-black/80 transition-all transform hover:scale-110">
                        <i class="fa-brands fa-x-twitter text-white text-xl"></i>
                    </a>
                    <a href="https://www.instagram.com/auriole.dev/" class="w-12 h-12 rounded-full flex items-center justify-center hover:opacity-90 transition-all transform hover:scale-110 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                        <i class="fab fa-instagram text-white text-xl"></i>
                    </a>
                    <a href="https://www.linkedin.com/in/kelly-jovien-auriole-dion-88b411379" class="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center hover:bg-blue-700/80 transition-all transform hover:scale-110">
                        <i class="fab fa-linkedin-in text-white text-xl"></i>
                    </a>
                    <a href="https://github.com/DevCoder021" class="w-12 h-12 bg-black rounded-full flex items-center justify-center hover:bg-black/80 transition-all transform hover:scale-110">
                        <i class="fab fa-github text-white text-xl"></i>
                    </a>
                </div>
            </div>

        </div>
    </div>
</section>

  <!-- Footer Ultra Moderne -->
    <footer class="py-16 border-t border-gray-700/10 relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-t from-neon-red/5 to-transparent"></div>
        
        <div class="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
            <div class="grid md:grid-cols-3 gap-12 mb-12">
                <!-- Colonne 1 -->
                <div class="space-y-4">
                    <div class="text-3xl font-cyber font-bold text-gradient bg-gradient-to-r from-electric-violet to-sky-cyan bg-clip-text text-transparent">AURIOLE DION</div>
                    <p class="text-gray-400">
                        Développeur Full-Stack • Designer • Producteur Musical
                    </p>
                </div>

                <!-- Colonne 2 -->
                <div class="space-y-4">
                    <h3 class="text-lg font-bold text-neon-green">Navigation</h3>
                    <div class="flex flex-col space-y-2">
                        <a href="#home" class="text-gray-400 hover:text-electric-violet transition-colors">Accueil</a>
                        <a href="#about" class="text-gray-400 hover:text-electric-violet transition-colors">À propos</a>
                        <a href="#skills" class="text-gray-400 hover:text-electric-violet transition-colors">Compétences</a>
                        <a href="#projects" class="text-gray-400 hover:text-electric-violet transition-colors">Projets</a>
                        <a href="#contact" class="text-gray-400 hover:text-electric-violet transition-colors">Contact</a>
                    </div>
                </div>

                <!-- Colonne 3 -->
                <div class="space-y-4">
                    <h3 class="text-lg font-bold text-cyber-blue">Contact</h3>
                    <div class="flex flex-col space-y-2 text-gray-400">
                        <a href="mailto:aurioledev@gmail.com" class="hover:text-electric-violet transition-colors flex items-center gap-2">
                            <i class="fas fa-envelope"></i>
                            aurioledev@gmail.com
                        </a>
                        <p class="flex items-center gap-2">
                            <i class="fas fa-map-marker-alt"></i>
                            Bouaké, Côte d'Ivoire
                        </p>
                    </div>
                </div>
            </div>

            <!-- Copyright -->
            <div class="pt-8 border-t border-white/10 text-center">
                <p class="text-gray-400">
                    &copy; 2025 Auriole Dion. Tous droits réservés. Conçu avec 
                    <span class="text-neon-red animate-pulse">❤</span> et 
                    <span class="text-gradient font-semibold">passion</span>
                </p>
            </div>
        </div>
    </footer>

  <!-- Scroll to top -->
  <button id="scrollTop" type="button" title="Retour en haut" aria-label="Retour en haut" onclick="window.scrollTo({top: 0, behavior: 'smooth'})" class="fixed bottom-8 right-8 w-14 h-14 glass rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all z-50 opacity-0 pointer-events-none">
    <i class="fas fa-arrow-up text-electric-violet text-xl transform-style-3d" aria-hidden="true"></i>
    <span class="sr-only">Retour en haut</span>
  </button>

  <!-- JS -->
<script src="public/js/main.js"></script>
<script src="public/js/script.js"></script>
<script src="public/js/audio.js"></script>

</body>
</html>

