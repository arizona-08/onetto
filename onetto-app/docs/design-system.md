# Design System Onetto

Le socle est opt-in. Les pages existantes gardent leurs styles tant qu'elles n'adoptent pas les utilitaires `ui-*` ou les composants de `app/components/ui`.

## Fondations

- Couleur principale : `#454ADE`, réservée aux actions, sélections, liens et graphiques principaux.
- Fond d'application : `ui-background` (`#F7F7FC`) ; cartes : `ui-surface` (`#FFFFFF`) ; surface secondaire : `ui-subtle`.
- Texte : `ui-text` et `ui-secondary` ; bordure décorative : `ui-border` ; bordure de contrôle : `ui-control`.
- États : `ui-success`, `ui-warning`, `ui-danger`, `ui-info` et leurs fonds `*-soft`. Toujours afficher un libellé, pas seulement une couleur.
- Espacements : grille de 4 px, avec 8/12/16/24/32/48 px comme étapes usuelles.
- Coins : 12 px pour les contrôles, 20 px pour les cartes. Ombres : `shadow-ui-card` et `shadow-ui-popover` seulement lorsque nécessaires.
- Typographie : Poppins, via `font-body` et `font-title`, pour conserver l'identité existante.
- Icônes : Lucide, généralement 16 ou 20 px et trait 1.75. Ne pas modifier tous les SVG globalement.
- Interactions : focus visible, vrais contrôles désactivés, retour de chargement, transitions discrètes et réduction des animations si demandée par le système.

Les valeurs sont dans `styles/tokens.css`, exposées à Tailwind dans `app/globals.css` sans modifier les anciennes couleurs.

## Composants disponibles

- `Card` : surface principale réutilisable, sans contenu métier.
- `Badge` : libellé d'état avec ton sémantique.
- `Button`, `IconButton` : variantes principale, secondaire, discrète, destructive ; état de chargement.
- `Field`, `Input`, `Select`, `Textarea`, `Separator` : champs natifs avec style commun. Associer `id` au libellé, puis `aria-describedby` à l'aide ou à l'erreur.
- `Spinner` : indicateur décoratif associé à un libellé et à `aria-busy`.

Le catalogue est accessible uniquement en développement à `/design-system`. Il ne contient aucune donnée métier fictive.

## Migration progressive

1. Adopter les tokens et composants sur un écran demandé explicitement.
2. Conserver ses appels, données, permissions, actions et états existants.
3. Tester les parcours clavier, les petits écrans et les états vide, chargement et erreur.
4. Adapter ensuite les tableaux, modales et menus existants dans les demandes d'écran correspondantes, en conservant leur logique d'accessibilité et de fermeture.

Le dashboard et la navigation de l'application constituent le premier écran migré. Les autres pages fonctionnelles ne sont pas refondues par ce socle.
