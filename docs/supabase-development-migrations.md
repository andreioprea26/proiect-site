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

## Limitarea fluxului manual

SQL Editor nu înregistrează automat versiunea în istoricul folosit de Supabase
CLI. Din acest motiv, comenzile CLI de aplicare, inclusiv `db push`, nu trebuie
folosite asupra acestui proiect până când reconcilierea istoricului nu este
definită și aprobată într-un task separat. Nu rula `migration repair`, `db
reset`, `db pull` sau `db diff` pentru a încerca o reconciliere ad-hoc.

Tokenurile Supabase, parolele bazei de date și orice alte credentiale nu se
salvează în repository, documentație, capturi sau loguri partajate.
