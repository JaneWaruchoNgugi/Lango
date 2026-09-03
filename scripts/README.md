# Lango seed

Provisions a Super Admin + Greenview demo property.

## Prerequisites
Download a service-account key from the Firebase console
(Project settings → Service accounts → Generate new private key) and export:

    export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccount.json

## Run
    cd scripts && npm install && npm run seed

## Demo accounts (all dev-only)
| Role         | Login                     | Password       |
|--------------|---------------------------|----------------|
| Super Admin  | waruchojanen@gmail.com     | Lango#Admin1   |
| Caretaker    | caretaker@greenview.dev   | Lango#Care1    |
| Security Guard | guard1@greenview.dev    | Lango#Guard1   |

Real staff accounts are created by the Super Admin in-app (never via public signup).
