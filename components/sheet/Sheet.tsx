import { QRCodeSVG } from "qrcode.react";
import { templateVersion, type SheetData } from "@/lib/sheet";

type Props = {
  data: SheetData;
  imageSrc?: string;
};

function Section({ title, titleField, field, children, facts = false }: { title: string; titleField: keyof SheetData; field: keyof SheetData; children: string; facts?: boolean }) {
  return <section className="sheet-section" data-field={field}>
    <h2 data-field={titleField}>{title}</h2>
    <p>{facts ? children.split("\n").map((line, index) => {
      const match = /^(\s*(?:Ort|Studieform|Omfattning|Längd|APL|Mål):)(.*)$/i.exec(line);
      return <span key={index}>{index > 0 && <br />}{match ? <><strong>{match[1]}</strong>{match[2]}</> : line}</span>;
    }) : children}</p>
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
  const af = data.layout === "af";
  const qrValue = /^https?:\/\//i.test(data.qrUrl) ? data.qrUrl : "https://example.org/produktblad";
  const contact = (second = false) => <div className="sheet-contact" data-field={second ? "contactTwoEmail" : "contactOneEmail"}>
    <strong>{af ? (second ? data.contactTwoRole : data.contactOneRole) : (second ? data.contactTwoName : data.contactOneName)}</strong>
    <span>{af ? (second ? data.contactTwoName : data.contactOneName) : (second ? data.contactTwoRole : data.contactOneRole)}</span>
    <span>{second ? data.contactTwoEmail : data.contactOneEmail}</span>
  </div>;
  const hasContactOne = Boolean(data.contactOneName || data.contactOneRole || data.contactOneEmail);
  const hasContactTwo = Boolean(data.contactTwoName || data.contactTwoRole || data.contactTwoEmail);
  return <article className="sheet-page" data-layout={af ? "af" : data.layout === "umea" ? "umea" : "standard"} data-template={templateVersion(data)} aria-label="Produktblad, en A4-sida">
    <div className="sheet-hero" data-overlay={data.gradientStyle}>
      {/* The local prototype uses an image extracted from the supplied PDF. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="sheet-hero-image" src={imageSrc ?? data.image} alt={`Utbildningsbild: ${data.profession}`} />
      {data.gradientStyle !== "none" && <div className="sheet-hero-gradient" data-gradient={data.gradientStyle} data-strength={data.gradientStrength} aria-hidden="true" />}
      <div className="sheet-eyebrow" data-field="eyebrow">{data.eyebrow}</div>
      <div className="sheet-red-line" />
      <div className="sheet-title" data-field="title" data-rows={data.titleRows}>
        <div data-color={data.titleLineColor}>{data.titleLine}</div>
        <div><span className="title-prefix" data-color={data.titlePrefixColor}>{data.titlePrefix}</span>{data.titlePrefix && " "}<span className="title-profession" data-color={data.professionColor}>{data.profession}</span></div>
      </div>
      <div className="sheet-intro" data-field="intro">{data.intro}</div>
    </div>

    <div className="sheet-columns">
      <div className="sheet-column sheet-left" data-column="left">
        <Section title={data.whyTitle} titleField="whyTitle" field="why">{data.why}</Section>
        <Section title={data.learnTitle} titleField="learnTitle" field="learn">{data.learn}</Section>
        {af && <Section title={data.processTitle} titleField="processTitle" field="process">{data.process}</Section>}
      </div>
      <div className="sheet-column sheet-right" data-column="right">
        {!af && <><Section title={data.processTitle} titleField="processTitle" field="process">{data.process}</Section>
        <Section title={data.formTitle} titleField="formTitle" field="form">{data.form}</Section></>}
        <Section title={data.audienceTitle} titleField="audienceTitle" field="audience">{data.audience}</Section>
        {af && <Section title={data.startTitle ?? "Utbildningsstart"} titleField="startTitle" field="start">{data.start ?? ""}</Section>}
        <Section title={data.financeTitle} titleField="financeTitle" field="finance">{data.finance}</Section>
        {af && <Section title={data.formTitle} titleField="formTitle" field="form" facts>{data.form}</Section>}
      </div>
    </div>

    {af && <section className="sheet-af-contacts" data-two-contacts={hasContactOne && hasContactTwo}>
      <h2>Kontaktpersoner</h2>
      <div className="sheet-af-contact-grid">{hasContactOne && contact()}{hasContactTwo && contact(true)}</div>
    </section>}

    <div className="sheet-bottom">
      <div className="sheet-about" data-field="about"><strong>Astar</strong>{data.about ? ` ${data.about.replace(/^Astar\s*/, "").trimStart()}` : ""}</div>
      <div className="sheet-footer">
        <div className="sheet-logo-group">
          <AstarMark />
          {af && data.schoolName && <div className="sheet-school">Astar {data.schoolName}</div>}
          <div className="sheet-address" data-field="address">{data.address}</div>
        </div>
        <div className="sheet-qr" data-field="qrUrl"><QRCodeSVG value={qrValue} size={43} marginSize={0} fgColor="#174f9e" bgColor="#fff" /></div>
        {!af && <>{hasContactOne && contact()}{hasContactTwo && contact(true)}</>}
      </div>
    </div>
  </article>;
}
