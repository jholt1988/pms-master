const fs = require('fs');

function applyRegex(filePath, regex, replacement) {
  if (!fs.existsSync(filePath)) {
    console.log("File not found:", filePath);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content);
}

// dashboard.service.ts
applyRegex('src/dashboard/dashboard.service.ts', /tenant:\s*\{\s*select:\s*\{\s*id:\s*true,\s*username:\s*true\s*\}\s*\}/g, 'tenant: { select: { id: true, email: true } }');
applyRegex('src/dashboard/dashboard.service.ts', /t\.tenant\.username/g, 't.tenant.email');
applyRegex('src/dashboard/dashboard.service.ts', /lease:\s*\{\s*isNot:\s*null\s*\}/g, 'lease: { some: {} }');
applyRegex('src/dashboard/dashboard.service.ts', /pendingInvoices\._sum\.amount\b/g, '(pendingInvoices._sum.amountCents || 0) / 100');
applyRegex('src/dashboard/dashboard.service.ts', /rentAmount:\s*extractedFields\.monthlyRent,/g, '// rentAmount removed');
applyRegex('src/dashboard/dashboard.service.ts', /rentAmount:\s*recommendedRent,/g, '// rentAmount removed');
applyRegex('src/dashboard/dashboard.service.ts', /tenant\?\.username/g, 'tenant?.email');

// inspections.service.ts
applyRegex('src/inspections/inspections.service.ts', /user\.Lease\?\.unitId/g, 'user.Lease?.[0]?.unitId');

// lease-abstraction.service.ts
applyRegex('src/lease-abstraction/lease-abstraction.service.ts', /firstName:\s*true/g, 'fullName: true');
applyRegex('src/lease-abstraction/lease-abstraction.service.ts', /lastName:\s*true,?/g, ''); // just remove lastName true

// maintenance.service.ts
applyRegex('src/maintenance/maintenance.service.ts', /lease:\s*\{\s*include:\s*\{\s*unit:\s*true;?\s*\}\s*,?\s*\}\s*,?/g, 'Lease: { include: { unit: true } },');
applyRegex('src/maintenance/maintenance.service.ts', /lease:\s*\{\s*include:\s*\{\s*unit:\s*true\s*\},?\s*\},?/g, 'Lease: { include: { unit: true } },');
applyRegex('src/maintenance/maintenance.service.ts', /userWithLease\?\.lease/g, 'userWithLease?.Lease');
applyRegex('src/maintenance/maintenance.service.ts', /userWithLease\.lease\.unitId/g, 'userWithLease.Lease[0].unitId');
applyRegex('src/maintenance/maintenance.service.ts', /userWithLease\.lease\.unit\.propertyId/g, 'userWithLease.Lease[0].unit.propertyId');

// messaging/bulk-messaging.service.ts
applyRegex('src/messaging/bulk-messaging.service.ts', /lease:\s*\{\s*is:\s*null\s*\}/g, 'lease: { none: {} }');

// operator-lease-signing.service.ts
applyRegex('src/operator-lease-signing/operator-lease-signing.service.ts', /rentAmountCents:\s*activeLease\.rentAmount,/g, 'rentAmount: activeLease.rentAmountCents != null ? activeLease.rentAmountCents / 100 : 0,');

// operator-renewals.service.ts
applyRegex('src/operator-renewals/operator-renewals.service.ts', /t\.tenant\.username/g, '(t.tenant.fullName || t.tenant.email)');
applyRegex('src/operator-renewals/operator-renewals.service.ts', /proposedRentCents:\s*offer\.proposedRent/g, 'proposedRent: offer.proposedRentCents != null ? offer.proposedRentCents / 100 : 0');

console.log("Regex replacements applied.");
