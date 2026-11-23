import { Page } from "@/components/transitions/Page";
import Hero from "@/components/hero/Hero";
import Bench from "@/components/home/Bench";
import Worlds from "@/components/home/Worlds";
import ThinkTeaser from "@/components/home/ThinkTeaser";
import Identity from "@/components/home/Identity";
import LabStrip from "@/components/home/LabStrip";
import Contact from "@/components/home/Contact";
import Ending from "@/components/home/Ending";
import { summaries } from "@/data/projects";
import { profile } from "@/data/profile";
import { site } from "@/data/site";

// who this site belongs to, for search engines (schema.org Person)
const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  url: site.url,
  jobTitle: profile.roles[0],
  address: { "@type": "PostalAddress", addressLocality: profile.location.city, addressCountry: profile.location.country },
  sameAs: profile.socials.map((s) => s.href),
};

// The journey: BOOT → ENTER → PLAY → SELECTED WORLDS → THINK → IDENTITY → LAB → CONTACT → SESSION COMPLETE → RESTART
export default function Home() {
  return (
    <Page>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, "\\u003c") }} />
      <Hero />
      <Bench />
      <Worlds projects={summaries} />
      <ThinkTeaser />
      <Identity />
      <LabStrip />
      <Contact />
      <Ending />
    </Page>
  );
}
