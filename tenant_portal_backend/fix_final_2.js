const fs = require('fs');
const path = require('path');

function applyRegex(filePath, regex, replacement) {
  const fullPath = path.resolve(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log("File not found:", fullPath);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  content = content.replace(regex, replacement);
  fs.writeFileSync(fullPath, content);
}

// 1. src/billing/billing.service.ts
applyRegex('src/billing/billing.service.ts', /amount:\s*enrollment\.lease\.depositAmount,/g, 'amountCents: enrollment.lease.depositAmount,');
applyRegex('src/billing/billing.service.ts', /amount:\s*toCents\(enrollment\.lease\.depositAmount\),/g, 'amountCents: enrollment.lease.depositAmount,');
applyRegex('src/billing/billing.service.ts', /lateFeeAmount:/g, 'lateFeeAmountCents:');
applyRegex('src/billing/billing.service.ts', /invoice\.schedule!\.lateFeeAmount!/g, 'invoice.schedule!.lateFeeAmountCents!');

// 2. src/maintenance/maintenance.service.ts
applyRegex('src/maintenance/maintenance.service.ts', /include:\s*\{\s*lease:\s*\{\s*include:\s*\{\s*unit:\s*true\s*\}\s*\}\s*\}/g, 'include: { Lease: { include: { unit: true } } }');
applyRegex('src/maintenance/maintenance.service.ts', /userWithLease\?\.lease/g, 'userWithLease?.Lease?.[0]');
applyRegex('src/maintenance/maintenance.service.ts', /userWithLease\.lease/g, 'userWithLease.Lease[0]');

// 3. src/messaging/bulk-messaging.service.ts
applyRegex('src/messaging/bulk-messaging.service.ts', /lease:\s*\{\s*is:\s*null\s*\}/g, 'lease: { none: {} }');
applyRegex('src/messaging/bulk-messaging.service.ts', /lease:\s*\{\s*isNot:\s*null\s*\}/g, 'lease: { some: {} }'); // Just in case

// 4. src/operator-lease-signing/operator-lease-signing.service.ts
applyRegex('src/operator-lease-signing/operator-lease-signing.service.ts', /rentAmount:\s*activeLease\.rentAmount\s*!=\s*null\s*\?\s*activeLease\.rentAmount\s*\/\s*100\s*:\s*0,/g, 'rentAmount: activeLease.rentAmountCents != null ? activeLease.rentAmountCents / 100 : 0,');

// 5. src/operator-renewals/operator-renewals.service.ts
applyRegex('src/operator-renewals/operator-renewals.service.ts', /proposedRentCents:\s*offer\.proposedRent,/g, 'proposedRent: offer.proposedRentCents != null ? offer.proposedRentCents / 100 : 0,');

console.log('Regex pass completed.');
