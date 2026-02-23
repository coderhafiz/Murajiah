-- Force a schema cache reload in PostgREST so the API picks up the latest table schemas
NOTIFY pgrst, 'reload schema';
