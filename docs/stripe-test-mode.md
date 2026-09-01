# Stripe Checkout — configurare test mode

Integrarea din Blocul 6B acceptă exclusiv o cheie secretă `sk_test_...` și
Checkout Sessions `cs_test_...`. Nu este necesară o cheie publishable deoarece
clientul este redirecționat către pagina Stripe-hosted folosind URL-ul Session.

## Dezvoltare locală

Adaugă numai în `.env.local`, fără commit:

```text
SUPABASE_SERVICE_ROLE_KEY=<Development service_role key>
STRIPE_SECRET_KEY=<Stripe test secret key>
STRIPE_WEBHOOK_SECRET=<Stripe test webhook signing secret>
```

`APP_URL` trebuie să indice origin-ul aplicației. Pentru dezvoltare locală este
`http://localhost:3000`.

Webhook endpoint:

```text
POST /api/stripe/webhook
```

Evenimente abonate:

- `checkout.session.completed`
- `checkout.session.expired`

Secretul webhook trebuie să corespundă exact endpoint-ului care livrează
evenimentele. Nu copia cheia `service_role`, cheia Stripe sau webhook secretul
în variabile `NEXT_PUBLIC_*` și nu le afișa în loguri.

## Vercel Preview

Configurează următoarele variabile numai pentru mediul **Preview**:

- `APP_URL` — URL-ul HTTPS al deployment-ului Preview;
- `NEXT_PUBLIC_SUPABASE_URL` — proiectul Supabase Development/Test;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — cheia publishable Development;
- `SUPABASE_SERVICE_ROLE_KEY` — cheia server-only Development;
- `STRIPE_SECRET_KEY` — cheia Stripe test mode;
- `STRIPE_WEBHOOK_SECRET` — signing secret-ul endpoint-ului Stripe test.

În Stripe Dashboard, cu **Test mode** activ, endpoint-ul trebuie să fie:

```text
https://<vercel-preview>/api/stripe/webhook
```

Nu configura endpoint-ul către domeniul Production real. Dacă URL-ul Preview
se schimbă, actualizează endpoint-ul Stripe test și `APP_URL`, apoi folosește
noul signing secret emis pentru acel endpoint.

## Durate și sursa adevărului

- Stripe Checkout Session: 30 minute;
- rezervare internă inițială: 35 minute;
- după atașarea Session: minimum `session.expires_at + 5 minute`.

Success URL nu confirmă plata. Numai webhook-ul semnat poate apela tranzacția
DB care marchează plata/comanda paid și consumă rezervarea. Cancel URL nu
schimbă starea plății și nu eliberează rezervarea.

## Verificare manuală test mode

1. Pornește aplicația cu variabilele locale configurate.
2. Creează o comandă card și confirmă redirect-ul către Stripe-hosted Checkout.
3. Plătește numai cu datele de test documentate de Stripe.
4. Confirmă în DB: payment `paid`, order `paid`, reservation `consumed`, o
   singură scădere de inventar și un singur inventory movement.
5. Repetă livrarea aceluiași event și confirmă absența efectelor duplicate.
6. Pentru abandon/expiry, lasă Session să expire și confirmă payment `expired`,
   order `cancelled`, reservation `expired` și inventar fizic neschimbat.

