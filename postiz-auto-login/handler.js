const express = require('express');
const jwt = require('jsonwebtoken');
const { Client } = require('pg');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const app = express();
app.use(cookieParser());

const EPIC_AI_SSO_SECRET = process.env.EPIC_AI_SSO_SECRET;
const POSTIZ_DB_URL = process.env.DATABASE_URL;
const POSTIZ_JWT_SECRET = process.env.JWT_SECRET;

// Helper to generate UUID
function generateId() {
  return crypto.randomUUID();
}

// Helper to generate API key
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper to query DB
async function queryDB(query, params = []) {
  const client = new Client({ connectionString: POSTIZ_DB_URL });
  try {
    await client.connect();
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    await client.end();
  }
}

// Auto-login endpoint
app.get('/auth/auto-login', async (req, res) => {
  try {
    const { token, redirect } = req.query;

    if (!token) {
      console.log('Missing token');
      return res.redirect('/auth?error=missing_token');
    }

    if (!EPIC_AI_SSO_SECRET) {
      console.error('EPIC_AI_SSO_SECRET not set');
      return res.redirect('/auth?error=config_error');
    }

    // Verify Epic AI token
    let payload;
    try {
      payload = jwt.verify(token, EPIC_AI_SSO_SECRET);
    } catch (err) {
      console.error('Token invalid:', err.message);
      return res.redirect('/auth?error=invalid_token');
    }

    const { email, orgName } = payload;
    console.log(`Auto-login request for: ${email}`);

    // Find user in Postiz
    let users = await queryDB(
      `SELECT u.id, u.email, uo."organizationId", uo.id as "userOrgId", uo.role
       FROM "User" u
       LEFT JOIN "UserOrganization" uo ON u.id = uo."userId"
       WHERE u.email = $1
       LIMIT 1`,
      [email]
    );

    let user = users[0];
    let organizationId = user?.organizationId;
    let userOrgId = user?.userOrgId;
    let userRole = user?.role;

    // JIT provisioning if user doesn't exist
    if (!user) {
      console.log(`Creating new user: ${email}`);

      const orgId = generateId();
      const userId = generateId();
      const newUserOrgId = generateId();
      const apiKey = generateApiKey();
      const now = new Date().toISOString();
      const company = orgName || email.split('@')[0];

      // Create organization
      await queryDB(
        `INSERT INTO "Organization" (id, name, "apiKey", "allowTrial", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orgId, company, apiKey, true, now, now]
      );

      // Create user with GENERIC provider (for SSO users)
      await queryDB(
        `INSERT INTO "User" (id, email, "providerName", "providerId", activated, timezone, audience, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [userId, email, 'GENERIC', email, true, 0, 0, now, now]
      );

      // Link user to organization with SUPERADMIN role
      await queryDB(
        `INSERT INTO "UserOrganization" (id, "userId", "organizationId", role, disabled, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newUserOrgId, userId, orgId, 'SUPERADMIN', false, now, now]
      );

      user = { id: userId, email };
      organizationId = orgId;
      userOrgId = newUserOrgId;
      userRole = 'SUPERADMIN';

      console.log(`Created user ${userId} in org ${orgId}`);
    }

    // Generate Postiz session JWT (matching Postiz auth format)
    const sessionPayload = {
      id: user.id,
      email: user.email,
      activated: true,
    };

    const sessionJwt = jwt.sign(sessionPayload, POSTIZ_JWT_SECRET);

    // Set auth cookie (same as Postiz does)
    res.cookie('auth', sessionJwt, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Set organization cookie if we have one
    if (organizationId && userOrgId) {
      const orgPayload = {
        id: userOrgId,
        orgId: organizationId,
        role: userRole || 'SUPERADMIN',
      };
      const orgJwt = jwt.sign(orgPayload, POSTIZ_JWT_SECRET);
      res.cookie('showorg', orgJwt, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    }

    // Redirect to Postiz
    const redirectUrl = redirect || '/integrations/social';
    console.log(`Redirecting to: ${redirectUrl}`);
    return res.redirect(redirectUrl);

  } catch (error) {
    console.error('Auto-login error:', error);
    return res.redirect('/auth?error=server_error');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'postiz-auto-login' });
});

const PORT = process.env.AUTO_LOGIN_PORT || 3333;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Auto-login handler running on port ${PORT}`);
  console.log(`SSO Secret configured: ${!!EPIC_AI_SSO_SECRET}`);
  console.log(`Database URL configured: ${!!POSTIZ_DB_URL}`);
  console.log(`JWT Secret configured: ${!!POSTIZ_JWT_SECRET}`);
});
