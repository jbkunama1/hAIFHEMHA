# Environment configuration

The Compose file now interpolates all application variables. Previously it hardcoded FHEM_URL and empty credentials, so Portainer stack variables did not override them.

## Portainer

1. Update the stack Compose file from this repository.
2. Set FHEM_URL in the stack environment variables to your actual FHEMWEB base URL, without /fhem.
3. Optionally set FHEM_WEB_PATH (default /fhem), FHEM_USER, FHEM_PASS and APP_PASSWORD.
4. Leave PORT at 8080 unless you need a different internal port. The published host port remains 8090.
5. Update/redeploy the stack so the container is recreated; restarting alone does not apply changed environment variables.

## Local Compose

Copy .env.example to .env, replace the hostname, then run docker compose up -d --force-recreate haifhemha. Never commit .env or credentials.

## Verification

Run docker exec haifhemha printenv FHEM_URL to verify the effective URL without displaying passwords.

FHEM_URL is required: deployment fails rather than silently using an example IP. The external highfishNetwork must already exist. No application image rebuild is required for this Compose-only fix.
