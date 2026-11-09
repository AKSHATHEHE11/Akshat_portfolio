import type { Metadata } from "next";
import { Page } from "@/components/transitions/Page";
import AboutPage from "@/components/about/AboutPage";

export const metadata: Metadata = {
  title: "About",
  description: "Akshat Agrawal, design engineer: an identity you explore rather than read.",
};

export default function AboutPageRoute() {
  return (
    <Page>
      <AboutPage />
    </Page>
  );
}
