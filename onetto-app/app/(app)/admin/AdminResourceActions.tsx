"use client";

import AdminRowActions from "./AdminRowActions";
import { useAuthUser } from "@/app/components/context/AuthUserContext";

export function AdminUserRowActions({
  user,
}: {
  user: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    appUserRole: "SUPERADMIN" | "ADMIN" | "USER";
    bannedAt: string | null;
    closedAt?: string | null;
  };
}) {
  const { user: viewer } = useAuthUser();
  const name = `${user.firstname} ${user.lastname}`;
  const endpoint = `api/admin/users/${user.id}`;
  const canManage =
    user.appUserRole === "USER" ||
    viewer?.appUserRole === "SUPERADMIN" ||
    viewer?.id === user.id;
  const canBan =
    user.appUserRole === "USER" ||
    (user.appUserRole === "ADMIN" && viewer?.appUserRole === "SUPERADMIN");
  return (
    <AdminRowActions
      edit={
        user.closedAt || !canManage
          ? undefined
          : {
              title: `Modifier ${name}`,
              endpoint,
              successMessage: "Utilisateur modifié.",
              fields: [
                {
                  name: "firstname",
                  label: "Prénom",
                  value: user.firstname,
                  required: true,
                },
                {
                  name: "lastname",
                  label: "Nom",
                  value: user.lastname,
                  required: true,
                },
                {
                  name: "email",
                  label: "E-mail",
                  value: user.email,
                  type: "email",
                  required: true,
                },
              ],
            }
      }
      danger={
        !canBan || user.bannedAt || user.closedAt
          ? undefined
          : {
              title: `Désactiver ${name}`,
              description: `Le compte de ${name} sera banni. Ses sessions existantes ne pourront plus être utilisées. Le compte et ses données seront conservés.`,
              endpoint: `${endpoint}/ban`,
              method: "PATCH",
              confirmationWord: "DESACTIVER",
              successMessage: "Utilisateur désactivé.",
            }
      }
      restore={
        user.bannedAt && canBan && !user.closedAt
          ? {
              title: `Réactiver ${name}`,
              description: `Le compte de ${name} pourra de nouveau accéder à Onetto.`,
              endpoint: `${endpoint}/ban`,
              method: "DELETE",
              confirmationWord: "REACTIVER",
              successMessage: "Utilisateur réactivé.",
            }
          : undefined
      }
    />
  );
}

export function AdminCompanyRowActions({
  company,
}: {
  company: {
    id: string;
    name: string;
    email?: string;
    status: string;
    closedByAccountClosureAt?: string | null;
  };
}) {
  const endpoint = `api/admin/companies/${company.id}`;
  return (
    <AdminRowActions
      edit={
        company.closedByAccountClosureAt
          ? undefined
          : {
              title: `Modifier ${company.name}`,
              endpoint,
              successMessage: "Entreprise modifiée.",
              fields: [
                {
                  name: "name",
                  label: "Nom",
                  value: company.name,
                  required: true,
                },
                ...(company.email
                  ? [
                      {
                        name: "email",
                        label: "E-mail",
                        value: company.email,
                        type: "email" as const,
                        required: true,
                      },
                    ]
                  : []),
              ],
            }
      }
      danger={
        company.status === "ACTIVE"
          ? {
              title: `Fermer ${company.name}`,
              description: `L’espace de ${company.name} sera fermé. Les collaborateurs perdront leur accès opérationnel. Les factures et historiques seront conservés.`,
              endpoint,
              method: "PATCH",
              body: { status: "CLOSED" },
              confirmationWord: "FERMER",
              successMessage: "Entreprise fermée.",
            }
          : undefined
      }
      restore={
        company.status === "CLOSED" && !company.closedByAccountClosureAt
          ? {
              title: `Réouvrir ${company.name}`,
              description: `L’espace de ${company.name} sera de nouveau accessible.`,
              endpoint,
              method: "PATCH",
              body: { status: "ACTIVE" },
              confirmationWord: "REOUVRIR",
              successMessage: "Entreprise réouverte.",
            }
          : undefined
      }
    />
  );
}

export function AdminServiceRowActions({
  service,
}: {
  service: {
    id: string;
    name: string;
    description: string;
    category: string;
    unitPrice: number;
    unit: string;
    taxRate: number | null;
    company: { status: string };
  };
}) {
  if (service.company.status !== "ACTIVE") return null;
  const endpoint = `api/admin/services/${service.id}`;
  return (
    <AdminRowActions
      edit={{
        title: `Modifier ${service.name}`,
        endpoint,
        successMessage: "Prestation modifiée.",
        fields: [
          { name: "name", label: "Nom", value: service.name, required: true },
          {
            name: "description",
            label: "Description",
            value: service.description,
          },
          {
            name: "category",
            label: "Catégorie",
            value: service.category,
            required: true,
          },
          {
            name: "unitPrice",
            label: "Prix unitaire",
            value: service.unitPrice,
            type: "number",
            required: true,
          },
          { name: "unit", label: "Unité", value: service.unit, required: true },
          {
            name: "taxRate",
            label: "TVA (%)",
            value: service.taxRate ?? 0,
            type: "number",
          },
        ],
      }}
      danger={{
        title: `Supprimer ${service.name}`,
        description: `La prestation « ${service.name} » sera retirée du catalogue. Cette suppression ne modifie pas les documents déjà émis.`,
        endpoint,
        method: "DELETE",
        confirmationWord: "SUPPRIMER",
        successMessage: "Prestation supprimée.",
      }}
    />
  );
}

export function AdminSubscriptionRowActions({
  subscription,
}: {
  subscription: {
    userId: string;
    subscriptionPlan: string;
    isActive: boolean;
    pendingSubscriptionPlan: string | null;
    user: {
      firstname: string;
      lastname: string;
      closedAt?: string | null;
      appUserRole: "SUPERADMIN" | "ADMIN" | "USER";
    };
  };
}) {
  const { user: viewer } = useAuthUser();
  const endpoint = `api/admin/users/${subscription.userId}/subscription`;
  const name = `${subscription.user.firstname} ${subscription.user.lastname}`;
  const canManage =
    subscription.user.appUserRole === "USER" ||
    viewer?.appUserRole === "SUPERADMIN" ||
    viewer?.id === subscription.userId;
  return (
    <AdminRowActions
      edit={
        !canManage ||
        subscription.user.closedAt ||
        subscription.pendingSubscriptionPlan
          ? undefined
          : {
              title: `Modifier l’abonnement de ${name}`,
              description:
                "Un changement d’offre peut être immédiat ou programmé et peut déclencher un paiement Stripe. Vérifiez l’offre avant de confirmer.",
              endpoint,
              successMessage: "Demande de changement d’offre enregistrée.",
              fields: [
                {
                  name: "subscriptionPlan",
                  label: "Offre",
                  value: subscription.subscriptionPlan,
                  options: [
                    { value: "FREE", label: "Gratuit" },
                    { value: "STARTER_MONTHLY", label: "Starter mensuel" },
                    { value: "STARTER_YEARLY", label: "Starter annuel" },
                    { value: "PRO_MONTHLY", label: "Pro mensuel" },
                    { value: "PRO_YEARLY", label: "Pro annuel" },
                  ],
                },
              ],
            }
      }
      danger={
        !canManage || subscription.user.closedAt
          ? undefined
          : subscription.pendingSubscriptionPlan
            ? {
                title: `Annuler le changement programmé pour ${name}`,
                description:
                  "Le changement d’offre programmé sera annulé. L’abonnement actuel sera conservé.",
                endpoint: `${endpoint}/pending`,
                method: "DELETE",
                confirmationWord: "ANNULER",
                successMessage: "Changement programmé annulé.",
              }
            : subscription.isActive && subscription.subscriptionPlan !== "FREE"
              ? {
                  title: `Arrêter l’abonnement de ${name}`,
                  description:
                    "La résiliation sera demandée selon la période déjà payée. L’historique de facturation sera conservé.",
                  endpoint,
                  method: "PATCH",
                  body: { subscriptionPlan: "FREE" },
                  confirmationWord: "ARRETER",
                  successMessage:
                    "Demande d’arrêt de l’abonnement enregistrée.",
                }
              : undefined
      }
    />
  );
}

export function AdminCollaboratorRowActions({
  collaborator,
  active = true,
}: {
  collaborator: {
    id: string;
    role: string;
    user: { firstname: string; lastname: string };
  };
  active?: boolean;
}) {
  if (!active) return null;
  const name = `${collaborator.user.firstname} ${collaborator.user.lastname}`;
  const endpoint = `api/admin/collaborators/${collaborator.id}`;
  return (
    <AdminRowActions
      edit={{
        title: `Modifier le rôle de ${name}`,
        endpoint,
        successMessage: "Rôle du collaborateur modifié.",
        fields: [
          {
            name: "role",
            label: "Rôle",
            value: collaborator.role,
            options: [
              { value: "ADMIN", label: "Administrateur" },
              { value: "ACCOUNTANT", label: "Comptable" },
              { value: "EMPLOYEE", label: "Employé" },
            ],
          },
        ],
      }}
      danger={{
        title: `Retirer ${name}`,
        description: `${name} perdra l’accès à cette entreprise. Les données métier seront conservées.`,
        endpoint,
        method: "DELETE",
        confirmationWord: "RETIRER",
        successMessage: "Collaborateur retiré.",
      }}
    />
  );
}
