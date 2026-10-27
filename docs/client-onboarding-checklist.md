# Client onboarding — checklist final 10B.3

Versiune 1, 2026-10-12. Client `[CLIENT]`, owner `[OWNER]`, coordonator
`[RESPONSABIL]`. Index: [Client Delivery Package](client-delivery/README.md).
Bifele consemnează materiale și aprobări, nu autorizează automat resurse sau Live.

## Obligatoriu de la client

- [ ] Identitate business: denumire juridică, formă juridică, CUI/înregistrare
  aplicabile, sediu/adresă comercială, responsabil și date de facturare.
  Clientul/contabilul aprobă corectitudinea și fiscalitatea.
- [ ] Brand: nume, descriere, ton, culori preferate, logo cu drepturi de utilizare
  sau acceptarea identității textuale fără logo grafic.
- [ ] Catalog: nume, identificatori, descrieri, fotografii cu drepturi, categorii,
  tip standard/unicat/la comandă, disponibilitate și termen per produs.
- [ ] Variante: titlu/atribute, preț propriu sau de bază, stoc separat; confirmare
  dacă nu există. SKU opțional. Personalizări: tip, valori, limite, obligatoriu,
  cost suplimentar, proces verificare; confirmare dacă nu se folosesc.
- [ ] Prețuri finale RON, taxe/prezentare aprobate cu contabilul, stoc fizic și
  praguri. Template-ul nu furnizează motor fiscal, facturare sau e-Factura.
- [ ] Livrare: arie RO, curier, tarife, timpi, adresă retur, reguli COD și excepții.
  Metodele sunt setup tehnic separat; locker, prag gratuit și curier automat
  nu se promit ca funcții existente.
- [ ] Plăți dorite COD/card, reguli personalizări/avans, responsabil reconciliere
  și refund. Stripe actual este Sandbox; Live necesită implementare separată.
- [ ] Contact public aprobat: email, canal suport și program comunicat în conținut;
  telefon când este necesar pentru business.
- [ ] Domeniu dorit/existent, titular, registrar și responsabil DNS. Preview
  poate începe fără domeniu final; lansarea nu.
- [ ] Materiale Despre/Contact/FAQ/livrare-retur/termeni/confidențialitate/cookies
  după evaluare. Date comerciale complete. Clientul sau specialistul verifică
  și aprobă textele; pachetul nu este certificare juridică automată.
- [ ] Responsabil date personale, retenție, acces/corectare/ștergere, newsletter
  și consimțământ; furnizori și practici validate de client/specialist.
- [ ] Invitații individuale GitHub/Vercel/Supabase/Stripe/Resend/registrar-DNS,
  ownership client și acces minim cu expirare/revocare. Costurile/planurile
  și crearea resurselor se aprobă înainte de execuție.
- [ ] Destinatar QA, persoană training/acceptanță, responsabil după predare.

Nu solicita parole, chei private, tokenuri, date card sau MFA în documente,
email/chat nesecurizat ori capturi. Owner-ul introduce propria parolă. Secretele
se transferă/injectează prin secret manager sau canal securizat convenit;
fișa consemnează numai nume variabilă, mediu, responsabil și confirmarea configurării.

## Opțional — decide înainte de includere

- [ ] Logo grafic, favicon, OG și fotografii suplimentare; paletă evergreen/plum/
  terracotta sau design separat. Assets și paleta sunt versionate de developer.
- [ ] Tagline, SEO/footer, WhatsApp, telefon suplimentar, Instagram/Facebook/TikTok
  HTTPS validate, administrate prin Store Settings.
- [ ] Colecții sezoniere, texte Hero/Banner promoțional, ordinea homepage.
- [ ] Catalog demo fictiv numai Test, aprobat în manifest și înainte de users.
- [ ] Administratori suplimentari, detalii FAQ și materiale de training proprii.
- [ ] Newsletter numai colectare; campaniile/servicii noi cer task separat.
  Upload privat de referințe nu este flux complet disponibil.

## Gate-uri de implementare și acceptanță

- [ ] [Fișa clientului](client-delivery/internal/client-record-template.md): release,
  repo, medii, ref-uri, accesuri și aprobări fără secrete.
- [ ] [Ghid instalator](client-delivery/internal/installer-guide.md): operator curat,
  manifest extern, autorizare standalone, runner guarded, seed înainte de bootstrap
  dacă aprobat, fără dump original sau credențiale copiate.
- [ ] Preview/Auth/SMTP/webhook separat autorizate, Supabase Test client, Stripe
  Sandbox, email redirect; livrarea Auth și cea operațională verificate distinct.
- [ ] [Training administrator](client-delivery/client/admin-guide.md): catalog,
  stoc, comenzi, COD, tracking, refund și conținut exersate în Test.
- [ ] [Acceptanță și predare](client-delivery/client/handover-maintenance.md):
  dovezi exacte, SHA/țintă/limite. E2E generic actual este BLOCKED, nu skip acceptat.
- [ ] Brand/copy/fallback-uri/catalog aprobate; fiecare pagină legală necesară
  accesibilă. Footer-ul afișează maximum șase pagini publicate.
- [ ] [Launch checklist](client-delivery/internal/production-launch.md) separat;
  niciun PASS Preview nu autorizează Production sau tranzacții reale.
- [ ] Ownership, revocare, documente și responsabilități acceptate.

Se reutilizează [preflight](preflight.md), [runner](client-install-runner.md),
[branding](10b2c-theme-brand-assets.md) și [findings](10b2d-installation-findings.md).
Nu se stabilesc prețuri, SLA-uri sau obligații comerciale prin acest document.
