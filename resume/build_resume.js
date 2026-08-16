const {
  Document, Packer, Paragraph, TextRun, TabStopType, AlignmentType,
  LevelFormat, BorderStyle, convertInchesToTwip,
} = require('docx');
const fs = require('fs');

const ACCENT = '1F4E5F';   // deep teal-navy
const DARK = '1A1A1A';
const GRAY = '595959';
const CONTENT_W = 12240 - 2 * 864; // letter width minus 0.6" margins

const rt = (text, opts = {}) => new TextRun({ text, font: 'Calibri', color: DARK, size: 20, ...opts });

const sectionHeader = (text) => new Paragraph({
  spacing: { before: 160, after: 70 },
  keepNext: true,
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 2 } },
  children: [rt(text, { bold: true, allCaps: true, color: ACCENT, size: 21, characterSpacing: 20 })],
});

const jobHeader = (title, company, meta) => new Paragraph({
  spacing: { before: 110, after: 30 },
  keepNext: true,
  tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
  children: [
    rt(title, { bold: true, size: 21 }),
    rt('  ·  ', { color: GRAY, size: 21 }),
    rt(company, { bold: true, color: ACCENT, size: 21 }),
    rt('\t'),
    rt(meta, { color: GRAY, size: 19 }),
  ],
});

const bullet = (runs) => new Paragraph({
  numbering: { reference: 'dash-bullets', level: 0 },
  spacing: { after: 20, line: 240, lineRule: 'auto' },
  children: (Array.isArray(runs) ? runs : [runs]).map(r => typeof r === 'string' ? rt(r) : r),
});

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Calibri', size: 20, color: DARK } } },
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
          paragraph: { indent: { left: 260, hanging: 160 } },
        },
      }],
    }],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 648, bottom: 648, left: 864, right: 864 },
      },
    },
    children: [
      // ---------- Header ----------
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [rt('SHREYANS KHUNTETA', { bold: true, size: 52, color: ACCENT, characterSpacing: 30 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [rt('Senior Software Engineer  |  AI Systems  |  Backend & Enterprise Platforms', { bold: true, size: 21, color: DARK })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF', space: 4 } },
        children: [
          rt('503-724-0544  •  shreyans.khunteta@gmail.com  •  linkedin.com/in/shreyans-khunteta-3167247a', { size: 19, color: GRAY }),
          new TextRun({ break: 1 }),
          rt('github.com/SKhunteta  •  builtbyshrey.com  •  US Citizen', { size: 19, color: GRAY }),
        ],
      }),

      // ---------- Summary ----------
      new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [rt('Senior engineer with 6+ years building .NET platforms, healthcare and financial integrations, and applied AI systems. Architects MCP/RAG services and directs agent-assisted development through detailed specifications, automated tests, and technical review.')],
      }),

      // ---------- Experience ----------
      sectionHeader('Experience'),

      jobHeader('Senior Software Engineer', 'Careismatic Brands', 'Remote  |  Sep 2025 – Present'),
      bullet('Lead integration work for a Microsoft Dynamics ERP migration across a $500M+ medical-apparel business spanning 15 brands in 70 countries.'),
      bullet('Built an invoice-reconciliation tool enabling Finance to identify and recover missing payments across enterprise systems.'),
      bullet('Developing an EDI 810 invoice integration to automate B2B invoicing with distribution partners.'),

      jobHeader('Senior Software Engineer', 'SouthEast Bank', 'Remote (Seattle, WA)  |  Jul 2023 – Sep 2025'),
      bullet('Led development of a Loan Origination System (LOS) using Blazor and MS SQL Server, transforming paper-based lending into dynamic digital workflows and cutting loan processing time by 65%.'),
      bullet('Integrated the Equifax API for real-time credit score retrieval, automating credit review and reducing underwriting turnaround from days to minutes.'),
      bullet('Strengthened data security and compliance by implementing a custom encryption service protecting database columns holding confidential client data.'),
      bullet('Raised unit-test coverage from 0% to 94% using Moq, reducing production defects and enabling faster release cycles for new LOS features.'),
      bullet('Implemented structured application logging with NLog across the LOS, improving error traceability, system monitoring, and issue resolution.'),
      bullet('Spearheaded technical collaboration across cross-functional teams, aligning IT and business goals to deliver solutions meeting regulatory and operational requirements.'),

      jobHeader('Software Engineer', 'Moxe Health', 'Remote (Tacoma, WA)  |  Jun 2022 – Apr 2023'),
      bullet('Built a greenfield multi-cloud clinical data pipeline for a major health insurer across AWS and Google Cloud, managing all infrastructure with Terraform.'),
      bullet('Decomposed a monolithic .NET application into Docker microservices and built an AWS S3-to-BigQuery pipeline for clinical data processing.'),
      bullet('Created REST APIs consumed by internal and external applications.'),
      bullet('Processed machine-readable health record files through a Camunda workflow engine, producing human-readable PDF charts for health-records coding.'),

      jobHeader('Backend Software Developer', 'PacificSource Health Plans', 'Eugene, OR  |  Apr 2020 – Jun 2022'),
      bullet('Developed an internal .NET web application housing multiple team build tools targeted at improving provider data, saving dozens of engineering hours weekly.'),
      bullet('Built a C# roster-file ingestion tool streaming data into a staging database with per-file-type edge-case handling; adopted by 12+ developers and hosted via a companion web page.'),
      bullet('Leveraged Informatica PowerCenter to cleanse and standardize data for loading into the Master Data Management (MDM) environment.'),
      bullet('Created end-to-end source-to-target mapping of the provider data lifecycle, unifying disparate documentation efforts into a single reference document.'),

      jobHeader('Founder', 'COVID Response Collective', 'Oregon  |  Mar 2020 – Sep 2020'),
      bullet('Founded and led a 300-person volunteer mutual-aid network coordinating grocery delivery to immunocompromised people, rent assistance, and PPE distribution.'),
      bullet('Organized mask deliveries to the Navajo Nation and the Warm Springs tribe, and partnered with 2 Towns Ciderhouse to repurpose barrels into handwashing stations for unhoused communities.'),
      bullet('Managed an internship program for Oregon State University New Media Communications students, directing social media and design work approved for college credit.'),

      // ---------- Selected Systems ----------
      sectionHeader('Selected Systems'),
      bullet([
        rt('BuiltByShrey AI Platform — ', { bold: true }),
        rt('Architected and deployed a React/Express platform with MCP over Streamable HTTP, Qdrant-backed RAG, structured portfolio and job-fit tools, and canon-aware retrieval.'),
      ]),
      bullet([
        rt('Sound & Rail — ', { bold: true }),
        rt('Architected and directed agent-assisted development of a real-time Three.js Seattle transit visualization using true network geometry and live vehicle feeds, with disclosed simulation fallbacks, device-tier rendering, and automated visual regression.'),
      ]),
      bullet([
        rt('The Life of an AI Chip — ', { bold: true }),
        rt('Created a sourced interactive analysis of AI-hardware chokepoints; encoded provenance, confidence, and re-verification metadata so unsourced metrics cannot render.'),
      ]),

      // ---------- Skills ----------
      sectionHeader('Technical Skills'),
      new Paragraph({ spacing: { after: 30 }, children: [rt('AI Systems:  ', { bold: true }), rt('MCP, RAG, Qdrant, OpenAI & Anthropic APIs, structured generation, Claude Code agent workflows')] }),
      new Paragraph({ spacing: { after: 30 }, children: [rt('Engineering:  ', { bold: true }), rt('C#, .NET, ASP.NET Core, Blazor, SQL, Python, JavaScript, TypeScript, React, Docker')] }),
      new Paragraph({ spacing: { after: 30 }, children: [rt('Cloud & Data:  ', { bold: true }), rt('AWS, Azure, Google Cloud, BigQuery, Kubernetes, Terraform, REST/EDI integrations, Informatica')] }),

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
