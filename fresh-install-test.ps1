$env:PGPASSWORD = 'xNyfsjngYpP9TiJgIQa75rVi1rvnHLVWUFENg37CGMw_'
$dbName = "masjid_fresh_test_$([int][double]::Parse((Get-Date -UFormat %s)))"
Write-Host "Creating disposable DB $dbName"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 55432 -U masjid_app -d postgres -c "CREATE DATABASE ""$dbName"";"
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to create DB"; exit 1 }

$testUrl = "postgresql://masjid_app:xNyfsjngYpP9TiJgIQa75rVi1rvnHLVWUFENg37CGMw_@127.0.0.1:55432/$dbName"
Write-Host "Running prisma db push..."
npx prisma db push --url $testUrl --accept-data-loss

Write-Host "Verifying Payment.status default..."
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 55432 -U masjid_app -d $dbName -c "SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='Payment' AND column_name='status';"

Write-Host "Checking MemberSequence table..."
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 55432 -U masjid_app -d $dbName -c "SELECT * FROM ""MemberSequence"" LIMIT 1;"

Write-Host "Checking ExpenseSequence table..."
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 55432 -U masjid_app -d $dbName -c "SELECT * FROM ""ExpenseSequence"" LIMIT 1;"

Write-Host "Running prisma migrate deploy (expected to fail)..."
try { npx prisma migrate deploy --url $testUrl } catch { Write-Host "migrate deploy failed as expected: $_" }

Write-Host "Cleaning up: dropping DB $dbName"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 55432 -U masjid_app -d postgres -c "DROP DATABASE IF EXISTS ""$dbName"" WITH (FORCE);"