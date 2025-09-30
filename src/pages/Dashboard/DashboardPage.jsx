import React, { useEffect, useState } from "react";
import "./DashboardPage.css";

const TABS = [
  { key: "leads", label: "Leads" },
  { key: "admins", label: "Admins" },
  { key: "messages", label: "Messages" },
];

// Safely format date values from backend (ISO string, epoch, or Firestore Timestamp-like)
function formatDate(value) {
  if (!value) return "";
  try {
    // String or number (epoch ms)
    if (typeof value === "string" || typeof value === "number") {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    }
    // Firestore Timestamp JSON shapes
    if (typeof value === "object") {
      if (typeof value._seconds === "number") {
        const ms = value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1e6);
        return new Date(ms).toLocaleString();
      }
      if (typeof value.seconds === "number") {
        const ms = value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
        return new Date(ms).toLocaleString();
      }
    }
  } catch (_) {}
  return "";
}

export default function DashboardPage() {
  const [active, setActive] = useState("leads");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const BASE_URL = "https://wmhsl-real-estate-backend.vercel.app";

  // Fetch all leads using paginated requests (limit 100, increasing offset) until empty batch
  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const pageSize = 100;
      let offset = 0;
      const all = [];
      while (true) {
        const url = `${BASE_URL}/api/v1/leads?limit=${pageSize}&offset=${offset}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const batch = await res.json();
        if (!Array.isArray(batch) || batch.length === 0) break;
        all.push(...batch);
        if (batch.length < pageSize) break; // no more pages
        offset += pageSize;
      }
      setLeads(all);
    } catch (err) {
      setError(err.message || "Failed to load leads");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active === "leads") fetchLeads();
  }, [active]);

  return (
    <div className="dashboard-root">
      <aside className="dashboard-sidebar">
        <div className="brand">Stone Real Estate</div>
        <nav className="nav">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={"nav-item" + (active === t.key ? " active" : "")}
              onClick={() => setActive(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <h2>{TABS.find((t) => t.key === active)?.label}</h2>
          {active === "leads" && (
            <div className="header-actions">
              <button className="btn" onClick={fetchLeads}>Refresh</button>
            </div>
          )}
        </header>

        <section className="dashboard-content">
          {active === "leads" && (
            <div className="table-wrap">
              {loading ? (
                <div className="empty">Loading leads…</div>
              ) : error ? (
                <div className="empty error">Error: {error}</div>
              ) : leads.length === 0 ? (
                <div className="empty">No leads found.</div>
              ) : (
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Suburb</th>
                      <th>Timeframe</th>
                      <th>Selling</th>
                      <th>Buying</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((l, idx) => (
                      <tr key={l.lead_id || l.id || idx}>
                        <td className="mono">{idx + 1}</td>
                        <td>{(l.contact?.first_name || "") + " " + (l.contact?.last_name || "")}</td>
                        <td>{l.contact?.email}</td>
                        <td>{l.contact?.phone}</td>
                        <td>{l.contact?.suburb}</td>
                        <td>{l.contact?.timeframe}</td>
                        <td>{String(l.contact?.selling_interest ?? l.contact?.interested ?? "")}</td>
                        <td>{String(l.contact?.buying_interest ?? l.metadata?.custom_fields?.buying_interest ?? "")}</td>
                        <td>{formatDate(l.metadata?.created_at) || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {active === "admins" && (
            <div className="empty">Admins management coming soon.</div>
          )}

          {active === "messages" && (
            <div className="empty">Messages inbox coming soon.</div>
          )}
        </section>
      </main>
    </div>
  );
}
