import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing Svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Get webhook secret from environment
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  // If no webhook secret, skip verification in development
  let evt: WebhookEvent;

  if (webhookSecret) {
    const wh = new Webhook(webhookSecret);
    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return new Response("Error: Verification failed", {
        status: 400,
      });
    }
  } else {
    // Development mode - skip verification
    console.warn("CLERK_WEBHOOK_SECRET not set, skipping verification");
    evt = payload as WebhookEvent;
  }

  // Handle the webhook event
  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    const primaryEmail = email_addresses?.[0]?.email_address;

    if (!primaryEmail) {
      return new Response("Error: No email address", { status: 400 });
    }

    try {
      await prisma.user.create({
        data: {
          id: id,
          email: primaryEmail,
          firstName: first_name || null,
          lastName: last_name || null,
          imageUrl: image_url || null,
        },
      });

      console.log(`User created in database: ${id}`);
    } catch (error) {
      console.error("Error creating user:", error);
      return new Response("Error: Failed to create user", { status: 500 });
    }
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    const primaryEmail = email_addresses?.[0]?.email_address;

    try {
      await prisma.user.update({
        where: { id: id },
        data: {
          email: primaryEmail,
          firstName: first_name || null,
          lastName: last_name || null,
          imageUrl: image_url || null,
        },
      });

      console.log(`User updated in database: ${id}`);
    } catch (error) {
      console.error("Error updating user:", error);
      // User might not exist yet, create them
      if (primaryEmail) {
        await prisma.user.create({
          data: {
            id: id,
            email: primaryEmail,
            firstName: first_name || null,
            lastName: last_name || null,
            imageUrl: image_url || null,
          },
        });
      }
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    if (id) {
      try {
        await prisma.user.delete({
          where: { id: id },
        });

        console.log(`User deleted from database: ${id}`);
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  }

  return new Response("Webhook processed", { status: 200 });
}
