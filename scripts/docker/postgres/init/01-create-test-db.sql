-- Infrastructure only: create the test database without business tables or data.
SELECT format('CREATE DATABASE %I', 'brewlite_test')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'brewlite_test')
\gexec
