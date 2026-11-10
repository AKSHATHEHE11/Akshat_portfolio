import type { Metadata } from "next";
import { Page } from "@/components/transitions/Page";
import WorkIndex, { type IndexProject } from "@/components/work/WorkIndex";
import { projects, toSummary } from "@/data/projects";

export const metadata: Metadata = {
  title: "Work",
  description: "Selected worlds: every project gets its own environment.",
};

// Derived here on the server: the listing shows three tags and a "file size" per project, and only
// those reach the browser — not every world's full scene data.
const listing: IndexProject[] = projects.map((p) => ({
  ...toSummary(p),
  tags: p.technologies.slice(0, 3).map((t) => t.name),
  size: `${(JSON.stringify(p).length / 1024).toFixed(1)}K`,
}));

export default function WorkPage() {
  return (
    <Page>
      <WorkIndex projects={listing} />
    </Page>
  );
}
