# Social Media Integration Patterns

## OAuth 2.0 Flow

Epic AI uses native OAuth 2.0 integrations for all social platforms. No third-party services.

### General OAuth Flow

```
1. User clicks "Connect [Platform]"
   ↓
2. Redirect to platform's OAuth page
   ↓
3. User authorizes app
   ↓
4. Platform redirects to callback with code
   ↓
5. Exchange code for access token
   ↓
6. Store encrypted token in database
```

---

## Platform-Specific Integration

### Twitter/X (OAuth 2.0 with PKCE)

**Location**: `apps/web/src/app/api/social/connect/twitter/`

**OAuth Initiation**:
```typescript
// apps/web/src/app/api/social/connect/twitter/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect("/sign-in");
  }

  // Generate PKCE challenge
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  // Store verifier in session/database
  await storeCodeVerifier(userId, codeVerifier);

  // Build authorization URL
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.TWITTER_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/connect/twitter/callback`,
    scope: "tweet.read tweet.write users.read offline.access",
    state: userId,
    code_challenge: codeChallenge,
    code_challenge_method: "S256"
  });

  const authUrl = `https://twitter.com/i/oauth2/authorize?${params}`;
  return NextResponse.redirect(authUrl);
}
```

**OAuth Callback**:
```typescript
// apps/web/src/app/api/social/connect/twitter/callback/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // userId
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`/dashboard?error=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect("/dashboard?error=missing_params");
  }

  try {
    // Retrieve code verifier
    const codeVerifier = await getCodeVerifier(state);

    // Exchange code for tokens
    const tokenResponse = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
        ).toString("base64")}`
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/connect/twitter/callback`,
        code_verifier: codeVerifier
      })
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokens.error_description || "Token exchange failed");
    }

    // Get user info
    const userResponse = await fetch("https://api.twitter.com/2/users/me", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    });

    const userData = await userResponse.json();

    // Store encrypted tokens
    await prisma.socialAccount.upsert({
      where: {
        brandId_platform_accountId: {
          brandId: state,
          platform: "TWITTER",
          accountId: userData.data.id
        }
      },
      create: {
        brandId: state,
        platform: "TWITTER",
        accountId: userData.data.id,
        accountName: userData.data.username,
        accessToken: await encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? await encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
      },
      update: {
        accessToken: await encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? await encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        isActive: true
      }
    });

    return NextResponse.redirect("/dashboard?success=twitter_connected");
  } catch (error) {
    console.error("Twitter OAuth error:", error);
    return NextResponse.redirect("/dashboard?error=connection_failed");
  }
}
```

---

### LinkedIn (OAuth 2.0)

**OAuth Initiation**:
```typescript
// apps/web/src/app/api/social/connect/linkedin/route.ts
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect("/sign-in");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/connect/linkedin/callback`,
    scope: "openid profile email w_member_social",
    state: userId
  });

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  return NextResponse.redirect(authUrl);
}
```

**OAuth Callback**:
```typescript
// apps/web/src/app/api/social/connect/linkedin/callback/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code!,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/connect/linkedin/callback`
      })
    });

    const tokens = await tokenResponse.json();

    // Get user profile
    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    });

    const profile = await profileResponse.json();

    // Store connection
    await prisma.socialAccount.upsert({
      where: {
        brandId_platform_accountId: {
          brandId: state!,
          platform: "LINKEDIN",
          accountId: profile.sub
        }
      },
      create: {
        brandId: state!,
        platform: "LINKEDIN",
        accountId: profile.sub,
        accountName: profile.name,
        accessToken: await encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? await encrypt(tokens.refresh_token) : null,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000)
      },
      update: {
        accessToken: await encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? await encrypt(tokens.refresh_token) : null,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        isActive: true
      }
    });

    return NextResponse.redirect("/dashboard?success=linkedin_connected");
  } catch (error) {
    console.error("LinkedIn OAuth error:", error);
    return NextResponse.redirect("/dashboard?error=connection_failed");
  }
}
```

---

### Facebook/Instagram (OAuth 2.0)

Facebook and Instagram use the same OAuth flow (Meta Graph API).

**OAuth Initiation**:
```typescript
// apps/web/src/app/api/social/connect/facebook/route.ts
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect("/sign-in");
  }

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/connect/facebook/callback`,
    scope: "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish",
    state: userId
  });

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params}`;
  return NextResponse.redirect(authUrl);
}
```

**OAuth Callback**:
```typescript
// apps/web/src/app/api/social/connect/facebook/callback/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  try {
    // Exchange code for token
    const tokenUrl = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", process.env.META_APP_ID!);
    tokenUrl.searchParams.set("client_secret", process.env.META_APP_SECRET!);
    tokenUrl.searchParams.set("code", code!);
    tokenUrl.searchParams.set("redirect_uri", `${process.env.NEXT_PUBLIC_APP_URL}/api/social/connect/facebook/callback`);

    const tokenResponse = await fetch(tokenUrl);
    const tokens = await tokenResponse.json();

    // Get user's pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${tokens.access_token}`
    );
    const pages = await pagesResponse.json();

    // Store each page as a separate account
    for (const page of pages.data) {
      await prisma.socialAccount.upsert({
        where: {
          brandId_platform_accountId: {
            brandId: state!,
            platform: "FACEBOOK",
            accountId: page.id
          }
        },
        create: {
          brandId: state!,
          platform: "FACEBOOK",
          accountId: page.id,
          accountName: page.name,
          accessToken: await encrypt(page.access_token),
          refreshToken: null,
          expiresAt: null // Page tokens don't expire
        },
        update: {
          accessToken: await encrypt(page.access_token),
          isActive: true
        }
      });
    }

    return NextResponse.redirect("/dashboard?success=facebook_connected");
  } catch (error) {
    console.error("Facebook OAuth error:", error);
    return NextResponse.redirect("/dashboard?error=connection_failed");
  }
}
```

---

## Token Encryption/Decryption

```typescript
// apps/web/src/lib/crypto.ts
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex"); // 32-byte key

export async function encrypt(text: string): Promise<string> {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export async function decrypt(encryptedData: string): Promise<string> {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
```

---

## Publishing to Social Platforms

### Twitter Publishing

```typescript
// apps/web/src/lib/services/social-publishing/twitter.ts
export async function publishToTwitter(
  account: SocialAccount,
  content: string
) {
  const accessToken = await decrypt(account.accessToken);

  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      text: content
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail || "Failed to post to Twitter");
  }

  return result.data.id; // Tweet ID
}
```

### LinkedIn Publishing

```typescript
// apps/web/src/lib/services/social-publishing/linkedin.ts
export async function publishToLinkedIn(
  account: SocialAccount,
  content: string
) {
  const accessToken = await decrypt(account.accessToken);

  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0"
    },
    body: JSON.stringify({
      author: `urn:li:person:${account.accountId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: content
          },
          shareMediaCategory: "NONE"
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to post to LinkedIn");
  }

  return result.id;
}
```

### Facebook Publishing

```typescript
// apps/web/src/lib/services/social-publishing/facebook.ts
export async function publishToFacebook(
  account: SocialAccount,
  content: string
) {
  const accessToken = await decrypt(account.accessToken);

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${account.accountId}/feed`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: content,
        access_token: accessToken
      })
    }
  );

  const result = await response.json();

  if (result.error) {
    throw new Error(result.error.message || "Failed to post to Facebook");
  }

  return result.id; // Post ID
}
```

---

## Token Refresh

Twitter and LinkedIn tokens expire and need refreshing:

```typescript
export async function refreshTwitterToken(account: SocialAccount) {
  const refreshToken = await decrypt(account.refreshToken!);

  const response = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
      ).toString("base64")}`
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  const tokens = await response.json();

  // Update stored tokens
  await prisma.socialAccount.update({
    where: { id: account.id },
    data: {
      accessToken: await encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? await encrypt(tokens.refresh_token) : null,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000)
    }
  });

  return tokens.access_token;
}
```

---

## Best Practices

1. **Always encrypt tokens** - Never store plaintext access tokens
2. **Handle token expiration** - Check expiry before using, refresh if needed
3. **Use state parameter** - Prevent CSRF attacks
4. **Validate redirect URI** - Must match exactly in OAuth config
5. **Handle errors gracefully** - Show user-friendly messages
6. **Store platform IDs** - For fetching analytics later
7. **Rate limiting** - Respect platform API limits
8. **Webhook verification** - Verify signatures for incoming webhooks
