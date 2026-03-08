import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret) {
      console.error("Missing Paystack secret key");
      return NextResponse.json(
        { error: "Configuration error" },
        { status: 500 },
      );
    }

    // Verify Signature
    const hash = crypto
      .createHmac("sha512", secret)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      console.error("Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.event;
    const data = payload.data;

    // Extract user_id. From payment page it might be under metadata.custom_fields
    // or passed directly in URL and reflected in metadata
    let userId = null;

    if (data.metadata) {
      if (data.metadata.custom_user_id) {
        userId = data.metadata.custom_user_id;
      } else if (
        data.metadata.custom_fields &&
        Array.isArray(data.metadata.custom_fields)
      ) {
        const userIdField = data.metadata.custom_fields.find(
          (f: { variable_name: string; display_name: string; value: string }) =>
            f.variable_name === "custom_user_id" ||
            f.display_name === "custom_user_id",
        );
        if (userIdField) userId = userIdField.value;
      }
    }

    if (!userId) {
      console.error("No user_id found in metadata. Payload:", payload);
      // Return 200 to prevent Paystack from retrying infinitely
      return NextResponse.json({ received: true });
    }

    const supabase = createAdminClient();

    // Map Paystack Events to Database Updates
    if (eventName === "charge.success") {
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: "active",
          paystack_customer_id: String(data.customer.customer_code),
          paystack_subscription_id: data.plan
            ? String(data.plan.plan_code)
            : null,
        })
        .eq("id", userId);

      if (error) {
        console.error("Failed to update profile for successful charge:", error);
      }
    } else if (eventName === "subscription.create") {
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: data.status, // e.g., 'active'
          paystack_customer_id: String(data.customer.customer_code),
          paystack_subscription_id: String(data.subscription_code),
        })
        .eq("id", userId);

      if (error) {
        console.error(
          "Failed to update profile for subscription create:",
          error,
        );
      }
    } else if (
      eventName === "subscription.disable" ||
      eventName === "subscription.not_renew"
    ) {
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: "cancelled",
        })
        .eq("id", userId);

      if (error) {
        console.error(
          "Failed to update profile for subscription disabled:",
          error,
        );
      }
    } else {
      console.log(`Unhandled webhook event: ${eventName}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook processing error:", errorMessage);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
