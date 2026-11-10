import type { Metadata } from "next";
import { Ephesis } from "next/font/google";
import { Page } from "@/components/transitions/Page";
import DesignPage from "@/components/design/DesignPage";

// The hand-written "I am a / I like" from the cover. Only this route loads it.
const script = Ephesis({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-script" });

export const metadata: Metadata = {
  title: "Design",
  description: "Akshat Agrawal's design side: graphic design, photo and video editing, and 3D.",
};

export default function DesignPageRoute() {
  return (
    <Page>
      <div className={script.variable}>
        <DesignPage />
      </div>
    </Page>
  );
}
