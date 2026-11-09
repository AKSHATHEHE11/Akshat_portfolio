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

// The journey: BOOT → ENTER → PLAY → SELECTED WORLDS → THINK → IDENTITY → LAB → CONTACT → SESSION COMPLETE → RESTART
export default function Home() {
  return (
    <Page>
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
