import type { Metadata } from "next";
import { Page } from "@/components/transitions/Page";
import ThinkPage from "@/components/think/ThinkPage";

export const metadata: Metadata = {
  title: "Think",
  description: "How my brain works: observe, question, design, build, break, fix, ship.",
};

export default function ThinkPageRoute() {
  return (
    <Page>
      <ThinkPage />
    </Page>
  );
}
