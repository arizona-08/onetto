# Passage des logos d’entreprise vers S3

Les nouveaux logos sont stockés dans `S3_DOCUMENTS_BUCKET`. La base conserve uniquement la clé S3 et le type MIME. Un SVG validé reste un SVG dans S3 et dans l’interface ; le PDF le convertit uniquement en mémoire.

Pour une base qui contient déjà des logos dans `CompanyLogo.content`, déployer dans cet ordre :

1. Appliquer `20261125190000_company_logo_s3` (colonnes `s3Key` et `contentType`, `content` rendu nullable).
2. Avec les accès S3 du backend, exécuter `npm run storage:migrate-company-logos`. Relancer la commande si elle échoue : chaque ligne n’est vidée qu’après un upload réussi.
3. Appliquer `20261125200000_company_logo_remove_content`. Cette migration refuse de supprimer la colonne tant que des logos restent en base.

Sur une base neuve, `prisma migrate deploy` peut appliquer toutes les migrations d’un coup. Sur une base existante, il faut respecter l’étape intermédiaire avant de déployer la dernière migration ; `migrate deploy` applique automatiquement toutes les migrations disponibles.
