# Authentication Credentials

## Overview

The application now has full authentication protecting:
- Customer portals at `/customers/[id]`
- Rep portal at `/rep`

## Test Credentials

All passwords are currently set to: `test123`

### Customer Logins

**Starlight Lighting**
- URL: `http://localhost:30002/customers/starlight-lighting`
- Username: `star`
- Password: `test123`

**Veranda Estate Homes Inc.**
- URL: `http://localhost:30002/customers/veranda-estate-homes-inc`
- Username: `veranda`
- Password: `test123`

### Rep Portal (Admin)

**Rep Portal Access**
- URL: `http://localhost:30002/rep`
- Username: `rep`
- Password: `test123`

## Test Customers (No Login Required)

Customers with names starting with `!!` are test customers and don't require authentication:
- `!! Starlight Lighting`
- `!! Veranda Estate Homes Inc.`
- `!! Acres Market & Interiors`
- `!! Heirloom Home Shop Inc.`
- `!! Jenny Martin Design`

## How It Works

1. **Protected customers**: Customers without `!!` prefix require login
2. **Test customers**: Customers with `!!` prefix are openly accessible
3. **Session duration**: 30 days (stays logged in)
4. **Middleware protection**: Automatically redirects to login if not authenticated

## Adding New Customer Credentials

Edit `/Users/mattrowland/code/Curated-Presentation-4.0/data/credentials.json`:

```json
{
  "customers": [
    {
      "customerId": "customer-id-or-slug",
      "username": "short",
      "passwordHash": "$2b$10$..."
    }
  ]
}
```

To generate a password hash:
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('yourpassword', 10).then(hash => console.log(hash))"
```

## Security Notes

- Passwords are hashed with bcrypt (10 rounds)
- Sessions use JWT tokens
- Middleware protects routes server-side
- Test customers remain open for development
- Production: Set `NEXTAUTH_SECRET` environment variable
