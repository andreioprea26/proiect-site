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

## Registrul aplicărilor manuale

| Versiune | Migrare | Mediu | Data aplicării | Rezultat |
| --- | --- | --- | --- | --- |
| `20260811120000` | `create_account_schema` | Development | 2026-08-12 | Aplicată; trei tabele prezente, RLS activ, zero politici |
| `20260812120000` | `create_account_bootstrap` | Development | 2026-08-12 | Aplicată; trigger Auth verificat, rol `customer` creat atomic, utilizatorul temporar șters și cascadele confirmate |

## Limitarea fluxului manual

SQL Editor nu înregistrează automat versiunea în istoricul folosit de Supabase
CLI. Din acest motiv, comenzile CLI de aplicare, inclusiv `db push`, nu trebuie
folosite asupra acestui proiect până când reconcilierea istoricului nu este
definită și aprobată într-un task separat. Nu rula `migration repair`, `db
reset`, `db pull` sau `db diff` pentru a încerca o reconciliere ad-hoc.

Tokenurile Supabase, parolele bazei de date și orice alte credentiale nu se
salvează în repository, documentație, capturi sau loguri partajate.
