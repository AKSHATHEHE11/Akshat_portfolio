import { Page } from "@/components/transitions/Page";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/marks";

export default function NotFound() {
  return (
    <Page>
      <section className="frame relative grid min-h-svh content-center gap-10 py-32">
        <Corners className="text-fg-muted" inset={24} size={22} />
        <p className="label text-signal">ERR 404 — SIGNAL LOST</p>
        <h1 className="display text-display-l">
          Nothing
          <br />
          was <span className="serif-accent normal-case">built</span> here.
        </h1>
        <div>
          <Button href="/" kind="nav-back">
            Back to base
          </Button>
        </div>
      </section>
    </Page>
  );
}
