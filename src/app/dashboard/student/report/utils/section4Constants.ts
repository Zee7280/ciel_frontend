import { 
    Truck, Activity, GraduationCap, Megaphone, Search, Building, 
    Smartphone, Gavel, Users, Leaf, Banknote, Landmark, 
    Handshake, ShieldCheck, HelpCircle 
} from "lucide-react";

export const PRIMARY_CATEGORIES = [
    { id: "Resource Distribution", label: "Resource Distribution", icon: Truck },
    { id: "Service Delivery", label: "Service Delivery", icon: Activity },
    { id: "Training / Capacity Building", label: "Training / Capacity Building", icon: GraduationCap },
    { id: "Awareness / Advocacy", label: "Awareness / Advocacy", icon: Megaphone },
    { id: "Research / Data Collection", label: "Research / Data Collection", icon: Search },
    { id: "Infrastructure / Facility Improvement", label: "Infrastructure / Facility Improvement", icon: Building },
    { id: "Digital / Technology Intervention", label: "Digital / Technology Intervention", icon: Smartphone },
    { id: "Policy / Governance Engagement", label: "Policy / Governance Engagement", icon: Gavel },
    { id: "Community Mobilization", label: "Community Mobilization", icon: Users },
    { id: "Environmental Action / Conservation", label: "Environmental Action / Conservation", icon: Leaf },
    { id: "Economic / Livelihood Support", label: "Economic / Livelihood Support", icon: Banknote },
    { id: "Institutional / Systems Strengthening", label: "Institutional / Systems Strengthening", icon: Landmark },
    { id: "Partnership / Coordination Development", label: "Partnership / Coordination Development", icon: Handshake },
    { id: "Protection / Inclusion Support", label: "Protection / Inclusion Support", icon: ShieldCheck },
    { id: "Other", label: "Other", icon: HelpCircle }
];

export const SUB_CATEGORIES: Record<string, string[]> = {
    "Resource Distribution": [
        "Food / Nutrition Distribution", "Clean Water Distribution", "Hygiene / Sanitation Supplies",
        "Clothing / Shelter Support", "Educational Materials Distribution", "Medical / Health Supplies Distribution",
        "Energy / Fuel / Utility Support", "Agricultural Inputs Distribution", "Disaster Relief Material Support",
        "Cash / Voucher / Financial Aid Distribution", "Other Essential Resource Support"
    ],
    "Service Delivery": [
        "Healthcare / Medical Service", "Mental Health / Psychosocial Support", "Tutoring / Academic Support",
        "Legal / Rights-Based Support", "Counseling / Guidance Services", "Nutrition / Feeding Services",
        "Water / Sanitation Service Support", "Childcare / Elderly Care Support", "Employment / Career Support Services",
        "Community Help Desk / Facilitation", "Other Social or Public Service Delivery"
    ],
    "Training / Capacity Building": [
        "Academic / Educational Training", "Vocational / Technical Skills Training", "Digital Literacy Training",
        "Financial Literacy Training", "Entrepreneurship Training", "Leadership / Civic Engagement Training",
        "Teacher / Staff Capacity Building", "Health / Hygiene Training", "Climate / Environmental Training",
        "Rights / Gender / Inclusion Training", "Governance / Policy Awareness Training", "Other Training or Skill Building"
    ],
    "Awareness / Advocacy": [
        "Public Health Awareness", "Education Awareness", "Gender Equality Awareness", "Child Protection Awareness",
        "Environmental / Climate Awareness", "Water / Sanitation Awareness", "Human Rights / Legal Awareness",
        "Civic Responsibility / Voting Awareness", "Social Inclusion / Anti-Discrimination Advocacy",
        "Peace / Anti-Violence Advocacy", "Sustainable Consumption Awareness", "Other Awareness / Advocacy Campaign"
    ],
    "Research / Data Collection": [
        "Baseline Survey", "Endline Survey", "Needs Assessment", "Community Mapping",
        "Beneficiary Registration / Verification", "Household Survey", "Institutional / Policy Research",
        "Market / Livelihood Study", "Environmental / Field Observation", "Monitoring and Evaluation Data Collection",
        "Case Documentation / Report Writing", "Other Research / Data Activity"
    ],
    "Infrastructure / Facility Improvement": [
        "Classroom / School Improvement", "Health Facility Improvement", "Water / Sanitation Facility Improvement",
        "Shelter / Housing Support", "Community Space Development", "Waste Management Infrastructure",
        "Accessibility / Disability-Friendly Improvement", "Green Space / Public Space Improvement",
        "Energy / Electrification Improvement", "Transport / Mobility-Related Improvement",
        "Safety / Protection Infrastructure", "Other Physical Infrastructure Support"
    ],
    "Digital / Technology Intervention": [
        "App / Platform Development", "Digital Information System", "E-Learning Support",
        "Digital Awareness Campaign", "Data Management / Dashboard System", "Telehealth / Remote Service Solution",
        "Digital Registration / Tracking System", "Automation / Process Improvement Tool",
        "Assistive Technology Support", "ICT Access Support", "Innovation / Prototype Development",
        "Other Digital / Technology Solution"
    ],
    "Policy / Governance Engagement": [
        "Stakeholder Consultation", "Policy Dialogue / Policy Input", "Governance Awareness Session",
        "Community Representation / Voice Facilitation", "Institutional Coordination Meeting",
        "Rights-Based Advocacy", "Public Accountability Initiative", "Administrative Support / Facilitation",
        "Local Government Engagement", "Legal / Documentation Support", "Civic Participation Promotion",
        "Other Governance / Policy Engagement"
    ],
    "Community Mobilization": [
        "Volunteer Mobilization", "Community Outreach Campaign", "Community Meeting / Gathering",
        "Door-to-Door Engagement", "Social Action Drive", "Relief Coordination", "Local Participation Mobilization",
        "Youth Engagement Initiative", "Parent / Family Engagement", "Faith / Cultural Community Engagement",
        "Event-Based Mobilization", "Other Community Mobilization"
    ],
    "Environmental Action / Conservation": [
        "Tree Plantation", "Waste Collection / Cleanup Drive", "Recycling / Reuse Initiative",
        "Water Conservation Action", "Biodiversity / Habitat Protection", "Clean Energy Promotion",
        "Climate Adaptation Activity", "Sustainable Agriculture Support", "Pollution Reduction Activity",
        "Eco-Awareness Campaign", "Environmental Monitoring", "Other Environmental Action"
    ],
    "Economic / Livelihood Support": [
        "Entrepreneurship Support", "Small Business Support", "Job Readiness / Employability Training",
        "Income Generation Support", "Women’s Economic Empowerment", "Youth Livelihood Support",
        "Agricultural Livelihood Support", "Market Linkage Support", "Savings / Financial Inclusion Activity",
        "Cooperative / Group Enterprise Support", "Career Counseling / Placement Support", "Other Livelihood / Economic Support"
    ],
    "Institutional / Systems Strengthening": [
        "School / University System Support", "NGO / Partner Capacity Strengthening", "Health System Support",
        "Community Organization Strengthening", "Monitoring / Reporting System Improvement",
        "Governance / Administrative Process Improvement", "Documentation / SOP Development",
        "Service Delivery System Strengthening", "Data / Record Management Improvement",
        "Supply Chain / Operational Improvement", "Institutional Planning Support", "Other Systems Strengthening"
    ],
    "Partnership / Coordination Development": [
        "NGO Partnership Building", "Community–Institution Linkage", "University–Partner Collaboration",
        "Public–Private Coordination", "Multi-Stakeholder Coordination", "Referral Network Development",
        "Volunteer / Sponsor Coordination", "Resource Mobilization Coordination", "Joint Planning / Joint Delivery",
        "Donor / Stakeholder Engagement", "Collaboration Platform Development", "Other Partnership Development"
    ],
    "Protection / Inclusion Support": [
        "Child Protection Support", "Gender-Based Support", "Disability Inclusion Support", "Elderly Support",
        "Refugee / Displaced Population Support", "Minority / Marginalized Group Support", "Safe Space Support",
        "Protection Referral Support", "Social Inclusion Activity", "Anti-Discrimination Initiative",
        "Accessibility Support", "Other Protection / Inclusion Activity"
    ],
    "Other": ["Please specify your sub-category below"]
};

export const DELIVERY_MODES = ["Field-Based (On-Ground)", "Online (Digital)", "Hybrid (Both)"];

export const IMPLEMENTATION_MODELS = [
    "Individual", "Team-Based", "Partner-Led", "Multi-Stakeholder", 
    "Volunteer-Supported", "Institutionally Coordinated", "Community-Led"
];

export const OUTPUT_TYPES = [
    "Individuals Reached", "Households Supported", "Sessions Conducted", "Trainings Delivered",
    "Resources Distributed", "Services Delivered", "Reports / Surveys / Assessments Generated",
    "Facilities Improved", "Systems / Tools Developed", "Partnerships Formed", "Volunteers Engaged",
    "Awareness Materials Produced", "Area Covered / Cleaned / Restored", "Financial Support Provided", "Other"
];

export const UNIVERSAL_UNITS = [
    "Individuals / People", "Households", "Sessions", "Trainings", "Workshops", "Kits", "Items",
    "Packages", "Meals", "Kg", "Tons", "Liters", "Facilities", "Classrooms", "Systems", "Platforms",
    "Reports", "Surveys", "Assessments", "Partnerships", "Volunteers", "PKR", "USD", "Hectares / Area Units", "Other"
];

export const BENEFICIARY_CATEGORIES = [
    "Children", "Youth", "Women", "Men", "Elderly", "Students", "Teachers / Educators",
    "Workers / Laborers", "Farmers / Agricultural Communities", "Entrepreneurs / Small Business Owners",
    "Persons with Disabilities", "Low-Income Households", "Patients / Health-Service Users",
    "Refugees / Displaced Populations", "Minority / Marginalized Communities", "Institutions / Organizations",
    "General Community", "Other"
];

export const RELEVANCE_TYPES = ["Primary Target Group", "Secondary Target Group", "Indirect Beneficiary Group"];

export const OVERLAP_STATUSES = [
    "Mostly Unique to This Activity", "Partially Overlapping with Other Activities",
    "Mostly the Same Beneficiaries as Another Activity", "Not Known"
];

export const GEOGRAPHIC_REACH_OPTIONS = [
    "Single Site", "Local Community", "Multi-Community", "City-Wide", "District-Wide",
    "Province / State-Wide", "National", "International", "Digital", "Hybrid"
];

export const GEOGRAPHIC_SUB_CATEGORIES: Record<string, string[]> = {
    "Single Site": ["School", "College / University", "NGO / Organization", "Hospital / Clinic", "Workplace", "Village", "Neighborhood", "Shelter / Camp", "Other"],
    "Local Community": ["Village", "Union Council", "Neighborhood", "Campus", "Workplace", "Partner Organization Community", "Informal Settlement", "Rural Community", "Other"],
    "Multi-Community": ["Multiple Villages", "Multiple Neighborhoods", "Multiple Institutions", "Multiple Settlements", "Mixed Community Sites"],
    "Digital": ["Online Platform", "Remote Users", "Social Media Audience", "Virtual Learning Group", "App / System Users"]
};

export const COUNTING_METHODS = [
    "Verified registration / list", "Partner-provided records", "Distribution / service logs",
    "Manual counting by team", "Estimate based on activity records", "Mixed method", "Other"
];
