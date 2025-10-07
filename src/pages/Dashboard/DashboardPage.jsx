import React, { useEffect, useState } from "react";
import "./DashboardPage.css";
import { api } from "../../lib/api";
import { useAuth } from "../../auth/useAuth";

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
  const raw =
    lead?.score ??
    lead?.metadata?.score ??
    lead?.metadata?.lead_score ??
    lead?.metadata?.custom_fields?.score ??
    lead?.metadata?.custom_fields?.lead_score ??
    lead?.contact?.score ??
    lead?.contact?.lead_score;
  const num = typeof raw === "string" ? Number(raw) : raw;
  return typeof num === "number" && !isNaN(num) ? num : undefined;
}

// Map score to category: >=75 -> HOT, >=50 -> WARM, else (<50) -> COLD; fallback to any textual category
function getLeadCategory(lead) {
  const score = getLeadScore(lead);
  if (typeof score === "number") {
    if (score >= 75) return "HOT";
    if (score >= 50) return "WARM";
    return "COLD";
  }
  const rawCat = lead?.category || lead?.metadata?.category || lead?.contact?.category;
  if (rawCat) return String(rawCat).toUpperCase();
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
  const { user, refreshMe, logout } = useAuth();
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
  // Message edit modal state
  const [editingMessage, setEditingMessage] = useState(null);
  const [messageForm, setMessageForm] = useState({ message: "", tags: "", edited_by: "" });

  // Edit modal state
  const [editingLead, setEditingLead] = useState(null); // the full lead object being edited
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    suburb: "",
    timeframe: "",
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
    };
    // Build body: only contact fields per requirement
    const body = { contact };

    try {
      const { data: updated } = await api.patch(`/api/v1/leads/${leadId}`, body);
      setLeads((list) => list.map((x) => {
        const idX = x.lead_id || x.id;
        if (idX !== leadId) return x;
        const newContact = updated?.contact || { ...x.contact, ...contact };
        const newMeta = updated?.metadata || x.metadata;
        return { ...x, contact: newContact, metadata: newMeta };
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
      await api.delete(`/api/v1/leads/${leadId}`);
      // Refresh from server to keep data authoritative
      await fetchLeads();
    } catch (err) {
      alert(`Failed to delete lead: ${err.message}`);
    }
  };

  // Preferred contact extraction (email/phone/other) if present
  function getPreferredContact(lead) {
    const v = lead?.contact?.preferred_contact || lead?.metadata?.preferred_contact || lead?.metadata?.custom_fields?.preferred_contact;
    if (!v) return '-';
    return String(v).trim();
  }

  // Export leads to CSV (Excel compatible)
  const exportLeads = () => {
    if (!leads || leads.length === 0) return;
    const headers = [
      'First Name','Last Name','Score','Status','Selling','Buying','Suburb','Timeframe','Preferred Contact','Email','Phone','Created'
    ];
    const rows = leads.map(l => {
      const c = l.contact || {};
      return [
        c.first_name || '',
        c.last_name || '',
        getLeadScore(l) ?? '',
        getLeadCategory(l) || '',
        toYesNo(c.selling_interest ?? c.interested),
        toYesNo(c.buying_interest ?? l.metadata?.custom_fields?.buying_interest),
        c.suburb || '',
        c.timeframe || '',
        getPreferredContact(l),
        c.email || '',
        c.phone || '',
        formatDate(l.metadata?.created_at) || ''
      ];
    });
    const escape = (val) => {
      const s = String(val ?? '');
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
      return s;
    };
    const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const ts = new Date();
    const pad = (n)=> String(n).padStart(2,'0');
    const name = `leads_export_${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.csv`;
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const BASE_URL = "https://wmhsl-real-estate-backend.vercel.app";

  // Message edit helpers
  const openEditMessage = (msg) => {
    const text = (msg?.message ?? msg?.content ?? msg?.body ?? "").toString();
    const tagsArr = Array.isArray(msg?.metadata?.tags) ? msg.metadata.tags : [];
    const editedBy = msg?.metadata?.custom_fields?.edited_by || "";
    setEditingMessage(msg);
    setMessageForm({
      message: text,
      tags: tagsArr.join(", "),
      edited_by: editedBy,
    });
  };

  const closeEditMessage = () => setEditingMessage(null);
  const onMessageFormChange = (e) => {
    const { name, value } = e.target;
    setMessageForm((f) => ({ ...f, [name]: value }));
  };

  const saveEditMessage = async () => {
    if (!editingMessage) return;
    const msgId = editingMessage.id || editingMessage.message_id || editingMessage.text_id;
    if (!msgId) return;
    const body = { message: messageForm.message };
    const tags = messageForm.tags
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const meta = {};
    if (tags.length > 0) meta.tags = tags;
    if (messageForm.edited_by && messageForm.edited_by.trim() !== "") {
      meta.custom_fields = { edited_by: messageForm.edited_by.trim() };
    }
    if (Object.keys(meta).length > 0) body.metadata = meta;

    try {
      const { data: updated } = await api.patch(`/api/v1/messages/${msgId}`, body);
      setMessages((list) => list.map((m) => {
        const mid = m.id || m.message_id || m.text_id;
        if (mid !== msgId) return m;
        const newMeta = updated?.metadata || m.metadata;
        return {
          ...m,
          message: updated?.message ?? messageForm.message,
          metadata: newMeta,
        };
      }));
      closeEditMessage();
    } catch (err) {
      alert(`Failed to update message: ${err.message}`);
    }
  };

  // Fetch all leads using paginated requests (limit 100, increasing offset) until empty batch
  const fetchLeads = async () => {
    setLeadsLoading(true);
    setLeadsError(null);
    try {
      const pageSize = 100;
      let offset = 0;
      const all = [];
      while (true) {
  const { data: batch } = await api.get('/api/v1/leads', { params: { limit: pageSize, offset } });
        if (!Array.isArray(batch) || batch.length === 0) break;
        all.push(...batch);
        if (batch.length < pageSize) break; // no more pages
        offset += pageSize;
      }
  // Filter out soft-deleted leads (only include where metadata.deleted_at is null/undefined)
  const filtered = all.filter((l) => l?.metadata?.deleted_at == null);
  setLeads(filtered);
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
  const { data: json } = await api.get('/api/v1/admins', { params: { limit: pageSize, offset } });
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
  const { data: json } = await api.get('/api/v1/messages', { params: { limit: pageSize, offset } });
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
              <>
                <button className="btn" onClick={fetchLeads}>Refresh</button>
                <button className="btn" onClick={exportLeads} disabled={leads.length === 0} style={{ marginLeft: 8 }}>Export</button>
              </>
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
                      <th>First Name</th>
                      <th>Last Name</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th>Selling</th>
                      <th>Buying</th>
                      <th>Suburb</th>
                      <th>Timeframe</th>
                      <th>Preferred Contact</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((l, idx) => {
                      const c = l.contact || {};
                      return (
                        <tr key={l.lead_id || l.id || idx}>
                          <td>{c.first_name || ''}</td>
                          <td>{c.last_name || ''}</td>
                          <td>{getLeadScore(l) ?? '-'}</td>
                          <td>{getLeadCategory(l)}</td>
                          <td>{toYesNo(c.selling_interest ?? c.interested)}</td>
                          <td>{toYesNo(c.buying_interest ?? l.metadata?.custom_fields?.buying_interest)}</td>
                          <td>{c.suburb || ''}</td>
                          <td>{c.timeframe || ''}</td>
                          <td>{getPreferredContact(l)}</td>
                          <td>{c.email || ''}</td>
                          <td>{c.phone || ''}</td>
                          <td>{formatDate(l.metadata?.created_at) || '-'}</td>
                          <td>
                            <div className="row-actions">
                              <button className="btn small" onClick={() => openEdit(l)}>Edit</button>
                              <button className="btn danger small" onClick={() => deleteLead(l)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
                          <td>
                            <div className="inline-actions">
                              <span className="message-text">{text}</span>
                              <button className="btn small" onClick={() => openEditMessage(m)}>Edit</button>
                            </div>
                          </td>
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
                {/* Only allow editing specified fields */}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={saveEdit}>Save</button>
              <button className="btn gray" onClick={closeEdit}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {editingMessage && (
        <div className="modal-overlay" onClick={closeEditMessage}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Message</h3>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <label style={{ gridColumn: '1 / -1' }}>
                  Message
                  <textarea name="message" value={messageForm.message} onChange={onMessageFormChange} rows={4} style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6 }} />
                </label>
                <label>
                  Tags (comma-separated)
                  <input name="tags" value={messageForm.tags} onChange={onMessageFormChange} placeholder="e.g., updated, homepage" />
                </label>
                <label>
                  Edited by
                  <input name="edited_by" value={messageForm.edited_by} onChange={onMessageFormChange} placeholder="admin" />
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={saveEditMessage}>Save</button>
              <button className="btn gray" onClick={closeEditMessage}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
