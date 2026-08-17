const {
  Document, Packer, Paragraph, TextRun, TabStopType, AlignmentType,
  LevelFormat, BorderStyle,
} = require('docx');
const fs = require('fs');

const ACCENT = '1F4E5F';   // deep teal-navy
const DARK = '1A1A1A';
const GRAY = '595959';
const CONTENT_W = 12240 - 2 * 792; // letter width minus 0.55" margins

const rt = (text, opts = {}) => new TextRun({ text, font: 'Calibri', color: DARK, size: 19, ...opts });

const sectionHeader = (text) => new Paragraph({
  spacing: { before: 110, after: 50 },
  keepNext: true,
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 2 } },
  children: [rt(text, { bold: true, allCaps: true, color: ACCENT, size: 20, characterSpacing: 20 })],
});

const jobHeader = (title, company, meta) => new Paragraph({
  spacing: { before: 80, after: 20 },
  keepNext: true,
  tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
  children: [
    rt(title, { bold: true, size: 20 }),
    rt('  ·  ', { color: GRAY, size: 20 }),
    rt(company, { bold: true, color: ACCENT, size: 20 }),
    rt('\t'),
    rt(meta, { color: GRAY, size: 18 }),
  ],
});

const bullet = (runs) => new Paragraph({
  numbering: { reference: 'dash-bullets', level: 0 },
  spacing: { after: 10, line: 235, lineRule: 'auto' },
  children: (Array.isArray(runs) ? runs : [runs]).map(r => typeof r === 'string' ? rt(r) : r),
});

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Calibri', size: 19, color: DARK } } },
  },
  numbering: {
    config: [{
      reference: 'dash-bullets',
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: '•',
        alignment: AlignmentType.LEFT,
        style: {
          run: { color: ACCENT, font: 'Calibri' },
          paragraph: { indent: { left: 245, hanging: 155 } },
        },
      }],
    }],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 576, bottom: 576, left: 792, right: 792 },
      },
    },
    children: [
      // ---------- Header ----------
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [rt('SHREYANS KHUNTETA', { bold: true, size: 44, color: ACCENT, characterSpacing: 30 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [rt('Senior Software Engineer  |  AI Systems  |  Backend & Enterprise Platforms', { bold: true, size: 20, color: DARK })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF', space: 3 } },
        children: [
          rt('503-724-0544  •  shreyans.khunteta@gmail.com  •  linkedin.com/in/shreyans-khunteta-3167247a', { size: 18, color: GRAY }),
          new TextRun({ break: 1 }),
          rt('github.com/SKhunteta  •  builtbyshrey.com  •  US Citizen', { size: 18, color: GRAY }),
        ],
      }),

      // ---------- Summary ----------
      new Paragraph({
        spacing: { before: 50, after: 20 },
        children: [rt('Senior engineer with 6+ years building .NET platforms, healthcare and financial integrations, and applied AI systems — architecting MCP/RAG services and directing agent-assisted development through specs, automated tests, and technical review.')],
      }),

      // ---------- Experience ----------
      sectionHeader('Experience'),

      jobHeader('Senior Software Engineer', 'Careismatic Brands', 'Remote  |  Sep 2025 – Present'),
      bullet('Lead integration work for a Microsoft Dynamics ERP migration across a $500M+ medical-apparel business (15 brands, 70 countries).'),
      bullet('Built an invoice-reconciliation tool enabling Finance to identify and recover missing payments across enterprise systems.'),
      bullet('Developing an EDI 810 invoice integration to automate B2B invoicing with distribution partners.'),

      jobHeader('Senior Software Engineer', 'SouthEast Bank', 'Remote (Seattle, WA)  |  Jul 2023 – Sep 2025'),
      bullet('Led development of a Loan Origination System (LOS) in Blazor and MS SQL Server, digitizing paper-based lending workflows and cutting loan processing time by 65%.'),
      bullet('Integrated the Equifax API for real-time credit decisions, reducing underwriting turnaround from days to minutes.'),
      bullet('Implemented a custom encryption service protecting database columns holding confidential client data, strengthening security and compliance.'),
      bullet('Raised unit-test coverage from 0% to 94% with Moq and added NLog structured logging, cutting production defects and speeding release cycles.'),

      jobHeader('Software Engineer', 'Moxe Health', 'Remote (Tacoma, WA)  |  Jun 2022 – Apr 2023'),
      bullet('Built a greenfield multi-cloud clinical data pipeline (AWS + Google Cloud) for a major health insurer, managing all infrastructure with Terraform.'),
      bullet('Decomposed a monolithic .NET application into Docker microservices and built an S3-to-BigQuery pipeline for clinical data processing.'),
      bullet('Processed machine-readable health records through a Camunda workflow engine, producing human-readable PDF charts for health-records coding.'),

      jobHeader('Backend Software Developer', 'PacificSource Health Plans', 'Eugene, OR  |  Apr 2020 – Jun 2022'),
      bullet('Built internal .NET tooling for provider data — including a C# roster-file ingestion tool adopted by 12+ developers — saving dozens of engineering hours weekly.'),
      bullet('Cleansed and standardized data with Informatica PowerCenter for the MDM environment, and authored end-to-end source-to-target mapping of the provider data lifecycle.'),

      jobHeader('Founder', 'COVID Response Collective', 'Oregon  |  Mar 2020 – Sep 2020'),
      bullet('Founded and led a 300-person volunteer mutual-aid network — grocery delivery for immunocompromised people, rent assistance, PPE distribution, and mask deliveries to the Navajo Nation and Warm Springs tribe.'),

      // ---------- Selected Systems ----------
      sectionHeader('Selected Systems'),
      bullet([
        rt('BuiltByShrey AI Platform — ', { bold: true }),
        rt('React/Express platform with MCP over Streamable HTTP, Qdrant-backed RAG, and structured portfolio & job-fit tools.'),
      ]),
      bullet([
        rt('Sound & Rail — ', { bold: true }),
        rt('Real-time Three.js Seattle transit visualization with true network geometry, live vehicle feeds, and automated visual regression.'),
      ]),
      bullet([
        rt('The Life of an AI Chip — ', { bold: true }),
        rt('Sourced interactive analysis of AI-hardware chokepoints; provenance and confidence metadata gate every rendered metric.'),
      ]),

      // ---------- Skills ----------
      sectionHeader('Technical Skills'),
      new Paragraph({ spacing: { after: 20 }, children: [rt('AI Systems:  ', { bold: true }), rt('MCP, RAG, Qdrant, OpenAI & Anthropic APIs, structured generation, agent workflows')] }),
      new Paragraph({ spacing: { after: 20 }, children: [rt('Engineering:  ', { bold: true }), rt('C#, .NET, ASP.NET Core, Blazor, SQL, Python, TypeScript, React, Docker')] }),
      new Paragraph({ spacing: { after: 20 }, children: [rt('Cloud & Data:  ', { bold: true }), rt('AWS, Azure, Google Cloud, BigQuery, Kubernetes, Terraform, REST/EDI, Informatica')] }),

      // ---------- Education ----------
      sectionHeader('Education'),
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
        spacing: { after: 0 },
        children: [
          rt('B.S. in Computer Science', { bold: true }),
          rt(', minors in Psychology and Writing'),
          rt('\t'),
          rt('Oregon State University', { bold: true, color: ACCENT }),
        ],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('Shreyans_Khunteta_Resume.docx', buf);
  console.log('written');
});
