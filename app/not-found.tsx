import Link from "next/link";

export default function NotFound() {
  return <main className="catalog-main">
    <div className="brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="brand-logo" src="/logo_liggande.png" alt="Astar Education" width={784} height={219} />
    </div>
    <div className="catalog-heading"><h1>Produktbladet hittades inte</h1><p>Välj ett produktblad i biblioteket för att fortsätta.</p></div>
    <Link className="catalog-example" href="/produktblad">Alla produktblad</Link>
  </main>;
}
