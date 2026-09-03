# Resend în Development

Emailurile operaționale folosesc SDK-ul oficial Resend și sunt trimise numai
din cod server-side. Cheile și adresele reale se configurează exclusiv în
`.env.local` sau în secret managerul platformei; `.env.example` conține doar
placeholdere.

## Configurare sigură

Variabile necesare:

- `RESEND_API_KEY`;
- `RESEND_FROM_EMAIL`;
- `RESEND_REPLY_TO_EMAIL`;
- `EMAIL_DELIVERY_MODE=redirect`;
- `EMAIL_TEST_RECIPIENT`.

În Development se păstrează modul `redirect`: destinatarul real rămâne în
jurnalul notificării, dar mesajul este livrat numai către
`EMAIL_TEST_RECIPIENT`. Modul live este acceptat doar când
`EMAIL_DELIVERY_MODE=live` și `VERCEL_ENV=production` sunt setate explicit.

Pentru primul test real se poate folosi expeditorul de test permis de Resend.
Un domeniu propriu și modul live se activează abia după verificarea manuală a
conținutului, linkurilor și destinatarului redirecționat. Nu sunt necesare
add-on-uri sau servicii plătite pentru checkpoint-ul Fazei 7.

## Verificare

1. Completează variabilele doar local, fără commit.
2. Plasează o comandă de test și confirmă că mesajul ajunge exclusiv la
   destinatarul de test.
3. Verifică în admin destinatarul original, starea, provider ID-ul și tentativa.
4. Simulează un eșec și folosește retry; aceeași tentativă nu trebuie trimisă de
   două ori la dublu click.
5. Păstrează modul `redirect` până la aprobarea separată pentru Production.
