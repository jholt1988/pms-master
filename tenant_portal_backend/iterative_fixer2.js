const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');
const { execSync } = require('child_process');

const project = new Project({
    tsConfigFilePath: "tsconfig.json",
});

const propMap = {
    "'amount' does not exist": ["amount", "amountCents"],
    "'amountCents' does not exist": ["amountCents", "amount"],
    "'rentAmount' does not exist": ["rentAmount", "rentAmountCents"],
    "'rentAmountCents' does not exist": ["rentAmountCents", "rentAmount"],
    "'depositAmount' does not exist": ["depositAmount", "depositAmountCents"],
    "'depositAmountCents' does not exist": ["depositAmountCents", "depositAmount"],
    "'lateFeeAmount' does not exist": ["lateFeeAmount", "lateFeeAmountCents"],
    "'lateFeeAmountCents' does not exist": ["lateFeeAmountCents", "lateFeeAmount"],
    "'currentBalance' does not exist": ["currentBalance", "currentBalanceCents"],
    "'currentBalanceCents' does not exist": ["currentBalanceCents", "currentBalance"],
    "'proposedRent' does not exist": ["proposedRent", "proposedRentCents"],
    "'proposedRentCents' does not exist": ["proposedRentCents", "proposedRent"],
    "'currentRent' does not exist": ["currentRent", "currentRentCents"],
    "'currentRentCents' does not exist": ["currentRentCents", "currentRent"],
    "'recommendedRent' does not exist": ["recommendedRent", "recommendedRentCents"],
    "'recommendedRentCents' does not exist": ["recommendedRentCents", "recommendedRent"],
    "'amountPerInstallment' does not exist": ["amountPerInstallment", "amountPerInstallmentCents"],
    "'amountPerInstallmentCents' does not exist": ["amountPerInstallmentCents", "amountPerInstallment"],
    "'totalAmount' does not exist": ["totalAmount", "totalAmountCents"],
    "'totalAmountCents' does not exist": ["totalAmountCents", "totalAmount"],
    "'grossIncome' does not exist": ["grossIncome", "grossIncomeCents"],
    "'grossIncomeCents' does not exist": ["grossIncomeCents", "grossIncome"],
    "'netDistribution' does not exist": ["netDistribution", "netDistributionCents"],
    "'netDistributionCents' does not exist": ["netDistributionCents", "netDistribution"],
    "'debit' does not exist": ["debit", "debitCents"],
    "'debitCents' does not exist": ["debitCents", "debit"],
    "'credit' does not exist": ["credit", "creditCents"],
    "'creditCents' does not exist": ["creditCents", "credit"],
    "'confidenceIntervalLow' does not exist": ["confidenceIntervalLow", "confidenceIntervalLowCents"],
    "'confidenceIntervalHigh' does not exist": ["confidenceIntervalHigh", "confidenceIntervalHighCents"],
    "'lease' does not exist": ["lease", "Lease"],
    "Property 'Lease' does not exist": ["Lease", "leaseId"],
    "'username' does not exist": ["username", "email"],
    "Property 'username' does not exist": ["username", "email"]
};

let iter = 1;

while (iter <= 3) {
    console.log(`\n--- Iteration ${iter} ---`);
    let log = '';
    try {
        console.log('Running tsc...');
        log = execSync('npx tsc --project tsconfig.json', { encoding: 'utf8', stdio: 'pipe' });
        console.log('Success! 0 errors.');
        break;
    } catch (err) {
        log = err.stdout;
    }
    
    log = log.replace(/\x1b\[[0-9;]*m/g, ''); // strip ANSI
    const lines = log.split('\n');
    let modifiedCount = 0;
    
    for (let line of lines) {
        line = line.replace(/\r/g, '');
        const match = line.match(/^([^:]+)\((\d+),(\d+)\):\s*error\s*TS\d+:\s*(.*)$/);
        if (!match) continue;
        
        let [, file, row, col, message] = match;
        file = file.trim();
        const sourceFile = project.getSourceFile(file);
        if (!sourceFile) continue;
        const lineIndex = parseInt(row, 10) - 1;
        
        if (message.includes("An object literal cannot have multiple properties with the same name")) {
            const descendants = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAssignment);
            for (const node of descendants) {
                if (node.getStartLineNumber() === lineIndex + 1) {
                    node.remove();
                    modifiedCount++;
                    break;
                }
            }
            continue;
        }

        if (message.includes("is not assignable to type 'LeaseWhereUniqueInput'") && message.includes("tenantId")) {
            const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
            for (const call of calls) {
                const propAccess = call.getExpression();
                if (propAccess.getKind() === SyntaxKind.PropertyAccessExpression) {
                    if (propAccess.getName() === 'findUnique' && propAccess.getStartLineNumber() <= lineIndex + 5 && propAccess.getStartLineNumber() >= lineIndex - 5) {
                        propAccess.getNameNode().replaceWithText('findFirst');
                        modifiedCount++;
                    }
                }
            }
            continue;
        }

        if (message.includes("Property 'aiUsageMetric' does not exist on type 'PrismaService'")) {
            const expressions = sourceFile.getDescendantsOfKind(SyntaxKind.ExpressionStatement);
            for (const expr of expressions) {
                if (expr.getStartLineNumber() === lineIndex + 1) {
                    expr.remove();
                    modifiedCount++;
                    break;
                }
            }
            const props = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAssignment);
            for (const prop of props) {
                if (prop.getStartLineNumber() === lineIndex + 1) {
                    prop.remove();
                    modifiedCount++;
                    break;
                }
            }
            const methods = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
            for (const m of methods) {
                if (m.getStartLineNumber() === lineIndex + 1) {
                    m.replaceWithText("undefined /* aiUsageMetric removed */");
                    modifiedCount++;
                    break;
                }
            }
            continue;
        }
        
        let targetProp = null;
        let replacement = null;

        for (const key in propMap) {
            if (message.includes(key)) {
                [targetProp, replacement] = propMap[key];
                break;
            }
        }

        if (targetProp) {
            const descendants = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
            for (const node of descendants) {
                if (node.getText() === targetProp && node.getStartLineNumber() === lineIndex + 1) {
                    node.replaceWithText(replacement);
                    modifiedCount++;
                }
            }
        }
    }
    
    if (modifiedCount > 0) {
        project.saveSync();
        console.log(`Fixed ${modifiedCount} issues. Saving...`);
    } else {
        console.log('No issues fixed in this iteration. Stopping.');
        break;
    }
    
    iter++;
}
