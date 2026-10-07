import { QRCodeSVG } from "qrcode.react";
import type { SheetData } from "@/lib/sheet";

type Props = {
  data: SheetData;
  imageSrc?: string;
};

function Section({ title, field, children }: { title: string; field: keyof SheetData; children: string }) {
  return <section className="sheet-section" data-field={field}>
    <h2>{title}</h2>
    <p>{children}</p>
  </section>;
}

function AstarMark() {
  return <div className="astar-mark" aria-label="Astar Education, schematisk prototyplogotyp">
    <svg className="astar-symbol" viewBox="0 0 44 44" aria-hidden="true">
      <g fill="none" stroke="#ff4b45" strokeWidth="2.5" strokeLinecap="round">
        <path d="M22 2v10M22 32v10M2 22h10M32 22h10M7.9 7.9l7.1 7.1M29 29l7.1 7.1M36.1 7.9L29 15M15 29l-7.1 7.1" />
        <path d="m17 8 3 6M27 30l-3 6M8 17l6 3M30 24l6 3M27 8l-3 6M20 30l-3 6M36 17l-6 3M14 24l-6 3" />
      </g>
    </svg>
    <span className="astar-word">ASTAR<small>EDUCATION</small></span>
  </div>;
}

export function Sheet({ data, imageSrc }: Props) {
  const qrValue = /^https?:\/\//i.test(data.qrUrl) ? data.qrUrl : "https://example.org/produktblad";
  return <article className="sheet-page" data-template="kock-1.0.0-prototyp" aria-label="Produktblad, en A4-sida">
    <div className="sheet-hero">
      {/* The local prototype uses an image extracted from the supplied PDF. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="sheet-hero-image" src={imageSrc ?? data.image} alt="Kockar arbetar i kök" />
      <div className="sheet-eyebrow" data-field="eyebrow">{data.eyebrow}</div>
      <div className="sheet-red-line" />
      <div className="sheet-title" data-field="title">
        <div>{data.titleLine}</div>
        <div>{data.titlePrefix} <span>{data.profession}</span></div>
      </div>
      <div className="sheet-intro" data-field="intro">{data.intro}</div>
    </div>

    <div className="sheet-columns">
      <div className="sheet-column sheet-left" data-column="left">
        <Section title="Varför bli kock?" field="why">{data.why}</Section>
        <Section title="Det här lär du dig" field="learn">{data.learn}</Section>
      </div>
      <div className="sheet-column sheet-right" data-column="right">
        <Section title="Så här går det till." field="process">{data.process}</Section>
        <Section title="Utbildningsform." field="form">{data.form}</Section>
        <Section title="Vem kan söka?" field="audience">{data.audience}</Section>
        <Section title="Ekonomisk kompensation." field="finance">{data.finance}</Section>
      </div>
    </div>

    <div className="sheet-bottom">
      <div className="sheet-about" data-field="about"><strong>Astar</strong>{data.about.replace(/^Astar/, "")}</div>
      <div className="sheet-footer">
        <div className="sheet-logo-group">
          <AstarMark />
          <div className="sheet-address" data-field="address">{data.address}</div>
        </div>
        <div className="sheet-qr" data-field="qrUrl"><QRCodeSVG value={qrValue} size={43} marginSize={0} fgColor="#174f9e" bgColor="#fff" /></div>
        <div className="sheet-contact" data-field="contactOneEmail">
          <strong>{data.contactOneName}</strong>
          <span>{data.contactOneRole}</span>
          <span>{data.contactOneEmail}</span>
        </div>
        <div className="sheet-contact" data-field="contactTwoEmail">
          <strong>{data.contactTwoName}</strong>
          <span>{data.contactTwoRole}</span>
          <span>{data.contactTwoEmail}</span>
        </div>
      </div>
    </div>
  </article>;
}
