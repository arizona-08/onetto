import { Suspense } from "react";
import AuthShell from "../AuthShell";
import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <AuthShell
        appearance="modern"
        title="Créer un compte"
        subtitle="Commencez à organiser vos factures, vos clients et votre catalogue de services."
      >
        <RegisterForm />
      </AuthShell>
    </Suspense>
  );
}
