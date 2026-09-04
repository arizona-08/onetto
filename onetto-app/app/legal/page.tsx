import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Informations légales | Onetto',
  description: 'Mentions légales du service Onetto.',
};

const sections = [
  { number: '01', label: 'Mentions légales', href: '#mentions-legales' },
  { number: '02', label: 'Politique de confidentialité', href: '#politique-de-confidentialite' },
  { number: '03', label: 'Conditions générales d’utilisation', href: '#conditions-generales-utilisation' },
  { number: '04', label: 'Conditions générales de vente', href: '#conditions-generales-vente' },
];

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground sm:px-10 lg:px-16 lg:py-16">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <p className="font-title text-sm font-bold uppercase tracking-[0.18em] text-primary">Onetto</p>
          <h1 className="mt-4 font-title text-4xl font-semibold tracking-tight text-secondary sm:text-5xl">
            Informations légales
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
            Retrouvez les informations qui encadrent l’utilisation de la plateforme Onetto.
          </p>
        </header>

        <div className="mt-16 grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-20">
          <aside className="lg:sticky lg:top-8 lg:self-start lg:pt-1" aria-label="Sommaire des informations légales">
            <p className="font-title text-xs font-bold uppercase tracking-[0.16em] text-primary">Sommaire</p>
            <nav className="mt-4 border-l border-primary/20" aria-label="Navigation des rubriques">
              <ol className="space-y-1">
                {sections.map((section) => (
                  <li key={section.number}>
                    {section.href ? (
                      <a
                        href={section.href}
                        className="-ml-px flex items-start gap-3 border-l-2 border-transparent px-4 py-3 text-sm font-semibold text-zinc-500 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                      >
                        <span className="pt-0.5 text-xs font-bold text-primary/60">{section.number}</span>
                        <span>{section.label}</span>
                      </a>
                    ) : (
                      <span className="flex items-start gap-3 px-4 py-3 text-sm leading-5 text-zinc-400">
                        <span className="pt-0.5 text-xs font-bold text-zinc-300">{section.number}</span>
                        <span>{section.label}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article id="mentions-legales" className="max-w-2xl scroll-mt-8">
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">01</span>
              <p className="font-title text-xs font-bold uppercase tracking-[0.16em] text-primary">Informations légales</p>
            </div>

            <h2 className="mt-5 font-title text-3xl font-semibold tracking-tight text-secondary">Mentions légales</h2>
            <p className="mt-3 text-sm text-zinc-500">Dernière mise à jour : 10 septembre 2026</p>

            <div className="mt-10 space-y-10 text-[15px] leading-7 text-zinc-600 sm:text-base">
              <section>
                <h3 className="font-title text-lg font-bold text-secondary">Éditeur du service</h3>
                <p className="mt-4">Le site et l’application <strong className="font-semibold text-secondary">Onetto</strong>, accessibles à l’adresse <a className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-hover" href="https://onetto.fr">onetto.fr</a>, sont édités par :</p>
                <address className="mt-4 not-italic">
                  <p className="font-semibold text-secondary">Jonathan ASSI</p>
                  <p>Entrepreneur individuel exerçant sous le régime de la micro-entreprise</p>
                  <p>10 rue des Semailles, 77230 Rouvres, France</p>
                  <p>SIREN : 102 765 955</p>
                  <p>SIRET : 102 765 955 00012</p>
                  <p>E-mail : <a className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-hover" href="mailto:contact@marc-assi.com">contact@marc-assi.com</a></p>
                </address>
                <p className="mt-5">Directeur de la publication : <strong className="font-semibold text-secondary">Jonathan ASSI</strong>.</p>
              </section>

              <section>
                <h3 className="font-title text-lg font-bold text-secondary">Hébergement</h3>
                <p className="mt-4">Le site et l’application sont hébergés par <strong className="font-semibold text-secondary">OVH SAS</strong>, 2 rue Kellermann, 59100 Roubaix, France.</p>
                <p className="mt-4">Les documents et fichiers associés au service peuvent être stockés via <strong className="font-semibold text-secondary">Amazon Web Services EMEA SARL (AWS)</strong>, 38 Avenue John F. Kennedy, L-1855 Luxembourg.</p>
              </section>

              <section>
                <h3 className="font-title text-lg font-bold text-secondary">Objet du service</h3>
                <p className="mt-4">Onetto est une application destinée aux professionnels, permettant notamment de créer, gérer et envoyer des devis et des factures, ainsi que d’accéder à des fonctionnalités associées, dont des solutions de paiement.</p>
              </section>

              <section>
                <h3 className="font-title text-lg font-bold text-secondary">Propriété intellectuelle</h3>
                <p className="mt-4">L’ensemble des éléments composant Onetto, notamment les textes, marques, logos, illustrations, graphismes, interfaces, logiciels et bases de données, est protégé par les droits de propriété intellectuelle.</p>
                <p className="mt-4">Toute reproduction, représentation, adaptation ou exploitation, totale ou partielle, de ces éléments sans autorisation écrite préalable de l’éditeur est interdite, sauf disposition légale contraire.</p>
              </section>

              <section>
                <h3 className="font-title text-lg font-bold text-secondary">Responsabilité</h3>
                <p className="mt-4">L’éditeur s’efforce d’assurer l’exactitude et la mise à jour des informations et fonctionnalités proposées sur Onetto. Il ne peut toutefois garantir l’absence d’erreur, d’interruption ou d’indisponibilité temporaire du service.</p>
                <p className="mt-4">L’utilisateur reste responsable de l’utilisation du service, des informations qu’il renseigne et de la conformité des documents commerciaux ou comptables qu’il émet.</p>
              </section>

              <section>
                <h3 className="font-title text-lg font-bold text-secondary">Données personnelles</h3>
                <p className="mt-4">Les modalités de collecte et de traitement des données personnelles sont détaillées dans la Politique de confidentialité d’Onetto.</p>
                <p className="mt-4">Pour toute question relative aux données personnelles ou pour exercer vos droits, vous pouvez écrire à <a className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-hover" href="mailto:contact@marc-assi.com">contact@marc-assi.com</a>.</p>
              </section>

              <section>
                <h3 className="font-title text-lg font-bold text-secondary">Droit applicable</h3>
                <p className="mt-4">Les présentes mentions légales sont soumises au droit français.</p>
              </section>
            </div>

            <section id="politique-de-confidentialite" className="mt-20 scroll-mt-8 border-t border-zinc-200 pt-14">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">02</span>
                <p className="font-title text-xs font-bold uppercase tracking-[0.16em] text-primary">Informations légales</p>
              </div>

              <h2 className="mt-5 font-title text-3xl font-semibold tracking-tight text-secondary">Politique de confidentialité</h2>
              <p className="mt-3 text-sm text-zinc-500">Dernière mise à jour : 10 septembre 2026</p>

              <div className="mt-10 space-y-10 text-[15px] leading-7 text-zinc-600 sm:text-base">
                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Objet de la politique</h3>
                  <p className="mt-4">La présente politique explique comment Onetto collecte, utilise, conserve et protège les données personnelles dans le cadre de l’utilisation du site et de l’application Onetto.</p>
                  <p className="mt-4">Onetto est réservé aux personnes majeures agissant à des fins professionnelles.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Responsable du traitement</h3>
                  <p className="mt-4">Le responsable des traitements de données personnelles liés au fonctionnement d’Onetto est :</p>
                  <address className="mt-4 not-italic">
                    <p className="font-semibold text-secondary">Jonathan ASSI</p>
                    <p>Entrepreneur individuel exerçant sous le régime de la micro-entreprise</p>
                    <p>10 rue des Semailles, 77230 Rouvres, France</p>
                    <p>SIREN : 102 765 955</p>
                    <p>E-mail : <a className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-hover" href="mailto:contact@onetto.fr">contact@onetto.fr</a></p>
                  </address>
                  <p className="mt-4">Onetto n’a pas désigné de délégué à la protection des données (DPO). Pour toute question relative à vos données personnelles, vous pouvez écrire à cette adresse.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Données traitées</h3>
                  <p className="mt-4">Selon votre utilisation du service, Onetto peut traiter les données de compte, les données d’entreprise, les informations relatives aux clients, les devis, factures et pièces associées, les références de transaction, les demandes d’assistance ainsi que les données techniques nécessaires à la sécurité et au bon fonctionnement du service.</p>
                  <p className="mt-4">Onetto ne conserve aucune donnée de carte bancaire. Les paiements sont traités directement par les prestataires de paiement concernés.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Finalités et bases légales</h3>
                  <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
                    <table className="w-full min-w-[520px] text-left text-sm leading-6">
                      <thead className="bg-zinc-50 text-secondary"><tr><th className="px-4 py-3 font-semibold">Finalité</th><th className="px-4 py-3 font-semibold">Base légale</th></tr></thead>
                      <tbody className="divide-y divide-zinc-200">
                        <tr><td className="px-4 py-3">Création, gestion et sécurisation du compte</td><td className="px-4 py-3">Exécution du contrat</td></tr>
                        <tr><td className="px-4 py-3">Fourniture des fonctionnalités d’Onetto</td><td className="px-4 py-3">Exécution du contrat</td></tr>
                        <tr><td className="px-4 py-3">Vérification de l’e-mail et prévention de la fraude</td><td className="px-4 py-3">Intérêt légitime</td></tr>
                        <tr><td className="px-4 py-3">Gestion des paiements et abonnements</td><td className="px-4 py-3">Exécution du contrat</td></tr>
                        <tr><td className="px-4 py-3">Conservation des documents comptables</td><td className="px-4 py-3">Obligation légale</td></tr>
                        <tr><td className="px-4 py-3">Assistance, sécurité et prévention des incidents</td><td className="px-4 py-3">Exécution du contrat ou intérêt légitime</td></tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Données de vos clients</h3>
                  <p className="mt-4">Lorsqu’un utilisateur professionnel renseigne les données de ses clients, prospects ou contacts dans Onetto, il demeure responsable de leur traitement pour son activité. Onetto agit alors comme sous-traitant, afin d’héberger, organiser et traiter ces données selon les instructions de l’utilisateur et pour fournir le service.</p>
                  <p className="mt-4">Toute personne souhaitant exercer ses droits concernant les données figurant sur une facture ou un devis doit contacter en priorité l’entreprise émettrice du document.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Destinataires et prestataires</h3>
                  <p className="mt-4">Les données sont accessibles uniquement aux personnes habilitées par Onetto et, lorsque cela est nécessaire, à OVHcloud pour l’hébergement, Amazon Web Services (AWS) pour le stockage de documents et fichiers, Brevo pour les e-mails transactionnels, GoCardless et Bridge pour les fonctionnalités de paiement, ainsi qu’à SuperPDP pour la facturation électronique.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Hébergement et transferts</h3>
                  <p className="mt-4">Les données de l’application, notamment les documents de facturation, sont hébergées au sein de l’Union européenne.</p>
                  <p className="mt-4">Certains traitements liés aux paiements peuvent impliquer GoCardless, établi au Royaume-Uni. Ce transfert est encadré par la décision d’adéquation de la Commission européenne applicable au Royaume-Uni.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Durées de conservation</h3>
                  <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
                    <table className="w-full min-w-[520px] text-left text-sm leading-6">
                      <thead className="bg-zinc-50 text-secondary"><tr><th className="px-4 py-3 font-semibold">Catégorie</th><th className="px-4 py-3 font-semibold">Durée</th></tr></thead>
                      <tbody className="divide-y divide-zinc-200">
                        <tr><td className="px-4 py-3">Compte et profil</td><td className="px-4 py-3">Durée du compte, puis jusqu’à 3 ans après la dernière activité ou sa clôture</td></tr>
                        <tr><td className="px-4 py-3">Devis, factures et pièces comptables</td><td className="px-4 py-3">10 ans à compter de la clôture de l’exercice comptable concerné</td></tr>
                        <tr><td className="px-4 py-3">Journaux de sécurité</td><td className="px-4 py-3">6 mois</td></tr>
                        <tr><td className="px-4 py-3">Sauvegardes</td><td className="px-4 py-3">3 mois maximum</td></tr>
                        <tr><td className="px-4 py-3">Demandes d’assistance et demandes RGPD</td><td className="px-4 py-3">3 ans après leur clôture ou leur traitement</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-4">À la clôture d’un compte, l’accès au service est désactivé. Les documents soumis à une obligation comptable ou nécessaires à la défense de droits restent archivés avec un accès strictement limité.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Sécurité</h3>
                  <p className="mt-4">Onetto met en œuvre des mesures techniques et organisationnelles adaptées afin de protéger les données contre la perte, l’accès non autorisé, l’altération ou la divulgation. Ces mesures comprennent notamment le contrôle des accès, la confirmation de l’adresse e-mail, le chiffrement des flux de données et des sauvegardes.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Cookies et traceurs</h3>
                  <p className="mt-4">Onetto utilise uniquement les cookies et traceurs strictement nécessaires à l’authentification, à la sécurité des sessions et au fonctionnement du service.</p>
                  <p className="mt-4">À la date de mise à jour de la présente politique, Onetto n’utilise aucun cookie publicitaire ni outil de mesure d’audience tel que Google Analytics. Si un tel outil est ajouté, cette politique sera mise à jour et le consentement requis sera recueilli avant tout dépôt de traceur non nécessaire.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Vos droits</h3>
                  <p className="mt-4">Vous disposez, dans les conditions prévues par la réglementation, des droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité de vos données. Vous pouvez également définir des directives relatives au sort de vos données après votre décès.</p>
                  <p className="mt-4">Pour exercer vos droits, écrivez à <a className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-hover" href="mailto:contact@onetto.fr">contact@onetto.fr</a> en précisant votre demande. Une réponse vous sera apportée dans un délai maximal d’un mois, sauf complexité particulière. Vous pouvez aussi introduire une réclamation auprès de la <a className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-hover" href="https://www.cnil.fr/fr/plaintes">CNIL</a>.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Modifications</h3>
                  <p className="mt-4">Onetto peut modifier la présente politique afin de tenir compte d’évolutions légales, techniques ou fonctionnelles. La date de dernière mise à jour figurant en tête de page sera alors modifiée.</p>
                </section>
              </div>
            </section>

            <section id="conditions-generales-utilisation" className="mt-20 scroll-mt-8 border-t border-zinc-200 pt-14">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">03</span>
                <p className="font-title text-xs font-bold uppercase tracking-[0.16em] text-primary">Informations légales</p>
              </div>

              <h2 className="mt-5 font-title text-3xl font-semibold tracking-tight text-secondary">Conditions générales d’utilisation</h2>
              <p className="mt-3 text-sm text-zinc-500">Dernière mise à jour : 10 septembre 2026</p>

              <div className="mt-10 space-y-10 text-[15px] leading-7 text-zinc-600 sm:text-base">
                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Objet</h3>
                  <p className="mt-4">Les présentes conditions générales d’utilisation (« CGU ») encadrent l’accès et l’utilisation du site et de l’application Onetto. Elles constituent un contrat entre Onetto et l’utilisateur. La création d’un compte ou l’utilisation du service implique leur acceptation sans réserve.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Utilisateurs autorisés</h3>
                  <p className="mt-4">Le service est exclusivement réservé aux personnes majeures agissant à des fins professionnelles et établies en France.</p>
                  <p className="mt-4">En créant un compte, l’utilisateur déclare agir pour les besoins de son activité professionnelle, disposer de la capacité juridique nécessaire pour utiliser le service, fournir des informations exactes, complètes et à jour, et utiliser une adresse e-mail professionnelle valide.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Création et sécurité du compte</h3>
                  <p className="mt-4">L’accès au service requiert la création d’un compte avec une adresse e-mail et un mot de passe. L’utilisateur doit confirmer son adresse e-mail afin d’activer son compte.</p>
                  <p className="mt-4">L’utilisateur est responsable de la confidentialité de ses identifiants et doit informer sans délai Onetto à l’adresse <a className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-hover" href="mailto:contact@onetto.fr">contact@onetto.fr</a> en cas d’accès non autorisé, de perte ou de compromission de son compte. Un même compte peut permettre la gestion de plusieurs entreprises, dans les limites prévues par la formule d’abonnement souscrite.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Fonctionnalités du service</h3>
                  <p className="mt-4">Onetto propose notamment, selon la formule choisie, la gestion de profils d’entreprise, de clients, de biens et services, la création et l’envoi de devis et factures, la négociation de devis, les liens de paiement en une ou plusieurs échéances, le suivi des paiements, les relances, l’archivage de documents, les tableaux de bord, les prévisions de trésorerie, les notifications et certaines fonctionnalités de facturation électronique.</p>
                  <p className="mt-4">Onetto peut faire évoluer, améliorer, suspendre ou retirer tout ou partie de ces fonctionnalités, notamment pour des raisons techniques, de sécurité, réglementaires ou de maintenance.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Obligations de l’utilisateur</h3>
                  <p className="mt-4">L’utilisateur s’engage à renseigner des données exactes, légales et à jour, à respecter les règles applicables à son activité, à obtenir les autorisations nécessaires pour traiter les données de ses clients et à ne pas utiliser Onetto à des fins frauduleuses, illicites, abusives ou portant atteinte aux droits de tiers.</p>
                  <p className="mt-4">L’utilisateur est seul responsable des informations saisies, des documents émis, des taux de TVA appliqués, des mentions obligatoires, des conditions commerciales conclues avec ses propres clients et du recouvrement de ses créances. Onetto ne fournit aucun conseil juridique, fiscal, comptable ou financier.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Paiements</h3>
                  <p className="mt-4">Onetto met à disposition une interface technique permettant de créer, transmettre et suivre des demandes de paiement. Les paiements sont exécutés par des prestataires tiers, notamment GoCardless ou Bridge, selon les fonctionnalités utilisées. Ces prestataires peuvent exiger la création d’un compte, des vérifications d’identité ou d’entreprise, ainsi que l’acceptation de leurs propres conditions contractuelles.</p>
                  <p className="mt-4">Onetto n’est ni un établissement bancaire ni un prestataire de services de paiement. Onetto ne garantit ni l’acceptation d’un paiement, ni la date de réception des fonds, ni le paiement effectif d’une facture, ni l’absence de rejet, de contestation, de remboursement ou de litige.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Facturation électronique et prestataires tiers</h3>
                  <p className="mt-4">Certaines fonctionnalités d’Onetto reposent sur des prestataires tiers, notamment pour le paiement, l’envoi d’e-mails, le stockage de documents ou la facturation électronique. Onetto s’efforce de sélectionner des prestataires fiables, mais ne peut être tenu responsable des indisponibilités, erreurs, retards, décisions de conformité ou modifications de leurs services lorsqu’ils échappent à son contrôle raisonnable.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Disponibilité et maintenance</h3>
                  <p className="mt-4">Onetto s’efforce d’assurer l’accès au service dans des conditions normales de fonctionnement. Le service peut toutefois être temporairement indisponible, notamment en cas de maintenance, d’évolution technique, de faille de sécurité, d’incident réseau ou de force majeure. Aucune disponibilité continue ou sans erreur n’est garantie.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Suspension et fermeture du compte</h3>
                  <p className="mt-4">Onetto peut suspendre ou fermer un compte, avec ou sans préavis selon la gravité de la situation, notamment en cas d’informations fausses, incomplètes ou frauduleuses, d’utilisation illicite, de tentative d’atteinte à la sécurité, de violation des droits d’un tiers, d’impayé, d’obligation légale ou de demande d’une autorité compétente.</p>
                  <p className="mt-4">Sauf urgence, risque de sécurité, obligation légale ou manquement grave, Onetto informe l’utilisateur du motif de la suspension ou de la fermeture. L’utilisateur peut demander la clôture de son compte à <a className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-hover" href="mailto:contact@onetto.fr">contact@onetto.fr</a>. La clôture désactive l’accès au service, sans entraîner l’effacement immédiat des documents devant être conservés en raison d’obligations légales.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Données et export</h3>
                  <p className="mt-4">L’utilisateur reste propriétaire des données et documents qu’il renseigne dans Onetto. Sous réserve des fonctionnalités disponibles et des obligations légales de conservation, l’utilisateur peut demander l’accès à ses données ou leur export en écrivant à <a className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-hover" href="mailto:contact@onetto.fr">contact@onetto.fr</a>.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Propriété intellectuelle</h3>
                  <p className="mt-4">L’ensemble des éléments composant Onetto est protégé par les droits de propriété intellectuelle. L’utilisateur bénéficie d’un droit personnel, limité, non exclusif et non transférable d’utilisation du service pendant la durée de son accès. Toute reproduction, adaptation, commercialisation, cession, location, décompilation ou exploitation non autorisée est interdite.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Responsabilité</h3>
                  <p className="mt-4">Onetto est tenu à une obligation de moyens dans la fourniture du service. Dans les limites autorisées par la loi, Onetto ne pourra être tenu responsable des dommages indirects, tels qu’une perte de chiffre d’affaires, une perte d’opportunité, un préjudice commercial, une perte de données imputable à l’utilisateur ou les conséquences d’un impayé d’un client de l’utilisateur.</p>
                  <p className="mt-4">La responsabilité totale d’Onetto, toutes causes confondues, est limitée au montant effectivement payé par l’utilisateur au titre du service au cours des douze derniers mois précédant le fait générateur du dommage. Cette limitation ne s’applique pas lorsqu’elle est interdite par la loi.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Modification des CGU</h3>
                  <p className="mt-4">Onetto peut modifier les présentes CGU pour tenir compte d’évolutions techniques, fonctionnelles, légales ou réglementaires. En cas de modification substantielle, l’utilisateur sera informé au moins 30 jours avant son entrée en vigueur, sauf obligation légale, urgence de sécurité ou nécessité de prévenir un risque ou un abus.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Droit applicable et litiges</h3>
                  <p className="mt-4">Les présentes CGU sont soumises au droit français. En cas de litige, les parties s’efforcent de rechercher une solution amiable. À défaut d’accord, le litige relève des juridictions compétentes du ressort du domicile professionnel de Jonathan ASSI, sous réserve des règles impératives applicables.</p>
                </section>
              </div>
            </section>

            <section id="conditions-generales-vente" className="mt-20 scroll-mt-8 border-t border-zinc-200 pt-14">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">04</span>
                <p className="font-title text-xs font-bold uppercase tracking-[0.16em] text-primary">Informations légales</p>
              </div>

              <h2 className="mt-5 font-title text-3xl font-semibold tracking-tight text-secondary">Conditions générales de vente</h2>
              <p className="mt-3 text-sm text-zinc-500">Dernière mise à jour : 10 septembre 2026</p>

              <div className="mt-10 space-y-10 text-[15px] leading-7 text-zinc-600 sm:text-base">
                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Objet et champ d’application</h3>
                  <p className="mt-4">Les présentes conditions générales de vente (« CGV ») régissent la souscription aux formules payantes d’Onetto par des utilisateurs professionnels établis en France. Elles complètent les Conditions générales d’utilisation, qui demeurent applicables à l’utilisation du service.</p>
                  <p className="mt-4">Onetto est édité par Jonathan ASSI, entrepreneur individuel exerçant sous le régime de la micro-entreprise, dont les coordonnées figurent dans les Mentions légales.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Formules et tarifs</h3>
                  <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
                    <table className="w-full min-w-[520px] text-left text-sm leading-6">
                      <thead className="bg-zinc-50 text-secondary"><tr><th className="px-4 py-3 font-semibold">Formule</th><th className="px-4 py-3 font-semibold">Facturation mensuelle</th><th className="px-4 py-3 font-semibold">Facturation annuelle</th></tr></thead>
                      <tbody className="divide-y divide-zinc-200">
                        <tr><td className="px-4 py-3 font-medium text-secondary">Free</td><td className="px-4 py-3">0,00 €</td><td className="px-4 py-3">0,00 €</td></tr>
                        <tr><td className="px-4 py-3 font-medium text-secondary">Starter</td><td className="px-4 py-3">7,00 € par mois</td><td className="px-4 py-3">84,00 € par an</td></tr>
                        <tr><td className="px-4 py-3 font-medium text-secondary">Pro</td><td className="px-4 py-3">13,00 € par mois</td><td className="px-4 py-3">156,00 € par an</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-4">Les prix sont exprimés en euros. TVA non applicable, art. 293 B du CGI. Les fonctionnalités incluses dans chaque formule sont présentées au moment de la souscription et peuvent évoluer conformément aux CGU.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Souscription et renouvellement</h3>
                  <p className="mt-4">La souscription à une formule payante est effectuée en ligne via Stripe. Le prix est dû immédiatement à la souscription, puis est prélevé à chaque date anniversaire mensuelle ou annuelle, selon la périodicité choisie.</p>
                  <p className="mt-4">Les abonnements sont souscrits sans engagement et sans durée minimale. Ils se renouvellent tacitement à chaque échéance jusqu’à leur résiliation par l’utilisateur.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Moyens de paiement</h3>
                  <p className="mt-4">Le paiement des abonnements est sécurisé et traité par Stripe. Les moyens de paiement proposés dépendent de la disponibilité de Stripe au moment de la souscription et de la configuration applicable à l’utilisateur.</p>
                  <p className="mt-4">Onetto ne conserve aucune donnée de carte bancaire. L’utilisateur garantit disposer des autorisations nécessaires pour utiliser le moyen de paiement présenté.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Frais liés aux liens de paiement</h3>
                  <p className="mt-4">La création de devis et de factures est disponible sans frais de commission prélevés par Onetto. Lorsqu’un utilisateur crée un lien de paiement via GoCardless, les frais applicables sont ceux prévus par l’offre ou le contrat conclu entre l’utilisateur et GoCardless.</p>
                  <p className="mt-4">Onetto ne prélève aucune commission sur les factures réglées au moyen de ces liens de paiement. L’utilisateur est invité à prendre connaissance des conditions tarifaires de GoCardless avant d’utiliser cette fonctionnalité.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Échec de paiement</h3>
                  <p className="mt-4">En cas d’échec de paiement, l’utilisateur est invité à régulariser sa situation auprès de Stripe. Onetto pourra limiter ou suspendre l’accès aux fonctionnalités payantes tant que le paiement n’a pas été régularisé, après information de l’utilisateur dans la mesure du possible.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Changement de formule et résiliation</h3>
                  <p className="mt-4">L’utilisateur peut demander un changement de formule ou la résiliation de son abonnement à tout moment. Sauf indication contraire lors de la demande, la résiliation prend effet à la fin de la période déjà réglée ; l’accès aux fonctionnalités de la formule concernée est maintenu jusqu’à cette date.</p>
                  <p className="mt-4">En cas de passage vers une formule inférieure, les fonctionnalités ou capacités non incluses dans la nouvelle formule peuvent devenir indisponibles à la prochaine échéance.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Remboursements</h3>
                  <p className="mt-4">Les sommes réglées ne sont pas remboursables, y compris en cas de résiliation avant la fin de la période en cours, sauf obligation légale ou erreur directement imputable à Onetto.</p>
                  <p className="mt-4">Toute demande exceptionnelle de remboursement doit être adressée à <a className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-hover" href="mailto:contact@onetto.fr">contact@onetto.fr</a>. Son acceptation relève de l’appréciation d’Onetto au regard des circonstances de la demande.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Offres promotionnelles</h3>
                  <p className="mt-4">Onetto peut proposer ponctuellement des réductions, codes promotionnels ou offres particulières. Sauf mention contraire, ces offres ne sont pas cumulables, sont limitées dans le temps et ne peuvent pas être échangées contre une somme d’argent.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Modification des prix et des CGV</h3>
                  <p className="mt-4">Onetto peut modifier ses prix ou les présentes CGV. Toute modification substantielle sera communiquée à l’utilisateur au moins 30 jours avant son entrée en vigueur, sauf obligation légale, urgence de sécurité ou nécessité de prévenir un risque ou un abus.</p>
                  <p className="mt-4">Les nouveaux tarifs ne s’appliquent pas aux périodes déjà réglées. L’utilisateur peut résilier son abonnement avant l’entrée en vigueur de la modification.</p>
                </section>

                <section>
                  <h3 className="font-title text-lg font-semibold text-secondary">Droit applicable et litiges</h3>
                  <p className="mt-4">Les présentes CGV sont soumises au droit français. En cas de litige, les parties s’efforcent de rechercher une solution amiable. À défaut d’accord, le litige relève des juridictions compétentes du ressort du domicile professionnel de Jonathan ASSI, sous réserve des règles impératives applicables.</p>
                </section>
              </div>
            </section>
          </article>
        </div>
      </div>
    </main>
  );
}
