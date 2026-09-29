import type { Metadata } from "next";
import { ReviewQueue } from "@/components/review/ReviewQueue";

export const metadata: Metadata = {
  title: "Review queue",
};

export default function ReviewPage() {
  return <ReviewQueue />;
}
