import { QRCodeSVG } from "qrcode.react";
import { TEMPLATE_VERSION, type SheetData } from "@/lib/sheet";

type Props = {
  data: SheetData;
  imageSrc?: string;
};

function Section({ title, titleField, field, children }: { title: string; titleField: keyof SheetData; field: keyof SheetData; children: string }) {
  return <section className="sheet-section" data-field={field}>
    <h2 data-field={titleField}>{title}</h2>
    <p>{children}</p>
  </section>;
}

function AstarMark() {
  return <div className="astar-mark">
    {/* Use the original file directly in both preview and PDF. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="astar-logo" src="/logo_liggande.png" alt="Astar Education" />
  </div>;
}

export function Sheet({ data, imageSrc }: Props) {
  const qrValue = /^https?:\/\//i.test(data.qrUrl) ? data.qrUrl : "https://example.org/produktblad";
  return <article className="sheet-page" data-template={TEMPLATE_VERSION} aria-label="Produktblad, en A4-sida">
    <div className="sheet-hero" data-overlay={data.gradientStyle}>
      {/* The local prototype uses an image extracted from the supplied PDF. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="sheet-hero-image" src={imageSrc ?? data.image} alt="Kockar arbetar i kök" />
      {data.gradientStyle !== "none" && <div className="sheet-hero-gradient" data-gradient={data.gradientStyle} data-strength={data.gradientStrength} aria-hidden="true" />}
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
        <Section title={data.whyTitle} titleField="whyTitle" field="why">{data.why}</Section>
        <Section title={data.learnTitle} titleField="learnTitle" field="learn">{data.learn}</Section>
      </div>
      <div className="sheet-column sheet-right" data-column="right">
        <Section title={data.processTitle} titleField="processTitle" field="process">{data.process}</Section>
        <Section title={data.formTitle} titleField="formTitle" field="form">{data.form}</Section>
        <Section title={data.audienceTitle} titleField="audienceTitle" field="audience">{data.audience}</Section>
        <Section title={data.financeTitle} titleField="financeTitle" field="finance">{data.finance}</Section>
      </div>
    </div>

    <div className="sheet-bottom">
      <div className="sheet-about" data-field="about"><strong>Astar</strong>{data.about ? ` ${data.about.replace(/^Astar\s*/, "").trimStart()}` : ""}</div>
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
