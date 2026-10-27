# Reproducerea demo-urilor locale

Node 22+, dependențele din lockfile și Chromium Playwright deja instalat sunt
necesare. Fără Docker, cloud sau secrete. Într-un checkout al branch-ului:

```text
npm ci
npx playwright install chromium
npm run showcase:export
npm run test:showcase
npm run showcase:capture
```

`npm ci` și instalarea browserului descarcă dependențele existente; nu introduc
servicii sau abonamente. Când sunt deja prezente, începe de la export. Captura
construiește serial toate cele trei profiluri; poate dura câteva minute.
Pentru un singur profil: `npm run showcase:capture -- iris` (sau soare/poveste).
Acesta produce `validation-iris.json`; raportul agregat și comparația se regenerează
numai prin captura completă. Comanda trebuie să termine cu exit 0 înainte de
acceptarea capturilor; la eșec nu considera capturile vechi dovadă pentru noul run.

Pentru prezentare interactivă locală, rulează **un profil la un moment dat**:

```text
npm run showcase:serve -- iris
npm run showcase:serve -- soare
npm run showcase:serve -- poveste
```

Oprește fiecare comandă cu Ctrl+C înainte de următoarea. Origin-urile sunt
`http://127.0.0.1:3410`, `:3411`, respectiv `:3412`. Nu utiliza un reverse proxy
public, tunnel sau deployment ca să expui acest harness. Rulează numai pe stația
de dezvoltare, cu porturile disponibile. Serverul de date folosește un port
loopback alocat de OS. Origin-urile distincte și contextele browser noi izolează
coșul și datele; nu comutăm magazine într-o aplicație Production.

## Ce execută runner-ul

[Runner](../../scripts/commercial-showcase.mjs),
[serverul fixtures](../../scripts/lib/commercial-showcase.mjs),
[definițiile datelor și SVG](../../tests/fixtures/commercial-demos.mjs).

1. Exportă snapshot-uri JSON și SVG deterministe în `data/` și `assets/`.
   Nu conține comenzi seed SQL, nu contactează Supabase și nu folosește runner-ul
   de instalare client sau cel demo istoric.
2. Creează **un singur workspace temporar** și copiază sursa aplicației, public,
   manifestele/configurile necesare; reutilizează node_modules instalat prin link.
   Nu copiază `.env*`, `.git`, `.vercel`, `.supabase`, cache-uri ori rapoarte vechi.
3. Pornește un server HTTP pe 127.0.0.1 care servește numai citiri publice din
   fixtures. POST este permis exclusiv pentru cele trei RPC-uri de citire publică;
   toate mutațiile, Auth, admin, comenzi și plăți sunt refuzate. Nu emulează RLS,
   tranzacții, validare de stoc sau procesarea financiară Supabase.
4. Injectează un environment din allowlist OS, cu URL/key public placeholder local,
   `APP_URL` loopback și email redirect. Nu moștenește PAT/service-role/Stripe/Resend,
   `NODE_OPTIONS` sau variabilele Vercel. Refuză rularea dacă este invocat pe Vercel.
5. În **copia temporară**, aplică profilul public în config-ul versionat existent
   și copiază logo/icon. Nu modifică fișierul `src/lib/config/store.ts` din checkout.
   Settings și Homepage sunt citite de aplicație prin RPC-urile existente, din
   fixtures. Nu există selector, rută demo sau import de fixtures în `src/`.
6. Rulează Next `build --webpack`, apoi `start` pe loopback, serial pentru fiecare
   profil, cu aceeași logică și aceleași componente. Alegerea webpack este numai
   pentru workspace-ul temporar/dependențele linkate; nu schimbă build-ul normal.
7. Playwright navighează **rutele reale** și capturează paginile. Nu interceptează
   cererile pentru a înlocui HTML-ul aplicației. Browserul de captură refuză
   origini externe și writes. Capturile nu sunt un mockup al storefront-ului.
8. Închide browserul/serverele și elimină numai directorul temporar propriu, verificat.
   În cazul unui stop forțat al procesului, verifică manual procesele/fișierele
   temporare rămase înainte de rerulare; nu omorî servere ale altui task.

Datele de inventar sunt incluse pentru transparența catalogului fictiv, nu pentru
a simula un checkout reușit. Nu există cont admin în acest harness: Settings este
o configurație pregătită și validată, nu o demonstrație de salvare administrativă.
Logo-urile produselor sunt ilustrații vectoriale originale servite local; nu este
demonstrată funcționarea Storage remote sau optimizarea fotografiilor externe.

## Ce cere deployment separat

Un magazin accesibil pe internet necesită repository/deployment și Supabase/Auth/
Storage/Stripe/Resend separate per client, identitate verificată, autorizare,
configurare sigură și teste reale. Nu publica fixture server-ul drept backend
comercial și nu transforma cele trei profile în tenant-uri ale unei baze comune.

Pentru publicarea unor demo-uri online se cere întâi aprobarea owner-ului pentru
resurse, ownership, planurile aplicabile, costuri și expunere publică. Fără estimări
sau prețuri preaprobate în acest task; ofertele se verifică la momentul deciziei.
Nu s-au creat resurse sau activat costuri. Nu s-au modificat proiectele Supabase
original/Demo sau comanda de audit. Nu s-au activat servicii Production.

Stripe Live și certificarea E2E per-client rămân blocajele din
[launch checklist](../client-delivery/internal/production-launch.md) și
[auditul de livrare](../client-delivery/internal/package-audit.md).
Testele locale 10B.4 nu le închid. Pentru livrare se folosește
[pachetul 10B.3](../client-delivery/README.md).
