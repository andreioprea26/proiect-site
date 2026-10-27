# Client Delivery Package — 10B.3

Versiune 1, 2026-10-12. Pachet pentru un magazin din România, în română, RON,
Europe/Bucharest; fiecare client are repository, date și infrastructură separate.
Documentația permite pregătirea și predarea Test/Preview. Nu certifică automat
un client instalat și nu autorizează lansarea Production.

## Ordinea utilizării

| Etapă | Document | Cine îl folosește | Rezultat cerut |
| --- | --- | --- | --- |
| Colectare | [Onboarding final](../client-onboarding-checklist.md) | Client + coordonator | Materiale obligatorii și decizii acceptate |
| Instalare Test/Preview | [Ghid instalator](internal/installer-guide.md) | Operator tehnic | Repo propriu, țintă autorizată, instalare verificată |
| Configurare și training | [Ghid administrator](client/admin-guide.md) | Client | Administratorul operează fluxurile existente |
| Acceptanță | [Predare și mentenanță](client/handover-maintenance.md) | Client + operator | Probe acceptate, ownership și responsabilități clare |
| Evidență | [Fișa clientului](internal/client-record-template.md) | Coordonator | Release, target-uri, dovezi, aprobări și limite |
| Lansare ulterioară | [Production și launch checklist](internal/production-launch.md) | Owner + operator | Gate-uri închise și aprobări separate înainte de execuție |
| Review pachet | [Audit 10B.3](internal/package-audit.md) | Reviewer | Acoperire, verificări și probleme documentate |

`client/` conține materialele de predat administratorului. `internal/` conține
proceduri tehnice și evidențe fără secrete; clientul poate primi copia completată
și sanitizată a fișei. Placeholderele `[CLIENT]`, `[OWNER]`, `[RELEASE_SHA]`,
`[TEST_REF]`, `[PRODUCTION_REF]`, `[PREVIEW_ORIGIN]`, `[DOMAIN]` și `[DATE]`
se înlocuiesc pentru fiecare client. O bifă goală ori un placeholder necompletat
într-o poartă obligatorie înseamnă PENDING/BLOCKED, niciodată PASS implicit.

## Documente reutilizate

Instalarea folosește [clean install](../clean-install-guide.md),
[preflight](../preflight.md), [autorizarea standalone](../standalone-target-authorization.md)
și [runner-ul oficial](../client-install-runner.md); acestea sunt sursa comenzilor
și a gate-urilor, nu se înlocuiesc prin SQL/CLI improvizat.
[Stripe Test](../stripe-test-mode.md), [Resend](../resend-development.md),
[branding 10B.2c](../10b2c-theme-brand-assets.md) și
[constatările de instalare](../10b2d-installation-findings.md) completează ghidul.
[Productization plan](../productization-plan.md) și
[Project Bible v0.4](../project-bible-v0.4.md) păstrează contextul; intențiile din
Bible nu sunt dovadă de funcții implementate.

[Checklist-ul Fazei 9](../production-launch-checklist.md) rămâne evidență istorică
nemodificată. Pentru un client nou se folosește procedura Production din acest
pachet, care include blocajul actual Stripe Live. Nu reutiliza URL-uri, ref-uri,
secrete, date sau aprobări istorice.

## Limite care trebuie comunicate înainte de acceptanță

Stripe funcționează exclusiv Sandbox. E2E complet pe un ref client arbitrar are
blocaj în guard-urile/fixture-urile actuale; vezi [audit](internal/package-audit.md).
Nu există administrare UI a metodelor/tarifelor de livrare, integrare automată
curier/locker, facturare/e-Factura, motor fiscal, campanii newsletter, upload privat
de referințe sau management UI al rolurilor. Acestea cer decizii/task-uri separate.
Predarea unui Preview pentru evaluare poate fi acceptată cu limite explicite;
certificarea tehnică completă și lansarea rămân blocate până la închiderea gate-urilor.
