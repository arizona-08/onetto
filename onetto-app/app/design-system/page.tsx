import { notFound } from "next/navigation";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field, Input, Select, Separator, Textarea } from "../components/ui/Field";

export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className="min-h-dvh bg-ui-background px-4 py-12 text-ui-text sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Design System Onetto</h1>
          <p className="mt-2 text-ui-secondary">Catalogue de composants, disponible en développement uniquement.</p>
        </header>

        <Card>
          <h2 className="text-lg font-semibold">Actions</h2>
          <Separator className="my-4" />
          <div className="flex flex-wrap gap-3">
            <Button>Action principale</Button>
            <Button variant="secondary">Action secondaire</Button>
            <Button variant="ghost">Action discrète</Button>
            <Button variant="danger">Action destructive</Button>
            <Button loading>Chargement</Button>
            <Button disabled>Indisponible</Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">États</h2>
          <Separator className="my-4" />
          <div className="flex flex-wrap gap-2">
            <Badge>Neutre</Badge>
            <Badge tone="primary">Sélectionné</Badge>
            <Badge tone="success">Succès</Badge>
            <Badge tone="warning">En attente</Badge>
            <Badge tone="danger">Erreur</Badge>
            <Badge tone="info">Information</Badge>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Champs</h2>
          <Separator className="my-4" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="sample-text" label="Libellé" hint="Texte d’aide associé au champ">
              <Input id="sample-text" aria-describedby="sample-text-hint" placeholder="Saisir une valeur" />
            </Field>
            <Field id="sample-select" label="Choix">
              <Select id="sample-select" defaultValue="one">
                <option value="one">Première option</option>
                <option value="two">Deuxième option</option>
              </Select>
            </Field>
            <Field id="sample-error" label="Erreur" error="Vérifiez cette valeur.">
              <Input id="sample-error" aria-invalid="true" aria-describedby="sample-error-error" />
            </Field>
            <Field id="sample-textarea" label="Description">
              <Textarea id="sample-textarea" rows={2} />
            </Field>
          </div>
        </Card>
      </div>
    </main>
  );
}
