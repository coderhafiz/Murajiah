import { getApprovedComments } from "@/app/actions/comments";
import { TestimonialCarousel } from "@/components/marketing/TestimonialCarousel";

export default async function TestimonialsWrapper() {
  const approvedComments = await getApprovedComments();

  if (approvedComments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight">
          Loved by the Community
        </h2>
        <p className="text-muted-foreground text-lg">
          See what our users are saying about their learning journey.
        </p>
      </div>
      <TestimonialCarousel comments={approvedComments} />
    </div>
  );
}
