# Contrat SUPER PDP utilisé par Onetto

Source de vérité locale : `backend/superpdp.json`, OpenAPI 3.0.4, version
`1.30.0.beta`, fournie le 29 août 2026. Serveur documenté :
`https://api.superpdp.tech`.

## Configuration Onetto

```env
SUPERPDP_ENVIRONMENT=sandbox
SUPERPDP_ONBOARDING_ENABLED=false
SUPERPDP_ISSUANCE_ENABLED=false
SUPERPDP_RECEIPT_ENABLED=false
SUPERPDP_TRANSACTION_EREPORTING_ENABLED=false
SUPERPDP_PAYMENT_EREPORTING_ENABLED=false
SUPERPDP_CLIENT_ID=
SUPERPDP_CLIENT_SECRET=
SUPERPDP_OAUTH_REDIRECT_URL=
SUPERPDP_TOKEN_ENCRYPTION_KEY=
```

`SUPERPDP_TOKEN_ENCRYPTION_KEY` doit être une clé aléatoire de 32 octets
encodée en base64. Dès qu’un flag est activé, le backend refuse de démarrer si
les quatre secrets/configurations OAuth nécessaires sont absents.

## Identité sandbox et adresse de facturation

- Le numéro de connexion de test est enregistré par entreprise dans
  `ElectronicInvoicingConnection.superPdpSandboxCompanyNumber` et utilisé avec
  `superpdp_company_number_scheme=sandbox`. Aucun fallback global n’est utilisé.
- `Company.siren` reste l’identifiant légal dans les factures. En production,
  il sert à la connexion OAuth avec le schéma `fr_siren`.
- `Company.electronicAddress` contient uniquement l’adresse de facturation.
  Pour `electronicAddressScheme=PEPPOL`, enregistrer l’adresse complète
  `schéma:identifiant` ; la génération des documents sépare les deux parties.
- Après OAuth et lors d’une vérification manuelle, `/companies/me` doit retourner
  le numéro, le schéma et l’environnement attendus. Sinon, la connexion passe en
  `ACTION_REQUIRED` et les appels authentifiés sont bloqués. Le rafraîchissement
  d’un jeton ne valide pas à lui seul l’identité.
- Le bouton « Charger mes adresses SuperPDP » consulte `/directory_entries`
  du compte connecté. Seules les entrées Peppol créées et non `is_replyto` sont proposées.
  Choisir une adresse puis enregistrer l’entreprise.

Après la migration de séparation des identifiants, vérifier les connexions
existantes depuis les paramètres. Le numéro sandbox n’est repris automatiquement
que s’il était présent dans un profil SuperPDP sauvegardé, jamais depuis une
adresse de routage. Pour le seed Burger Queen, le numéro OAuth est `000000002`.
L’adresse Peppol réelle peut être fournie avec
`SUPERPDP_SEED_SELLER_ELECTRONIC_ADDRESS` ; à défaut, une nouvelle entreprise est
créée sans adresse et doit être configurée après connexion. Le seed ne remplace
pas une adresse existante sans cette variable.

Contrat de référence des champs `company.number`, `number_scheme`, `env` et des
entrées d’annuaire : [OpenAPI SuperPDP](https://www.superpdp.tech/openapi/).

## Opérations confirmées

| Besoin métier | Opération OpenAPI | État prévu |
| --- | --- | --- |
| Vérifier une session et le KYB | `GET /v1.beta/oauth2_sessions/me` | À intégrer après onboarding OAuth |
| Lire l’entreprise rattachée | `GET /v1.beta/companies/me` | À intégrer après OAuth |
| Enregistrer une entreprise | `POST /v1.beta/companies` | Non utilisée : réservée aux experts-comptables ; le contrat impose OAuth pour le multi-tenant |
| Mettre à jour le régime TVA | `PATCH /v1.beta/companies` | À intégrer après OAuth |
| Consulter l’annuaire français | `GET /v1.beta/french_directory/companies` et `/entries` | Disponible dans le futur adaptateur |
| Envoyer une facture | `POST /v1.beta/invoices` | À intégrer après génération d’un document CII, UBL ou Factur-X conforme |
| Lire et télécharger une facture | `GET /v1.beta/invoices`, `/{id}`, `/{id}/download` | À intégrer après OAuth |
| Suivre ou émettre un statut | `GET/POST /v1.beta/invoice_events` | À intégrer après OAuth |
| E-reporting B2C | `POST /v1.beta/b2c_transactions`, `POST /v1.beta/b2c_payments` | À intégrer après OAuth |
| E-reporting B2B international | `POST /v1.beta/b2bint_invoices`, `POST /v1.beta/b2bint_payments` | À intégrer après OAuth |
| Lire l’agrégation PPF | `GET /v1.beta/ereportings` | À intégrer après OAuth |

## Contraintes confirmées

- L’authentification des routes privées est `BearerAuth`.
- L’inscription `POST /v1.beta/companies` est réservée aux experts-comptables ;
  pour un logiciel multi-tenant, la spécification renvoie explicitement vers le
  flux OAuth2.1 Authorization Code.
- `POST /v1.beta/invoices` accepte seulement CII/UBL XML ou Factur-X PDF : le
  PDF commercial généré par Onetto ne doit pas être envoyé tel quel.
- L’envoi est asynchrone ; le statut doit être suivi avec `invoice_events`.
- Les identifiants SUPER PDP sont documentés comme des `bigint` positifs. Ils
  seront conservés comme chaînes dans Onetto afin d’éviter toute perte de
  précision JavaScript.
- Les routes B2C/B2BInt enregistrent des données qui sont ensuite agrégées par
  SUPER PDP ; aucune route de soumission d’un rapport agrégé n’est documentée.

## OAuth confirmé

Source : [documentation SuperPDP — Authentification](https://www.superpdp.tech/documentation/4).

- Authorization Code pour la délégation par utilisateur final ; scopes vides.
- `https://api.superpdp.tech/oauth2/authorize`
- `https://api.superpdp.tech/oauth2/token`
- `https://api.superpdp.tech/oauth2/revoke`
- Les access tokens sont courts (30 minutes à la date de la documentation) ;
  un refresh token est rotatif et valable un an après chaque utilisation.
- `simple-oauth2` est utilisé pour l’échange de code ; son client servira au
  rafraîchissement rotatif et à la révocation dans l’adaptateur de flux. Les
  access et refresh tokens ne sont conservés qu’après chiffrement AES-256-GCM.

## Capacité toujours désactivée

La spécification et la page d’authentification ne documentent toujours pas les
webhooks (signature, format, URL de callback ou protection anti-rejeu). Aucun
webhook SuperPDP ne sera exposé avant réception de ce contrat.
