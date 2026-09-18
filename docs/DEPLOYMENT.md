# Hostinger Staging Deployment

Use a staging subdomain first, for example `staging-indrajatra.newaguthi.org.au`. Its document root must be separate from the existing WordPress site.

## 1. Create the Hostinger resources

In hPanel:

1. Create the staging subdomain and enable SSL.
2. Create a new MySQL database and a dedicated least-privilege database user. Do not reuse WordPress credentials.
3. Confirm PHP 8.2 or newer with `pdo_mysql`, `mbstring`, sessions and `mail()` enabled.
4. Create a mailbox or authenticated sender such as `no-reply@newaguthi.org.au` and confirm Hostinger permits PHP mail from it.
5. Enable SSH access and note the SSH hostname, username and absolute staging application path.

## 2. Configure secrets

On the server, create `STAGING_ROOT/shared/config/app.env`. Start from `deploy/app.env.example`, insert the real database credentials, generate a session secret with `openssl rand -hex 32`, and run:

```bash
chmod 600 STAGING_ROOT/shared/config/app.env
```

Keep this file outside the public document root and out of Git.

## 3. Build and inspect locally

The staging build uses seeded festival content and the real PHP/MySQL authentication API:

```bash
./deploy/build-staging-release.sh
```

The generated release is under `build/releases/<timestamp>`. Its `public` directory is the only web-accessible directory.

## 4. Dry-run and deploy

```bash
export STAGING_SSH='hostinger-user@hostinger-ssh-host'
export STAGING_ROOT='/home/hostinger-user/apps/indra-jatra-staging'

./deploy/deploy-hostinger.sh --dry-run
./deploy/deploy-hostinger.sh --apply
```

The apply step uploads a versioned release, runs the tracked MySQL migrations and updates `STAGING_ROOT/current`. Configure the subdomain document root as `STAGING_ROOT/current/public`.

## 5. Verify before inviting the team

```bash
curl -i https://STAGING_SUBDOMAIN/api/health
```

Register using a test email, receive and verify the six-digit code, log out, log back in, test a Devanagari name, install the PWA on iPhone and Android, and confirm the existing WordPress site is unchanged.

Keep the staging URL private or protect it with Hostinger directory password protection while collecting feedback. Do not share organiser controls until server-side organiser roles and CSRF-protected mutation endpoints are complete.

## Rollback

Point `STAGING_ROOT/current` back to the previous release directory. Database migrations in this stage are additive; take a database export before any later destructive migration.
