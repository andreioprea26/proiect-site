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

## Registrul aplicărilor manuale

| Versiune | Migrare | Mediu | Data aplicării | Rezultat |
| --- | --- | --- | --- | --- |
| `20260811120000` | `create_account_schema` | Development | 2026-08-12 | Aplicată; trei tabele prezente, RLS activ, zero politici |
| `20260812120000` | `create_account_bootstrap` | Development | 2026-08-12 | Aplicată; trigger Auth verificat, rol `customer` creat atomic, utilizatorul temporar șters și cascadele confirmate |
| `20260820120000` | `add_user_roles_select_own_policy` | Development | 2026-08-20 | Aplicată; o politică `SELECT` pentru propriile roluri, zero politici de scriere |
| `20260820160000` | `add_account_rls_policies` | Development | 2026-08-20 | Aplicată; RLS verificat, politici proprii pentru profiluri și adrese, politica rolurilor păstrată fără scriere |

## Limitarea fluxului manual

SQL Editor nu înregistrează automat versiunea în istoricul folosit de Supabase
CLI. Din acest motiv, comenzile CLI de aplicare, inclusiv `db push`, nu trebuie
folosite asupra acestui proiect până când reconcilierea istoricului nu este
definită și aprobată într-un task separat. Nu rula `migration repair`, `db
reset`, `db pull` sau `db diff` pentru a încerca o reconciliere ad-hoc.

Tokenurile Supabase, parolele bazei de date și orice alte credentiale nu se
salvează în repository, documentație, capturi sau loguri partajate.
