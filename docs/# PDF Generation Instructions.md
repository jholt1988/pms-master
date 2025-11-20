# PDF Generation Instructions

The AI Features Development Plan has been created in Markdown format. To generate a PDF version, use one of the following methods:

## Method 1: Using markdown-pdf (Recommended)

### Install globally:
```bash
npm install -g markdown-pdf
```

### Generate PDF:
```bash
cd c:\Users\plabr\IN_PROGRESS\property_management_suite\docs
markdown-pdf AI_FEATURES_DEVELOPMENT_PLAN.md -o AI_FEATURES_DEVELOPMENT_PLAN.pdf
```

## Method 2: Using VS Code Extension

1. Install the "Markdown PDF" extension by yzane
2. Open `AI_FEATURES_DEVELOPMENT_PLAN.md` in VS Code
3. Press `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
4. Type "Markdown PDF: Export (pdf)" and press Enter
5. PDF will be generated in the same directory

## Method 3: Using Pandoc (Professional Quality)

### Install Pandoc:
- Windows: Download from https://pandoc.org/installing.html
- Or use chocolatey: `choco install pandoc`

### Generate PDF with custom styling:
```bash
cd c:\Users\plabr\IN_PROGRESS\property_management_suite\docs
pandoc AI_FEATURES_DEVELOPMENT_PLAN.md -o AI_FEATURES_DEVELOPMENT_PLAN.pdf --pdf-engine=xelatex -V geometry:margin=1in
```

## Method 4: Using Online Converter

1. Visit https://www.markdowntopdf.com/
2. Upload `AI_FEATURES_DEVELOPMENT_PLAN.md`
3. Click "Convert to PDF"
4. Download the generated PDF

## Method 5: Using Chrome/Edge Browser

1. Open `AI_FEATURES_DEVELOPMENT_PLAN.md` in VS Code
2. Press `Ctrl+Shift+V` to preview
3. Right-click in preview → "Open in Browser"
4. Press `Ctrl+P` → Select "Save as PDF"

## Customization Options

### For markdown-pdf:
Create a `.markdown-pdf.css` file in the same directory:

```css
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #333;
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #2c3e50;
  border-bottom: 3px solid #3498db;
  padding-bottom: 10px;
}

h2 {
  color: #34495e;
  border-bottom: 2px solid #95a5a6;
  padding-bottom: 8px;
  margin-top: 30px;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 20px 0;
}

th, td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}

th {
  background-color: #3498db;
  color: white;
}

code {
  background-color: #f4f4f4;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

pre {
  background-color: #f8f9fa;
  border-left: 4px solid #3498db;
  padding: 15px;
  overflow-x: auto;
}

blockquote {
  border-left: 4px solid #95a5a6;
  margin: 20px 0;
  padding-left: 20px;
  color: #555;
  font-style: italic;
}
```

Then run:
```bash
markdown-pdf AI_FEATURES_DEVELOPMENT_PLAN.md -o AI_FEATURES_DEVELOPMENT_PLAN.pdf -s .markdown-pdf.css
```

## Troubleshooting

### Issue: "markdown-pdf: command not found"
**Solution**: Ensure npm global bin is in your PATH, or use npx:
```bash
npx markdown-pdf AI_FEATURES_DEVELOPMENT_PLAN.md -o AI_FEATURES_DEVELOPMENT_PLAN.pdf
```

### Issue: PDF formatting looks broken
**Solution**: Use Pandoc with LaTeX engine for better formatting:
```bash
pandoc AI_FEATURES_DEVELOPMENT_PLAN.md -o AI_FEATURES_DEVELOPMENT_PLAN.pdf --pdf-engine=xelatex
```

### Issue: Tables overflow in PDF
**Solution**: Use smaller font or landscape orientation:
```bash
pandoc AI_FEATURES_DEVELOPMENT_PLAN.md -o AI_FEATURES_DEVELOPMENT_PLAN.pdf -V geometry:landscape -V geometry:margin=0.5in
```

## File Locations

- **Markdown Source**: `c:\Users\plabr\IN_PROGRESS\property_management_suite\docs\AI_FEATURES_DEVELOPMENT_PLAN.md`
- **Generated PDF**: `c:\Users\plabr\IN_PROGRESS\property_management_suite\docs\AI_FEATURES_DEVELOPMENT_PLAN.pdf`
- **Architecture Diagram**: `c:\Users\plabr\IN_PROGRESS\property_management_suite\docs\AI_FEATURE_INTEGRATION_PLAN_ARCHITECTURE.txt`

## Recommended Method

For best results, use **Method 3 (Pandoc)** with the following command:

```bash
pandoc AI_FEATURES_DEVELOPMENT_PLAN.md -o AI_FEATURES_DEVELOPMENT_PLAN.pdf \
  --pdf-engine=xelatex \
  --toc \
  --toc-depth=3 \
  -V geometry:margin=1in \
  -V fontsize=11pt \
  -V documentclass=article \
  -V colorlinks=true \
  -V linkcolor=blue \
  -V urlcolor=blue
```

This will create a professional PDF with:
- Table of contents
- Proper page margins
- Clickable links
- Good typography