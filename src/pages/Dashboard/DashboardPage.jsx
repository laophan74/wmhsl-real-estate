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

// Extract numeric score from different possible locations in a lead object
function getLeadScore(lead) {
  const raw = lead?.score ?? lead?.metadata?.score ?? lead?.metadata?.lead_score ?? lead?.metadata?.custom_fields?.score ?? lead?.contact?.score;
  const num = typeof raw === "string" ? Number(raw) : raw;
  return typeof num === "number" && !isNaN(num) ? num : undefined;
}

// Map score to category: =75 -> HOT, =50 -> WARM, <50 -> COLD, otherwise '-'
function getLeadCategory(lead) {
  const score = getLeadScore(lead);
  if (score === 75) return "HOT";
  if (score === 50) return "WARM";
  if (typeof score === "number" && score < 50) return "COLD";
  return "-";
}

// Normalize boolean or string values to 'yes' / 'no' (fallback '-')
function toYesNo(value) {
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "yes") return "yes";
    if (v === "false" || v === "no") return "no";
  }
  return value == null || value === "" ? "-" : String(value);
}

export default function DashboardPage() {
  const [active, setActive] = useState("leads");
  const [leads, setLeads] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [messages, setMessages] = useState([]);

  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState(null);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsError, setAdminsError] = useState(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState(null);

  // Edit modal state
  const [editingLead, setEditingLead] = useState(null); // the full lead object being edited
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    suburb: "",
    timeframe: "",
    selling: "no",
    buying: "no",
    score: "",
    status: "",
  });

  const openEdit = (lead) => {
    const c = lead?.contact || {};
    setEditingLead(lead);
    setEditForm({
      first_name: c.first_name || "",
      last_name: c.last_name || "",
      email: c.email || "",
      phone: c.phone || "",
      suburb: c.suburb || "",
      timeframe: c.timeframe || "",
      selling: (typeof c.selling_interest === 'boolean' ? (c.selling_interest ? 'yes' : 'no') : (typeof c.interested === 'string' ? c.interested : 'no')) || 'no',
      buying: (typeof c.buying_interest === 'boolean' ? (c.buying_interest ? 'yes' : 'no') : (typeof (lead?.metadata?.custom_fields?.buying_interest) === 'string' ? lead.metadata.custom_fields.buying_interest : 'no')) || 'no',
      score: (c.score != null ? String(c.score) : (lead?.metadata?.custom_fields?.score != null ? String(lead.metadata.custom_fields.score) : '')),
      status: lead?.status || "",
    });
  };

  const closeEdit = () => {
    setEditingLead(null);
  };

  const onEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((f) => ({ ...f, [name]: value }));
  };

  const saveEdit = async () => {
    if (!editingLead) return;
    const leadId = editingLead.lead_id || editingLead.id;
    if (!leadId) return;

    const contact = {
      first_name: editForm.first_name.trim(),
      last_name: editForm.last_name.trim(),
      email: editForm.email.trim().toLowerCase(),
      phone: editForm.phone.trim(),
      suburb: editForm.suburb,
      timeframe: editForm.timeframe,
      selling_interest: editForm.selling === 'yes',
      buying_interest: editForm.buying === 'yes',
    };
    // only include score if provided and valid
    const scoreNum = Number(editForm.score);
    if (!isNaN(scoreNum) && editForm.score !== "") {
      contact.score = scoreNum;
    }

    // Build body conditionally (contact + optional status)
    const body = { contact };
    if (editForm.status && editForm.status.trim() !== "") {
      body.status = editForm.status.trim();
    }

    try {
      const res = await fetch(`${BASE_URL}/api/v1/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} ${text}`);
      }
      let updated;
      try { updated = await res.json(); } catch (_) { updated = null; }
      setLeads((list) => list.map((x) => {
        const idX = x.lead_id || x.id;
        if (idX !== leadId) return x;
        const newContact = updated?.contact || { ...x.contact, ...contact };
        const newStatus = updated?.status ?? body.status ?? x.status;
        const newMeta = updated?.metadata || x.metadata;
        return { ...x, contact: newContact, status: newStatus, metadata: newMeta };
      }));
      closeEdit();
    } catch (err) {
      alert(`Failed to update lead: ${err.message}`);
    }
  };

  const deleteLead = async (lead) => {
    const leadId = lead.lead_id || lead.id;
    if (!leadId) return;
    const ok = window.confirm("Are you sure you want to delete this lead?");
    if (!ok) return;
    try {
      const res = await fetch(`${BASE_URL}/api/v1/leads/${leadId}`, { method: 'DELETE' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} ${text}`);
      }
      // Optimistically remove from list
      setLeads((list) => list.filter((x) => (x.lead_id || x.id) !== leadId));
    } catch (err) {
      alert(`Failed to delete lead: ${err.message}`);
    }
  };

  const BASE_URL = "https://wmhsl-real-estate-backend.vercel.app";

  // Fetch all leads using paginated requests (limit 100, increasing offset) until empty batch
  const fetchLeads = async () => {
    setLeadsLoading(true);
    setLeadsError(null);
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
      setLeadsError(err.message || "Failed to load leads");
      setLeads([]);
    } finally {
      setLeadsLoading(false);
    }
  };

  // Fetch all admins with pagination
  const fetchAdmins = async () => {
    setAdminsLoading(true);
    setAdminsError(null);
    try {
      const pageSize = 100;
      let offset = 0;
      const all = [];
      while (true) {
        const url = `${BASE_URL}/api/v1/admins?limit=${pageSize}&offset=${offset}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();
        const list = Array.isArray(json) ? json : (Array.isArray(json?.value) ? json.value : []);
        if (!Array.isArray(list) || list.length === 0) break;
        all.push(...list);
        if (list.length < pageSize) break;
        offset += pageSize;
      }
      setAdmins(all);
    } catch (err) {
      setAdminsError(err.message || "Failed to load admins");
      setAdmins([]);
    } finally {
      setAdminsLoading(false);
    }
  };

  // Fetch all messages with pagination
  const fetchMessages = async () => {
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const pageSize = 100;
      let offset = 0;
      const all = [];
      while (true) {
        const url = `${BASE_URL}/api/v1/messages?limit=${pageSize}&offset=${offset}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();
        const list = Array.isArray(json) ? json : (Array.isArray(json?.value) ? json.value : []);
        if (!Array.isArray(list) || list.length === 0) break;
        all.push(...list);
        if (list.length < pageSize) break;
        offset += pageSize;
      }
      setMessages(all);
    } catch (err) {
      setMessagesError(err.message || "Failed to load messages");
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (active === "leads") fetchLeads();
    if (active === "admins") fetchAdmins();
    if (active === "messages") fetchMessages();
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
          <div className="header-actions">
            {active === "leads" && (
              <button className="btn" onClick={fetchLeads}>Refresh</button>
            )}
            {active === "admins" && (
              <button className="btn" onClick={fetchAdmins}>Refresh</button>
            )}
            {active === "messages" && (
              <button className="btn" onClick={fetchMessages}>Refresh</button>
            )}
          </div>
        </header>

        <section className="dashboard-content">
          {active === "leads" && (
            <div className="table-wrap">
              {leadsLoading ? (
                <div className="empty">Loading leads…</div>
              ) : leadsError ? (
                <div className="empty error">Error: {leadsError}</div>
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
                      <th>Category</th>
                      <th>Selling</th>
                      <th>Buying</th>
                      <th>Created</th>
                      <th>Actions</th>
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
                        <td>{getLeadCategory(l)}</td>
                        <td>{toYesNo(l.contact?.selling_interest ?? l.contact?.interested)}</td>
                        <td>{toYesNo(l.contact?.buying_interest ?? l.metadata?.custom_fields?.buying_interest)}</td>
                        <td>{formatDate(l.metadata?.created_at) || "-"}</td>
                        <td>
                          <div className="row-actions">
                            <button className="btn small" onClick={() => openEdit(l)}>Edit</button>
                            <button className="btn danger small" onClick={() => deleteLead(l)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {active === "admins" && (
            <div className="table-wrap">
              {adminsLoading ? (
                <div className="empty">Loading admins…</div>
              ) : adminsError ? (
                <div className="empty error">Error: {adminsError}</div>
              ) : admins.length === 0 ? (
                <div className="empty">No admins found.</div>
              ) : (
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Username</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((a, idx) => (
                      <tr key={a.id || a.admin_id || idx}>
                        <td className="mono">{idx + 1}</td>
                        <td>{a.username || "-"}</td>
                        <td>{`${a.first_name || ""} ${a.last_name || ""}`.trim()}</td>
                        <td>{a.email || "-"}</td>
                        <td>{formatDate(a.metadata?.created_at || a.created_at) || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {active === "messages" && (
            <div className="table-wrap">
              {messagesLoading ? (
                <div className="empty">Loading messages…</div>
              ) : messagesError ? (
                <div className="empty error">Error: {messagesError}</div>
              ) : messages.length === 0 ? (
                <div className="empty">No messages found.</div>
              ) : (
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((m, idx) => {
                      const text = (m.message ?? m.content ?? m.body ?? "").toString();
                      return (
                        <tr key={m.id || m.message_id || idx}>
                          <td className="mono">{idx + 1}</td>
                          <td>{text}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      </main>
      {editingLead && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Lead</h3>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <label>
                  First name
                  <input name="first_name" value={editForm.first_name} onChange={onEditChange} />
                </label>
                <label>
                  Last name
                  <input name="last_name" value={editForm.last_name} onChange={onEditChange} />
                </label>
                <label>
                  Email
                  <input name="email" type="email" value={editForm.email} onChange={onEditChange} />
                </label>
                <label>
                  Phone
                  <input name="phone" value={editForm.phone} onChange={onEditChange} />
                </label>
                <label>
                  Suburb
                  <input name="suburb" value={editForm.suburb} onChange={onEditChange} />
                </label>
                <label>
                  Timeframe
                  <select name="timeframe" value={editForm.timeframe} onChange={onEditChange}>
                    <option value="">Choose…</option>
                    <option value="1-3 months">1-3 months</option>
                    <option value="3-6 months">3-6 months</option>
                    <option value="6+ months">6+ months</option>
                    <option value="not sure">Not sure</option>
                  </select>
                </label>
                <label>
                  Selling interest
                  <select name="selling" value={editForm.selling} onChange={onEditChange}>
                    <option value="yes">yes</option>
                    <option value="no">no</option>
                  </select>
                </label>
                <label>
                  Buying interest
                  <select name="buying" value={editForm.buying} onChange={onEditChange}>
                    <option value="yes">yes</option>
                    <option value="no">no</option>
                  </select>
                </label>
                <label>
                  Score
                  <input name="score" value={editForm.score} onChange={onEditChange} placeholder="e.g., 75" />
                </label>
                <label>
                  Status
                  <input name="status" value={editForm.status} onChange={onEditChange} placeholder="e.g., new, contacted" />
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={saveEdit}>Save</button>
              <button className="btn muted" onClick={closeEdit}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
