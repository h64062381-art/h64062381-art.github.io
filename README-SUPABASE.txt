KIWI + Supabase

1) The public menu is index.html. No Admin button is shown.
2) Admin is admin.html and the manager QR is ADMIN_QR.html.
3) 42 table QR codes are generated inside admin.html after deployment.
4) Public feedback is inserted into public.feedback. Public orders are inserted into public.orders.
5) Run supabase-setup.sql once in Supabase SQL Editor to create analytics_events and the protected admin RPC.
6) The publishable Supabase key is safe for browser use when RLS/policies are configured; never put a secret/service_role key in this package.
7) Admin PIN is 2580.

8) Order inserts now send created_at explicitly and show the exact Supabase error if insertion fails, so diagnosis is immediate.
9) If orders still fail, run the updated supabase-setup.sql again; it includes the required anon INSERT grants.
