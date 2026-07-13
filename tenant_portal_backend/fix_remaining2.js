const fs = require('fs');

function replaceFile(path, replacer) {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    const newContent = replacer(content);
    if (content !== newContent) {
        fs.writeFileSync(path, newContent);
        console.log(`Updated ${path}`);
    }
}

// Fix dashboard.service.ts
replaceFile('src/dashboard/dashboard.service.ts', (c) => {
    return c
        .replace(/invoice\.leaseId\?\./g, "invoice.lease?.")
        .replace(/lease\.tenant\?\.email/g, "lease.tenant?.username")
        .replace(/LeaseListRelationFilter/g, "any") // temp fix for isNot error
});

// Fix briefing.service.ts
replaceFile('src/briefing/briefing.service.ts', (c) => {
    return c
        .replace(/inv\.leaseId\?\./g, "inv.lease?.")
});

// Fix inspections.service.ts
replaceFile('src/inspections/inspections.service.ts', (c) => {
    return c
        .replace(/tenant\.leases\?\.\[0\]\?\.unitId/g, "tenant.lease?.[0]?.unitId")
        .replace(/tenant\.lease\?\.\[0\]\?\.unitId/g, "tenant.lease?.[0]?.unitId")
        .replace(/tenant\.Lease\?\.\[0\]\?\.unitId/g, "tenant.lease?.[0]?.unitId");
});

// Fix lease.service.ts
replaceFile('src/lease/lease.service.ts', (c) => {
    let newC = c
        .replace(/data\.rentAmountCents != null \? toCents\(data\.rentAmountCents\)/g, "data.rentAmount != null ? data.rentAmount : undefined")
        .replace(/rentAmount:\s*data\.rentAmount,/g, "")
        .replace(/rentAmountCents:\s*data\.rentAmount != null \? data\.rentAmount : undefined,/g, "rentAmountCents: data.rentAmount != null ? toCents(data.rentAmount) : undefined,")
        .replace(/rentAmountCents:\s*data\.rentAmount != null \? toCents\(data\.rentAmount\) : undefined,/g, "rentAmountCents: data.rentAmount != null ? toCents(data.rentAmount) : undefined,")
        .replace(/rentAmountCents:\s*data\.rentAmountCents != null \? toCents\(data\.rentAmountCents\) : undefined,/g, "rentAmountCents: data.rentAmount != null ? toCents(data.rentAmount) : undefined,")
        .replace(/rentAmount:\s*undefined/g, "")
        .replace(/data\.rentAmountCents/g, "data.rentAmount")
        
        .replace(/rentAmountCents\?: number;/g, "rentAmount?: number;")
        .replace(/depositAmountCents\?: number;/g, "depositAmount?: number;")
        
        .replace(/proposedRentCents/g, "proposedRent")
        .replace(/currentBalanceCents\?/g, "currentBalance?")
        .replace(/rentAmount:\s*lease\.rentAmountCents/g, "rentAmountCents: lease.rentAmountCents")
        .replace(/currentBalance:\s*lease\.currentBalanceCents/g, "currentBalanceCents: lease.currentBalanceCents");
    
    return newC;
});

// Fix rent-optimization.service.ts
replaceFile('src/rent-optimization/rent-optimization.service.ts', (c) => {
    return c
        .replace(/confidenceIntervalLow:/g, "confidenceIntervalLowCents:")
        .replace(/confidenceIntervalHigh:/g, "confidenceIntervalHighCents:")
        .replace(/recommendedRent:/g, "recommendedRentCents:")
        .replace(/rentAmount:/g, "rentAmountCents:")
        .replace(/confidenceIntervalLowCentsCents:/g, "confidenceIntervalLowCents:")
        .replace(/confidenceIntervalHighCentsCents:/g, "confidenceIntervalHighCents:")
        .replace(/recommendedRentCentsCents:/g, "recommendedRentCents:")
        .replace(/rentAmountCentsCents:/g, "rentAmountCents:")
        .replace(/id:\s*lease\.id/g, "leaseId: lease.id")
});

// Fix property-rollup.service.ts
replaceFile('src/property/property-rollup.service.ts', (c) => {
    return c
        .replace(/lease\.invoices/g, "lease.Invoices")
        .replace(/lease\.payments/g, "lease.Payment")
});

// Fix ai-payment.service.ts
replaceFile('src/payments/ai-payment.service.ts', (c) => {
    return c
        .replace(/lease\.invoices/g, "lease.Invoices")
});

// Fix payments.service.ts
replaceFile('src/payments/payments.service.ts', (c) => {
    return c
        .replace(/amount:\s*data\.amountCents/g, "amountCents: data.amountCents")
});

// Fix operator-renewals.service.ts
replaceFile('src/operator-renewals/operator-renewals.service.ts', (c) => {
    return c
        .replace(/tenant:\s*{/g, "tenantId: tenant.id")
        .replace(/proposedRent:/g, "proposedRentCents:")
});

// Fix operator-lease-signing.service.ts
replaceFile('src/operator-lease-signing/operator-lease-signing.service.ts', (c) => {
    return c
        .replace(/rentAmount:/g, "rentAmountCents:")
});
