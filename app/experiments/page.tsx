import type { Metadata } from "next";
import { Page } from "@/components/transitions/Page";
import ExperimentsLab from "@/components/experiments/ExperimentsLab";

export const metadata: Metadata = {
  title: "Experiments",
  description: "Six small creative-coding experiments you can run in the browser.",
};

export default function ExperimentsLabRoute() {
  return (
    <Page>
      <ExperimentsLab />
    </Page>
  );
}
