import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Page } from "@/components/transitions/Page";
import WorldShell from "@/components/worlds/shell/WorldShell";
import { worlds } from "@/components/worlds/registry";
import { getProject, projects, summaries, toSummary } from "@/data/projects";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) return {};
  // a shared link shows the project's own first screen when it has one
  const images = p.heroImage ? [{ url: p.heroImage, width: 1440, height: 900, alt: `${p.title}: first screen` }] : undefined;
  return { title: p.title, description: p.description, openGraph: { title: p.title, description: p.description, type: "website", images } };
}

export default async function WorldPage({ params }: Params) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  const World = worlds[project.environment];

  return (
    <Page>
      <WorldShell current={toSummary(project)} all={summaries}>
        <World project={project} />
      </WorldShell>
    </Page>
  );
}
