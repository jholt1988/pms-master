#!/usr/bin/env node

const BASE = process.env.API_BASE_URL || "http://pms-backend:3001/api";
const ADMIN_USER = process.env.VERIFY_ADMIN_USER || "admin";
const ADMIN_PASS = process.env.VERIFY_ADMIN_PASS || "Admin123!@#";
const TENANT_USER = process.env.VERIFY_TENANT_USER || "tenant";
const TENANT_PASS = process.env.VERIFY_TENANT_PASS || "Tenant123!@#";

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, ok: res.ok, data };
}

async function login(username, password) {
  const r = await api("/auth/login", { method: "POST", body: { username, password } });
  return { status: r.status, token: r.data?.access_token };
}

(async () => {
  const manager = await login(ADMIN_USER, ADMIN_PASS);
  const tenant = await login(TENANT_USER, TENANT_PASS);

  if (!manager.token || !tenant.token) {
    console.error("Login failed", { manager: manager.status, tenant: tenant.status });
    process.exit(1);
  }

  const checks = [
    ["Public", "/auth/password-policy", null],
    ["Public", "/properties/public", null],
    ["Tenant", "/tenant/dashboard", tenant.token],
    ["Tenant", "/maintenance", tenant.token],
    ["Tenant", "/payments/invoices", tenant.token],
    ["Tenant", "/leases/my-lease", tenant.token],
    ["Tenant", "/messaging/conversations", tenant.token],
    ["Tenant", "/inspections", tenant.token],
    ["Manager", "/dashboard/metrics", manager.token],
    ["Manager", "/properties", manager.token],
    ["Manager", "/leases", manager.token],
    ["Manager", "/rental-applications", manager.token],
    ["Manager", "/users", manager.token],
    ["Manager", "/security-events?limit=1", manager.token],
  ];

  const rows = [];
  for (const [scope, path, token] of checks) {
    const r = await api(path, { token });
    rows.push({ scope, path, status: r.status, pass: r.status === 200 });
  }

  // Manual confirmation flow
  const pmUser = `pm_verify_${Date.now().toString().slice(-6)}`;
  const pmPass = "PmFlow123!";
  const createPm = await api("/users", {
    method: "POST",
    token: manager.token,
    body: {
      username: pmUser,
      password: pmPass,
      email: `${pmUser}@example.com`,
      firstName: "PM",
      lastName: "Verify",
      role: "PROPERTY_MANAGER",
    },
  });

  let manualPass = false;
  let manualDetail = {};

  if (createPm.status === 201) {
    const pm = await login(pmUser, pmPass);
    if (pm.token) {
      const tech = await api("/maintenance/technicians", {
        method: "POST",
        token: pm.token,
        body: { name: "Verify Tech" },
      });

      const created = await api("/maintenance", {
        method: "POST",
        token: tenant.token,
        body: {
          title: "Verify manual confirmation",
          description: "Automated verification flow",
          category: "PLUMBING",
          priority: "LOW",
        },
      });

      const id = created.data?.id;
      const assign = await api(`/maintenance/${id}/assign`, {
        method: "PATCH",
        token: pm.token,
        body: { technicianId: tech.data?.id },
      });
      const complete = await api(`/maintenance/${id}/status`, {
        method: "PATCH",
        token: pm.token,
        body: { status: "COMPLETED", note: "Completed during verify flow" },
      });
      const confirm = await api(`/maintenance/${id}/confirm-complete`, {
        method: "POST",
        token: tenant.token,
        body: { note: "Tenant confirmed" },
      });

      manualDetail = {
        requestId: id,
        create: created.status,
        assign: assign.status,
        complete: complete.status,
        confirm: confirm.status,
      };

      manualPass = [created.status, assign.status, complete.status].every((s) => s === 200 || s === 201) && (confirm.status === 200 || confirm.status === 201);
    }
  }

  console.table(rows);
  console.log("MANUAL_CONFIRM", { pass: manualPass, ...manualDetail });

  const failed = rows.filter((r) => !r.pass).length + (manualPass ? 0 : 1);
  process.exit(failed ? 1 : 0);
})();
