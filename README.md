# Vault My Password

Petit gestionnaire de mots de passe pensé pour mobile (Expo / React Native).  
Focus : simplicité, thème sombre, sécurité locale (chiffrement des mots de passe, verrouillage par biométrie et question secrète).

## Concept rapide
- Stocke des éléments (Titre, username, site, notes, catégorie, mot de passe chiffré).
- Interface organisée par catégories (accordéons modernes).
- Ajout / modification via modal sécurisée.
- Détail d'un mot de passe dans une modal avec option modifier / supprimer.
- Protection : verrouillage automatique après inactivité + écran de déverrouillage.
  - Biometrie (si activée)
  - Question secrète (réponse stockée hachée, SHA‑256)

## Architecture
- Expo + React Native
- Redux Toolkit pour l'état (slices : passwords, categories, settings, ...)
- redux-persist pour persistance locale
- Chiffrement côté client (utilisé via redux slice `pwdSlice`)
- Components importants :
  - `app/_layout.tsx` — root + UnlockGate wrapper
  - `components/UnlockGate.tsx` — verrouillage / biométrie / question
  - `components/AddPasswordModal.tsx` — formulaire ajouter / modifier
  - `components/PasswordDetailModal.tsx` — affichage complet + actions
  - `components/CategoryAccordion.tsx`, `components/PasswordRow.tsx`
  - `app/settings.tsx` — paramètres (contrôles liés au slice `settings`)
  - `datas/questions.ts` — liste des questions disponibles

## Sécurité (points importants)
- La réponse à la question secrète est hachée avec SHA‑256 avant stockage.
- NE stockez PAS la « master key » en clair dans le code. Utilisez SecureStore / Keychain pour la clé maître.
- Recommandation : dériver la clé avec PBKDF2/scrypt/argon2, utiliser AES-GCM pour chiffrement si possible.
- Comparaison des hashes : effectuer une comparaison résistante au timing (déjà utilisée dans UnlockGate).
- Eviter d'afficher le mot de passe en clair automatiquement — l'utilisateur doit déclencher la révélation.

## Dépendances (à installer)
Exemples :
- npm install
- npm install react-redux @reduxjs/toolkit redux-persist
- npm install react-native-get-random-values
- expo install react-native-safe-area-context react-native-reanimated @expo/vector-icons
- expo install expo-local-authentication expo-crypto
- expo start -c

(adaptez selon votre gestionnaire de paquets)

## Exécution (développement)
1. Installer dépendances (voir ci‑dessus).
2. Lancer le bundler : `expo start -c` (vider le cache recommandé après changements critiques).
3. Ouvrir l'app sur simulateur / appareil.

## Notes pratiques pour le dev
- Les imports sensibles (ex. `react-native-get-random-values`) doivent être chargés en tout début d'exécution (ex : `app/_layout.tsx`) pour que crypto-js fonctionne.
- `UnlockGate` s'initialise au lancement et bloque l'UI tant que l'utilisateur n'a pas passé les protections configurées.
- Pour l'input du timeout de verrouillage, on utilise un champ local string et on valide au `onEndEditing` pour permettre la saisie multi‑chiffres.
- Questions pour la question secrète : `datas/questions.ts` — utilisez ces entrées dans les settings.

## Où personnaliser
- Couleurs / thèmes : ajuster les constantes `colors` dans `app/index.tsx`, `app/settings.tsx` et composants.
- Comportement d'authentification : `components/UnlockGate.tsx`.
- Chiffrement / stockage sécurisé : `redux/slices/pwdSlice.ts` (fonctions `encryptText` / `decryptText`) — remplacez la gestion de clé par SecureStore.

## A faire / améliorations suggérées
- Migrer chiffrement vers WebCrypto / native libs si besoin de meilleures primitives.
- Utiliser Keychain / SecureStore pour master key et/ou derivation robuste (PBKDF2/argon2).
- Ajouter tests unitaires pour slices (validation chiffrement/déchiffrement).
- Améliorer l'UX d'activation biométrie (ne pas lancer de prompt pendant l'édition des réglages).

Si vous voulez, je génère un README en anglais également ou j'ajoute une checklist de sécurité plus détaillée.
