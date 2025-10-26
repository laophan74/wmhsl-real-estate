import React, { useEffect, useState, useMemo } from "react";
import "./DashboardPage.css";
import { api, API_CONFIG } from "../../lib/api";
import * as XLSX from 'xlsx';
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

// Safely extract status string from lead object
function getLeadStatus(lead) {
  const status = lead?.status ?? lead?.metadata?.status ?? '';
  
  // If status is an object with 'current' field, extract that
  if (typeof status === 'object' && status !== null) {
    if (status.current) {
      return String(status.current);
    }
    // Fallback to JSON string if no current field
    return JSON.stringify(status);
  }
  
  return String(status || '');
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
  // Add Admin modal state
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({ username: '', password: '', first_name: '', last_name: '', email: '' });
  const [adminErrors, setAdminErrors] = useState({});
  const [savingAdmin, setSavingAdmin] = useState(false);
  // Reusable suburb options (mirrors Home form)
  const suburbOptions = [
    'Hornsby', 'Asquith', 'Waitara', 'Hornsby Heights', 'Mount Colah', 'Mount Kuring-gai', 'Berowra', 'Berowra Heights', 'Wahroonga', 'Turramurra', 'Pennant Hills', 'Thornleigh', 'Normanhurst'
  ];
  // Leads table UX state
  const [leadSort, setLeadSort] = useState({ field: 'updated', direction: 'desc' });
  const [leadQuery, setLeadQuery] = useState('');
  const [leadPage, setLeadPage] = useState(0); // 0-based
  const pageSize = 5;
  // Admin table UX state
  const [adminSort, setAdminSort] = useState({ field: 'created', direction: 'desc' });
  const [adminQuery, setAdminQuery] = useState('');
  const [adminPage, setAdminPage] = useState(0); // 0-based
  const [savingLead, setSavingLead] = useState(false);
  const [toasts, setToasts] = useState([]);

  const pushToast = (msg, opts={}) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type: opts.type || 'success' }]);
    const ttl = opts.ttl || 3000;
    setTimeout(() => {
      setToasts(t => t.filter(x => x.id !== id));
    }, ttl);
  };
  // Message edit modal state
  const [editingMessage, setEditingMessage] = useState(null);
  const [messageForm, setMessageForm] = useState({ message: "" });
  const [savingMessage, setSavingMessage] = useState(false);

  // Edit modal state
  const [editingLead, setEditingLead] = useState(null); // the full lead object being edited
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    suburb: "",
    timeframe: "",
    status: "",
  });
  const [editErrors, setEditErrors] = useState({});

  const openEdit = (lead) => {
    const c = lead?.contact || {};
    
    // Extract current status for editing
    const statusObj = lead?.status ?? lead?.metadata?.status ?? '';
    let currentStatus = '';
    if (typeof statusObj === 'object' && statusObj !== null && statusObj.current) {
      currentStatus = statusObj.current;
    } else if (typeof statusObj === 'string') {
      currentStatus = statusObj;
    }
    
    setEditingLead(lead);
    setEditForm({
      first_name: c.first_name || "",
      last_name: c.last_name || "",
      email: c.email || "",
      phone: c.phone || "",
      suburb: c.suburb || "",
      timeframe: c.timeframe || "",
      status: currentStatus,
    });
    setEditErrors({});
  };

  const closeEdit = () => {
    setEditingLead(null);
  };

  const onEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((f) => ({ ...f, [name]: value }));
    // live validate single field
    setEditErrors(prev => {
      const next = { ...prev };
      const v = value;
      const trim = (s)=> (s||'').trim();
      const validators = {
        first_name: () => !trim(v) ? 'First name required' : '',
        last_name: () => !trim(v) ? 'Last name required' : '',
        email: () => {
          if(!trim(v)) return 'Email required';
          return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trim(v)) ? '' : 'Invalid email';
        },
        phone: () => v && !/^[0-9+()\s-]{6,20}$/.test(v) ? 'Invalid phone' : '',
        suburb: () => !v ? 'Suburb required' : '',
        timeframe: () => !v ? 'Timeframe required' : '',
        status: () => !v ? 'Status required' : '',
      };
      if (validators[name]) {
        const msg = validators[name]();
        if (msg) next[name] = msg; else delete next[name];
      }
      return next;
    });
  };

  const validateEditForm = (data) => {
    const errs = {};
    const trim = (s)=> (s||'').trim();
    if (!trim(data.first_name)) errs.first_name = 'First name required';
    if (!trim(data.last_name)) errs.last_name = 'Last name required';
    if (!trim(data.email)) errs.email = 'Email required';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trim(data.email))) errs.email = 'Invalid email';
    if (data.phone && !/^[0-9+()\s-]{6,20}$/.test(data.phone)) errs.phone = 'Invalid phone';
    if (!data.suburb) errs.suburb = 'Suburb required';
    if (!data.timeframe) errs.timeframe = 'Timeframe required';
    if (!data.status) errs.status = 'Status required';
    return errs;
  };

  const saveEdit = async () => {
    if (!editingLead) return;
    const leadId = editingLead.lead_id || editingLead.id;
    if (!leadId) return;

    // validate
    const errs = validateEditForm(editForm);
    if (Object.keys(errs).length) {
      setEditErrors(errs);
      return;
    }

    const contact = {
      first_name: editForm.first_name.trim(),
      last_name: editForm.last_name.trim(),
      email: editForm.email.trim().toLowerCase(),
      phone: editForm.phone.trim(),
      suburb: editForm.suburb,
      timeframe: editForm.timeframe,
    };
    
    // Build status object according to backend requirements
    const statusUpdate = {
      current: editForm.status,
      notes: `Status updated to ${editForm.status}`, // optional note
      changed_by: user?.username || user?.email || "admin" // use current user info
    };
    
    // Build body: contact fields and status object
    const body = { 
      contact,
      status: statusUpdate
    };

    try {
      setSavingLead(true);
      const { data: updated } = await api.patch(`/api/v1/leads/${leadId}`, body);
      setLeads((list) => list.map((x) => {
        const idX = x.lead_id || x.id;
        if (idX !== leadId) return x;
        const newContact = updated?.contact || { ...x.contact, ...contact };
        const newMeta = { 
          ...(updated?.metadata || x.metadata), 
          // Use updated_at from server response, or set current time if not provided
          updated_at: updated?.metadata?.updated_at || new Date().toISOString()
        };
        const newStatus = updated?.status || editForm.status;
        return { ...x, contact: newContact, metadata: newMeta, status: newStatus };
      }));
      closeEdit();
      pushToast('Lead updated successfully');
    } catch (err) {
      alert(`Failed to update lead: ${err.message}`);
    } finally {
      setSavingLead(false);
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

  // Preferred Contact removed per latest requirements.

  // Export leads to CSV (Excel compatible)
  const exportLeads = () => {
    if (!leads || leads.length === 0) return;
    const data = leads.map(l => {
      const c = l.contact || {};
      return {
        'First Name': c.first_name || '',
        'Last Name': c.last_name || '',
        'Score': getLeadScore(l) ?? '',
        'Category': getLeadCategory(l) || '',
        'Status': getLeadStatus(l),
        'Selling': toYesNo(c.selling_interest ?? c.interested),
        'Buying': toYesNo(c.buying_interest ?? l.metadata?.custom_fields?.buying_interest),
        'Suburb': c.suburb || '',
        'Timeframe': c.timeframe || '',
  // Preferred Contact removed
        'Email': c.email || '',
        'Phone': c.phone || '',
        'Updated': formatDate(l.metadata?.updated_at) || ''
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    const ts = new Date();
    const pad = (n)=> String(n).padStart(2,'0');
    const name = `leads_export_${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.xlsx`;
    XLSX.writeFile(wb, name);
  };

  const toggleSort = (field) => {
    setLeadSort(s => {
      if (s.field === field) {
        const nextDir = s.direction === 'asc' ? 'desc' : 'asc';
        return { field, direction: nextDir };
      }
      return { field, direction: 'asc' };
    });
  };

  const toggleAdminSort = (field) => {
    setAdminSort(s => {
      if (s.field === field) {
        const nextDir = s.direction === 'asc' ? 'desc' : 'asc';
        return { field, direction: nextDir };
      }
      return { field, direction: 'asc' };
    });
  };

  const filteredSortedLeads = useMemo(() => {
    let arr = [...leads];
    if (leadQuery.trim()) {
      const q = leadQuery.trim().toLowerCase();
      arr = arr.filter(l => {
        const c = l.contact || {};
        const hay = [c.first_name, c.last_name, c.email, c.phone, c.suburb, c.timeframe, getLeadCategory(l), getLeadStatus(l)]
          .filter(Boolean)
          .map(String)
          .join(' ') // join all fields
          .toLowerCase();
        return hay.includes(q);
      });
    }
    const { field, direction } = leadSort;
    const dir = direction === 'asc' ? 1 : -1;
    arr.sort((a,b) => {
      const cA = a.contact || {};
      const cB = b.contact || {};
      let vA, vB;
      switch(field){
        case 'first_name': vA=cA.first_name||''; vB=cB.first_name||''; break;
        case 'last_name': vA=cA.last_name||''; vB=cB.last_name||''; break;
        case 'score': vA=getLeadScore(a)||0; vB=getLeadScore(b)||0; break;
        case 'category': vA=getLeadCategory(a)||''; vB=getLeadCategory(b)||''; break;
        case 'status': vA=getLeadStatus(a); vB=getLeadStatus(b); break;
        case 'selling': vA=toYesNo(cA.selling_interest ?? cA.interested); vB=toYesNo(cB.selling_interest ?? cB.interested); break;
        case 'buying': vA=toYesNo(cA.buying_interest ?? a.metadata?.custom_fields?.buying_interest); vB=toYesNo(cB.buying_interest ?? b.metadata?.custom_fields?.buying_interest); break;
        case 'suburb': vA=cA.suburb||''; vB=cB.suburb||''; break;
        case 'timeframe': vA=cA.timeframe||''; vB=cB.timeframe||''; break;
  // preferred_contact sorting removed
        case 'email': vA=cA.email||''; vB=cB.email||''; break;
        case 'phone': vA=cA.phone||''; vB=cB.phone||''; break;
        case 'updated': {
          // Handle Firestore timestamp objects
          const dateA = a.metadata?.updated_at;
          const dateB = b.metadata?.updated_at;
          
          // Handle Firestore timestamp - check if it has _seconds property
          let vA, vB;
          if (dateA && typeof dateA === 'object' && dateA._seconds) {
            vA = dateA._seconds * 1000; // Convert Firestore timestamp to milliseconds
          } else if (dateA && typeof dateA === 'string') {
            vA = new Date(dateA).getTime();
          } else {
            vA = 0;
          }
          
          if (dateB && typeof dateB === 'object' && dateB._seconds) {
            vB = dateB._seconds * 1000; // Convert Firestore timestamp to milliseconds
          } else if (dateB && typeof dateB === 'string') {
            vB = new Date(dateB).getTime();
          } else {
            vB = 0;
          }
          
          // Do comparison right here for updated case
          if (vA < vB) return -1 * dir;
          if (vA > vB) return 1 * dir;
          return 0;
        }
        default: vA=''; vB='';
      }
      if (vA < vB) return -1 * dir;
      if (vA > vB) return 1 * dir;
      return 0;
    });
    return arr;
  }, [leads, leadQuery, leadSort]);

  const paginatedLeads = useMemo(() => {
    const start = leadPage * pageSize;
    return filteredSortedLeads.slice(start, start + pageSize);
  }, [filteredSortedLeads, leadPage]);

  useEffect(() => {
    // Reset to first page when filter or sort changes
    setLeadPage(0);
  }, [leadQuery, leadSort]);

  useEffect(() => {
    setAdminPage(0);
  }, [adminQuery, adminSort]);

  const BASE_URL = API_CONFIG.BASE_URL;

  // Message edit helpers
  const openEditMessage = (msg) => {
    const text = (msg?.message ?? msg?.content ?? msg?.body ?? "").toString();
    setEditingMessage(msg);
    setMessageForm({ message: text });
  };

  const closeEditMessage = () => setEditingMessage(null);
  const onMessageFormChange = (e) => {
    const { name, value } = e.target;
    setMessageForm((f) => ({ ...f, [name]: value }));
  };

  // Add Admin helpers
  const openAddAdmin = () => {
    setAdminForm({ username: '', password: '', first_name: '', last_name: '', email: '' });
    setAdminErrors({});
    setAddingAdmin(true);
  };
  const closeAddAdmin = () => {
    if (!savingAdmin) setAddingAdmin(false);
  };
  const onAdminFormChange = (e) => {
    const { name, value } = e.target;
    setAdminForm(f => ({ ...f, [name]: value }));
    // live validate single field
    setAdminErrors(prev => {
      const next = { ...prev };
      const msg = validateAdminField(name, value, adminForm);
      if (msg) next[name] = msg; else delete next[name];
      return next;
    });
  };
  function validateAdminField(name, value, current) {
    const val = (value||'').trim();
    switch(name){
      case 'username': {
        if (!val) return 'Username required';
        if (!/^[a-z0-9._-]{3,30}$/i.test(val)) return '3-30 chars, letters/numbers/._-';
        // Check for duplicate username
        const existingUsername = admins.find(a => a.username?.toLowerCase() === val.toLowerCase());
        if (existingUsername) return 'Username is already used!';
        return '';
      }
      case 'password': return !val ? 'Password required' : (val.length < 6 ? 'Min 6 chars' : '');
      case 'first_name': return !val ? 'First name required' : '';
      case 'last_name': return !val ? 'Last name required' : '';
      case 'email': {
        if (!val) return 'Email required';
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) return 'Invalid email';
        // Check for duplicate email
        const existingEmail = admins.find(a => a.email?.toLowerCase() === val.toLowerCase());
        if (existingEmail) return 'Email is already used!';
        return '';
      }
      default: return '';
    }
  }
  function validateAdminForm(data){
    const errs = {};
    ['username','password','first_name','last_name','email'].forEach(f => {
      const msg = validateAdminField(f, data[f], data);
      if (msg) errs[f] = msg;
    });
    return errs;
  }
  const saveAdmin = async () => {
    const trimmed = {
      username: adminForm.username.trim().toLowerCase(),
      password: adminForm.password,
      first_name: adminForm.first_name.trim(),
      last_name: adminForm.last_name.trim(),
      email: adminForm.email.trim().toLowerCase(),
    };
    const errs = validateAdminForm(trimmed);
    if (Object.keys(errs).length){ setAdminErrors(errs); return; }
    try {
      setSavingAdmin(true);
      await api.post('/api/v1/admins', trimmed);
      await fetchAdmins();
      setAddingAdmin(false);
      pushToast('Admin created');
    } catch (err) {
      console.error('Save admin error:', err);
      console.error('Error response:', err?.response?.data);
      
      const status = err?.response?.status;
      const errorCode = err?.response?.data?.error;
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to create admin';
      
      // Handle specific error cases for duplicate admin
      if (status === 409 || status === 400) {
        // Check for common duplicate error messages
        const lowerMsg = errorMessage.toLowerCase();
        if (lowerMsg.includes('already exists') || 
            lowerMsg.includes('already used') || 
            lowerMsg.includes('duplicate') ||
            lowerMsg.includes('unique constraint') ||
            errorCode === 'ADMIN_EXISTS' ||
            errorCode === 'DUPLICATE_ADMIN' ||
            errorCode === 'USERNAME_EXISTS' ||
            errorCode === 'EMAIL_EXISTS') {
          
          // Set field-specific errors if possible
          if (lowerMsg.includes('username') || errorCode === 'USERNAME_EXISTS') {
            setAdminErrors({ username: 'Username is already used!' });
          } else if (lowerMsg.includes('email') || errorCode === 'EMAIL_EXISTS') {
            setAdminErrors({ email: 'Email is already used!' });
          } else {
            // General duplicate error
            pushToast('Information is already used!', { type: 'error' });
          }
        } else {
          pushToast(errorMessage, { type: 'error' });
        }
      } else {
        // Other errors (500, network, etc.)
        pushToast(errorMessage, { type: 'error' });
      }
    } finally {
      setSavingAdmin(false);
    }
  };

  const saveEditMessage = async () => {
    if (!editingMessage) return;
    const msgId = editingMessage.id || editingMessage.message_id || editingMessage.text_id;
    if (!msgId) return;
    const body = { message: messageForm.message };
    try {
      setSavingMessage(true);
      const { data: updated } = await api.patch(`/api/v1/messages/${msgId}`, body);
      setMessages((list) => list.map((m) => {
        const mid = m.id || m.message_id || m.text_id;
        if (mid !== msgId) return m;
        return {
          ...m,
          message: updated?.message ?? messageForm.message,
          metadata: updated?.metadata || m.metadata,
        };
      }));
      closeEditMessage();
    } catch (err) {
      alert(`Failed to update message: ${err.message}`);
    } finally {
      setSavingMessage(false);
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
                <button className="btn" onClick={fetchLeads}><span className="icon">↻</span> Refresh</button>
                <button className="btn" onClick={exportLeads} disabled={leads.length === 0} style={{ marginLeft: 8 }}><span className="icon">⬇</span> Export</button>
              </>
            )}
            {active === "admins" && (
              <>
                <button className="btn" style={{ display:'inline-flex', alignItems:'center' }} onClick={fetchAdmins}>
                  <span className="icon" style={{ display:'inline-flex', marginRight:4 }}>↻</span> Refresh
                </button>
                <button className="btn" style={{ marginLeft: 8, display:'inline-flex', alignItems:'center' }} onClick={openAddAdmin}>
                  <span className="icon" style={{ marginRight:4, display:'inline-flex' }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14"/><path d="M5 12h14"/>
                    </svg>
                  </span>
                  Add
                </button>
              </>
            )}
            {active === "messages" && (
              <button className="btn" onClick={fetchMessages}><span className="icon">↻</span> Refresh</button>
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
                <>
                  <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={leadQuery}
                      onChange={(e)=>setLeadQuery(e.target.value)}
                      style={{ padding:'6px 10px', border:'1px solid #d1d5db', borderRadius:4, minWidth:200 }}
                    />
                    <div style={{ fontSize:12, color:'#6b7280' }}>
                      Showing {paginatedLeads.length} of {filteredSortedLeads.length} (page {leadPage+1}/{Math.max(1, Math.ceil(filteredSortedLeads.length / pageSize))})
                    </div>
                  </div>
                  <table className="leads-table">
                    <thead>
                      <tr>
                        <th onClick={()=>toggleSort('first_name')} className="sortable">First Name {leadSort.field==='first_name' ? (leadSort.direction==='asc'?'▲':'▼') : ''}</th>
                        <th onClick={()=>toggleSort('last_name')} className="sortable">Last Name {leadSort.field==='last_name' ? (leadSort.direction==='asc'?'▲':'▼') : ''}</th>
                        <th onClick={()=>toggleSort('score')} className="sortable">Score {leadSort.field==='score' ? (leadSort.direction==='asc'?'▲':'▼') : ''}</th>
                        <th onClick={()=>toggleSort('category')} className="sortable">Category {leadSort.field==='category' ? (leadSort.direction==='asc'?'▲':'▼') : ''}</th>
                        <th onClick={()=>toggleSort('status')} className="sortable">Status {leadSort.field==='status' ? (leadSort.direction==='asc'?'▲':'▼') : ''}</th>
                        <th onClick={()=>toggleSort('selling')} className="sortable">Selling {leadSort.field==='selling' ? (leadSort.direction==='asc'?'▲':'▼') : ''}</th>
                        <th onClick={()=>toggleSort('buying')} className="sortable">Buying {leadSort.field==='buying' ? (leadSort.direction==='asc'?'▲':'▼') : ''}</th>
                        <th onClick={()=>toggleSort('suburb')} className="sortable">Suburb {leadSort.field==='suburb' ? (leadSort.direction==='asc'?'▲':'▼') : ''}</th>
                        <th onClick={()=>toggleSort('timeframe')} className="sortable">Timeframe {leadSort.field==='timeframe' ? (leadSort.direction==='asc'?'▲':'▼') : ''}</th>
                        {/* Preferred Contact column removed */}
                        <th onClick={()=>toggleSort('email')} className="sortable">Email {leadSort.field==='email' ? (leadSort.direction==='asc'?'▲':'▼') : ''}</th>
                        <th onClick={()=>toggleSort('phone')} className="sortable">Phone {leadSort.field==='phone' ? (leadSort.direction==='asc'?'▲':'▼') : ''}</th>
                        <th onClick={()=>toggleSort('updated')} className="sortable">Updated {leadSort.field==='updated' ? (leadSort.direction==='asc'?'▲':'▼') : ''}</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLeads.map((l, idx) => {
                        const c = l.contact || {};
                        return (
                          <tr key={l.lead_id || l.id || `${idx}-${leadPage}`}>
                            <td>{c.first_name || ''}</td>
                            <td>{c.last_name || ''}</td>
                            <td>
                              {(() => {
                                const score = getLeadScore(l);
                                const val = score ?? '-';
                                const cat = getLeadCategory(l);
                                // New mapping: HOT = green, WARM = yellow, COLD = red
                                let color = '#374151';
                                if (cat === 'HOT') color = '#059669'; // green
                                else if (cat === 'WARM') color = '#d97706'; // yellow/amber
                                else if (cat === 'COLD') color = '#dc2626'; // red
                                return <span style={{ fontWeight:600, color }}>{val}</span>;
                              })()}
                            </td>
                            <td>
                              {(() => {
                                const cat = getLeadCategory(l) || '-';
                                let color = '#374151';
                                if (cat === 'HOT') color = '#059669';
                                else if (cat === 'WARM') color = '#d97706';
                                else if (cat === 'COLD') color = '#dc2626';
                                return <span style={{ fontWeight:600, letterSpacing:0.5, color }}>{cat}</span>;
                              })()}
                            </td>
                            <td>
                              {(() => {
                                const statusStr = getLeadStatus(l) || '-';
                                return <span style={{ fontWeight:500, textTransform: 'capitalize' }}>{statusStr}</span>;
                              })()}
                            </td>
                            <td>{toYesNo(c.selling_interest ?? c.interested)}</td>
                            <td>{toYesNo(c.buying_interest ?? l.metadata?.custom_fields?.buying_interest)}</td>
                            <td>{c.suburb || ''}</td>
                            <td>{c.timeframe || ''}</td>
                            {/* Preferred Contact cell removed */}
                            <td>{c.email || ''}</td>
                            <td>{c.phone || ''}</td>
                            <td>{formatDate(l.metadata?.updated_at) || '-'}</td>
                            <td>
                              <div className="row-actions">
                                <button className="icon-btn" aria-label="Edit" title="Edit" onClick={() => openEdit(l)}>
                                  <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                </button>
                                <button className="icon-btn danger" aria-label="Delete" title="Delete" onClick={() => deleteLead(l)}>
                                  <svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:12 }}>
                    <div style={{ fontSize:12, color:'#6b7280' }}>
                      Page {leadPage + 1} of {Math.max(1, Math.ceil(filteredSortedLeads.length / pageSize))}
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="btn small icon-only" aria-label="Previous page" disabled={leadPage===0} onClick={()=>setLeadPage(p=>Math.max(0,p-1))}>&lt;</button>
                      <button className="btn small icon-only" aria-label="Next page" disabled={(leadPage+1) >= Math.ceil(filteredSortedLeads.length / pageSize)} onClick={()=>setLeadPage(p=>p+1)}>&gt;</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {active === "admins" && (
            <div className="table-wrap">
              {adminsLoading ? (
                <div className="empty">Loading admins…</div>
              ) : adminsError ? (
                <div className="empty error">Error: {adminsError}</div>
              ) : (() => {
                // prepare filtered/sorted/paginated inside render scope
                let arr = [...admins];
                if (adminQuery.trim()) {
                  const q = adminQuery.trim().toLowerCase();
                  arr = arr.filter(a => {
                    const hay = [a.username, a.first_name, a.last_name, a.email]
                      .filter(Boolean)
                      .map(String)
                      .join(' ')
                      .toLowerCase();
                    return hay.includes(q);
                  });
                }
                const { field, direction } = adminSort;
                const dir = direction === 'asc' ? 1 : -1;
                arr.sort((a,b) => {
                  let vA='', vB='';
                  switch(field){
                    case 'username': vA=a.username||''; vB=b.username||''; break;
                    case 'name': vA=`${a.first_name||''} ${a.last_name||''}`.trim(); vB=`${b.first_name||''} ${b.last_name||''}`.trim(); break;
                    case 'email': vA=a.email||''; vB=b.email||''; break;
                    case 'created': vA=a.metadata?.created_at||a.created_at||''; vB=b.metadata?.created_at||b.created_at||''; break;
                    default: vA=''; vB='';
                  }
                  if (vA < vB) return -1*dir;
                  if (vA > vB) return 1*dir;
                  return 0;
                });
                const total = arr.length;
                const start = adminPage * pageSize;
                const pageItems = arr.slice(start, start + pageSize);
                if (total === 0) return <div className="empty">No admins found.</div>;
                return (
                  <>
                    <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
                      <input
                        type="text"
                        placeholder="Search..."
                        value={adminQuery}
                        onChange={(e)=>setAdminQuery(e.target.value)}
                        style={{ padding:'6px 10px', border:'1px solid #d1d5db', borderRadius:4, minWidth:200 }}
                      />
                      <div style={{ fontSize:12, color:'#6b7280' }}>
                        Showing {pageItems.length} of {total} (page {adminPage+1}/{Math.max(1, Math.ceil(total / pageSize))})
                      </div>
                    </div>
                    <table className="leads-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th onClick={()=>toggleAdminSort('username')} className="sortable">Username {adminSort.field==='username' ? (adminSort.direction==='asc'?'▲':'▼') : ''}</th>
                          <th onClick={()=>toggleAdminSort('name')} className="sortable">Name {adminSort.field==='name' ? (adminSort.direction==='asc'?'▲':'▼') : ''}</th>
                          <th onClick={()=>toggleAdminSort('email')} className="sortable">Email {adminSort.field==='email' ? (adminSort.direction==='asc'?'▲':'▼') : ''}</th>
                          <th onClick={()=>toggleAdminSort('created')} className="sortable">Created {adminSort.field==='created' ? (adminSort.direction==='asc'?'▲':'▼') : ''}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.map((a, idx) => (
                          <tr key={a.id || a.admin_id || idx}>
                            <td className="mono">{start + idx + 1}</td>
                            <td>{a.username || '-'}</td>
                            <td>{`${a.first_name || ''} ${a.last_name || ''}`.trim()}</td>
                            <td>{a.email || '-'}</td>
                            <td>{formatDate(a.metadata?.created_at || a.created_at) || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:12 }}>
                      <div style={{ fontSize:12, color:'#6b7280' }}>
                        Page {adminPage + 1} of {Math.max(1, Math.ceil(total / pageSize))}
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="btn small icon-only" aria-label="Previous page" disabled={adminPage===0} onClick={()=>setAdminPage(p=>Math.max(0,p-1))}>&lt;</button>
                        <button className="btn small icon-only" aria-label="Next page" disabled={(adminPage+1) >= Math.ceil(total / pageSize)} onClick={()=>setAdminPage(p=>p+1)}>&gt;</button>
                      </div>
                    </div>
                  </>
                );
              })()}
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
                              <button className="icon-btn" aria-label="Edit message" title="Edit message" onClick={() => openEditMessage(m)}>
                                <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                              </button>
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
                  <input name="first_name" value={editForm.first_name} onChange={onEditChange} className={editErrors.first_name ? 'err' : ''} />
                  {editErrors.first_name && <small className="field-error">{editErrors.first_name}</small>}
                </label>
                <label>
                  Last name
                  <input name="last_name" value={editForm.last_name} onChange={onEditChange} className={editErrors.last_name ? 'err' : ''} />
                  {editErrors.last_name && <small className="field-error">{editErrors.last_name}</small>}
                </label>
                <label>
                  Email
                  <input name="email" type="email" value={editForm.email} onChange={onEditChange} className={editErrors.email ? 'err' : ''} />
                  {editErrors.email && <small className="field-error">{editErrors.email}</small>}
                </label>
                <label>
                  Phone
                  <input name="phone" value={editForm.phone} onChange={onEditChange} className={editErrors.phone ? 'err' : ''} />
                  {editErrors.phone && <small className="field-error">{editErrors.phone}</small>}
                </label>
                <label>
                  Suburb
                  <select name="suburb" value={editForm.suburb} onChange={onEditChange} className={editErrors.suburb ? 'err' : ''}>
                    <option value="">Choose…</option>
                    {suburbOptions.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {editErrors.suburb && <small className="field-error">{editErrors.suburb}</small>}
                </label>
                <label>
                  Timeframe
                  <select name="timeframe" value={editForm.timeframe} onChange={onEditChange} className={editErrors.timeframe ? 'err' : ''}>
                    <option value="">Choose…</option>
                    <option value="1-3 months">1-3 months</option>
                    <option value="3-6 months">3-6 months</option>
                    <option value="6+ months">6+ months</option>
                    <option value="not sure">Not sure</option>
                  </select>
                  {editErrors.timeframe && <small className="field-error">{editErrors.timeframe}</small>}
                </label>
                <label>
                  Status
                  <select name="status" value={editForm.status} onChange={onEditChange} className={editErrors.status ? 'err' : ''}>
                    <option value="">Choose…</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="closed">Closed</option>
                    <option value="lost">Lost</option>
                  </select>
                  {editErrors.status && <small className="field-error">{editErrors.status}</small>}
                </label>
                {/* Only allow editing specified fields */}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={saveEdit} disabled={savingLead || Object.keys(editErrors).length > 0}>
                {savingLead ? 'Saving...' : 'Save'}
              </button>
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
                  <textarea name="message" value={messageForm.message} onChange={onMessageFormChange} rows={5} style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6 }} />
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={saveEditMessage} disabled={savingMessage}>{savingMessage ? 'Saving…' : 'Save'}</button>
              <button className="btn gray" onClick={closeEditMessage} disabled={savingMessage}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {addingAdmin && (
        <div className="modal-overlay" onClick={closeAddAdmin}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header"><h3>Add New Admin</h3></div>
            <div className="modal-body">
              <div className="form-grid">
                <label>
                  Username
                  <input name="username" value={adminForm.username} onChange={onAdminFormChange} className={adminErrors.username? 'err':''} placeholder="newadmin" />
                  {adminErrors.username && <small className="field-error">{adminErrors.username}</small>}
                </label>
                <label>
                  Password
                  <input name="password" type="password" value={adminForm.password} onChange={onAdminFormChange} className={adminErrors.password? 'err':''} placeholder="Secret123" />
                  {adminErrors.password && <small className="field-error">{adminErrors.password}</small>}
                </label>
                <label>
                  First name
                  <input name="first_name" value={adminForm.first_name} onChange={onAdminFormChange} className={adminErrors.first_name? 'err':''} />
                  {adminErrors.first_name && <small className="field-error">{adminErrors.first_name}</small>}
                </label>
                <label>
                  Last name
                  <input name="last_name" value={adminForm.last_name} onChange={onAdminFormChange} className={adminErrors.last_name? 'err':''} />
                  {adminErrors.last_name && <small className="field-error">{adminErrors.last_name}</small>}
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  Email
                  <input name="email" type="email" value={adminForm.email} onChange={onAdminFormChange} className={adminErrors.email? 'err':''} placeholder="user@example.com" />
                  {adminErrors.email && <small className="field-error">{adminErrors.email}</small>}
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={saveAdmin} disabled={savingAdmin || Object.keys(adminErrors).length>0}>{savingAdmin? 'Saving...':'Create'}</button>
              <button className="btn gray" onClick={closeAddAdmin} disabled={savingAdmin}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast ${t.type || 'success'}`}>{t.msg}</div>
          ))}
        </div>
      )}
    </div>
  );
}
