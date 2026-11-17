import AuthShell from "../AuthShell";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <AuthShell
      appearance="modern"
      title="Connexion"
      subtitle="Ravi de vous revoir. Connectez-vous pour retrouver votre espace de gestion."
    >
      <LoginForm />
    </AuthShell>
  );
}
