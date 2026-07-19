# IDP Operations

Create the first admin invitation:

```bash
bun --filter idp bootstrap:admin -- --email admin@example.com --name "Admin"
```

Run migrations:

```bash
bun --filter idp db:migrate
```

Invited users create access from the studio login screen with their invited e-mail and password.
