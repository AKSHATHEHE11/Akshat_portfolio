"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOnScreen } from "@/lib/hooks";
import { play } from "@/lib/sound";
import type { Project } from "@/lib/types";
import SafarApp from "./app/SafarApp";
import { Landscape, newDrive, type SceneryItem } from "./Landscape";
import { Kulhad, Parcel } from "./Props";
import { dayT, toMin } from "./rail";
import type { RailwayScene, Station } from "./scene";

const CRUISE = 0.42;

/** The order window: the real app running in the glass while the countryside goes past. */
export default function Preview({ project }: { project: Project<RailwayScene> }) {
  const { scene } = project;
  const driveRef = useRef(newDrive({ d: 3.2, speed: CRUISE, target: CRUISE, t: dayT(scene.route, toMin(scene.now)) }));
  const frame = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(frame);
  const [stop, setStop] = useState<{ item: SceneryItem; coach: string } | null>(null);
  const [parcels, setParcels] = useState<{ code: string; n: number }[]>([]);
  const dropTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(dropTimer.current), []);

  // the train brakes so the ordered station's platform stops square in the window
  const onArrive = useCallback((station: Station, coach: string) => {
    const D = driveRef.current.d + 1.5;
    driveRef.current.stopAt = D;
    setStop({ item: { D, station, kind: "platform" }, coach });
  }, []);
  const onDepart = useCallback(() => {
    driveRef.current.stopAt = null;
    driveRef.current.target = CRUISE;
  }, []);
  const onDelivered = useCallback((code: string) => {
    setParcels((p) => [...p, { code, n: (p.at(-1)?.n ?? 0) + 1 }].slice(-3));
    dropTimer.current = window.setTimeout(() => play("drop"), 520);
  }, []);

  return (
    <section id="preview" className="rw-preview" aria-labelledby="rw-preview-h">
      <div className="rw-pwin">
        <div className="rw-plate">
          <h2 id="rw-preview-h">
            <span lang="hi" className="rw-hi">
              ऑर्डर खिड़की
            </span>
            <span>Order window</span>
          </h2>
          <p>PNR is prefilled. Order something.</p>
        </div>

        <div ref={frame} className="rw-frame rw-frame-app">
          <Landscape driveRef={driveRef} items={stop ? [stop.item] : []} active={onScreen} coach={stop?.coach ?? "B3"} />
          <div className="rw-glass" aria-hidden />
          <SafarApp brand={project.title} scene={scene} driveRef={driveRef} onArrive={onArrive} onDepart={onDepart} onDelivered={onDelivered} />
          <div className="rw-gasket" aria-hidden />
        </div>

        <div className="rw-table rw-table-app" aria-hidden>
          <div className="rw-table-items">
            <Kulhad />
            {parcels.map((p) => (
              <Parcel key={p.n} code={p.code} brand={project.title} className="rw-parcel-drop" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
