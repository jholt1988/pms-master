const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project({
    tsConfigFilePath: "tsconfig.json",
});

let log = fs.readFileSync('tsc_errors_final2.log', 'utf8');
log = log.replace(/\x1b\[[0-9;]*m/g, ''); // strip ANSI

const lines = log.split('\n');

const propMap = {
    "'amount' does not exist": ["amount", "amountCents"],
    "'rentAmount' does not exist": ["rentAmount", "rentAmountCents"],
    "'depositAmount' does not exist": ["depositAmount", "depositAmountCents"],
    "'lateFeeAmount' does not exist": ["lateFeeAmount", "lateFeeAmountCents"],
    "'currentBalance' does not exist": ["currentBalance", "currentBalanceCents"],
    "'proposedRent' does not exist": ["proposedRent", "proposedRentCents"],
    "'currentRent' does not exist": ["currentRent", "currentRentCents"],
    "'recommendedRent' does not exist": ["recommendedRent", "recommendedRentCents"],
    "'amountPerInstallment' does not exist": ["amountPerInstallment", "amountPerInstallmentCents"],
    "'totalAmount' does not exist": ["totalAmount", "totalAmountCents"],
    "'grossIncome' does not exist": ["grossIncome", "grossIncomeCents"],
    "'netDistribution' does not exist": ["netDistribution", "netDistributionCents"],
    "'debit' does not exist": ["debit", "debitCents"],
    "'credit' does not exist": ["credit", "creditCents"]
};

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
    
    // Fix TS1117 duplicate keys
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
    
    let targetProp = null;
    let replacement = null;

    for (const key in propMap) {
        if (message.includes(key)) {
            [targetProp, replacement] = propMap[key];
            break;
        }
    }

    if (!targetProp) continue;

    const descendants = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
    let found = false;
    for (const node of descendants) {
        if (node.getText() === targetProp && node.getStartLineNumber() === lineIndex + 1) {
            const parent = node.getParent();
            
            if (parent.getKind() === SyntaxKind.PropertyAssignment) {
                if (parent.getNameNode() === node) {
                    node.replaceWithText(replacement);
                    modifiedCount++;
                } else {
                    node.replaceWithText(replacement);
                    modifiedCount++;
                }
            } else if (parent.getKind() === SyntaxKind.ShorthandPropertyAssignment) {
                parent.replaceWithText(`${replacement}: ${targetProp}`);
                modifiedCount++;
            } else if (parent.getKind() === SyntaxKind.PropertyAccessExpression) {
                if (parent.getNameNode() === node) {
                    node.replaceWithText(replacement);
                    modifiedCount++;
                } else {
                    node.replaceWithText(replacement);
                    modifiedCount++;
                }
            } else if (parent.getKind() === SyntaxKind.BindingElement) {
                if (parent.getPropertyNameNode() === undefined && parent.getNameNode() === node) {
                    parent.replaceWithText(`${replacement}: ${targetProp}`);
                    modifiedCount++;
                }
            } else {
                node.replaceWithText(replacement);
                modifiedCount++;
            }
            // we do NOT break here so it can replace multiple occurrences on the SAME line!
        }
    }
}

if (modifiedCount > 0) {
    project.saveSync();
    console.log('Fixed ' + modifiedCount + ' issues');
} else {
    console.log('No issues fixed by ts-morph');
}
