# Migrații Supabase Development

## Fluxul curent

În mediul de lucru actual, migrațiile aprobate sunt aplicate manual prin SQL
Editor în proiectul Supabase Development. Fișierele versionate din
`supabase/migrations` rămân sursa de adevăr și trebuie executate integral,
neschimbate și în ordinea versiunilor.

Eticheta `main — PRODUCTION` afișată de Supabase identifică ramura principală
a bazei din proiectul selectat. Ea nu este branch-ul Git `main`. Înainte de
orice aplicare trebuie verificat că proiectul deschis este proiectul Development
configurat local, nu viitorul proiect Supabase Production.

## Verificarea înainte de aplicare

1. Confirmă că URL-ul proiectului corespunde proiectului Development configurat
   local, fără să copiezi chei sau parole în documentație ori în Git.
2. Verifică lista fișierelor din `supabase/migrations` și selectează exclusiv
   migrarea aprobată care nu a fost încă aplicată.
3. Rulează verificări read-only pentru a confirma că obiectele migrației nu
   există deja.
4. Dacă există obiecte neașteptate sau schema este parțial aplicată, oprește-te.
   Nu modifica migrarea și nu încerca să repari manual istoricul.

Pentru migrarea inițială a conturilor, verificarea preliminară este:

```sql
select
  to_regtype('public.app_role') as app_role,
  to_regclass('public.profiles') as profiles,
  to_regclass('public.user_roles') as user_roles,
  to_regclass('public.customer_addresses') as customer_addresses;
```

Toate valorile trebuie să fie `null` înainte de prima aplicare.

## Aplicarea în Development

1. Deschide SQL Editor în proiectul Supabase Development.
2. Creează un query nou.
3. Copiază integral conținutul fișierului de migrare aprobat.
4. Verifică încă o dată proiectul selectat.
5. Execută migrarea o singură dată.
6. Nu introduce date de test și nu adăuga manual obiecte care nu există în
   migrare.

Production nu se modifică înainte de Faza 10.

## Verificarea după aplicare

Confirmă existența tabelelor și activarea RLS:

```sql
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'user_roles', 'customer_addresses')
order by c.relname;
```

Confirmă că nu există încă politici RLS:

```sql
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'user_roles', 'customer_addresses');
```

Confirmă valorile enum-ului pentru roluri:

```sql
select e.enumlabel
from pg_enum e
join pg_type t on t.oid = e.enumtypid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
  and t.typname = 'app_role'
order by e.enumsortorder;
```

## Politica de citire a rolului propriu

Înainte de aplicarea migrării
`20260820120000_add_user_roles_select_own_policy.sql`, confirmă că RLS este
activ și că politica nu există deja:

```sql
select
  c.relrowsecurity as rls_enabled,
  exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'user_roles'
      and p.policyname = 'user_roles_select_own'
  ) as policy_exists
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'user_roles';
```

Rezultatul așteptat înainte de aplicare este `rls_enabled = true` și
`policy_exists = false`. După aplicare, verifică definiția exactă:

```sql
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'user_roles'
order by policyname;
```

Trebuie să existe exclusiv politica `user_roles_select_own` pentru `SELECT`,
atribuită rolului PostgreSQL `authenticated`, cu condiția bazată pe
`auth.uid() = user_id`. Nu trebuie să existe politici pentru `INSERT`, `UPDATE`
sau `DELETE`.

## Politicile RLS pentru profiluri și adrese

Înainte de aplicarea migrării
`20260820160000_add_account_rls_policies.sql`, verifică RLS și politicile deja
prezente:

```sql
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'user_roles', 'customer_addresses')
order by c.relname;

select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'user_roles', 'customer_addresses')
order by tablename, policyname;
```

Înainte de aplicare, toate cele trei tabele trebuie să aibă RLS activ, iar
singura politică trebuie să fie `user_roles_select_own`. După aplicare, rulează
aceleași query-uri și verifică următorul set:

- `profiles_select_own` și `profiles_update_own`;
- `customer_addresses_select_own`, `customer_addresses_insert_own`,
  `customer_addresses_update_own` și `customer_addresses_delete_own`;
- politica existentă `user_roles_select_own`.

Toate politicile sunt limitate la rolul PostgreSQL `authenticated`. Profilurile
nu au politici pentru `INSERT` sau `DELETE`, iar `user_roles` nu are politici de
scriere.

## Schema de bază a catalogului

Migrarea `20260820200000_create_catalog_base_schema.sql` creează tipurile,
tabelele și relațiile de bază pentru produse, categorii și colecții. Migrarea
a fost aplicată în Development la 2026-08-20.

Tipul produsului păstrează variantele structurale `standard`, `unique`,
`made_to_order` și `bundle`. Caracterul personalizabil este un marcaj separat,
iar sezonalitatea se exprimă prin asocierea cu una sau mai multe colecții; în
acest fel, ambele se pot combina cu orice tip de produs.

Înainte de aplicare, confirmă că obiectele nu există deja:

```sql
select
  to_regtype('public.product_type') as product_type,
  to_regtype('public.product_publication_status') as publication_status,
  to_regtype('public.product_availability_status') as availability_status,
  to_regclass('public.products') as products,
  to_regclass('public.categories') as categories,
  to_regclass('public.collections') as collections,
  to_regclass('public.product_categories') as product_categories,
  to_regclass('public.product_collections') as product_collections;
```

Toate valorile trebuie să fie `null`. După aplicare, confirmă existența
tabelelor și activarea RLS:

```sql
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'products',
    'categories',
    'collections',
    'product_categories',
    'product_collections'
  )
order by c.relname;
```

Toate cele cinci tabele trebuie să aibă `rls_enabled = true`. Acest task nu
adaugă încă politici de catalog, deci verifică și că nu există politici:

```sql
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in (
    'products',
    'categories',
    'collections',
    'product_categories',
    'product_collections'
  );
```

Query-ul trebuie să returneze zero rânduri. Verifică valorile enum-urilor:

```sql
select t.typname, e.enumlabel
from pg_enum e
join pg_type t on t.oid = e.enumtypid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
  and t.typname in (
    'product_type',
    'product_publication_status',
    'product_availability_status'
  )
order by t.typname, e.enumsortorder;
```

## Variante și opțiuni de personalizare

Migrarea `20260820210000_create_variants_customizations.sql` creează tabelele
`product_variants` și `customization_options`, plus enum-ul
`customization_option_type`. Migrarea a fost aplicată în Development la
2026-08-20.

Atributele fixe ale unei variante sunt păstrate într-un obiect `jsonb` nevid,
de exemplu `{"size": "M", "color": "red"}`. Combinația dintre produs și
obiectul de atribute este unică. Configurația unei personalizări este tot un
obiect `jsonb`; acesta poate conține reguli simple precum `allowed_values`,
`min_length`, `max_length` sau `multiline`, în funcție de tipul opțiunii.

Înainte de aplicare, confirmă că obiectele nu există deja:

```sql
select
  to_regtype('public.customization_option_type') as customization_option_type,
  to_regclass('public.product_variants') as product_variants,
  to_regclass('public.customization_options') as customization_options;
```

Toate valorile trebuie să fie `null`. După aplicare, confirmă existența
tabelelor și activarea RLS:

```sql
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('product_variants', 'customization_options')
order by c.relname;
```

Ambele tabele trebuie să aibă `rls_enabled = true`. Acest task nu adaugă
politici de catalog, deci următorul query trebuie să returneze zero rânduri:

```sql
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('product_variants', 'customization_options');
```

Confirmă și valorile enum-ului:

```sql
select e.enumlabel
from pg_enum e
join pg_type t on t.oid = e.enumtypid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
  and t.typname = 'customization_option_type'
order by e.enumsortorder;
```

Rezultatul așteptat, în ordine, este `selection`, `text`, `boolean`, `image`.

## Inventar și mișcări de stoc

Migrarea `20260820220000_create_inventory.sql` creează tabelele `inventory` și
`inventory_movements`, regulile pentru stoc direct sau pe variante și funcția
atomică `adjust_inventory`. Migrarea a fost aplicată manual în Development la
2026-08-20.

Un rând `inventory` țintește exact un produs sau o variantă. Produsele cu
variante folosesc exclusiv inventar pe variante. Funcția `adjust_inventory`
blochează rândul de inventar, aplică diferența și creează mișcarea de audit în
aceeași tranzacție. Funcția poate fi executată numai de `service_role` până la
definirea accesului centralizat pentru catalog.

Înainte de aplicare, confirmă că obiectele nu există deja:

```sql
select
  to_regclass('public.inventory') as inventory,
  to_regclass('public.inventory_movements') as inventory_movements,
  to_regprocedure(
    'public.adjust_inventory(uuid,integer,text,uuid,jsonb)'
  ) as adjust_inventory,
  to_regprocedure(
    'public.validate_inventory_target()'
  ) as validate_inventory_target,
  to_regprocedure(
    'public.validate_unique_product_inventory()'
  ) as validate_unique_product_inventory,
  to_regprocedure(
    'public.validate_product_variant_inventory()'
  ) as validate_product_variant_inventory;
```

Toate valorile trebuie să fie `null`. După aplicare, confirmă tabelele și RLS:

```sql
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('inventory', 'inventory_movements')
order by c.relname;
```

Ambele tabele trebuie să aibă `rls_enabled = true`. Politicile rămân absente:

```sql
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('inventory', 'inventory_movements');
```

Query-ul trebuie să returneze zero rânduri. Confirmă funcțiile și drepturile
funcției atomice:

```sql
select
  p.proname,
  p.prosecdef as security_definer,
  has_function_privilege(
    'anon',
    p.oid,
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    p.oid,
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    p.oid,
    'EXECUTE'
  ) as service_role_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'adjust_inventory',
    'validate_inventory_target',
    'validate_unique_product_inventory',
    'validate_product_variant_inventory'
  )
order by p.proname;
```

`adjust_inventory` trebuie să aibă `security_definer = false`, accesul
`anon/authenticated = false` și `service_role = true`. Cele trei funcții trigger
nu sunt apelate direct de aplicație.

## Imagini de produs și Storage

Migrarea `20260820230000_create_product_images_storage.sql` creează tabelul
`product_images` și bucket-ul public `product-images`. Migrarea a fost aplicată
manual în Development la 2026-08-20.

`product_images.storage_path` este cheia obiectului din bucket, nu un URL. Calea
trebuie să aibă forma `<product_id>/<nume-fisier>` și este unică. URL-ul public
se derivă din bucket și această cale. Ordinea este unică în cadrul produsului.

Bucket-ul acceptă maximum 5 MiB și MIME-urile `image/jpeg`, `image/png`,
`image/webp` și `image/avif`. UI-ul ulterior trebuie să accepte numai extensiile
`.jpg`, `.jpeg`, `.png`, `.webp` și `.avif`, să verifice MIME-ul real, mărimea și
să genereze nume sigure. SVG, GIF și video nu sunt acceptate în MVP.

Bucket-ul public permite livrarea obiectelor prin URL-ul public fără o politică
`SELECT` pentru `anon`. Absența acelei politici evită deschiderea listării
metadatelor din `storage.objects`; politicile admin pentru listare și scriere
sunt adăugate de migrarea următoare.

Storage nu este tranzacțional împreună cu `product_images`. Fluxul aplicației
trebuie să încarce obiectul, să creeze rândul DB și să șteargă compensator
obiectul dacă inserarea DB eșuează. La ștergere, aplicația trebuie să elimine
obiectul prin Storage API și apoi rândul DB; ștergerea rândului nu elimină
automat fișierul fizic. Supabase blochează intenționat ștergerea directă din
`storage.objects`; politica `DELETE` a fost verificată structural, iar fluxul
end-to-end de ștergere va fi testat prin Storage API odată cu UI-ul de upload.

## Securitatea catalogului

Migrarea `20260820240000_add_catalog_rls.sql` adaugă politicile catalogului,
helper-ul `is_admin()` și securizează RPC-ul `adjust_inventory`. Migrarea a fost
aplicată manual în Development la 2026-08-20.

Catalogul public expune numai produse cu `publication_status = 'published'`.
Variantele și personalizările trebuie să fie și active, iar imaginile și
relațiile devin vizibile numai printr-un produs publicat. Categoriile și
colecțiile publice trebuie să fie legate de cel puțin un produs publicat.

`inventory` și `inventory_movements` nu sunt publice. Adminul poate citi
inventarul, crea numai rânduri cu cantitate zero și edita direct numai pragul de
stoc redus. Cantitatea se modifică exclusiv prin `adjust_inventory`, iar
mișcările nu au acces direct de scriere. RPC-ul este `SECURITY DEFINER`, verifică
rolul real din `user_roles`, atribuie actorul autentificat și păstrează locking-ul
și tranzacția atomică din Task 3.3. `anon` și customer sunt refuzați; admin și
`service_role` sunt acceptați fără expunerea cheii privilegiate în browser.

Pentru produse cu istoric de stoc, UI-ul admin trebuie să folosească
`publication_status = 'archived'` în loc de hard-delete. Hard-delete rămâne
disponibil pentru cazuri administrative deliberate și elimină prin cascade
rândurile de inventar, mișcările și imaginile DB; obiectele Storage necesită
curățare separată prin API.

Ordinea obligatorie de aplicare manuală este:

1. `20260820230000_create_product_images_storage.sql`;
2. `20260820240000_add_catalog_rls.sql`.

Înainte de aplicare, confirmă că obiectele noi sunt absente:

```sql
select
  to_regclass('public.product_images') as product_images,
  to_regprocedure('public.is_admin()') as is_admin,
  exists (
    select 1 from storage.buckets where id = 'product-images'
  ) as product_images_bucket_exists;
```

Rezultatul așteptat este `null`, `null`, `false`. După ambele migrări, verifică
bucket-ul, RLS și politicile:

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'product-images';

select schemaname, tablename, policyname, cmd, roles
from pg_policies
where (schemaname = 'public' and tablename in (
  'products',
  'categories',
  'collections',
  'product_categories',
  'product_collections',
  'product_variants',
  'customization_options',
  'product_images',
  'inventory',
  'inventory_movements'
)) or (
  schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'product_images_storage_%'
)
order by schemaname, tablename, policyname;
```

## Checkout și schema comenzilor

Migrarea `20260823120000_create_checkout_order_schema.sql` creează schema
checkout-ului: `shipping_methods`, `orders`, `order_items` și
`order_status_history`, enum-urile stabile din Project Bible, snapshot-urile
istorice, cheia unică de idempotency și politicile RLS pentru guest, customer și
admin. Migrarea a fost aplicată manual în Development la 2026-08-23.

Migrarea `20260823130000_create_checkout_quote_function.sql` adaugă RPC-ul
read-only `quote_checkout(jsonb)`. Funcția reconstruiește din baza de date
produsul, varianta, personalizările, disponibilitatea, stocul și valorile
monetare; browserul nu furnizează prețuri autoritare și nu primește inventarul
brut. Migrarea a fost aplicată manual în Development la 2026-08-23.

Migrarea `20260823140000_place_cod_order.sql` adaugă plasarea atomică a
comenzii ramburs prin `place_cod_order(uuid, jsonb, jsonb)`, tokenul bearer
aleator pentru pagina de confirmare și RPC-ul minimal
`get_order_confirmation(uuid)`. Identitatea customerului este derivată din
`auth.uid()`, iar browserul nu poate furniza prețuri, costul transportului,
statusuri, actorul sau valorile inventarului. Funcția serializează retry-urile
după cheia de idempotency, blochează catalogul și inventarul într-o ordine
deterministă, recalculează quote-ul după lock, creează snapshot-urile comenzii,
scade numai inventarul urmărit și scrie movement-ul cu order ID. Ruta publică
primește un token UUID separat de order ID și returnează numai numărul public,
totalul, metoda de plată/livrare și data; nu expune contactul sau adresa.
Migrarea a fost aplicată manual în Development la 2026-08-23.

Ordinea obligatorie de aplicare este:

1. `20260823120000_create_checkout_order_schema.sql`;
2. `20260823130000_create_checkout_quote_function.sql`;
3. `20260823140000_place_cod_order.sql`.

Verificarea pre-migrare a confirmat că tipurile, tabelele și RPC-ul nu existau.
După aplicare au fost confirmate cele patru tabele cu RLS activ, opt politici,
cele 11 statusuri exacte ale comenzilor, accesul `anon/authenticated` la RPC și
absența accesului `anon` la `orders`. Testul tranzacțional
`supabase/tests/checkout_orders.sql` a trecut integral și a făcut `rollback`;
fixture-urile pentru produs, inventar, livrare și comandă nu au rămas în DB.
Testul acoperă izolarea rolurilor și ownership-ul structural, FK-uri,
snapshot-uri, bani în unități întregi, cantități, idempotency, livrare și
revalidarea autoritară pentru preț, stoc, variantă, personalizare și produs
indisponibil.

Migrarea nu introduce un tarif de livrare inventat. Checkout-ul devine
submisibil după configurarea unei metode active cu tariful aprobat.

## Blocul 6A — plăți și rezervări temporare

Migrarea `20260827120000_create_payment_reservations.sql` a fost aplicată
manual în Development la 2026-08-27, prin Supabase SQL Editor.

Migrarea adaugă `payments`, `stock_reservations`, statusurile lor, TTL-ul
centralizat de 30 de minute și operațiile atomice pentru pregătirea unei
comenzi card, release, expiration și confirmarea internă a plății. RPC-ul
public `quote_checkout` devine reservation-aware, iar inventarul nu mai poate
fi redus sub cantitatea rezervată activ. Fluxul COD existent rămâne separat,
dar folosește noul quote și aceeași invariantă DB.

Înainte de aplicare, toate obiectele noi trebuie să fie absente, iar funcția
Fazei 5 trebuie să aibă numele original:

```sql
select
  to_regtype('public.payment_record_status') as payment_record_status,
  to_regtype('public.stock_reservation_status') as stock_reservation_status,
  to_regclass('public.payments') as payments,
  to_regclass('public.stock_reservations') as stock_reservations,
  to_regprocedure('public.prepare_card_order(uuid,jsonb,jsonb)')
    as prepare_card_order,
  to_regprocedure('public.confirm_card_payment(uuid,text,text)')
    as confirm_card_payment,
  to_regprocedure('public.quote_checkout(jsonb)') as quote_checkout,
  to_regprocedure('public.quote_checkout_without_reservations(jsonb)')
    as quote_checkout_without_reservations;
```

Rezultatul așteptat este `null` pentru toate obiectele 6A, iar
`quote_checkout` trebuie să existe. Migrarea se aplică integral, o singură
dată, după toate migrările Fazei 5.

După aplicare, verifică tabelele și RLS:

```sql
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('payments', 'stock_reservations')
order by c.relname;

select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('payments', 'stock_reservations')
order by tablename, policyname;
```

Ambele tabele trebuie să aibă RLS activ. Trebuie să existe numai politicile
admin de `SELECT`; clienții nu primesc politici de scriere.

Verifică funcțiile și drepturile lor:

```sql
select
  p.proname,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE')
    as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE')
    as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'quote_checkout',
    'quote_checkout_without_reservations',
    'prepare_card_order',
    'release_card_order_reservations',
    'expire_stock_reservations',
    'confirm_card_payment'
  )
order by p.proname;
```

`anon` și `authenticated` pot executa numai `quote_checkout` și
`prepare_card_order`. Operațiile de release, expiration și confirmare sunt
doar pentru `service_role`. Funcția internă
`quote_checkout_without_reservations` nu trebuie să fie executabilă de
rolurile client.

După aplicare rulează integral, în SQL Editor, cu rollback:

1. `supabase/tests/payment_reservations.sql`;
2. `supabase/tests/place_cod_order.sql`;
3. `supabase/tests/checkout_orders.sql`.

Pentru verificarea concurenței reale folosește două sesiuni SQL pe fixture-uri
tranzacționale izolate: ambele sesiuni apelează `prepare_card_order` cu chei
diferite pentru ultima unitate a aceluiași inventar, iar una menține tranzacția
deschisă înainte de commit. A doua trebuie să aștepte lock-ul și, după commitul
primei, să returneze lipsă de stoc fără a crea comandă, plată sau rezervare.
Repetă perechea cu `place_cod_order` în a doua sesiune pentru cazul card versus
COD. În ambele cazuri verifică `inventory.quantity >= 0`, o singură rezervare
activă și absența rândurilor parțiale pentru cererea respinsă.

Aplicarea a fost verificată structural și prin testele tranzacționale de mai
sus. Testul real cu două sesiuni SQL rămâne o verificare manuală separată;
SQL Editor nu păstrează în mod fiabil o tranzacție între rulări distincte.

## Registrul aplicărilor manuale

| Versiune | Migrare | Mediu | Data aplicării | Rezultat |
| --- | --- | --- | --- | --- |
| `20260811120000` | `create_account_schema` | Development | 2026-08-12 | Aplicată; trei tabele prezente, RLS activ, zero politici |
| `20260812120000` | `create_account_bootstrap` | Development | 2026-08-12 | Aplicată; trigger Auth verificat, rol `customer` creat atomic, utilizatorul temporar șters și cascadele confirmate |
| `20260820120000` | `add_user_roles_select_own_policy` | Development | 2026-08-20 | Aplicată; o politică `SELECT` pentru propriile roluri, zero politici de scriere |
| `20260820160000` | `add_account_rls_policies` | Development | 2026-08-20 | Aplicată; RLS verificat, politici proprii pentru profiluri și adrese, politica rolurilor păstrată fără scriere |
| `20260820200000` | `create_catalog_base_schema` | Development | 2026-08-20 | Aplicată; cinci tabele și trei enum-uri prezente, RLS activ, zero politici, relații și trigger-e verificate |
| `20260820210000` | `create_variants_customizations` | Development | 2026-08-20 | Aplicată; două tabele și enum-ul prezente, RLS activ, zero politici, integritatea relațiilor, indexurile, tipurile monetare și trigger-ele verificate |
| `20260820220000` | `create_inventory` | Development | 2026-08-20 | Aplicată; două tabele prezente, RLS activ, zero politici, drepturile RPC și trigger-ele verificate; testele tranzacționale pentru ajustări, audit și reguli de integritate au trecut cu rollback |
| `20260820230000` | `create_product_images_storage` | Development | 2026-08-20 | Aplicată; tabelul, RLS, constrângerile, trigger-ul și bucket-ul public cu limita de 5 MiB și MIME-urile permise au fost verificate |
| `20260820240000` | `add_catalog_rls` | Development | 2026-08-20 | Aplicată; 20 politici public catalog/inventar și 4 politici Storage verificate; testele anon/customer/admin, RPC, audit, Storage și regresia regulilor de stoc au trecut cu rollback |
| `20260823120000` | `create_checkout_order_schema` | Development | 2026-08-23 | Aplicată; patru tabele și patru enum-uri prezente, RLS activ, opt politici, snapshot-uri, idempotency și constrângeri monetare verificate |
| `20260823130000` | `create_checkout_quote_function` | Development | 2026-08-23 | Aplicată; RPC autoritar disponibil pentru anon/customer fără expunerea inventarului; testele SQL pentru preț, stoc, variante, personalizări, disponibilitate și schema orders au trecut cu rollback |
| `20260823140000` | `place_cod_order` | Development | 2026-08-23 | Aplicată; plasare COD atomică, locking și idempotency, guest/customer, snapshot-uri, scădere/audit inventar și confirmare cu token minimal verificate; `place_cod_order.sql` și regresia `checkout_orders.sql` au trecut cu rollback |
| `20260827120000` | `create_payment_reservations` | Development | 2026-08-27 | Aplicată; tabelele, enum-urile, TTL-ul, RLS și privilegiile RPC au fost verificate; 76 aserțiuni 6A, 36 aserțiuni COD și 22 aserțiuni checkout au trecut cu rollback; testul real cu două sesiuni rămâne manual |

## Limitarea fluxului manual

SQL Editor nu înregistrează automat versiunea în istoricul folosit de Supabase
CLI. Din acest motiv, comenzile CLI de aplicare, inclusiv `db push`, nu trebuie
folosite asupra acestui proiect până când reconcilierea istoricului nu este
definită și aprobată într-un task separat. Nu rula `migration repair`, `db
reset`, `db pull` sau `db diff` pentru a încerca o reconciliere ad-hoc.

Tokenurile Supabase, parolele bazei de date și orice alte credentiale nu se
salvează în repository, documentație, capturi sau loguri partajate.
