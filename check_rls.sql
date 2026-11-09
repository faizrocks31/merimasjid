-- Check if RLS is enabled on JummaCorrection
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname = 'JummaCorrection';

-- Check policies
SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'JummaCorrection';

-- Check table owner
SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('JummaCollection', 'JummaCorrection');