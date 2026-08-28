function PaymentCallbackPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 p-6">
      <section className="max-w-md rounded-2xl border border-zinc-200 bg-white p-7 text-center">
        <h1 className="font-title text-xl font-semibold text-zinc-900">Paiement en cours de confirmation</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Si votre paiement a abouti, vous recevrez prochainement un email de confirmation.
        </p>
      </section>
    </main>
  )
}

export default PaymentCallbackPage
