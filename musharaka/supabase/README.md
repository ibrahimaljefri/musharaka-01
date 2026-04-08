# Supabase Database Setup

## Apply Migrations

Using Supabase CLI:
```bash
supabase db push
```

Or run each file manually in the Supabase SQL Editor in this order:
1. `001_create_branches.sql`
2. `002_create_submissions.sql`
3. `003_create_sales.sql`
4. `004_submit_rpc.sql`

## Seed Development Data
```bash
supabase db seed
```
Or run `seed.sql` manually in the SQL Editor.

## External API Access

Other teams can query data directly via Supabase PostgREST:

```bash
# Get all branches
GET https://<project>.supabase.co/rest/v1/branches
Headers: apikey: <anon-key>

# Get sales for a specific branch and month
GET https://<project>.supabase.co/rest/v1/sales?branch_id=eq.<uuid>&select=*
Headers: apikey: <anon-key>

# Get submissions with their sales
GET https://<project>.supabase.co/rest/v1/submissions?select=*,sales(*)
Headers: apikey: <anon-key>
```
