import type { Metadata } from "next";
import { Page } from "@/components/transitions/Page";
import WorkIndex from "@/components/work/WorkIndex";
import { summaries } from "@/data/projects";

export const metadata: Metadata = {
  title: "Work",
  description: "Selected worlds: every project gets its own environment.",
};

export default function WorkPage() {
  return (
    <Page>
      <WorkIndex projects={summaries} />
    </Page>
  );
}
