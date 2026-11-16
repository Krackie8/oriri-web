-- One line per object; run on hosted and on the twin and diff. Covers the bestie schema
-- and the public objects #68 touches.
select line from (
  select 'table '||c.oid::regclass||' rls='||c.relrowsecurity||' force='||c.relforcerowsecurity||' cols='||
    md5((select string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),''), ',' order by a.attnum)
         from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
         where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped))||
    ' anon='||has_table_privilege('anon',c.oid,'select')||' auth_sel='||has_table_privilege('authenticated',c.oid,'select')||
    ' auth_ins='||has_table_privilege('authenticated',c.oid,'insert')||' svc_ins='||has_table_privilege('service_role',c.oid,'insert') as line
  from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='bestie' and c.relkind='r'
  union all
  select 'con '||conrelid::regclass||' '||conname||' '||md5(pg_get_constraintdef(oid)) from pg_constraint where connamespace='bestie'::regnamespace
  union all
  select 'idx '||indexrelid::regclass||' '||md5(pg_get_indexdef(indexrelid)) from pg_index where indrelid in (select oid from pg_class where relnamespace='bestie'::regnamespace)
  union all
  select 'pol '||schemaname||'.'||tablename||' '||policyname||' '||cmd||' '||array_to_string(roles,',')||' '||md5(coalesce(qual,'')||'|'||coalesce(with_check,''))
    from pg_policies where schemaname='bestie' or (schemaname='public' and tablename='user_roles')
  union all
  select 'trg '||tgrelid::regclass||' '||tgname from pg_trigger where not tgisinternal and tgrelid in (select oid from pg_class where relnamespace='bestie'::regnamespace)
  union all
  select 'fn '||p.oid::regprocedure||' secdef='||p.prosecdef||' '||md5(p.prosrc)||' anon='||has_function_privilege('anon',p.oid,'execute')||' auth='||has_function_privilege('authenticated',p.oid,'execute')
    from pg_proc p where p.pronamespace='bestie'::regnamespace or p.oid in ('public.handle_new_user()'::regprocedure,'public.has_role(uuid,public.app_role)'::regprocedure)
  union all
  select 'type '||t.oid::regtype||' '||(select string_agg(enumlabel,',' order by enumsortorder) from pg_enum e where e.enumtypid=t.oid) from pg_type t where t.typnamespace in ('bestie'::regnamespace,'public'::regnamespace) and t.typtype='e'
  union all
  select 'public_tables '||string_agg(tablename,',' order by tablename) from pg_tables where schemaname='public'
  union all
  select 'schema_usage anon='||has_schema_privilege('anon','bestie','usage')||' auth='||has_schema_privilege('authenticated','bestie','usage')
) x order by line;
