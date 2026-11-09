import { Fragment } from "react";
import { isStop } from "./rail";
import type { RailwayScene } from "./scene";

/** Reduced-motion version of the scroll journey: the same route and story as a printed timetable. */
export default function Timetable({ scene, story }: { scene: RailwayScene; story: { lead: string; text: string }[] }) {
  const stops = scene.route.filter(isStop);
  return (
    <section className="rw-tt" aria-label={`${scene.train.no} ${scene.train.name} timetable`}>
      <ol className="frame">
        {stops.map((s, i) => (
          <Fragment key={s.code}>
            <li className="rw-tt-stop">
              <span className="rw-tt-code">{s.code}</span>
              <span className="rw-tt-name">
                {s.en}
                <span lang="hi" className="rw-hi">
                  {s.hi}
                </span>
              </span>
              <span className="rw-tt-time">
                {s.arr ?? "—"} · {s.dep ?? "—"}
              </span>
              <span className="rw-tt-food">{s.famous}</span>
            </li>
            {story[i] && (
              <li className="rw-tt-ann">
                <span lang="hi" className="rw-hi">
                  {scene.announce.hi}
                </span>
                <p>
                  <b>{story[i].lead}.</b> {story[i].text}
                </p>
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </section>
  );
}
