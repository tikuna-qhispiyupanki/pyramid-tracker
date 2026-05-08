# Pyramid Tracker — Lancement en local

App de suivi d'entraînement pyramide chronométrée.

## Prérequis

- **Node.js** version 18 ou plus récente
  Installation : https://nodejs.org (télécharge la version LTS)

Pour vérifier que c'est installé, ouvre un Terminal et tape :
```
node --version
npm --version
```

## Lancement (3 commandes)

Ouvre un Terminal **dans le dossier `pyramid-tracker`** (clic droit dans Finder sur Mac → "Nouveau terminal au dossier"), puis :

```bash
# 1. Installer les dépendances (une seule fois, ~30 secondes)
npm install

# 2. Lancer l'app en mode développement
npm run dev
```

L'app s'ouvre dans ton navigateur sur **http://localhost:5173**

## Pour arrêter l'app

Dans le Terminal où l'app tourne, tape `Ctrl + C`.

## Pour relancer l'app plus tard

Réouvre un Terminal dans le dossier `pyramid-tracker` et tape juste :
```bash
npm run dev
```

(Pas besoin de refaire `npm install` chaque fois.)

## Structure des fichiers

```
pyramid-tracker/
├── package.json          ← liste des dépendances
├── vite.config.js        ← configuration du builder
├── index.html            ← page principale
├── src/
│   ├── main.jsx          ← point d'entrée React
│   └── WorkoutTracker.jsx← TOUT le code de l'app
└── public/
    └── favicon.svg       ← icône de l'onglet
```

## Stockage des données

Tes séances sont stockées dans le **localStorage** de ton navigateur.

- **Avantages** : rapide, pas besoin de serveur, fonctionne hors-ligne
- **Inconvénients** : les données ne sont pas synchronisées entre navigateurs/appareils

**Important** : avant de changer de navigateur ou de réinstaller, exporte tes données via le bouton "JSON" dans le header de l'app.

## Build pour production

Quand tu seras prêt à déployer (sur Vercel par exemple) :

```bash
npm run build
```

Le dossier `dist/` contient l'app prête à être déployée.

## Problèmes courants

**"command not found: npm"**
→ Node.js n'est pas installé, va sur nodejs.org

**"Port 5173 is already in use"**
→ Une autre app utilise ce port. Soit tu l'arrêtes, soit tu utilises un autre port :
```bash
npm run dev -- --port 3000
```

**Page blanche dans le navigateur**
→ Ouvre la console (F12 → Console) et copie l'erreur. Probablement un import qui a foiré.

**L'app n'a pas de données au démarrage**
→ Normal, c'est ton premier lancement. Tu peux importer le seed des 27 séances en cliquant sur "Charger" dans la popup de bienvenue.
