# Clean install pentru un client nou

Workflow Test/Preview: repo nou → preflight → Supabase gol confirmat → migrations
→ bootstrap → demo opțional → Preview → teste.
Excepție de ordine obligatorie: catalogul demo se introduce înainte de users;
seed-ul refuză o bază cu utilizatori/comenzi. Nu reseta baza pentru a ocoli guard-ul.

1. Selectează release revizuit cu supabase/migration-manifest.json și cele 29 SQL,
   inclusiv 20260918150000_explicit_runtime_table_grants.sql.
2. Repo client separat din surse tracked. Checkout operator fără env/config/cache/
   dependențe copiate, numai origin client. Workspace separat pentru npm ci/build/E2E.
3. Resurse Test separate, aprobare owner/costuri; fără dump/clonă DB sau chei originale.
   Gate-ul verifică un proiect existent: crearea inițială are aprobarea umană separată.
4. Pregătește manifest extern și env conform [preflight](preflight.md).
   `node scripts/preflight.mjs empty` confirmă online proiectul, cheile și lipsa
   istoricului/datei de aplicație. Orice exit nonzero oprește instalarea.
5. Aplică migrațiile exacte în ordine cu CLI aprobat, dry-run și ref explicit,
   fără link-ul workspace-ului original. Preflight nu face acest write.
   Eșec parțial = STOP/investigare; fără reset/repair sau relaxarea manifestului.
6. `node scripts/preflight.mjs migrated` confirmă istoricul complet. Rulează SQL
   security în transaction/rollback. Niciun grant manual de onboarding.
7. Dacă se dorește demo: allowDemoSeed=true, dry-run apoi apply conform ghidului;
   numai date fictive. Apoi bootstrap conturi/admin prin procedura aprobată, fără
   copiere conturi demo/originale. Provisioner-ul istoric demo nu este pentru client.
8. Rerulează migrated înainte de configurări Preview/Auth/Stripe Test/Resend redirect.
   APP_URL/webhook secret obligatorii la validare finală, nu înainte de primul deploy.
9. Credențiale E2E dedicate în secret manager, apoi `node scripts/preflight.mjs e2e`.
   Config lipsă = eroare. Folosește teste autorizate pe client, nu runner-ele istorice
   hardcoded demo. Auth/linkuri noi, email, plată Sandbox și stock effect unic trebuie
   validate efectiv; gate-ul nu execută testele funcționale.
10. Păstrează dovezile fără secrete, review/PR/merge separat. Production cere alt gate;
    tooling-ul acesta refuză integral Live.

Demo-ul real din septembrie rămâne dovada funcțională istorică. Tooling-ul din
octombrie nu a reaplicat schema și nu a schimbat demo-ul sau proiectul original.
