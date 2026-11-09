import type { Metadata } from "next";
import { Page } from "@/components/transitions/Page";
import Playground from "@/components/playground/Playground";

export const metadata: Metadata = {
  title: "Playground",
  description: "A laboratory of draggable, throwable, slightly unreasonable things.",
};

export default function PlaygroundRoute() {
  return (
    <Page>
      <Playground />
    </Page>
  );
}
