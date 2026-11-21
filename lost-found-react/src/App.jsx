import { useEffect, useMemo, useState } from "react";
import {
  Search, Plus, LayoutDashboard, PackageSearch, FileText, ShieldCheck,
  MapPin, CalendarDays, Clock3, ArrowUpRight, X, Check, ChevronDown,
  CircleHelp, Bell, SlidersHorizontal, Eye, RotateCcw, Trash2, Menu
} from "lucide-react";

const initialItems = [
  { id: 1001, name: "Black leather wallet", type: "Found", category: "Personal items", color: "Black", location: "Central Library", date: "2026-10-24", status: "Open", description: "Found near the reading area on the first floor.", reporter: "Aarav Sharma" },
  { id: 1002, name: "Blue water bottle", type: "Lost", category: "Accessories", color: "Blue", location: "Cafeteria", date: "2026-10-23", status: "Open", description: "Reusable bottle with a small sticker on the side.", reporter: "Meera Singh" },
  { id: 1003, name: "Scientific calculator", type: "Lost", category: "Electronics", color: "Grey", location: "Block B, Room 204", date: "2026-10-22", status: "Claimed", description: "Grey calculator left after a lecture.", reporter: "Rohan Verma" },
  { id: 1004, name: "Wireless earbuds case", type: "Found", category: "Electronics", color: "White", location: "Sports Ground", date: "2026-10-21", status: "Returned", description: "White charging case found beside the benches.", reporter: "Ishita Rao" },
  { id: 1005, name: "Student ID card", type: "Found", category: "Documents", color: "Blue", location: "Main Entrance", date: "2026-10-20", status: "Open", description: "ID card found close to the entrance gate.", reporter: "Kabir Das" },
  { id: 1006, name: "USB flash drive", type: "Lost", category: "Electronics", color: "Black", location: "Computer Lab", date: "2026-10-19", status: "Open", description: "Small black 32 GB USB drive.", reporter: "Ananya Patel" }
];

const initialClaims = [
  { id: 501, itemId: 1003, itemName: "Scientific calculator", claimant: "Rohan Verma", date: "2026-10-23", status: "Pending" },
  { id: 502, itemId: 1004, itemName: "Wireless earbuds case", claimant: "Ishita Rao", date: "2026-10-22", status: "Approved" }
];

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "items", label: "Lost & found items", icon: PackageSearch },
  { id: "claims", label: "Claims", icon: FileText },
  { id: "admin", label: "Admin panel", icon: ShieldCheck }
];

const fmtDate = (date) => {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

function Badge({ children, tone = "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function App() {
  const [user,setUser] = useState(null);
  const [token,setToken] = useState(() => sessionStorage.getItem('findit_token') || '');
  const [authMode,setAuthMode] = useState('login');
  const [authForm,setAuthForm] = useState({name:'',email:'',password:''});
  const [authError,setAuthError] = useState('');
  const isAdmin=user?.role==='Admin';
  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const API = 'http://localhost:4000/api';
  const request = async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options, headers: { 'Content-Type': 'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {}), ...options.headers }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  };
  const refresh = async () => {
    const [newItems, newClaims] = await Promise.all([request('/items'), request('/claims')]);
    setItems(newItems);
    setClaims(newClaims);
  };
  useEffect(() => {
    if(!token) return;
    request('/auth/me').then(({user})=>setUser(user)).catch(()=>{sessionStorage.removeItem('findit_token');setToken('');setUser(null);});
  },[token]);
  useEffect(() => { if(user) refresh().catch(err=>notify(err.message)); },[user]);
  const submitAuth=async(e)=>{
    e.preventDefault();setAuthError('');
    try { const result=await request(`/auth/${authMode==='login'?'login':'signup'}`,{method:'POST',body:JSON.stringify(authForm)});
      sessionStorage.setItem('findit_token',result.token);setToken(result.token);setUser(result.user);setAuthForm({name:'',email:'',password:''});setPage('dashboard');
    } catch(err) { setAuthError(err.message); }
  };
  const logout=()=>{sessionStorage.removeItem('findit_token');setToken('');setUser(null);setItems([]);setClaims([]);setPage('dashboard');};
  const [page, setPage] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All reports");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [form, setForm] = useState({
    name: "", type: "Lost", category: "Electronics", color: "",
    location: "", date: new Date().toISOString().slice(0, 10),
    description: "", reporter: ""
  });

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const filteredItems = useMemo(() => items.filter((item) => {
    const haystack = [item.name, item.category, item.color, item.location, item.description, item.reporter].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase())
      && (typeFilter === "All reports" || item.type === typeFilter)
      && (statusFilter === "All statuses" || item.status === statusFilter);
  }), [items, query, typeFilter, statusFilter]);

  const stats = [
    { label: "Total reports", value: items.length, note: "All reported items", icon: PackageSearch, tone: "blue" },
    { label: "Lost items", value: items.filter((x) => x.type === "Lost").length, note: "Items being searched for", icon: Search, tone: "orange" },
    { label: "Found items", value: items.filter((x) => x.type === "Found").length, note: "Items waiting for owners", icon: Check, tone: "green" },
    { label: "Pending claims", value: claims.filter((x) => x.status === "Pending").length, note: "Need admin review", icon: Clock3, tone: "purple" }
  ];

  const openReportForm = (type = "Lost") => {
    setForm({ name: "", type, category: "Electronics", color: "", location: "", date: new Date().toISOString().slice(0, 10), description: "", reporter: user.name });
    setShowForm(true);
  };

  const submitReport = async (event) => {
    event.preventDefault();
    try {
      await request('/items', { method: 'POST', body: JSON.stringify(form) });
      await refresh();
      setShowForm(false);
      setPage('items');
      setQuery('');
      setTypeFilter('All reports');
      setStatusFilter('All statuses');
      notify('Report saved to MySQL');
    } catch (err) { notify(err.message); }
  };

  const createClaim = async (item) => {
    if (!window.confirm(`Submit a claim for "${item.name}" as ${user.name}?`)) return;
    try {
      await request('/claims', { method: 'POST', body: JSON.stringify({ itemId: item.id }) });
      await refresh();
      setSelectedItem(null);
      setPage('claims');
      notify('Claim saved for review');
    } catch (err) { notify(err.message); }
  };

  const updateClaim = async (claimId, status) => {
    try {
      await request(`/claims/${claimId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await refresh();
      notify(`Claim ${status.toLowerCase()}`);
    } catch (err) { notify(err.message); }
  };

  const deleteItem = async (id) => {
    const item = items.find((x) => x.id === id);
    if (!window.confirm(`Permanently delete "${item?.name}" and its claims from MySQL?`)) return;
    try {
      await request(`/items/${id}`, { method: 'DELETE' });
      await refresh();
      notify('Report deleted');
    } catch (err) { notify(err.message); }
  };

  const resetDemo = () => notify('Reset is disabled when using MySQL. Records are persistent.');

  if(!user) return <div className="auth-screen"><div className="auth-panel">
    <div className="auth-logo"><PackageSearch size={27}/> <strong>FindIt Campus</strong></div>
    <h1>{authMode==='login'?'Welcome back':'Create your student account'}</h1>
    <p>Campus Lost & Found · React + Express + MySQL</p>
    <form onSubmit={submitAuth} className="auth-form">
      {authMode==='signup' && <label>Full name<input required value={authForm.name} onChange={e=>setAuthForm({...authForm,name:e.target.value})} placeholder="Your full name"/></label>}
      <label>Email<input required type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="you@college.edu"/></label>
      <label>Password<input required type="password" minLength={authMode==='signup'?8:1} value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} placeholder="Your password"/></label>
      {authError && <div className="auth-error">{authError}</div>}
      <button className="btn btn-primary" type="submit">{authMode==='login'?'Sign in':'Create account'}</button>
    </form>
    <button className="auth-switch" onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setAuthError('');}}>{authMode==='login'?'New student? Sign up':'Already have an account? Sign in'}</button>
    <small>Admin accounts are created by the backend administrator.</small>
  </div></div>;

  const pageTitle = navItems.find((n) => n.id === page)?.label || "Dashboard";

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><PackageSearch size={23} /></div>
          <div><div className="brand-name">Find<span>It</span></div><div className="brand-sub">CAMPUS LOST & FOUND</div></div>
          <button className="icon-btn mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18}/></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list">
          {navItems.filter(n => isAdmin || (n.id!=="admin")).map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-link ${page === id ? "active" : ""}`} onClick={() => { setPage(id); setMobileNav(false); }}>
              <Icon size={18}/><span>{label}</span>
              {id === "claims" && claims.some((c) => c.status === "Pending") && <span className="nav-count">{claims.filter((c) => c.status === "Pending").length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><CircleHelp size={18}/></div>
            <div><strong>Need help?</strong><p>Keep your campus connected.</p></div>
            <ArrowUpRight size={15} className="help-arrow"/>
          </div>
          <div className="profile">
            <div className="avatar">{user.name.slice(0,2).toUpperCase()}</div>
            <div className="profile-copy"><strong>{user.name}</strong><span>{user.role}</span></div>
            <button className="logout-btn" onClick={logout}>Log out</button>
          </div>
        </div>
      </aside>

      {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20}/></button>
            <div><div className="breadcrumb">Workspace <span>/</span> <strong>{pageTitle}</strong></div><h1>{page === "dashboard" ? "Welcome, {user.name}" : pageTitle}</h1></div>
          </div>
          <div className="topbar-actions">
            <div className="today-pill"><CalendarDays size={15}/>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
            <button className="icon-btn notification-btn" aria-label="Notifications" onClick={() => { setPage("claims"); notify("Showing claims"); }}><Bell size={18}/><i/></button>
            <div className="top-avatar">{user.name.slice(0,2).toUpperCase()}</div>
          </div>
        </header>

        {page === "dashboard" && (
          <div className="content">
            <section className="welcome-banner">
              <div className="welcome-copy">
                <div className="eyebrow"><span className="live-dot"/> CAMPUS COMMUNITY</div>
                <h2>Every lost item deserves<br className="desktop-break"/> a way back home.</h2>
                <p>Keep track of lost belongings, found items, and recovery claims in one place.</p>
                <div className="banner-actions">
                  <button className="btn btn-white" onClick={() => openReportForm("Lost")}><Plus size={17}/> Report an item</button>
                  <button className="btn btn-ghost" onClick={() => { setPage("items"); setTypeFilter("Found"); }}><Search size={16}/> Browse found items</button>
                </div>
              </div>
              <div className="banner-art" aria-hidden="true">
                <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
                <div className="art-card art-card-back"><div className="art-mini-icon orange"><PackageSearch size={19}/></div><div className="art-lines"><i/><i/></div></div>
                <div className="art-card art-card-front"><div className="art-icon"><Search size={27}/></div><div className="art-title">Found it!</div><div className="art-caption">A little help goes a long way</div><div className="art-check"><Check size={14}/></div></div>
                <div className="art-spark spark-one">✦</div><div className="art-spark spark-two">✧</div>
              </div>
            </section>

            <div className="section-heading stats-heading"><div><h2>Overview</h2><p>Here's what's happening in your campus community.</p></div><span className="updated-label"><span className="live-dot"/> Live MySQL data</span></div>
            <section className="stats-grid">
              {stats.map(({ label, value, note, icon: Icon, tone }) => (
                <div className="stat-card" key={label}>
                  <div className={`stat-icon ${tone}`}><Icon size={19}/></div>
                  <div className="stat-label">{label}</div>
                  <div className="stat-value">{value}</div>
                  <div className="stat-note">{note}</div>
                </div>
              ))}
            </section>

            <section className="lower-grid">
              <div className="panel recent-panel">
                <div className="panel-heading"><div><h3>Recent reports</h3><p>The latest activity from your campus</p></div><button className="text-button" onClick={() => setPage("items")}>View all <ArrowUpRight size={15}/></button></div>
                <ItemTable items={items.slice(0, 4)} onView={setSelectedItem} compact/>
              </div>
              <div className="panel quick-panel">
                <div className="panel-heading"><div><h3>Quick actions</h3><p>What would you like to do?</p></div></div>
                <button className="quick-action" onClick={() => openReportForm("Lost")}><div className="quick-icon blue"><Search size={18}/></div><div><strong>Report a lost item</strong><span>Tell the campus what you're missing</span></div><ArrowUpRight size={16}/></button>
                <button className="quick-action" onClick={() => openReportForm("Found")}><div className="quick-icon green"><Check size={18}/></div><div><strong>Report a found item</strong><span>Help someone find their belongings</span></div><ArrowUpRight size={16}/></button>
                <button className="quick-action" onClick={() => setPage("claims")}><div className="quick-icon purple"><FileText size={18}/></div><div><strong>Review claims</strong><span>{claims.filter((c) => c.status === "Pending").length} claims waiting for review</span></div><ArrowUpRight size={16}/></button>
              </div>
            </section>
            <div className="demo-note"><CircleHelp size={16}/><span><strong>Demo mode:</strong> Reports and claims are stored permanently in MySQL.</span></div>
          </div>
        )}

        {page === "items" && (
          <div className="content">
            <div className="page-intro"><div><h2>Lost & found items</h2><p>Browse reports and help belongings find their owners.</p></div><button className="btn btn-primary" onClick={() => openReportForm("Lost")}><Plus size={17}/> New report</button></div>
            <div className="filter-bar">
              <div className="search-box"><Search size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items, locations, colors..." /><kbd>⌕</kbd></div>
              <div className="filter-select"><SlidersHorizontal size={16}/><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option>All reports</option><option>Lost</option><option>Found</option></select><ChevronDown size={14}/></div>
              <div className="filter-select"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>All statuses</option><option>Open</option><option>Claimed</option><option>Returned</option></select><ChevronDown size={14}/></div>
            </div>
            <div className="results-line"><span><strong>{filteredItems.length}</strong> reports found</span><button className="reset-button" onClick={() => { setQuery(""); setTypeFilter("All reports"); setStatusFilter("All statuses"); }}><RotateCcw size={14}/> Reset filters</button></div>
            <div className="panel items-panel"><ItemTable items={filteredItems} onView={setSelectedItem} onDelete={isAdmin ? deleteItem : undefined}/>{filteredItems.length === 0 && <div className="empty-state"><PackageSearch size={30}/><strong>No reports found</strong><span>Try another search or clear the filters.</span></div>}</div>
          </div>
        )}

        {page === "claims" && (
          <div className="content">
            <div className="page-intro"><div><h2>Claims inbox</h2><p>Review requests from people trying to recover their belongings.</p></div><Badge tone="purple">{claims.filter((c) => c.status === "Pending").length} pending</Badge></div>
            <div className="claims-summary">
              <div className="claim-summary-card"><span className="summary-dot purple-dot"/><div><span>Pending review</span><strong>{claims.filter((c) => c.status === "Pending").length}</strong></div></div>
              <div className="claim-summary-card"><span className="summary-dot green-dot"/><div><span>Approved</span><strong>{claims.filter((c) => c.status === "Approved").length}</strong></div></div>
              <div className="claim-summary-card"><span className="summary-dot red-dot"/><div><span>Rejected</span><strong>{claims.filter((c) => c.status === "Rejected").length}</strong></div></div>
            </div>
            <div className="panel table-panel"><div className="panel-heading"><div><h3>All claims</h3><p>Review each claim before updating its status.</p></div></div>
              <div className="table-wrap"><table><thead><tr><th>ITEM</th><th>CLAIMANT</th><th>SUBMITTED</th><th>STATUS</th><th className="actions-head">ACTIONS</th></tr></thead><tbody>
                {claims.map((claim) => <tr key={claim.id}><td><div className="item-cell"><div className="item-thumb thumb-purple"><FileText size={18}/></div><div><strong>{claim.itemName}</strong><span>Claim #{claim.id}</span></div></div></td><td>{claim.claimant}</td><td>{fmtDate(claim.date)}</td><td><Badge tone={claim.status.toLowerCase()}>{claim.status}</Badge></td><td><div className="row-actions">{isAdmin && claim.status === "Pending" ? <><button className="small-action approve" onClick={() => updateClaim(claim.id, "Approved")}><Check size={14}/> Approve</button><button className="small-action reject" onClick={() => updateClaim(claim.id, "Rejected")}><X size={14}/> Reject</button></> : <span className="muted small-text">Reviewed</span>}</div></td></tr>)}
              </tbody></table></div>
              {claims.length === 0 && <div className="empty-state"><FileText size={30}/><strong>No claims yet</strong><span>Claims submitted from item reports will appear here.</span></div>}
            </div>
            <div className="demo-note"><ShieldCheck size={16}/><span>In a real system, claim approval should be restricted to authorized administrators and ownership should be verified before returning an item.</span></div>
          </div>
        )}

        {page === "admin" && isAdmin && (
          <div className="content">
            <div className="page-intro"><div><h2>Admin panel</h2><p>Manage reports and review claims.</p></div><Badge tone="green">Administrator</Badge></div>
            <div className="admin-grid">
              <div className="panel admin-card"><div className="admin-card-icon blue"><PackageSearch size={22}/></div><h3>Manage reports</h3><p>Review all lost and found entries, inspect their details, and remove test records.</p><button className="btn btn-secondary" onClick={() => setPage("items")}>Open item reports <ArrowUpRight size={15}/></button></div>
              <div className="panel admin-card"><div className="admin-card-icon purple"><ShieldCheck size={22}/></div><h3>Review claims</h3><p>Approve or reject pending claims and update the corresponding item status.</p><button className="btn btn-secondary" onClick={() => setPage("claims")}>Open claims inbox <ArrowUpRight size={15}/></button></div>
              <div className="panel admin-card"><div className="admin-card-icon orange"><RotateCcw size={22}/></div><h3>Reset demo data</h3><p>Restore the original sample reports and claims before your next demonstration.</p><button className="btn btn-secondary" onClick={resetDemo}>Reset sample data <RotateCcw size={15}/></button></div>
            </div>
            <div className="demo-note"><CircleHelp size={16}/><span>Admin operations are protected by server-side role checks.</span></div>
          </div>
        )}
        <footer className="footer"><span>© 2026 FindIt Campus</span><span>Made to reunite people with their belongings <span className="footer-heart">♥</span></span></footer>
      </main>

      {showForm && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
        <div className="modal">
          <div className="modal-header"><div><div className="modal-kicker">NEW REPORT</div><h2>Report an item</h2><p>Share a few details to help reconnect an item with its owner.</p></div><button className="icon-btn" onClick={() => setShowForm(false)} aria-label="Close"><X size={19}/></button></div>
          <form onSubmit={submitReport}>
            <div className="form-type-switch"><button type="button" className={form.type === "Lost" ? "selected lost-selected" : ""} onClick={() => setForm({ ...form, type: "Lost" })}><Search size={16}/> I lost something</button><button type="button" className={form.type === "Found" ? "selected found-selected" : ""} onClick={() => setForm({ ...form, type: "Found" })}><Check size={16}/> I found something</button></div>
            <div className="form-grid">
              <label className="field full"><span>Item name <i>*</i></span><input required maxLength="100" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Black leather wallet"/></label>
              <label className="field"><span>Category <i>*</i></span><select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Electronics</option><option>Personal items</option><option>Accessories</option><option>Documents</option><option>Stationery</option><option>Clothing</option><option>Other</option></select></label>
              <label className="field"><span>Color</span><input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="e.g. Black"/></label>
              <label className="field full"><span>Location <i>*</i></span><div className="input-with-icon"><MapPin size={16}/><input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Where was it lost or found?"/></div></label>
              <label className="field"><span>Date <i>*</i></span><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}/></label>
              <label className="field"><span>Your name <i>*</i></span><input required value={user.name} readOnly placeholder="Enter your name"/></label>
              <label className="field full"><span>Description</span><textarea rows="3" maxLength="500" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Add identifying details that may help..."/></label>
            </div>
            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn btn-primary"><Plus size={16}/> Submit report</button></div>
          </form>
        </div>
      </div>}

      {selectedItem && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedItem(null); }}>
        <div className="modal detail-modal">
          <div className="modal-header"><div><div className="modal-kicker">REPORT #{selectedItem.id}</div><h2>{selectedItem.name}</h2><p>Item report details</p></div><button className="icon-btn" onClick={() => setSelectedItem(null)} aria-label="Close"><X size={19}/></button></div>
          <div className="detail-badges"><Badge tone={selectedItem.type.toLowerCase()}>{selectedItem.type}</Badge><Badge tone={selectedItem.status.toLowerCase()}>{selectedItem.status}</Badge></div>
          <div className="detail-grid">
            <div><span>Category</span><strong>{selectedItem.category}</strong></div><div><span>Color</span><strong>{selectedItem.color || "Not specified"}</strong></div>
            <div><span>Location</span><strong><MapPin size={14}/>{selectedItem.location}</strong></div><div><span>Date reported</span><strong>{fmtDate(selectedItem.date)}</strong></div>
            <div><span>Reported by</span><strong>{selectedItem.reporter}</strong></div>
          </div>
          <div className="detail-description"><span>Description</span><p>{selectedItem.description || "No additional description provided."}</p></div>
          <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setSelectedItem(null)}>Close</button>{selectedItem.status !== "Returned" && <button className="btn btn-primary" onClick={() => createClaim(selectedItem)}><FileText size={16}/> Submit a claim</button>}</div>
        </div>
      </div>}

      {toast && <div className="toast"><div className="toast-check"><Check size={15}/></div>{toast}</div>}
    </div>
  );
}

function ItemTable({ items, onView, onDelete, compact = false }) {
  return <div className="table-wrap"><table><thead><tr><th>ITEM DETAILS</th><th>TYPE</th>{!compact && <th>LOCATION</th>}<th>DATE</th><th>STATUS</th><th className="actions-head">ACTION</th></tr></thead><tbody>
    {items.map((item) => <tr key={item.id}>
      <td><div className="item-cell"><div className={`item-thumb ${item.category === "Electronics" ? "thumb-blue" : item.category === "Documents" ? "thumb-orange" : "thumb-green"}`}><PackageSearch size={18}/></div><div><strong>{item.name}</strong><span>{item.category} · {item.color || "Color not specified"}</span></div></div></td>
      <td><Badge tone={item.type.toLowerCase()}>{item.type}</Badge></td>
      {!compact && <td><span className="location-cell"><MapPin size={13}/>{item.location}</span></td>}
      <td><span className="date-cell">{fmtDate(item.date)}</span></td>
      <td><Badge tone={item.status.toLowerCase()}>{item.status}</Badge></td>
      <td><div className="row-actions"><button className="icon-btn table-action" title="View details" aria-label="View details" onClick={() => onView(item)}><Eye size={16}/></button>{onDelete && <button className="icon-btn table-action delete-action" title="Delete report" aria-label="Delete report" onClick={() => onDelete(item.id)}><Trash2 size={15}/></button>}</div></td>
    </tr>)}
  </tbody></table></div>;
}

export default App;
