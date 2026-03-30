import { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { getUserAccessContext } from "@/lib/access";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import Link from "next/link";
import { PricingCard } from "@/components/marketing/PricingCard";

// Get this from your Paystack Dashboard -> Payment Pages
// It should look like: https://paystack.com/pay/[page-slug]
const PAYSTACK_CHECKOUT_URL = process.env.PAYSTACK_CHECKOUT_URL || "#";

export const metadata: Metadata = {
  title: "Pricing & Premium Plans",
  description: "Upgrade to Murajiah Premium for unlimited AI quiz generation, private hosting, and advanced analytics.",
};

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isPremium = false;
  let checkoutUrl = PAYSTACK_CHECKOUT_URL;

  if (user) {
    const access = await getUserAccessContext();
    isPremium = access.isPremium;

    // Append the user ID to the checkout URL
    // Paystack payment pages can accept email and custom fields via URL parameters
    if (checkoutUrl !== "#") {
      const url = new URL(checkoutUrl);
      if (user.email) {
        url.searchParams.set("email", user.email);
      }
      url.searchParams.set("custom_user_id", user.id);
      checkoutUrl = url.toString();
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {user && (
        <DashboardNavbar
          user={user}
          profile={null}
          activeSessionCount={0}
          isPremium={isPremium}
        />
      )}

      {!user && (
        <nav className="border-b border-border/40 p-4">
          <Link href="/" className="font-bold text-xl">
            Murajiah
          </Link>
        </nav>
      )}

      <main className="flex-1 max-w-6xl mx-auto px-4 py-16 w-full fade-in zoom-in-95 duration-700 animate-in">
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            Upgrade Your Learning Experience
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock unlimited AI generation, massive quizzes, and the ability to
            host your own private sessions.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <PricingCard
            title="Basic"
            subtitle="For simple learning"
            baseAmountNGN={0}
            features={[
              "Create up to 10 questions per quiz",
              "Host live games for Public quizzes only",
              "Basic analytics and reporting",
              "Standard Question Types (Quiz, True/False)",
            ]}
            buttonText={user ? "Continue with Basic" : "Get Started for Free"}
            buttonHref={user ? "/dashboard" : "/signup"}
            isPremiumStyle={false}
          />

          {/* Premium Tier */}
          <PricingCard
            title="Premium"
            subtitle="Unlock everything Murajiah has to offer"
            baseAmountNGN={3000}
            features={[
              "7-Day Free Trial (New Users)",
              "Unlimited questions per quiz",
              "Generate quizzes instantly from files (PDF, Word, Images)",
              "Generate quizzes from any Topic using Google Gemini or GPT-4o",
              "Host live games for any quiz (Public or Private)",
              "Priority support",
            ]}

            isPremiumStyle={true}
            buttonText={
              isPremium
                ? "You are Premium"
                : user
                  ? "Upgrade Now"
                  : "Login to Upgrade"
            }
            buttonHref={
              isPremium
                ? undefined
                : user
                  ? checkoutUrl
                  : "/login?next=/pricing"
            }
            isButtonDisabled={isPremium}
            footerText="Secure payment processed by Paystack"
          />
        </div>
      </main>
    </div>
  );
}
