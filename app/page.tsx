
"use client";
import TradeDesk from "../components/TradeDesk";

export default function Page() {
  return (
    <main>
      <header style={{ padding: 20, background: "#111", color: "white" }}>
        <h1>Brenham CDJR TradeDesk</h1>
        <p>1880 US-290, Brenham, TX</p>
      </header>

      <section style={{ padding: 40 }}>
        <h2>Get a Cash Offer for Your Vehicle</h2>
        <p>Upload photos, VIN, and mileage. TradeDesk by Solace prepares your offer.</p>
      </section>

      <TradeDesk />
    </main>
  );
}
