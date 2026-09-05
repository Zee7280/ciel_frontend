/** CIEL PK Final Year Projects V9 form catalog — academic areas, routes, roadmaps, pathway fields.
 * Maps onto existing FYP JSON columns so the live API / merit model stay intact. */

import type { FypRoute } from "./fypTypes";

export type FypV9RouteKey =
    | "research"
    | "prototype"
    | "software"
    | "design"
    | "creative"
    | "media"
    | "business"
    | "field"
    | "legal"
    | "clinical"
    | "theory"
    | "other";

export const FYP_V9_TO_MERIT_ROUTE: Record<FypV9RouteKey, FypRoute> = {
    research: "scholar",
    legal: "scholar",
    theory: "scholar",
    clinical: "scholar",
    prototype: "maker",
    design: "maker",
    creative: "maker",
    software: "builder",
    media: "storyteller",
    business: "consultant",
    field: "consultant",
    other: "scholar",
};

export const FYP_V9_STEP_NAMES = ["Route", "Roadmap", "Pathway", "Evidence", "Outcome", "Sustainability", "Reflection", "Review"] as const;

export const FYP_V9_ROUTES: Record<FypV9RouteKey, { icon: string; title: string; desc: string; tag: string }> = {
    research: {
        icon: "📚",
        title: "Research / Thesis / Dissertation / Research Paper",
        desc: "Empirical, qualitative, mixed-method, experimental, systematic review, historical, interpretive or scholarly research.",
        tag: "RESEARCH",
    },
    prototype: {
        icon: "⚙️",
        title: "Prototype / Product / Engineering Build",
        desc: "Physical product, device, material, engineered solution, fabricated system or experimental prototype.",
        tag: "BUILD & TEST",
    },
    software: {
        icon: "💻",
        title: "Software / Digital / AI / Data System",
        desc: "Application, platform, AI/ML model, game, database, automation, digital experience or computing system.",
        tag: "DIGITAL",
    },
    design: {
        icon: "🏛️",
        title: "Architecture / Planning / Design Project",
        desc: "Architectural thesis, spatial/interior project, planning solution, model, design system or built-environment project.",
        tag: "DESIGN",
    },
    creative: {
        icon: "🎨",
        title: "Fashion / Textile / Fine Art / Creative Practice",
        desc: "Garment, collection, textile development, artwork, installation, photography, craft, exhibition or creative artefact.",
        tag: "CREATIVE",
    },
    media: {
        icon: "🎬",
        title: "Film / TV / Media / Communication / Performance",
        desc: "Film, documentary, animation, campaign, publication, journalism, theatre, performance, podcast or media production.",
        tag: "MEDIA",
    },
    business: {
        icon: "📈",
        title: "Business / Consultancy / Entrepreneurship",
        desc: "Consultancy, market or feasibility study, strategy, business plan, venture, financial model or organisational solution.",
        tag: "APPLIED",
    },
    field: {
        icon: "🤝",
        title: "Education / Community / Field Intervention",
        desc: "Teaching intervention, curriculum/resource design, social/community project, extension work, service improvement or field implementation.",
        tag: "FIELD",
    },
    legal: {
        icon: "⚖️",
        title: "Legal / Policy / Regulatory Project",
        desc: "Doctrinal analysis, case-law study, comparative legal research, legal drafting, policy analysis or regulatory proposal.",
        tag: "LEGAL / POLICY",
    },
    clinical: {
        icon: "🩺",
        title: "Clinical / Health / Professional Practice",
        desc: "Clinical, allied-health, pharmacy, nursing, public-health, veterinary or professionally supervised applied project.",
        tag: "PROFESSIONAL",
    },
    theory: {
        icon: "∑",
        title: "Mathematical / Theoretical / Modelling",
        desc: "Proof, formal model, theoretical analysis, simulation, conceptual framework or abstract disciplinary inquiry.",
        tag: "THEORY",
    },
    other: {
        icon: "＋",
        title: "Other / Interdisciplinary",
        desc: "Choose this if the final work does not fit the listed routes; define the pathway in your own words.",
        tag: "CUSTOM",
    },
};

export const FYP_V9_ROUTE_KEYS = Object.keys(FYP_V9_ROUTES) as FypV9RouteKey[];

export const FYP_V9_AREAS: Record<string, { label: string; council: string; routes: FypV9RouteKey[]; disciplines: string[] }> = {
    engineering: {
        label: "Engineering & Engineering Technology",
        council: "Typical professional/accreditation coverage: Pakistan Engineering Council (PEC) and/or National Technology Council (NTC), depending on programme.",
        routes: ["prototype", "software", "research"],
        disciplines: ["Aerospace Engineering", "Avionics Engineering", "Biomedical Engineering", "Chemical Engineering", "Civil Engineering", "Electrical Engineering", "Electronics Engineering", "Energy Systems Engineering", "Environmental Engineering", "Food Engineering", "Industrial Engineering", "Materials / Metallurgy Engineering", "Mechanical Engineering", "Mechatronics Engineering", "Mining Engineering", "Petroleum & Gas Engineering", "Telecommunication Engineering", "Textile Engineering", "Engineering Technology", "B-Tech / Technology Programme", "Surveying / Geomatics Engineering Technology", "Nuclear Engineering Technology", "Space Science Engineering Technology", "Other"],
    },
    computing: {
        label: "Computing, Digital, AI & Data",
        council: "Typical accreditation coverage: National Computing Education Accreditation Council (NCEAC); some technology-oriented programmes may fall under NTC.",
        routes: ["software", "research", "prototype"],
        disciplines: ["Computer Science", "Software Engineering", "Artificial Intelligence", "Data Science", "Cyber Security", "Information Technology", "Computer Engineering", "Computer Games Development", "Multimedia & Animation", "Robotics", "Human–Computer Interaction (HCI)", "Internet of Things (IoT)", "Network Infrastructure & Cloud Computing", "Quantum Computing", "Health Informatics", "Bioinformatics", "Other"],
    },
    natural: {
        label: "Natural, Physical, Biological & Earth Sciences",
        council: "HEC curriculum / quality framework; HEC is also developing broader accreditation coverage for natural and biological sciences.",
        routes: ["research", "theory", "prototype"],
        disciplines: ["Biochemistry", "Biology", "Biotechnology", "Botany", "Chemistry", "Physics", "Zoology", "Microbiology", "Molecular Biology", "Genetics", "Fresh Water Biology", "Marine Sciences", "Geology", "Environmental Science", "Space Sciences", "Bioinformatics", "Other"],
    },
    math: {
        label: "Mathematics, Statistics & Quantitative Sciences",
        council: "HEC curriculum / quality framework.",
        routes: ["theory", "research", "software"],
        disciplines: ["Mathematics", "Statistics", "Applied Mathematics", "Computational Mathematics", "Mathematical Modelling", "Quantitative / Statistical Sciences", "Other"],
    },
    agriculture: {
        label: "Agriculture, Food, Forestry & Environmental Production",
        council: "Typical accreditation coverage: National Agricultural Education Accreditation Council (NAEAC).",
        routes: ["research", "prototype", "field"],
        disciplines: ["Agronomy", "Agricultural Extension", "Horticulture", "Forestry", "Plant Breeding & Genetics", "Soil Science", "Agricultural & Resource Economics", "Plant Pathology", "Entomology", "Food Technology", "Food Science & Technology", "Crop Physiology", "Meat Science", "Water Management", "Animal Production & Technology", "Fisheries / Aquaculture", "Agricultural Sciences", "Other"],
    },
    veterinary: {
        label: "Veterinary & Animal Health Sciences",
        council: "Typical professional coverage: Pakistan Veterinary Medical Council (PVMC).",
        routes: ["clinical", "research", "field"],
        disciplines: ["Veterinary Medicine / DVM", "Veterinary Sciences", "Animal Health", "Animal Production & Technology", "Livestock / Poultry Sciences", "Other"],
    },
    business: {
        label: "Business, Management, Commerce, Economics & Administration",
        council: "Typical accreditation coverage for business education: National Business Education Accreditation Council (NBEAC).",
        routes: ["business", "research", "software"],
        disciplines: ["Business Administration", "Management Sciences", "Accounting & Finance", "Commerce", "Economics", "Marketing", "Human Resource Management", "Supply Chain / Operations Management", "Entrepreneurship", "Finance / Investment", "Public Administration", "Project Management", "Other"],
    },
    social: {
        label: "Social, Behavioural, Development & Policy Sciences",
        council: "HEC curriculum / quality framework; HEC has announced work toward broader social-science and psychology accreditation coverage.",
        routes: ["research", "field", "legal"],
        disciplines: ["Anthropology", "Criminology", "Development Studies", "Disaster Management", "Gender / Women Studies", "International Relations", "Peace & Conflict Studies", "Political Science", "Psychology", "Social Work", "Sociology", "Geography", "Pakistan Studies", "Public Policy", "Governance", "Other"],
    },
    education: {
        label: "Education & Teacher Development",
        council: "Typical accreditation coverage: National Accreditation Council for Teacher Education (NACTE).",
        routes: ["field", "research", "software"],
        disciplines: ["Education", "Teacher Education", "Special Education", "Early Childhood Education", "Curriculum & Instruction", "Assessment / Educational Measurement", "Educational Leadership & Management", "Educational Technology", "Other"],
    },
    law: {
        label: "Law, Legal Studies & Governance",
        council: "Typical professional coverage: Pakistan Bar Council (PBC).",
        routes: ["legal", "research", "field"],
        disciplines: ["Law / LLB", "Corporate / Commercial Law", "International Law", "Constitutional / Public Law", "Criminal Justice / Criminology", "Human Rights Law", "Legal Studies", "Governance / Regulatory Studies", "Other"],
    },
    built: {
        label: "Architecture, Planning & Built Environment",
        council: "Typical professional coverage: Pakistan Council for Architects and Town Planners (PCATP).",
        routes: ["design", "research", "prototype"],
        disciplines: ["Architecture", "City & Regional Planning", "Urban Planning", "Interior / Spatial Design", "Landscape Architecture", "Heritage & Conservation", "Built Environment / Urban Design", "Remote Sensing & GIS", "Other"],
    },
    art: {
        label: "Fine Arts, Design, Fashion & Textile Practice",
        council: "HEC Art / Design / Media framework; programme-specific institutional quality processes apply.",
        routes: ["creative", "design", "media"],
        disciplines: ["Fine Arts", "Painting", "Sculpture", "Printmaking", "Ceramics", "Textile Design", "Fashion Design", "Graphic Design", "Photography", "Interior & Spatial Design", "Performing Arts", "Digital / AI-Integrated Art", "Visual Communication / Illustration", "Craft / Material Practice", "Other"],
    },
    media: {
        label: "Film, Television, Media, Communication & Performance",
        council: "HEC Art / Design / Media and Media & Communication curriculum frameworks.",
        routes: ["media", "creative", "research"],
        disciplines: ["Media & Communication Studies", "Mass Communication", "Film & Television", "Theatre / Performance", "Journalism", "Advertising / Public Relations", "Animation", "Digital Media", "Broadcast / Audio Production", "Communication Design", "Other"],
    },
    humanities: {
        label: "Humanities, Languages, History, Culture & Religious Studies",
        council: "HEC curriculum / quality framework; language and humanities accreditation reforms are under development.",
        routes: ["research", "creative", "legal"],
        disciplines: ["English", "Urdu", "Punjabi", "Persian", "History", "Archaeology", "Islamic Studies", "Pakistan Studies", "Philosophy", "Languages / Linguistics", "Cultural Studies", "Religious Studies", "Other"],
    },
    medicine: {
        label: "Medicine, Dentistry & Clinical Medicine",
        council: "Typical professional coverage: Pakistan Medical & Dental Council (PMDC).",
        routes: ["clinical", "research", "prototype"],
        disciplines: ["Medicine / MBBS", "Dentistry / BDS", "Clinical Medicine", "Medical Sciences", "Other"],
    },
    nursing: {
        label: "Nursing & Midwifery",
        council: "Typical professional coverage: Pakistan Nursing and Midwifery Council (PN&MC).",
        routes: ["clinical", "research", "field"],
        disciplines: ["Nursing / BSN", "Pediatric Nursing", "Midwifery", "Community / Public Health Nursing", "Other"],
    },
    pharmacy: {
        label: "Pharmacy & Pharmaceutical Sciences",
        council: "Typical professional coverage: Pharmacy Council of Pakistan (PCP).",
        routes: ["clinical", "research", "prototype"],
        disciplines: ["Pharmacy / Pharm.D", "Pharmaceutical Sciences", "Pharmaceutics", "Pharmacology / Clinical Pharmacy", "Other"],
    },
    allied: {
        label: "Allied Health, Rehabilitation, Public Health & Nutrition",
        council: "Typical professional coverage: Allied Health Professionals Council (AHPC) and relevant HEC/professional frameworks.",
        routes: ["clinical", "research", "prototype"],
        disciplines: ["Public Health", "Doctor of Physical Therapy / Physical Therapy", "Occupational Therapy", "Human Nutrition & Dietetics", "Medical Laboratory Technology", "Anaesthesia Technology", "Aesthetics & Skin Care Technology", "Cardiac Care / Cardiology Technology", "Dental Technology", "Medical Imaging / Radiography Technology", "Orthotics & Prosthetics", "Renal Dialysis Technology", "Speech & Language Pathology", "Surgical / Operation Theatre Technology", "Optometry / Ophthalmology Technology", "Respiratory Care Technology", "Emergency & Intensive Care Technology", "Nuclear Medicine Technology", "Rehabilitation Medical Technology", "Sports / Exercise Medicine Technology", "Other"],
    },
    home: {
        label: "Home Economics, Nutrition, Family & Consumer Sciences",
        council: "HEC curriculum / quality framework; some nutrition and allied-health programmes may have additional professional requirements.",
        routes: ["research", "creative", "business"],
        disciplines: ["Home Economics", "Human Nutrition & Dietetics", "Food & Nutrition", "Family / Consumer Sciences", "Interior / Home Design", "Textile & Clothing", "Other"],
    },
    library: {
        label: "Library, Information, Archives & Knowledge Studies",
        council: "HEC curriculum / quality framework.",
        routes: ["research", "software", "field"],
        disciplines: ["Library & Information Science", "Information Management", "Archives / Records Management", "Knowledge Management", "Other"],
    },
    tourism: {
        label: "Tourism, Hospitality & Service Studies",
        council: "HEC curriculum / institutional quality framework.",
        routes: ["business", "field", "research"],
        disciplines: ["Tourism & Hospitality Management", "Hospitality Management", "Tourism Studies", "Event / Service Management", "Other"],
    },
    traditional: {
        label: "Traditional / Complementary Medicine",
        council: "Professional bodies include National Council for Homoeopathy (NCH) and National Council for Tibb (NCT), where applicable.",
        routes: ["clinical", "research", "field"],
        disciplines: ["Homoeopathy", "Tibb / Eastern Medicine", "Traditional / Complementary Medicine", "Other"],
    },
    sports: {
        label: "Sports, Physical Education & Exercise Sciences",
        council: "HEC curriculum / institutional quality framework; professional requirements may vary by programme.",
        routes: ["field", "research", "clinical"],
        disciplines: ["Physical Education", "Sports Sciences", "Exercise Science", "Sports Management", "Health & Physical Education", "Adapted Physical Activity", "Other"],
    },
    religion: {
        label: "Islamic, Religious, Seerah & Theological Studies",
        council: "HEC curriculum / institutional quality framework.",
        routes: ["research", "legal", "field"],
        disciplines: ["Islamic Studies", "Seerah Studies", "Quranic Studies", "Hadith Studies", "Comparative Religion", "Theology", "Islamic Thought / Philosophy", "Islamic Finance / Shariah Studies", "Other"],
    },
    area: {
        label: "Area, Regional, Strategic & Security Studies",
        council: "HEC curriculum / institutional quality framework.",
        routes: ["research", "legal", "field"],
        disciplines: ["Pakistan Studies", "Strategic Studies", "Defence & Security Studies", "South Asian Studies", "Area Studies", "Diplomacy / Foreign Policy Studies", "Peace & Conflict Studies", "Other"],
    },
    maritime: {
        label: "Marine, Maritime, Ocean & Coastal Studies",
        council: "HEC curriculum / institutional quality framework; relevant professional standards may apply to specialist programmes.",
        routes: ["research", "prototype", "field"],
        disciplines: ["Marine Sciences", "Oceanography", "Coastal Studies", "Maritime Studies", "Fisheries / Aquaculture", "Marine Biology", "Marine Technology", "Other"],
    },
    interdisciplinary: {
        label: "Interdisciplinary / Emerging / University-Specific",
        council: "Use this when your programme crosses fields or has a newer nomenclature not captured above.",
        routes: ["research", "prototype", "software", "design", "creative", "media", "business", "field", "legal", "clinical", "theory", "other"],
        disciplines: ["Interdisciplinary Studies", "Sustainability Studies", "Innovation / Technology Management", "Women, Development & Seerah Studies", "Women, Entrepreneurship & Seerah Studies", "Women, Leadership & Seerah Studies", "Other"],
    },
};

export const FYP_V9_ROADMAPS: Record<FypV9RouteKey, [string, string][]> = {
    research: [["Frame", "Question, context & research gap"], ["Design", "Approach, ethics & evidence plan"], ["Collect", "Data, sources, cases or material"], ["Analyse", "Analyse / interpret / test"], ["Conclude", "Findings, contribution & final paper/thesis"]],
    prototype: [["Define", "Need, user & technical requirements"], ["Design", "Concept, specifications & materials"], ["Build", "Prototype / fabrication / development"], ["Test", "Performance, safety, usability or standards"], ["Refine", "Final build, evidence & technical documentation"]],
    software: [["Discover", "User/system problem & requirements"], ["Design", "Architecture, data & core features"], ["Build", "Implement working system/model"], ["Test", "Functionality, usability, performance & security"], ["Deliver", "Deploy/demo, document & evaluate"]],
    design: [["Research", "Brief, site/context, precedents & users"], ["Concept", "Design intention & early alternatives"], ["Develop", "Drawings/models, systems & iterations"], ["Resolve", "Technical, environmental & feasibility integration"], ["Present", "Final design package, model/portfolio & defence"]],
    creative: [["Research", "Concept, references, user/cultural/material research"], ["Explore", "Experiment, samples, sketches & trials"], ["Develop", "Prototype / collection / body of work"], ["Refine", "Critique, iteration & craft/technical resolution"], ["Present", "Final work, portfolio, exhibition/runway/jury"]],
    media: [["Research", "Audience, context, narrative/message"], ["Pre-produce", "Script, storyboard, treatment & planning"], ["Produce", "Shoot/create/perform/develop"], ["Post-produce", "Edit, sound, design, refinement"], ["Evaluate", "Screening/audience response & final delivery"]],
    business: [["Diagnose", "Organisation/market problem & stakeholders"], ["Research", "Market, customer, financial or operational evidence"], ["Analyse", "Evaluate options / business case"], ["Recommend", "Solution, strategy, plan or venture model"], ["Validate", "Feasibility, client feedback & implementation plan"]],
    field: [["Needs", "Learner/community/service need & baseline"], ["Plan", "Intervention/resource/activity design"], ["Deliver", "Implement in the field"], ["Evaluate", "Participation, learning, service or outcome evidence"], ["Improve", "Reflection, refinement & handover/next steps"]],
    legal: [["Frame", "Legal/policy question & jurisdiction"], ["Research", "Statutes, cases, doctrine, policy & scholarship"], ["Analyse", "Interpret, compare & test arguments"], ["Develop", "Position, draft, recommendation or framework"], ["Conclude", "Implications, limitations & final legal/policy output"]],
    clinical: [["Define", "Clinical/professional problem & context"], ["Evidence", "Guidelines, ethics & professional standards"], ["Plan", "Method/intervention/protocol"], ["Evaluate", "Outcome measures, audit/test/feedback"], ["Conclude", "Professional learning, limitations & recommendations"]],
    theory: [["Formulate", "Problem, proposition & assumptions"], ["Develop", "Definitions, derivation, proof or model"], ["Test", "Boundary cases, simulation or robustness"], ["Interpret", "Meaning, implications & comparison"], ["Present", "Contribution, limitations & final defence/report"]],
    other: [["Define", "Clarify what your programme expects"], ["Plan", "Choose appropriate research/development stages"], ["Create", "Produce the main work"], ["Evaluate", "Use relevant evidence/critique/testing"], ["Present", "Finalize output, documentation & reflection"]],
};

export const FYP_V9_DELIVERABLES: Record<FypV9RouteKey, string[]> = {
    research: ["Thesis / dissertation", "Research report", "Research paper / manuscript", "Systematic / evidence review", "Dataset / appendix", "Presentation / viva", "Poster / conference output"],
    prototype: ["Working prototype", "Product / device", "Material / sample system", "Technical report", "Drawings / specifications", "Testing results", "Prototype video / demonstration"],
    software: ["Working software / application", "Source code / repository", "AI / data model", "System documentation", "Demo / deployment", "Testing / performance report"],
    design: ["Design thesis / report", "Drawings / plans", "Physical / digital model", "Renderings / visualization", "Site / context analysis", "Portfolio / jury presentation"],
    creative: ["Final garment / collection", "Textile / material samples", "Artwork / artefact", "Installation / exhibition", "Process book / portfolio", "Creative research statement", "Runway / jury presentation"],
    media: ["Film / documentary / animation", "Media / communication campaign", "Performance", "Script / storyboard", "Production file / portfolio", "Audience / engagement report"],
    business: ["Consultancy report", "Business plan / venture proposal", "Market / feasibility study", "Strategy report", "Financial model", "Client presentation / implementation plan"],
    field: ["Intervention / programme", "Teaching / learning resource", "Community / field implementation", "Training / workshop package", "Evaluation report", "Toolkit / guide", "Presentation / handover"],
    legal: ["Legal research paper", "Case-law / doctrinal analysis", "Comparative legal study", "Policy paper", "Legal draft / model instrument", "Regulatory framework / recommendation", "Presentation / defence"],
    clinical: ["Clinical / professional report", "Case study / audit", "Intervention / protocol", "Research report", "Poster / presentation", "Evidence / outcome record"],
    theory: ["Proof / derivation", "Theoretical paper / report", "Formal model", "Simulation", "Conceptual framework", "Presentation / defence"],
    other: ["Report / documentation", "Physical output", "Digital output", "Portfolio", "Presentation", "Evidence package"],
};

export const FYP_V9_EVIDENCE: Record<FypV9RouteKey, string[]> = {
    research: ["Literature / source evidence", "Survey / dataset", "Interviews / focus groups", "Experiment / lab data", "Statistical analysis", "Thematic / textual analysis", "Peer / expert review"],
    prototype: ["Functional testing", "Performance benchmarks", "Material testing", "User testing", "Safety / standards check", "Expert review", "Iteration comparison"],
    software: ["Unit / system testing", "User testing", "Performance benchmarks", "Model metrics", "Security / reliability checks", "Expert / client review", "Version / iteration evidence"],
    design: ["Jury / critique", "User feedback", "Site / context evidence", "Code / standard compliance", "Model / simulation", "Design iteration", "Expert review"],
    creative: ["Critique / jury", "Material / technique testing", "Audience response", "Process documentation", "Iteration / experimentation", "Exhibition / showcase", "Expert review"],
    media: ["Audience testing", "Reach / engagement metrics", "Screening / critique", "Production quality review", "Message / content analysis", "Iteration / edit comparison", "Expert review"],
    business: ["Market evidence", "Financial analysis", "Client feedback", "Benchmark / competitor analysis", "Survey / interview data", "Feasibility testing", "Expert review"],
    field: ["Baseline / needs evidence", "Participation / attendance", "Learning / performance evidence", "User / community feedback", "Observation", "Pre-post comparison", "Supervisor / partner review"],
    legal: ["Primary legal sources", "Case law / precedent", "Statutes / regulations", "Comparative jurisdiction analysis", "Policy evidence", "Doctrinal scholarship", "Expert / supervisor review"],
    clinical: ["Outcome measures", "Clinical / professional assessment", "Case evidence", "Audit data", "Participant / patient feedback", "Guideline / protocol alignment", "Supervisor review"],
    theory: ["Proof / logical verification", "Simulation / computational check", "Counterexample testing", "Comparison with literature", "Model validation", "Peer / supervisor critique", "Boundary / sensitivity analysis"],
    other: ["Documentary evidence", "Testing / evaluation", "User / audience feedback", "Expert review", "Data / measurement", "Iteration evidence"],
};

export const FYP_V9_WHY = ["Academic / disciplinary gap", "Real-world problem", "Industry / professional need", "Creative exploration", "User / community need", "New technology / opportunity", "Policy / regulatory relevance", "Environmental / social relevance", "Personal research interest"];
export const FYP_V9_CONTRIB = ["New knowledge / insight", "Original analysis", "Prototype / product", "Technical improvement", "Creative / design contribution", "Framework / model", "Software / digital solution", "Teaching / community resource", "Professional recommendation", "Legal / policy recommendation", "Dataset / method / tool", "Replication / validation"];
export const FYP_V9_SKILLS = ["Research & analysis", "Critical thinking", "Creative development", "Technical / lab", "Design & prototyping", "Data / statistics", "Software / digital", "Writing & communication", "Project management", "Teamwork", "Professional practice", "Problem-solving", "Ethical / responsible practice"];
export const FYP_V9_OPPORTUNITY = ["Internship / job portfolio", "Paid pilot / industry project", "Freelance / commission work", "Startup / incubation", "IP / licensing", "Publication / conference", "Grant / competition", "Exhibition / showcase", "Further research / postgraduate study"];
export const FYP_V9_SUSTAIN = ["Direct / material connection", "Indirect / contextual connection", "Potential / future connection", "No defensible sustainability link", "Not sure — request guidance"];
export const FYP_V9_Q_ANALYSIS = ["Descriptive statistics", "t-test / ANOVA", "Chi-square", "Correlation", "Regression", "Non-parametric test", "Time-series / forecasting", "Financial / ratio analysis", "Model performance metrics", "Experimental comparison", "Technical measurements"];
export const FYP_V9_LEVELS = ["Undergraduate / Bachelor's", "Professional Undergraduate", "Postgraduate / Taught Master's", "MPhil / Research Master's", "Doctoral / Advanced Research", "Other"];
export const FYP_V9_LIMITATIONS = ["Time", "Budget / resources", "Data / sample access", "Equipment / technology", "Limited testing / validation", "Single context / site / case", "Scope intentionally narrow", "Production / fabrication constraint", "Ethical / access restrictions", "No major limitation identified", "Other"];
export const FYP_V9_VISIBILITY = ["University repository / portfolio", "Public — where permitted", "Restricted — supervisor / authorized reviewers", "Embargo / IP-sensitive"];
export const FYP_V9_READINESS = ["Idea / early concept", "Developed project / proof of concept", "Prototype / portfolio ready", "Pilot / client / audience tested", "Ready for external showcase / application", "Already generating interest / revenue", "Not a commercial project", "Other"];
export const FYP_V9_IP = ["No known IP/confidentiality concern", "May contain protectable IP — review before public sharing", "Client / sponsor confidentiality applies", "Patent / design / copyright / licensing discussion needed", "Not sure — request university/ORIC guidance", "Not applicable"];
export const FYP_V9_Q_SAMPLING = ["Probability / random", "Stratified / cluster", "Convenience", "Purposive", "Census / full dataset", "Experimental test set", "Not applicable", "Other"];
export const FYP_V9_QUAL_ANALYSIS = ["Thematic analysis", "Content analysis", "Discourse analysis", "Narrative analysis", "Visual / semiotic analysis", "Case analysis", "Doctrinal / textual interpretation", "Critique / jury feedback", "Other"];
export const FYP_V9_QUAL_SAMPLING = ["Purposive", "Convenience", "Snowball", "Theoretical", "Maximum variation", "Case-based / criterion", "Full corpus / archive", "Not applicable", "Other"];

export const FYP_V9_REVIEW_LABELS = ["Project & Route", "Purpose & Roadmap", "Project Pathway", "Evidence & Analysis", "Outcome & Key Findings", "Sustainability", "Reflection"] as const;

export const FYP_V9_PATHWAY_CHIPS: Record<string, string[]> = {
    rApproach: ["Quantitative", "Qualitative", "Mixed methods", "Experimental / laboratory", "Design-based research", "Doctrinal / legal", "Historical / archival", "Practice-based research", "Systematic / evidence review"],
    rMethods: ["Survey", "Interviews / focus groups", "Experiment", "Observation / fieldwork", "Case study", "Secondary dataset", "Textual / archival analysis", "Systematic review", "Simulation / modelling"],
    dDev: ["Case studies / precedents", "Site analysis", "Sketching / ideation", "Physical models", "Digital models / BIM", "Renderings / visualization", "User / stakeholder input", "Iteration after critique"],
    cDev: ["Mood / concept board", "Visual / contextual research", "Material experimentation", "Sampling / swatches", "Sketch development", "Toile / mock-up", "Prototype / iteration", "Critique & refinement"],
    bAnalysis: ["Primary research", "Secondary research", "Market analysis", "Competitor benchmarking", "Financial analysis", "Operations / process analysis", "Strategy framework", "User / customer validation"],
};

export type FypV9PathwayField = {
    id: string;
    label: string;
    kind: "input" | "textarea" | "select" | "chips";
    placeholder?: string;
    options?: string[];
    otherId?: string;
    span?: 1 | 2 | 3;
};

export const FYP_V9_PATHWAYS: Record<FypV9RouteKey, { title: string; tag: string; fields: FypV9PathwayField[] }> = {
    research: {
        title: "📚 Research pathway",
        tag: "QUESTION · METHOD · EVIDENCE · ANALYSIS",
        fields: [
            { id: "rQuestion", label: "Research question / central inquiry", kind: "input", placeholder: "What exactly are you investigating?" },
            { id: "rContext", label: "Scholarly / contextual grounding", kind: "input", placeholder: "Key theory, literature, precedent, law, archive or knowledge base", span: 1 },
            { id: "rGap", label: "Gap / position", kind: "input", placeholder: "What is missing, contested, untested or worth re-examining?", span: 1 },
            { id: "rApproach", label: "Research approach", kind: "chips", options: FYP_V9_PATHWAY_CHIPS.rApproach, otherId: "rApproachOther" },
            { id: "rMethods", label: "Methods used", kind: "chips", options: FYP_V9_PATHWAY_CHIPS.rMethods, otherId: "rMethodsOther" },
            { id: "rData", label: "Data / sources / sample", kind: "input", placeholder: "e.g. 220 respondents, 12 interviews, 35 cases", span: 1 },
            { id: "rTools", label: "Tools / techniques", kind: "input", placeholder: "SPSS, R, NVivo, lab equipment…", span: 1 },
            { id: "rEthics", label: "Ethics / approval status", kind: "select", options: ["Ethical approval obtained", "Department / supervisor clearance", "Not required for this study", "Pending / in process", "Other"], otherId: "rEthicsOther" },
        ],
    },
    prototype: {
        title: "⚙️ Prototype / product pathway",
        tag: "DESIGN · BUILD · TEST · REFINE",
        fields: [
            { id: "pNeed", label: "User / technical need", kind: "input", placeholder: "What must the prototype or product do better, differently or newly?" },
            { id: "pSpecs", label: "Key design requirements / specifications", kind: "textarea", placeholder: "Performance, dimensions, material, cost, safety, usability…", span: 1 },
            { id: "pTech", label: "Materials / technologies / components", kind: "textarea", placeholder: "Main materials, technologies, components or fabrication methods", span: 1 },
            { id: "pStages", label: "Development stages", kind: "input", placeholder: "Concept → prototype 1 → testing → revision → final build" },
            { id: "pTest", label: "Testing criteria", kind: "input", placeholder: "How was performance judged?", span: 1 },
            { id: "pStandards", label: "Standards / constraints (if relevant)", kind: "input", placeholder: "Technical standard, budget, safety, manufacturability…", span: 1 },
        ],
    },
    software: {
        title: "💻 Software / digital pathway",
        tag: "REQUIRE · BUILD · TEST · DEPLOY",
        fields: [
            { id: "sProblem", label: "User / system problem", kind: "input", placeholder: "What user or technical problem does the system address?" },
            { id: "sFeatures", label: "Core features / functionality", kind: "textarea", placeholder: "Main functions, workflows or model capabilities", span: 1 },
            { id: "sStack", label: "Technology / stack / platform", kind: "textarea", placeholder: "Languages, frameworks, hardware, cloud, APIs…", span: 1 },
            { id: "sData", label: "Data used (if any)", kind: "input", placeholder: "Dataset / source / scale", span: 1 },
            { id: "sArch", label: "Architecture / model", kind: "input", placeholder: "System architecture / algorithm / model", span: 1 },
            { id: "sDeploy", label: "Deployment status", kind: "select", options: ["Prototype only", "Working local system", "Pilot / user tested", "Deployed / live", "Other"], otherId: "sDeployOther", span: 1 },
            { id: "sTesting", label: "Testing / evaluation plan", kind: "input", placeholder: "Functional, usability, performance, accuracy, security…" },
        ],
    },
    design: {
        title: "🏛️ Architecture / design pathway",
        tag: "CONTEXT · CONCEPT · DEVELOPMENT · RESOLUTION",
        fields: [
            { id: "dBrief", label: "Design brief / central design challenge", kind: "input", placeholder: "What must the design achieve?" },
            { id: "dContext", label: "Site / context / user", kind: "textarea", placeholder: "Site, audience, cultural context, spatial or user needs", span: 1 },
            { id: "dConcept", label: "Concept / design intention", kind: "textarea", placeholder: "The core idea guiding the project", span: 1 },
            { id: "dDev", label: "Development evidence", kind: "chips", options: FYP_V9_PATHWAY_CHIPS.dDev, otherId: "dDevOther" },
            { id: "dCodes", label: "Codes / constraints / feasibility", kind: "input", placeholder: "By-laws, structure, materials, accessibility, cost…", span: 1 },
            { id: "dFinal", label: "Final resolution", kind: "input", placeholder: "What final drawings/model/design package was produced?", span: 1 },
        ],
    },
    creative: {
        title: "🎨 Fashion / textile / creative pathway",
        tag: "RESEARCH · EXPERIMENT · MAKE · PRESENT",
        fields: [
            { id: "cBrief", label: "Creative brief / collection / body of work", kind: "input", placeholder: "What are you making or presenting?" },
            { id: "cConcept", label: "Concept / inspiration / research", kind: "textarea", placeholder: "Visual, cultural, material, historical, user or conceptual research", span: 1 },
            { id: "cMaterials", label: "Materials / media / technique", kind: "textarea", placeholder: "Fabric, dye, craft, medium, digital tools, production technique…", span: 1 },
            { id: "cDev", label: "Creative development", kind: "chips", options: FYP_V9_PATHWAY_CHIPS.cDev, otherId: "cDevOther" },
            { id: "cOutputs", label: "Final pieces / outputs", kind: "input", placeholder: "e.g. 8-look collection, 5 artworks, installation", span: 1 },
            { id: "cShow", label: "Presentation / showcase", kind: "input", placeholder: "Jury, runway, exhibition, critique, portfolio…", span: 1 },
        ],
    },
    media: {
        title: "🎬 Film / media / communication pathway",
        tag: "RESEARCH · PRE-PRODUCTION · PRODUCTION · RESPONSE",
        fields: [
            { id: "mFormat", label: "Format", kind: "select", options: ["Film / short film", "Documentary", "Animation", "Advertising / campaign", "Journalism / publication", "Performance / theatre", "Podcast / audio", "Interactive media", "Other"], otherId: "mFormatOther", span: 1 },
            { id: "mAudience", label: "Primary audience", kind: "input", placeholder: "Who is it designed to reach?", span: 1 },
            { id: "mMessage", label: "Core narrative / message / communication objective", kind: "textarea", placeholder: "What should the audience understand, feel or do?" },
            { id: "mPre", label: "Research & pre-production", kind: "textarea", placeholder: "Research, script, storyboard, concept tests, references…", span: 1 },
            { id: "mProd", label: "Production & post-production", kind: "textarea", placeholder: "Shooting, design, editing, sound, animation, performance development…", span: 1 },
            { id: "mEval", label: "How will response / quality be evaluated?", kind: "input", placeholder: "Screening feedback, engagement, critique, audience test…" },
        ],
    },
    business: {
        title: "📈 Business / consultancy pathway",
        tag: "DIAGNOSE · ANALYSE · RECOMMEND / BUILD",
        fields: [
            { id: "bProblem", label: "Organization / market problem", kind: "input", placeholder: "What decision, opportunity or problem is the project addressing?" },
            { id: "bType", label: "Project type", kind: "select", options: ["Consultancy project", "Business plan / venture", "Market / feasibility study", "Strategy project", "Financial / investment analysis", "Operations / process improvement", "Other"], otherId: "bTypeOther", span: 1 },
            { id: "bClient", label: "Client / stakeholder (if any)", kind: "input", placeholder: "Organization, industry, user group…", span: 1 },
            { id: "bAnalysis", label: "Evidence / analysis used", kind: "chips", options: FYP_V9_PATHWAY_CHIPS.bAnalysis, otherId: "bAnalysisOther" },
            { id: "bSolution", label: "Proposed solution / recommendation", kind: "textarea", placeholder: "What are you proposing?", span: 1 },
            { id: "bFeas", label: "Feasibility / business case", kind: "textarea", placeholder: "Cost, market, operations, resources, risks, implementation…", span: 1 },
        ],
    },
    field: {
        title: "🤝 Education / community / field pathway",
        tag: "NEEDS · PLAN · DELIVER · EVALUATE",
        fields: [
            { id: "fNeed", label: "Learner / community / service need", kind: "input", placeholder: "What need, gap or field problem is being addressed?" },
            { id: "fGroup", label: "Setting / target group", kind: "input", placeholder: "School, community, organisation, farmer group…", span: 1 },
            { id: "fBaseline", label: "Baseline / starting point (if available)", kind: "input", placeholder: "Current situation, performance, access or need", span: 1 },
            { id: "fIntervention", label: "Intervention / resource / activity designed", kind: "textarea", placeholder: "What did you design or implement?" },
            { id: "fDelivery", label: "Delivery / implementation", kind: "textarea", placeholder: "How, where and with whom was it delivered?", span: 1 },
            { id: "fEval", label: "Evaluation / feedback", kind: "textarea", placeholder: "How was learning, response, uptake or improvement assessed?", span: 1 },
        ],
    },
    legal: {
        title: "⚖️ Legal / policy pathway",
        tag: "ISSUE · AUTHORITIES · ANALYSIS · POSITION",
        fields: [
            { id: "lQuestion", label: "Legal / policy question or issue", kind: "input", placeholder: "State the legal, regulatory or policy issue clearly" },
            { id: "lJurisdiction", label: "Jurisdiction / context", kind: "input", placeholder: "Pakistan, province, comparative jurisdiction, sector…", span: 1 },
            { id: "lSources", label: "Primary authorities / evidence base", kind: "input", placeholder: "Statutes, regulations, cases, policy documents, treaties…", span: 1 },
            { id: "lMethod", label: "Method of legal / policy analysis", kind: "select", options: ["Doctrinal legal research", "Case-law analysis", "Comparative legal analysis", "Policy analysis", "Empirical legal research", "Legal drafting / reform proposal", "Other"], otherId: "lMethodOther" },
            { id: "lPosition", label: "Core argument / position", kind: "textarea", placeholder: "What position does the project develop?", span: 1 },
            { id: "lRecommend", label: "Recommendation / draft / implication", kind: "textarea", placeholder: "What should change, be interpreted, drafted or considered?", span: 1 },
        ],
    },
    clinical: {
        title: "🩺 Clinical / health / professional pathway",
        tag: "EVIDENCE · ETHICS · PRACTICE · OUTCOMES",
        fields: [
            { id: "hProblem", label: "Clinical / professional problem or focus", kind: "input", placeholder: "What practice, case, service or health issue is being addressed?" },
            { id: "hContext", label: "Setting / population / case context", kind: "textarea", placeholder: "Keep identifying patient/client information out of this record", span: 1 },
            { id: "hEvidence", label: "Evidence base / guideline / professional standard", kind: "textarea", placeholder: "Guidelines, literature, protocol, professional framework…", span: 1 },
            { id: "hMethod", label: "Method / intervention / professional activity", kind: "textarea", placeholder: "What was done and why?", span: 1 },
            { id: "hEthics", label: "Ethics / authorization / confidentiality", kind: "select", options: ["Formal ethics approval", "Institutional / professional authorization", "De-identified educational case", "Not required", "Other"], otherId: "hEthicsOther", span: 1 },
            { id: "hOutcome", label: "Outcome measure / evaluation", kind: "input", placeholder: "Clinical, service, audit, user or professional outcome measure" },
        ],
    },
    theory: {
        title: "∑ Mathematical / theoretical pathway",
        tag: "FORMULATE · DERIVE / PROVE · TEST · INTERPRET",
        fields: [
            { id: "tProblem", label: "Theoretical question / proposition / problem", kind: "textarea", placeholder: "State the mathematical, conceptual or theoretical problem clearly" },
            { id: "tAssume", label: "Definitions / assumptions / framework", kind: "textarea", placeholder: "Key assumptions, axioms, constructs or model boundaries", span: 1 },
            { id: "tMethod", label: "Method of reasoning / derivation", kind: "textarea", placeholder: "Proof, derivation, formal analysis, simulation, modelling…", span: 1 },
            { id: "tVerify", label: "Verification / robustness", kind: "input", placeholder: "Proof checking, boundary cases, counterexamples, simulation…", span: 1 },
            { id: "tContribution", label: "Interpretation / contribution", kind: "input", placeholder: "What does the result add or clarify?", span: 1 },
        ],
    },
    other: {
        title: "＋ Custom / interdisciplinary pathway",
        tag: "YOU DEFINE THE ROUTE",
        fields: [
            { id: "oNature", label: "Describe the nature of your final project", kind: "textarea", placeholder: "What kind of final-year work is this, and what does your programme expect?" },
            { id: "oProcess", label: "Development / research process", kind: "textarea", placeholder: "Main stages, methods or creative/technical process", span: 1 },
            { id: "oOutputs", label: "Final outputs", kind: "textarea", placeholder: "What will be submitted, produced or demonstrated?", span: 1 },
            { id: "oEval", label: "How should quality be evaluated?", kind: "input", placeholder: "Testing, critique, evidence, performance, review, functionality…" },
        ],
    },
};

export function isFypV9RouteKey(v?: string | null): v is FypV9RouteKey {
    return !!v && v in FYP_V9_ROUTES;
}

export function suggestFypV9Routes(areaKey?: string, discipline?: string): FypV9RouteKey[] {
    const area = areaKey ? FYP_V9_AREAS[areaKey] : undefined;
    const r: FypV9RouteKey[] = area ? [...area.routes] : [];
    const d = (discipline || "").toLowerCase();
    const add = (x: FypV9RouteKey) => {
        if (!r.includes(x)) r.unshift(x);
    };
    if (/fashion|textile design|fine arts|painting|sculpt|ceramic|photograph|art/.test(d)) add("creative");
    if (/architecture|planning|interior|spatial|landscape|urban/.test(d)) add("design");
    if (/film|television|media|communication|journal|advert|theatre|performance|animation/.test(d)) add("media");
    if (/computer|software|artificial|data science|cyber|information technology|cloud|iot|game|hci|bioinformatics/.test(d)) add("software");
    if (/mathemat|statistics|theoretical/.test(d)) add("theory");
    if (/law|legal/.test(d)) add("legal");
    if (/education|teacher|special education|curriculum/.test(d)) add("field");
    if (/medicine|dent|nurs|midwi|pharm|therapy|health|medical|anesthesia|cardiac|dialysis|speech|surgical|optometry|veterinary/.test(d)) add("clinical");
    if (/business|management|commerce|marketing|finance|entrepreneur|economics/.test(d)) add("business");
    return [...new Set(r)].slice(0, 4);
}

export type FypV9RoadStage = { stage: string; goal: string };
export type FypV9TableRow = { a: string; b: string; c: string };

export type FypV9FormState = {
    academicAreaKey: string;
    discipline: string;
    disciplineOther: string;
    officialProgram: string;
    academicLevel: string;
    academicLevelOther: string;
    teamType: string;
    teamRole: string;
    v9Route: FypV9RouteKey | "";
    v9RouteOther: string;
    focus: string;
    why: string[];
    whyOther: string;
    objective: string;
    audience: string;
    deliverables: string[];
    deliverableOther: string;
    roadmap: FypV9RoadStage[];
    pathway: Record<string, string | string[]>;
    evidence: string[];
    evidenceOther: string;
    hasQuant: boolean;
    hasQual: boolean;
    qPopulation: string;
    qSample: string;
    qSampling: string;
    qSamplingOther: string;
    qVariables: string;
    qSoftware: string;
    qAnalysis: string[];
    qAnalysisOther: string;
    qRows: FypV9TableRow[];
    qSig: string;
    qEffect: string;
    qPerf: string;
    qualData: string;
    qualAnalysis: string;
    qualAnalysisOther: string;
    qualSampling: string;
    qualSamplingOther: string;
    qualSoftware: string;
    qualRows: FypV9TableRow[];
    qualInsight: string;
    mixedIntegration: string;
    validationSummary: string;
    outcome: string;
    finding1: string;
    finding2: string;
    contribution: string[];
    contribOther: string;
    qualityEvidence: string;
    limitation: string;
    limitationOther: string;
    future: string;
    sustain: string;
    sustainHow: string;
    sdgHow: string;
    learned: string;
    challenge: string;
    skills: string[];
    skillOther: string;
    sustainReflection: string;
    opportunities: string[];
    opportunityOther: string;
    readiness: string;
    readinessOther: string;
    valueOffer: string;
    ipStatus: string;
    links: string;
    visibility: string;
};

export const EMPTY_FYP_V9: FypV9FormState = {
    academicAreaKey: "",
    discipline: "",
    disciplineOther: "",
    officialProgram: "",
    academicLevel: "",
    academicLevelOther: "",
    teamType: "Individual",
    teamRole: "",
    v9Route: "",
    v9RouteOther: "",
    focus: "",
    why: [],
    whyOther: "",
    objective: "",
    audience: "",
    deliverables: [],
    deliverableOther: "",
    roadmap: [],
    pathway: {},
    evidence: [],
    evidenceOther: "",
    hasQuant: false,
    hasQual: false,
    qPopulation: "",
    qSample: "",
    qSampling: "",
    qSamplingOther: "",
    qVariables: "",
    qSoftware: "",
    qAnalysis: [],
    qAnalysisOther: "",
    qRows: [
        { a: "", b: "", c: "" },
        { a: "", b: "", c: "" },
    ],
    qSig: "",
    qEffect: "",
    qPerf: "",
    qualData: "",
    qualAnalysis: "",
    qualAnalysisOther: "",
    qualSampling: "",
    qualSamplingOther: "",
    qualSoftware: "",
    qualRows: [
        { a: "", b: "", c: "" },
        { a: "", b: "", c: "" },
    ],
    qualInsight: "",
    mixedIntegration: "",
    validationSummary: "",
    outcome: "",
    finding1: "",
    finding2: "",
    contribution: [],
    contribOther: "",
    qualityEvidence: "",
    limitation: "",
    limitationOther: "",
    future: "",
    sustain: "",
    sustainHow: "",
    sdgHow: "",
    learned: "",
    challenge: "",
    skills: [],
    skillOther: "",
    sustainReflection: "",
    opportunities: [],
    opportunityOther: "",
    readiness: "",
    readinessOther: "",
    valueOffer: "",
    ipStatus: "",
    links: "",
    visibility: "University repository / portfolio",
};

function join(list: string[]) {
    const a = list.map((x) => x.trim()).filter(Boolean);
    if (a.length < 2) return a.join("");
    return `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`;
}
function lc(s: string) {
    const t = s.trim().replace(/\.$/, "");
    return t ? t.charAt(0).toLowerCase() + t.slice(1) : "";
}

export function effectiveSelect(value: string, other: string) {
    return value === "Other" ? other.trim() : value.trim();
}

export function composeFypV9Summaries(args: {
    title: string;
    university: string;
    degree: string;
    supervisor: string;
    teamNames: string[];
    v9: FypV9FormState;
}): string[] {
    const { title, university, degree, supervisor, teamNames, v9 } = args;
    const area = FYP_V9_AREAS[v9.academicAreaKey]?.label || "";
    const disc = effectiveSelect(v9.discipline, v9.disciplineOther);
    const lev = effectiveSelect(v9.academicLevel, v9.academicLevelOther);
    const routeMeta = v9.v9Route ? FYP_V9_ROUTES[v9.v9Route] : undefined;
    const s0 = title
        ? `<b>${title}</b> is recorded as a ${routeMeta?.title || "Final Year Project"}${disc ? ` in ${disc}` : ""}${area && area !== disc ? ` within ${area}` : ""}${degree ? ` for ${degree}` : ""}${lev ? ` at ${lev} level` : ""}${university ? ` at ${university}` : ""}${v9.teamType === "Team / Group" && teamNames.length ? `; project team: ${teamNames.join(", ")}` : ""}${supervisor ? `, supervised by ${supervisor}` : ""}.`
        : "";

    const why = [...v9.why, v9.whyOther].filter(Boolean);
    const dels = [...v9.deliverables, v9.deliverableOther].filter(Boolean);
    const road = v9.roadmap.filter((r) => r.stage || r.goal);
    const s1 = v9.focus
        ? `The project focuses on ${lc(v9.focus)}${v9.objective ? `; its intended outcome is ${lc(v9.objective)}` : ""}.${why.length ? ` Its significance is linked to ${join(why)}.` : ""}${dels.length ? ` Expected outputs include ${join(dels)}.` : ""}${road.length ? ` The roadmap moves through ${road.map((x) => x.stage + (x.goal ? ` (${x.goal})` : "")).join(" → ")}.` : ""}`
        : "";

    const pv = (id: string) => {
        const v = v9.pathway[id];
        if (Array.isArray(v)) return v.filter(Boolean).join(", ");
        return (v || "").trim();
    };
    const pOther = (id: string, otherId?: string) => {
        const base = pv(id);
        const o = otherId ? pv(otherId) : "";
        return [base, o].filter(Boolean).join(", ");
    };
    let s2 = "";
    if (v9.v9Route === "research") {
        s2 = `The research pathway centres on ${pv("rQuestion") || v9.focus || "the stated inquiry"}${pv("rGap") ? `, positioned around the gap that ${pv("rGap")}` : ""}.${pOther("rApproach", "rApproachOther") ? ` The approach is ${pOther("rApproach", "rApproachOther")}` : ""}${pOther("rMethods", "rMethodsOther") ? `, using ${pOther("rMethods", "rMethodsOther")}` : ""}${pv("rData") ? ` with ${pv("rData")}` : ""}.`;
    } else if (v9.v9Route === "prototype") {
        s2 = `The build pathway translates ${pv("pNeed") || v9.focus || "the identified need"} into a prototype/product${pv("pSpecs") ? ` guided by ${pv("pSpecs")}` : ""}${pv("pTech") ? ` using ${pv("pTech")}` : ""}.${pv("pTest") ? ` Performance is judged through ${pv("pTest")}.` : ""}`;
    } else if (v9.v9Route === "software") {
        s2 = `The digital pathway addresses ${pv("sProblem") || v9.focus || "the identified user/system problem"}${pv("sFeatures") ? ` through ${pv("sFeatures")}` : ""}${pv("sStack") ? `, built with ${pv("sStack")}` : ""}.${pv("sTesting") ? ` Evaluation covers ${pv("sTesting")}.` : ""}`;
    } else if (v9.v9Route === "design") {
        s2 = `The design pathway responds to ${pv("dBrief") || v9.focus || "the stated brief"}${pv("dContext") ? ` within ${pv("dContext")}` : ""}, guided by ${pv("dConcept") || "the selected design concept"}.${pv("dFinal") ? ` The final resolution is ${pv("dFinal")}.` : ""}`;
    } else if (v9.v9Route === "creative") {
        s2 = `The creative pathway develops ${pv("cBrief") || v9.focus || "the stated body of work"}${pv("cConcept") ? ` from ${pv("cConcept")}` : ""}${pv("cMaterials") ? ` through ${pv("cMaterials")}` : ""}.${pv("cOutputs") ? ` The final output comprises ${pv("cOutputs")}.` : ""}`;
    } else if (v9.v9Route === "media") {
        s2 = `The media/performance pathway uses ${effectiveSelect(pv("mFormat"), pv("mFormatOther")) || "the selected format"} for ${pv("mAudience") || "its intended audience"}, with the central objective that ${pv("mMessage") || v9.focus || "the project communicates its intended message"}.${pv("mEval") ? ` Quality/response is evaluated through ${pv("mEval")}.` : ""}`;
    } else if (v9.v9Route === "business") {
        s2 = `The applied business pathway addresses ${pv("bProblem") || v9.focus || "the stated organisational/market challenge"} through ${effectiveSelect(pv("bType"), pv("bTypeOther")) || "an applied project"}.${pv("bSolution") ? ` The proposed solution is ${pv("bSolution")}.` : ""}${pv("bFeas") ? ` Feasibility considers ${pv("bFeas")}.` : ""}`;
    } else if (v9.v9Route === "field") {
        s2 = `The field pathway responds to ${pv("fNeed") || v9.focus || "the identified learner/community/service need"} for ${pv("fGroup") || "the target group"}.${pv("fIntervention") ? ` The project delivers ${pv("fIntervention")}.` : ""}${pv("fEval") ? ` Evaluation uses ${pv("fEval")}.` : ""}`;
    } else if (v9.v9Route === "legal") {
        s2 = `The legal/policy pathway examines ${pv("lQuestion") || v9.focus || "the stated legal or policy issue"}${pv("lJurisdiction") ? ` in ${pv("lJurisdiction")}` : ""}, using ${effectiveSelect(pv("lMethod"), pv("lMethodOther")) || "appropriate legal/policy analysis"}.${pv("lPosition") ? ` The core position is ${pv("lPosition")}.` : ""}`;
    } else if (v9.v9Route === "clinical") {
        s2 = `The professional pathway focuses on ${pv("hProblem") || v9.focus || "the stated clinical/professional issue"}${pv("hContext") ? ` in ${pv("hContext")}` : ""}.${pv("hMethod") ? ` The activity/intervention is ${pv("hMethod")}.` : ""}${pv("hOutcome") ? ` Evaluation focuses on ${pv("hOutcome")}.` : ""}`;
    } else if (v9.v9Route === "theory") {
        s2 = `The theoretical pathway formulates ${pv("tProblem") || v9.focus || "the stated theoretical problem"} within ${pv("tAssume") || "its defined assumptions/framework"}.${pv("tMethod") ? ` It is developed through ${pv("tMethod")}.` : ""}${pv("tContribution") ? ` The intended contribution is ${pv("tContribution")}.` : ""}`;
    } else if (v9.v9Route === "other") {
        s2 = `The custom pathway is defined as ${pv("oNature") || v9.v9RouteOther || v9.focus || "an interdisciplinary final-year project"}.${pv("oProcess") ? ` The main process is ${pv("oProcess")}.` : ""}${pv("oOutputs") ? ` Final outputs include ${pv("oOutputs")}.` : ""}`;
    }

    const ev = [...v9.evidence, v9.evidenceOther].filter(Boolean);
    const qFilled = v9.qRows.filter((r) => r.a || r.b || r.c);
    let s3 = "";
    if (ev.length) s3 += `Evidence and validation include ${join(ev)}. `;
    if (v9.hasQuant) {
        const parts = [v9.qSample && `sample / observations ${v9.qSample}`, v9.qVariables && `measures ${v9.qVariables}`, [...v9.qAnalysis, v9.qAnalysisOther].filter(Boolean).length && `analysis ${join([...v9.qAnalysis, v9.qAnalysisOther])}`].filter(Boolean);
        s3 += `Quantitative evidence was used${parts.length ? ` (${parts.join("; ")})` : ""}.${qFilled.length ? ` Key numerical results include ${qFilled.map((r) => [r.a, r.b, r.c].filter(Boolean).join(" — ")).join("; ")}.` : ""} `;
    }
    if (v9.hasQual) {
        const qf = v9.qualRows.filter((r) => r.a || r.b || r.c);
        s3 += `Qualitative / interpretive evidence was used${v9.qualData ? ` (${v9.qualData})` : ""}.${qf.length ? ` Themes include ${qf.map((r) => [r.a, r.b, r.c].filter(Boolean).join(" — ")).join("; ")}.` : ""} `;
    }
    if (v9.hasQuant && v9.hasQual && v9.mixedIntegration) s3 += `The evidence streams were integrated by ${lc(v9.mixedIntegration)}. `;
    if (v9.validationSummary) s3 += `Overall, ${lc(v9.validationSummary)}.`;
    s3 = s3.trim();

    const co = [...v9.contribution, v9.contribOther].filter(Boolean);
    const fs = [v9.finding1, v9.finding2].filter(Boolean);
    const lim = effectiveSelect(v9.limitation, v9.limitationOther);
    const s4 = v9.outcome
        ? `The final outcome is ${lc(v9.outcome)}.${fs.length ? ` Key findings/results: ${fs.join("; ")}.` : ""}${co.length ? ` The work contributes through ${join(co)}.` : ""}${v9.qualityEvidence ? ` Its strongest evidence of quality is ${lc(v9.qualityEvidence)}.` : ""}${lim ? ` The main limitation/constraint is ${lc(lim)}.` : ""}${v9.future ? ` Future potential: ${lc(v9.future)}.` : ""}`
        : "";

    const s5 = v9.sustain
        ? `Sustainability relevance is classified as <b>${v9.sustain}</b>.${v9.sustainHow ? ` ${v9.sustainHow}.` : ""}`
        : "";

    const sk = [...v9.skills, v9.skillOther].filter(Boolean);
    const opp = [...v9.opportunities, v9.opportunityOther].filter(Boolean);
    const ready = effectiveSelect(v9.readiness, v9.readinessOther);
    const s6 = v9.learned
        ? `The student's key learning is ${lc(v9.learned)}.${v9.challenge ? ` A major challenge was addressed through ${lc(v9.challenge)}.` : ""}${sk.length ? ` Skills strengthened include ${join(sk)}.` : ""}${v9.sustainReflection ? ` Sustainability also influenced project decisions through ${lc(v9.sustainReflection)}.` : ""}${opp.length ? ` Optional opportunity interests include ${join(opp)}.` : ""}${ready ? ` External-readiness stage: ${ready}.` : ""}`
        : "";

    return [s0, s1, s2, s3, s4, s5, s6];
}
