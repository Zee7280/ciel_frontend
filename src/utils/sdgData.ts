export interface SDGIndicator {
    id: string;
    description: string;
}

export interface SDGTarget {
    id: string;
    description: string;
    indicators: SDGIndicator[];
}

export interface SDG {
    id: string;
    number: number;
    title: string;
    description: string;
    color: string;
    targets: SDGTarget[];
}

export const sdgData: SDG[] = [
    {
        id: "1",
        number: 1,
        title: "No Poverty",
        description: "End poverty in all its forms everywhere",
        color: "#E5243B",
        targets: [
            {
                id: "1.1",
                description: "Eradicate extreme poverty for all people by 2030",
                indicators: [{ id: "1.1.1", description: "Proportion below international poverty line" }]
            },
            {
                id: "1.2",
                description: "Reduce poverty by at least 50% by 2030",
                indicators: [
                    { id: "1.2.1", description: "Proportion below national poverty line" },
                    { id: "1.2.2", description: "Proportion in multidimensional poverty" }
                ]
            },
            {
                id: "1.3",
                description: "Implement social protection systems",
                indicators: [{ id: "1.3.1", description: "Population covered by social protection systems" }]
            },
            {
                id: "1.4",
                description: "Equal rights to ownership, basic services, technology, and economic resources",
                indicators: [
                    { id: "1.4.1", description: "Access to basic services" },
                    { id: "1.4.2", description: "Secure tenure rights to land" }
                ]
            },
            {
                id: "1.5",
                description: "Build resilience to environmental, economic, and social disasters",
                indicators: [
                    { id: "1.5.1", description: "Deaths and persons affected by natural disasters" },
                    { id: "1.5.2", description: "Direct economic loss from natural disasters" },
                    { id: "1.5.3", description: "Disaster risk reduction strategies" },
                    { id: "1.5.4", description: "Local disaster risk reduction plans" }
                ]
            },
            {
                id: "1.a",
                description: "Mobilize resources to end poverty",
                indicators: [
                    { id: "1.a.1", description: "Development assistance for poverty reduction" },
                    { id: "1.a.2", description: "Government spending on essential services" }
                ]
            },
            {
                id: "1.b",
                description: "Policy frameworks for poverty eradication",
                indicators: [{ id: "1.b.1", description: "Pro-poor public spending" }]
            }
        ]
    },
    {
        id: "2",
        number: 2,
        title: "Zero Hunger",
        description: "End hunger, achieve food security and improved nutrition, and promote sustainable agriculture",
        color: "#DDA63A",
        targets: [
            {
                id: "2.1",
                description: "Universal access to safe, nutritious, and sufficient food",
                indicators: [
                    { id: "2.1.1", description: "Prevalence of undernourishment" },
                    { id: "2.1.2", description: "Prevalence of food insecurity" }
                ]
            },
            {
                id: "2.2",
                description: "End all forms of malnutrition",
                indicators: [
                    { id: "2.2.1", description: "Prevalence of childhood stunting" },
                    { id: "2.2.2", description: "Prevalence of childhood malnutrition (wasting or overweight)" }
                ]
            },
            {
                id: "2.3",
                description: "Double the productivity and incomes of small-scale food producers by 2030",
                indicators: [
                    { id: "2.3.1", description: "Production per labor unit" },
                    { id: "2.3.2", description: "Income of small-scale food producers" }
                ]
            },
            {
                id: "2.4",
                description: "Sustainable food production and resilient agricultural practices",
                indicators: [{ id: "2.4.1", description: "Sustainable food production practices" }]
            },
            {
                id: "2.5",
                description: "Maintain the genetic diversity in food production",
                indicators: [
                    { id: "2.5.1", description: "Genetic resources in conservation facilities" },
                    { id: "2.5.2", description: "Local breeds at risk of extinction" }
                ]
            },
            {
                id: "2.a",
                description: "Invest in rural infrastructure, agricultural research, technology and gene banks",
                indicators: [
                    { id: "2.a.1", description: "Agriculture orientation index" },
                    { id: "2.a.2", description: "Official flows to agriculture" }
                ]
            },
            {
                id: "2.b",
                description: "Prevent agricultural trade restrictions, market distortions and export subsidies",
                indicators: [{ id: "2.b.1", description: "Agricultural export subsidies" }]
            },
            {
                id: "2.c",
                description: "Ensure stable food commodity markets and timely access to information",
                indicators: [{ id: "2.c.1", description: "Food price anomalies" }]
            }
        ]
    },
    {
        id: "3",
        number: 3,
        title: "Good Health and Well-Being",
        description: "Ensure healthy lives and promote well-being for all at all ages",
        color: "#4C9F38",
        targets: [
            {
                id: "3.1",
                description: "Reduce maternal mortality",
                indicators: [
                    { id: "3.1.1", description: "Maternal mortality ratio" },
                    { id: "3.1.2", description: "Skilled birth attendance" }
                ]
            },
            {
                id: "3.2",
                description: "End all preventable deaths under 5 years of age",
                indicators: [
                    { id: "3.2.1", description: "Under-5 mortality rate" },
                    { id: "3.2.2", description: "Neonatal mortality rate" }
                ]
            },
            {
                id: "3.3",
                description: "Fight communicable diseases",
                indicators: [
                    { id: "3.3.1", description: "HIV incidence" },
                    { id: "3.3.2", description: "Tuberculosis incidence" },
                    { id: "3.3.3", description: "Malaria incidence" },
                    { id: "3.3.4", description: "Hepatitis B incidence" },
                    { id: "3.3.5", description: "Neglected tropical diseases prevalence" }
                ]
            },
            {
                id: "3.4",
                description: "Reduce mortality from non-communicable diseases and promote mental health",
                indicators: [
                    { id: "3.4.1", description: "Mortality rate from non-communicable diseases" },
                    { id: "3.4.2", description: "Suicide rate" }
                ]
            },
            {
                id: "3.5",
                description: "Prevent and treat substance abuse",
                indicators: [
                    { id: "3.5.1", description: "Treatment for substance use disorders" },
                    { id: "3.5.2", description: "Alcohol consumption per capita" }
                ]
            },
            {
                id: "3.6",
                description: "Reduce road injuries and deaths",
                indicators: [{ id: "3.6.1", description: "Halve the number of road traffic deaths" }]
            },
            {
                id: "3.7",
                description: "Universal access to sexual and reproductive care, family planning and education",
                indicators: [
                    { id: "3.7.1", description: "Family planning needs met" },
                    { id: "3.7.2", description: "Adolescent birth rate" }
                ]
            },
            {
                id: "3.8",
                description: "Achieve universal health coverage",
                indicators: [
                    { id: "3.8.1", description: "Coverage of essential health services" },
                    { id: "3.8.2", description: "Household expenditure on health" }
                ]
            },
            {
                id: "3.9",
                description: "Reduce illnesses and deaths from hazardous chemicals and pollution",
                indicators: [
                    { id: "3.9.1", description: "Mortality rate from air pollution" },
                    { id: "3.9.2", description: "Mortality rate from unsafe water, sanitation and hygiene" },
                    { id: "3.9.3", description: "Mortality rate from unintentional poisoning" }
                ]
            },
            {
                id: "3.a",
                description: "Implement the WHO Framework Convention on Tobacco Control",
                indicators: [{ id: "3.a.1", description: "Prevalence of tobacco use" }]
            },
            {
                id: "3.b",
                description: "Support research, development and access to affordable vaccines and medicines",
                indicators: [
                    { id: "3.b.1", description: "Vaccine coverage" },
                    { id: "3.b.2", description: "Development assistance for medical research and basic healthcare" },
                    { id: "3.b.3", description: "Availability of essential medicines" }
                ]
            },
            {
                id: "3.c",
                description: "Increase health financing and support the health workforce in developing countries",
                indicators: [{ id: "3.c.1", description: "Health worker density" }]
            },
            {
                id: "3.d",
                description: "Improve early warning systems for global health risks",
                indicators: [
                    { id: "3.d.1", description: "Health emergency preparedness" },
                    { id: "3.d.2", description: "Detect and control antimicrobial-resistant infections" }
                ]
            }
        ]
    },
    {
        id: "4",
        number: 4,
        title: "Quality Education",
        description: "Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all",
        color: "#C5192D",
        targets: [
            {
                id: "4.1",
                description: "Free primary and secondary education",
                indicators: [
                    { id: "4.1.1", description: "Proficiency in reading and mathematics" },
                    { id: "4.1.2", description: "Completion of primary and secondary education" }
                ]
            },
            {
                id: "4.2",
                description: "Equal access to quality pre-primary education",
                indicators: [
                    { id: "4.2.1", description: "Children developmentally on track" },
                    { id: "4.2.2", description: "Participation in pre-primary education" }
                ]
            },
            {
                id: "4.3",
                description: "Equal access to affordable technical, vocational and higher education",
                indicators: [{ id: "4.3.1", description: "Access to further education" }]
            },
            {
                id: "4.4",
                description: "Increase the number of people with relevant skills for financial success",
                indicators: [{ id: "4.4.1", description: "ICT skills (information and communications technology)" }]
            },
            {
                id: "4.5",
                description: "Eliminate all discrimination in education",
                indicators: [{ id: "4.5.1", description: "Disparities in educational access" }]
            },
            {
                id: "4.6",
                description: "Universal literacy and numeracy",
                indicators: [{ id: "4.6.1", description: "Literacy and numeracy proficiency" }]
            },
            {
                id: "4.7",
                description: "Education for sustainable development and global citizenship",
                indicators: [{ id: "4.7.1", description: "Education on sustainable development and global citizenship" }]
            },
            {
                id: "4.a",
                description: "Build and upgrade inclusive and safe schools",
                indicators: [{ id: "4.a.1", description: "Inclusive and safe schools" }]
            },
            {
                id: "4.b",
                description: "Expand higher education scholarships for developing countries",
                indicators: [{ id: "4.b.1", description: "Scholarships for developing countries" }]
            },
            {
                id: "4.c",
                description: "Increase the supply of qualified teachers in developing countries",
                indicators: [{ id: "4.c.1", description: "Qualified teachers supply" }]
            }
        ]
    },
    {
        id: "5",
        number: 5,
        title: "Gender Equality",
        description: "Achieve gender equality and empower all women and girls",
        color: "#FF3A21",
        targets: [
            {
                id: "5.1",
                description: "End discrimination against women and girls",
                indicators: [{ id: "5.1.1", description: "Legal frameworks for gender equality and non-discrimination" }]
            },
            {
                id: "5.2",
                description: "End all violence against and exploitation of women and girls",
                indicators: [
                    { id: "5.2.1", description: "Violence against women by an intimate partner" },
                    { id: "5.2.2", description: "Violence against women by others (non-partner)" }
                ]
            },
            {
                id: "5.3",
                description: "Eliminate forced marriages and genital mutilation",
                indicators: [
                    { id: "5.3.1", description: "Women married before age 15 or 18" },
                    { id: "5.3.2", description: "Female genital mutilation/cutting" }
                ]
            },
            {
                id: "5.4",
                description: "Value unpaid care and promote shared domestic responsibilities",
                indicators: [{ id: "5.4.1", description: "Time spent on unpaid domestic and care work" }]
            },
            {
                id: "5.5",
                description: "Ensure full participation in leadership and decision-making",
                indicators: [
                    { id: "5.5.1", description: "Women in political positions" },
                    { id: "5.5.2", description: "Women in managerial positions" }
                ]
            },
            {
                id: "5.6",
                description: "Universal access to reproductive rights and health",
                indicators: [
                    { id: "5.6.1", description: "Women making informed decisions on reproductive health" },
                    { id: "5.6.2", description: "Laws guaranteeing access to sexual and reproductive healthcare" }
                ]
            },
            {
                id: "5.a",
                description: "Equal rights to economic resources, property ownership and financial services",
                indicators: [
                    { id: "5.a.1", description: "Female land ownership rights" },
                    { id: "5.a.2", description: "Equal rights to land ownership" }
                ]
            },
            {
                id: "5.b",
                description: "Promote empowerment of women through technology",
                indicators: [{ id: "5.b.1", description: "Mobile phone ownership by gender" }]
            },
            {
                id: "5.c",
                description: "Adopt and strengthen policies and enforceable legislation for gender equality",
                indicators: [{ id: "5.c.1", description: "Systems to track and enforce gender equality" }]
            }
        ]
    },
    {
        id: "6",
        number: 6,
        title: "Clean Water and Sanitation",
        description: "Ensure availability and sustainable management of water and sanitation for all",
        color: "#26BDE2",
        targets: [
            {
                id: "6.1",
                description: "Safe and affordable drinking water",
                indicators: [{ id: "6.1.1", description: "Safe drinking water services" }]
            },
            {
                id: "6.2",
                description: "End open defecation and provide access to sanitation and hygiene",
                indicators: [{ id: "6.2.1", description: "Safe sanitation and hand-washing facilities" }]
            },
            {
                id: "6.3",
                description: "Improve water quality, wastewater treatment and safe reuse",
                indicators: [
                    { id: "6.3.1", description: "Wastewater safely treated" },
                    { id: "6.3.2", description: "Bodies of water with good ambient water quality" }
                ]
            },
            {
                id: "6.4",
                description: "Increase water use efficiency and ensure freshwater supplies",
                indicators: [
                    { id: "6.4.1", description: "Water use efficiency" },
                    { id: "6.4.2", description: "Level of water stress (freshwater withdrawal)" }
                ]
            },
            {
                id: "6.5",
                description: "Implement integrated water resources management",
                indicators: [
                    { id: "6.5.1", description: "Integrated water management implementation" },
                    { id: "6.5.2", description: "Transboundary water cooperation" }
                ]
            },
            {
                id: "6.6",
                description: "Protect and restore water-related ecosystems",
                indicators: [{ id: "6.6.1", description: "Change in extent of water-related ecosystems" }]
            },
            {
                id: "6.a",
                description: "Expand water and sanitation support to developing countries",
                indicators: [{ id: "6.a.1", description: "Amount of water- and sanitation-related official assistance" }]
            },
            {
                id: "6.b",
                description: "Support local engagement in water and sanitation management",
                indicators: [{ id: "6.b.1", description: "Local participation in water and sanitation management" }]
            }
        ]
    },
    {
        id: "7",
        number: 7,
        title: "Affordable and Clean Energy",
        description: "Ensure access to affordable, reliable, sustainable and modern energy for all",
        color: "#FCC30B",
        targets: [
            {
                id: "7.1",
                description: "Universal access to modern energy",
                indicators: [
                    { id: "7.1.1", description: "Access to electricity" },
                    { id: "7.1.2", description: "Access to clean fuels for cooking" }
                ]
            },
            {
                id: "7.2",
                description: "Increase global percentage of renewable energy",
                indicators: [{ id: "7.2.1", description: "Renewable energy share in consumption" }]
            },
            {
                id: "7.3",
                description: "Double the improvement in energy efficiency",
                indicators: [{ id: "7.3.1", description: "Energy efficiency (energy intensity of GDP)" }]
            },
            {
                id: "7.a",
                description: "Promote access, technology and investments in clean energy",
                indicators: [{ id: "7.a.1", description: "International financial flows to clean energy" }]
            },
            {
                id: "7.b",
                description: "Expand and upgrade energy services for developing countries",
                indicators: [{ id: "7.b.1", description: "Installed renewable energy capacity in developing countries" }]
            }
        ]
    },
    {
        id: "8",
        number: 8,
        title: "Decent Work and Economic Growth",
        description: "Promote sustained, inclusive and sustainable economic growth, full and productive employment and decent work for all",
        color: "#A21942",
        targets: [
            {
                id: "8.1",
                description: "Sustainable economic growth",
                indicators: [{ id: "8.1.1", description: "GDP per capita growth rate" }]
            },
            {
                id: "8.2",
                description: "Diversify, innovate and upgrade for economic productivity",
                indicators: [{ id: "8.2.1", description: "GDP per employed person growth" }]
            },
            {
                id: "8.3",
                description: "Promote policies to support job creation and growing enterprises",
                indicators: [{ id: "8.3.1", description: "Informal employment" }]
            },
            {
                id: "8.4",
                description: "Improve resource efficiency in consumption and production",
                indicators: [
                    { id: "8.4.1", description: "Material footprint" },
                    { id: "8.4.2", description: "Domestic material consumption" }
                ]
            },
            {
                id: "8.5",
                description: "Full employment and decent work with equal pay",
                indicators: [
                    { id: "8.5.1", description: "Average hourly earnings of employees" },
                    { id: "8.5.2", description: "Unemployment rate" }
                ]
            },
            {
                id: "8.6",
                description: "Promote youth employment, education and training",
                indicators: [{ id: "8.6.1", description: "Youth not in employment or education (NEET rate)" }]
            },
            {
                id: "8.7",
                description: "End modern slavery, trafficking, and child labor",
                indicators: [{ id: "8.7.1", description: "Child labor prevalence" }]
            },
            {
                id: "8.8",
                description: "Protect labor rights and promote safe working environments",
                indicators: [
                    { id: "8.8.1", description: "Occupational injury frequency rate" },
                    { id: "8.8.2", description: "Compliance with labor rights (freedom of association and collective bargaining)" }
                ]
            },
            {
                id: "8.9",
                description: "Promote beneficial and sustainable tourism",
                indicators: [{ id: "8.9.1", description: "Tourism direct GDP as a proportion of total GDP" }]
            },
            {
                id: "8.10",
                description: "Universal access to banking, insurance and financial services",
                indicators: [
                    { id: "8.10.1", description: "Access to financial institutions (e.g. number of bank branches per 100,000 adults)" },
                    { id: "8.10.2", description: "Proportion of adults with a financial account" }
                ]
            },
            {
                id: "8.a",
                description: "Increase aid for trade support",
                indicators: [{ id: "8.a.1", description: "Aid for Trade commitments and disbursements" }]
            },
            {
                id: "8.b",
                description: "Develop a global youth employment strategy",
                indicators: [{ id: "8.b.1", description: "Existence of a developed youth employment strategy" }]
            }
        ]
    },
    {
        id: "9",
        number: 9,
        title: "Industry, Innovation and Infrastructure",
        description: "Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation",
        color: "#FD6925",
        targets: [
            {
                id: "9.1",
                description: "Develop sustainable, resilient and inclusive infrastructures",
                indicators: [
                    { id: "9.1.1", description: "Rural population with road access" },
                    { id: "9.1.2", description: "Passenger and freight volumes by mode" }
                ]
            },
            {
                id: "9.2",
                description: "Promote inclusive and sustainable industrialization",
                indicators: [
                    { id: "9.2.1", description: "Manufacturing value added (% of GDP)" },
                    { id: "9.2.2", description: "Manufacturing employment (% of total employment)" }
                ]
            },
            {
                id: "9.3",
                description: "Increase access to financial services and markets",
                indicators: [
                    { id: "9.3.1", description: "Small-scale industries’ share of total industry value added" },
                    { id: "9.3.2", description: "Small-scale industries with affordable credit" }
                ]
            },
            {
                id: "9.4",
                description: "Upgrade all industries and infrastructures for sustainability",
                indicators: [{ id: "9.4.1", description: "CO₂ emissions per unit of value added" }]
            },
            {
                id: "9.5",
                description: "Enhance research and upgrade industrial technologies",
                indicators: [
                    { id: "9.5.1", description: "Research and development spending" },
                    { id: "9.5.2", description: "Researchers per million inhabitants" }
                ]
            },
            {
                id: "9.a",
                description: "Facilitate sustainable infrastructure development for developing countries",
                indicators: [{ id: "9.a.1", description: "Official development assistance for infrastructure" }]
            },
            {
                id: "9.b",
                description: "Support domestic technology development and industrial diversification",
                indicators: [{ id: "9.b.1", description: "Medium and high-tech industry share in total output" }]
            },
            {
                id: "9.c",
                description: "Universal access to information and communications technology",
                indicators: [{ id: "9.c.1", description: "Population covered by a mobile network" }]
            }
        ]
    },
    {
        id: "10",
        number: 10,
        title: "Reduced Inequalities",
        description: "Reduce inequality within and among countries",
        color: "#DD1367",
        targets: [
            {
                id: "10.1",
                description: "Reduce income inequalities",
                indicators: [{ id: "10.1.1", description: "Income growth of the bottom 40% of population" }]
            },
            {
                id: "10.2",
                description: "Promote universal social, economic and political inclusion",
                indicators: [{ id: "10.2.1", description: "People living below 50% of median income" }]
            },
            {
                id: "10.3",
                description: "Ensure equal opportunities and end discrimination",
                indicators: [{ id: "10.3.1", description: "Population reporting discriminatory experiences" }]
            },
            {
                id: "10.4",
                description: "Adopt fiscal and social policies that promote equality",
                indicators: [
                    { id: "10.4.1", description: "Labor share of GDP (income share of workers)" },
                    { id: "10.4.2", description: "Redistributive impact of fiscal policy" }
                ]
            },
            {
                id: "10.5",
                description: "Improve regulation of global financial markets and institutions",
                indicators: [{ id: "10.5.1", description: "Financial Soundness Indicators (e.g. capital adequacy)" }]
            },
            {
                id: "10.6",
                description: "Ensure enhanced representation for developing countries in financial institutions",
                indicators: [{ id: "10.6.1", description: "Voting rights of developing countries in international organizations" }]
            },
            {
                id: "10.7",
                description: "Facilitate orderly, safe, regular and responsible migration",
                indicators: [
                    { id: "10.7.1", description: "Recruitment cost borne by employee as a proportion of yearly income" },
                    { id: "10.7.2", description: "Countries with migration policies for safe migration" },
                    { id: "10.7.3", description: "Number of people who died or disappeared during migration" },
                    { id: "10.7.4", description: "Proportion of refugees by population" }
                ]
            },
            {
                id: "10.a",
                description: "Special and differential treatment for developing countries",
                indicators: [{ id: "10.a.1", description: "Proportion of tariff lines applied to imports from least developed countries with zero-tariff" }]
            },
            {
                id: "10.b",
                description: "Encourage development assistance and investment in least developed countries",
                indicators: [{ id: "10.b.1", description: "Total resource flows for development, by recipient and donor" }]
            },
            {
                id: "10.c",
                description: "Reduce transaction costs for migrant remittances",
                indicators: [{ id: "10.c.1", description: "Remittance costs as a percentage of the amount remitted" }]
            }
        ]
    },
    {
        id: "11",
        number: 11,
        title: "Sustainable Cities and Communities",
        description: "Make cities and human settlements inclusive, safe, resilient and sustainable",
        color: "#FD9D24",
        targets: [
            {
                id: "11.1",
                description: "Safe and affordable housing",
                indicators: [{ id: "11.1.1", description: "Urban population living in slums" }]
            },
            {
                id: "11.2",
                description: "Affordable and sustainable transport systems",
                indicators: [{ id: "11.2.1", description: "Access to public transport" }]
            },
            {
                id: "11.3",
                description: "Inclusive and sustainable urbanization",
                indicators: [
                    { id: "11.3.1", description: "Ratio of land consumption rate to population growth rate" },
                    { id: "11.3.2", description: "Cities with participatory planning" }
                ]
            },
            {
                id: "11.4",
                description: "Protect the world’s cultural and natural heritage",
                indicators: [{ id: "11.4.1", description: "Expenditure on preservation of cultural and natural heritage" }]
            },
            {
                id: "11.5",
                description: "Reduce the adverse effects of natural disasters",
                indicators: [
                    { id: "11.5.1", description: "Deaths and injuries from natural disasters" },
                    { id: "11.5.2", description: "Economic losses from natural disasters" },
                    { id: "11.5.3", description: "Damage to infrastructure and basic services" }
                ]
            },
            {
                id: "11.6",
                description: "Reduce the environmental impacts of cities",
                indicators: [
                    { id: "11.6.1", description: "Solid waste management (collection rate)" },
                    { id: "11.6.2", description: "Urban air pollution (fine particulate matter concentration)" }
                ]
            },
            {
                id: "11.7",
                description: "Provide access to safe and inclusive green and public spaces",
                indicators: [
                    { id: "11.7.1", description: "Open public space per capita" },
                    { id: "11.7.2", description: "Physical or sexual harassment rate" }
                ]
            },
            {
                id: "11.a",
                description: "Support positive economic, social and environmental links in urban, peri-urban and rural areas",
                indicators: [{ id: "11.a.1", description: "Population living in cities with urban planning and regional development plans" }]
            },
            {
                id: "11.b",
                description: "Implement policies for inclusion, resource efficiency and disaster risk reduction",
                indicators: [
                    { id: "11.b.1", description: "Countries with disaster risk reduction strategies" },
                    { id: "11.b.2", description: "Local governments with disaster risk reduction plans" }
                ]
            },
            {
                id: "11.c",
                description: "Support least developed countries in sustainable and resilient building",
                indicators: [{ id: "11.c.1", description: "[Under development]" }]
            }
        ]
    },
    {
        id: "12",
        number: 12,
        title: "Responsible Consumption and Production",
        description: "Ensure sustainable consumption and production patterns",
        color: "#BF8B2E",
        targets: [
            {
                id: "12.1",
                description: "Implement the 10-Year Framework of Sustainable Consumption and Production Programs",
                indicators: [{ id: "12.1.1", description: "National action plans for sustainable consumption and production" }]
            },
            {
                id: "12.2",
                description: "Sustainable management and use of natural resources",
                indicators: [
                    { id: "12.2.1", description: "Material footprint (total, per capita, per GDP)" },
                    { id: "12.2.2", description: "Domestic material consumption (total, per capita, per GDP)" }
                ]
            },
            {
                id: "12.3",
                description: "Halve global per capita food waste",
                indicators: [{ id: "12.3.1", description: "Global food loss index" }]
            },
            {
                id: "12.4",
                description: "Responsible management of chemicals and waste",
                indicators: [
                    { id: "12.4.1", description: "Participation in chemicals and waste agreements" },
                    { id: "12.4.2", description: "Hazardous waste generation per capita" }
                ]
            },
            {
                id: "12.5",
                description: "Substantially reduce waste generation",
                indicators: [{ id: "12.5.1", description: "National recycling rate" }]
            },
            {
                id: "12.6",
                description: "Encourage companies to adopt sustainable practices and sustainability reporting",
                indicators: [{ id: "12.6.1", description: "Companies publishing sustainability reports" }]
            },
            {
                id: "12.7",
                description: "Promote sustainable public procurement practices",
                indicators: [{ id: "12.7.1", description: "Green public procurement policies" }]
            },
            {
                id: "12.8",
                description: "Promote universal understanding of sustainable lifestyles",
                indicators: [{ id: "12.8.1", description: "Extent of education for sustainable development (in curricula)" }]
            },
            {
                id: "12.a",
                description: "Support developing countries’ capacity for sustainable consumption and production",
                indicators: [{ id: "12.a.1", description: "Amount of support for sustainable production in developing countries" }]
            },
            {
                id: "12.b",
                description: "Develop and implement tools to monitor sustainable tourism",
                indicators: [{ id: "12.b.1", description: "Sustainable tourism strategies or action plans" }]
            },
            {
                id: "12.c",
                description: "Remove market distortions that encourage wasteful consumption",
                indicators: [{ id: "12.c.1", description: "Fossil fuel subsidies (amount and change)" }]
            }
        ]
    },
    {
        id: "13",
        number: 13,
        title: "Climate Action",
        description: "Take urgent action to combat climate change and its impacts",
        color: "#3F7E44",
        targets: [
            {
                id: "13.1",
                description: "Strengthen resilience and adaptive capacity to climate-related disasters",
                indicators: [
                    { id: "13.1.1", description: "Deaths and people affected by disasters (per 100,000 population)" },
                    { id: "13.1.2", description: "National disaster risk reduction strategies" },
                    { id: "13.1.3", description: "Local disaster risk reduction strategies" }
                ]
            },
            {
                id: "13.2",
                description: "Integrate climate change measures into policies and planning",
                indicators: [
                    { id: "13.2.1", description: "Climate change integrated in national policies" },
                    { id: "13.2.2", description: "Total greenhouse gas emissions per year" }
                ]
            },
            {
                id: "13.3",
                description: "Build knowledge and capacity to meet climate change",
                indicators: [{ id: "13.3.1", description: "Education and awareness on climate change" }]
            },
            {
                id: "13.a",
                description: "Implement the UN Framework Convention on Climate Change",
                indicators: [{ id: "13.a.1", description: "Mobilized amount of $100 billion commitment (Green Climate Fund)" }]
            },
            {
                id: "13.b",
                description: "Promote mechanisms to raise capacity for planning and management in least developed countries",
                indicators: [{ id: "13.b.1", description: "Support for climate planning in least developed countries" }]
            }
        ]
    },
    {
        id: "14",
        number: 14,
        title: "Life Below Water",
        description: "Conserve and sustainably use the oceans, seas and marine resources for sustainable development",
        color: "#0A97D9",
        targets: [
            {
                id: "14.1",
                description: "Reduce marine pollution",
                indicators: [{ id: "14.1.1", description: "Index of coastal eutrophication & plastic debris density" }]
            },
            {
                id: "14.2",
                description: "Protect and restore ecosystems",
                indicators: [{ id: "14.2.1", description: "Countries managing marine areas using ecosystem-based approaches" }]
            },
            {
                id: "14.3",
                description: "Reduce ocean acidification",
                indicators: [{ id: "14.3.1", description: "Marine acidity (pH) level" }]
            },
            {
                id: "14.4",
                description: "Sustainable fishing",
                indicators: [{ id: "14.4.1", description: "Fish stocks within biologically sustainable levels" }]
            },
            {
                id: "14.5",
                description: "Conserve coastal and marine areas",
                indicators: [{ id: "14.5.1", description: "Protected marine areas (% of total marine area)" }]
            },
            {
                id: "14.6",
                description: "End subsidies contributing to overfishing and illegal fishing",
                indicators: [{ id: "14.6.1", description: "Progress in combating illegal, unreported and unregulated fishing" }]
            },
            {
                id: "14.7",
                description: "Increase the economic benefits from sustainable use of marine resources",
                indicators: [{ id: "14.7.1", description: "Sustainable fisheries as a percentage of GDP in small island states" }]
            },
            {
                id: "14.a",
                description: "Increase scientific knowledge, research and technology for ocean health",
                indicators: [{ id: "14.a.1", description: "Research investment in marine technology" }]
            },
            {
                id: "14.b",
                description: "Support small-scale fishers",
                indicators: [{ id: "14.b.1", description: "Rights for small-scale fishers" }]
            },
            {
                id: "14.c",
                description: "Implement and enforce international sea law",
                indicators: [{ id: "14.c.1", description: "Progress in ratifying and implementing ocean-related international agreements" }]
            }
        ]
    },
    {
        id: "15",
        number: 15,
        title: "Life on Land",
        description: "Protect, restore and promote sustainable use of terrestrial ecosystems, sustainably manage forests, combat desertification, and halt and reverse land degradation and halt biodiversity loss",
        color: "#56C02B",
        targets: [
            {
                id: "15.1",
                description: "Conserve and restore terrestrial and freshwater ecosystems",
                indicators: [
                    { id: "15.1.1", description: "Forest area as proportion of total land area (forest cover)" },
                    { id: "15.1.2", description: "Protected important sites for terrestrial and freshwater biodiversity" }
                ]
            },
            {
                id: "15.2",
                description: "End deforestation and restore degraded forests",
                indicators: [{ id: "15.2.1", description: "Progress towards sustainable forest management" }]
            },
            {
                id: "15.3",
                description: "End desertification and restore degraded land",
                indicators: [{ id: "15.3.1", description: "Proportion of land that is degraded over total land area" }]
            },
            {
                id: "15.4",
                description: "Ensure conservation of mountain ecosystems",
                indicators: [
                    { id: "15.4.1", description: "Coverage of protected areas in mountains" },
                    { id: "15.4.2", description: "Mountain Green Cover Index (vegetation cover in mountains)" }
                ]
            },
            {
                id: "15.5",
                description: "Protect biodiversity and natural habitats",
                indicators: [{ id: "15.5.1", description: "Red List Index (species extinction risk)" }]
            },
            {
                id: "15.6",
                description: "Protect access to genetic resources and fair sharing of the benefits",
                indicators: [{ id: "15.6.1", description: "Number of countries with frameworks to share genetic resources benefits" }]
            },
            {
                id: "15.7",
                description: "Eliminate poaching and trafficking of protected species",
                indicators: [{ id: "15.7.1", description: "Proportion of traded wildlife that was poached or illicitly trafficked" }]
            },
            {
                id: "15.8",
                description: "Prevent invasive alien species on land and in water ecosystems",
                indicators: [{ id: "15.8.1", description: "Countries with invasive species management plans" }]
            },
            {
                id: "15.9",
                description: "Integrate ecosystem and biodiversity values into national and local planning",
                indicators: [{ id: "15.9.1", description: "Progress in national biodiversity strategy and action plans" }]
            },
            {
                id: "15.a",
                description: "Increase financial resources to conserve and sustainably use biodiversity and ecosystems",
                indicators: [{ id: "15.a.1", description: "Official development assistance for biodiversity" }]
            },
            {
                id: "15.b",
                description: "Finance and incentivize sustainable forest management",
                indicators: [{ id: "15.b.1", description: "Official development assistance for forest management" }]
            },
            {
                id: "15.c",
                description: "Combat global poaching and trafficking of wildlife",
                indicators: [{ id: "15.c.1", description: "Proportion of illegally traded wildlife that is seized" }]
            }
        ]
    },
    {
        id: "16",
        number: 16,
        title: "Peace, Justice and Strong Institutions",
        description: "Promote peaceful and inclusive societies for sustainable development, provide access to justice for all and build effective, accountable and inclusive institutions at all levels",
        color: "#00689D",
        targets: [
            {
                id: "16.1",
                description: "Reduce violence everywhere",
                indicators: [
                    { id: "16.1.1", description: "Intentional homicide rate" },
                    { id: "16.1.2", description: "Conflict-related deaths per 100,000 population" },
                    { id: "16.1.3", description: "Population subjected to violence in the previous 12 months" },
                    { id: "16.1.4", description: "Population feeling safe walking alone at night" }
                ]
            },
            {
                id: "16.2",
                description: "Protect children from abuse, exploitation, trafficking and violence",
                indicators: [
                    { id: "16.2.1", description: "Children experiencing physical or psychological violence at home" },
                    { id: "16.2.2", description: "Human trafficking victims (per 100,000 population)" },
                    { id: "16.2.3", description: "Young women and men subjected to sexual violence" }
                ]
            },
            {
                id: "16.3",
                description: "Promote the rule of law and ensure equal access to justice",
                indicators: [
                    { id: "16.3.1", description: "Proportion of victims reporting crimes" },
                    { id: "16.3.2", description: "Unsentenced detainees as a proportion of prison population" },
                    { id: "16.3.3", description: "Access to dispute resolution mechanisms" }
                ]
            },
            {
                id: "16.4",
                description: "Combat organized crime and illicit financial and arms flows",
                indicators: [
                    { id: "16.4.1", description: "Illicit financial flows" },
                    { id: "16.4.2", description: "Seized or surrendered arms" }
                ]
            },
            {
                id: "16.5",
                description: "Substantially reduce corruption and bribery",
                indicators: [
                    { id: "16.5.1", description: "Bribery prevalence (% of firms experiencing bribery)" },
                    { id: "16.5.2", description: "Bribery incidents in business (% of persons)" }
                ]
            },
            {
                id: "16.6",
                description: "Develop effective, accountable and transparent institutions",
                indicators: [
                    { id: "16.6.1", description: "Government expenditure within approved budgets" },
                    { id: "16.6.2", description: "Population satisfied with public services" }
                ]
            },
            {
                id: "16.7",
                description: "Ensure responsive, inclusive and representative decision-making",
                indicators: [
                    { id: "16.7.1", description: "Representation in public institutions (by demographics)" },
                    { id: "16.7.2", description: "Inclusive decision-making index" }
                ]
            },
            {
                id: "16.8",
                description: "Strengthen the participation of developing countries in global governance",
                indicators: [{ id: "16.8.1", description: "Developing countries’ membership in international organizations" }]
            },
            {
                id: "16.9",
                description: "Provide universal legal identity",
                indicators: [{ id: "16.9.1", description: "Birth registration rate" }]
            },
            {
                id: "16.10",
                description: "Ensure public access to information and protect fundamental freedoms",
                indicators: [
                    { id: "16.10.1", description: "Number of verified cases of killing or kidnapping of journalists and human rights advocates" },
                    { id: "16.10.2", description: "Existence of laws guaranteeing public access to information" }
                ]
            },
            {
                id: "16.a",
                description: "Strengthen national institutions to prevent violence and combat crime and terrorism",
                indicators: [{ id: "16.a.1", description: "Independent national human rights institutions (existence and strength)" }]
            },
            {
                id: "16.b",
                description: "Promote and enforce non-discriminatory laws and policies",
                indicators: [{ id: "16.b.1", description: "Population reporting exposure to discrimination" }]
            }
        ]
    },
    {
        id: "17",
        number: 17,
        title: "Partnerships for the Goals",
        description: "Strengthen the means of implementation and revitalize the global partnership for sustainable development",
        color: "#19486A",
        targets: [
            {
                id: "17.1",
                description: "Mobilize resources to improve domestic revenue collection",
                indicators: [
                    { id: "17.1.1", description: "Government revenue as % of GDP" },
                    { id: "17.1.2", description: "Proportion of budget funded by domestic taxes" }
                ]
            },
            {
                id: "17.2",
                description: "Implement all development assistance commitments",
                indicators: [{ id: "17.2.1", description: "Official development assistance to least developed countries (% of GNI of donors)" }]
            },
            {
                id: "17.3",
                description: "Mobilize financial resources for developing countries",
                indicators: [
                    { id: "17.3.1", description: "Foreign direct investment inflows" },
                    { id: "17.3.2", description: "Volume of remittances as % of GDP" }
                ]
            },
            {
                id: "17.4",
                description: "Assist developing countries in attaining debt sustainability",
                indicators: [{ id: "17.4.1", description: "Debt service as a proportion of exports of goods and services" }]
            },
            {
                id: "17.5",
                description: "Invest in least-developed countries",
                indicators: [{ id: "17.5.1", description: "Countries adopting investment promotion regimes for LDCs" }]
            },
            {
                id: "17.6",
                description: "Knowledge sharing and cooperation for access to science, technology and innovation",
                indicators: [{ id: "17.6.1", description: "Fixed internet broadband subscriptions per 100 inhabitants" }]
            },
            {
                id: "17.7",
                description: "Promote sustainable technologies to developing countries",
                indicators: [{ id: "17.7.1", description: "Total amount of funding for sustainable technologies in developing countries" }]
            },
            {
                id: "17.8",
                description: "Strengthen science, technology and innovation capacity for least-developed countries",
                indicators: [{ id: "17.8.1", description: "Proportion of individuals using the Internet" }]
            },
            {
                id: "17.9",
                description: "Enhance SDG capacity in developing countries",
                indicators: [{ id: "17.9.1", description: "Dollar value of financial and technical assistance for SDG implementation" }]
            },
            {
                id: "17.10",
                description: "Promote a universal trading system under the WTO",
                indicators: [{ id: "17.10.1", description: "Worldwide weighted tariff-average" }]
            },
            {
                id: "17.11",
                description: "Increase the exports of developing countries",
                indicators: [{ id: "17.11.1", description: "Developing countries’ share of global exports" }]
            },
            {
                id: "17.12",
                description: "Remove trade barriers for least-developed countries",
                indicators: [{ id: "17.12.1", description: "Average tariffs faced by developing countries" }]
            },
            {
                id: "17.13",
                description: "Enhance global macroeconomic stability",
                indicators: [{ id: "17.13.1", description: "Macroeconomic Dashboard (composite indicator)" }]
            },
            {
                id: "17.14",
                description: "Enhance policy coherence for sustainable development",
                indicators: [{ id: "17.14.1", description: "Mechanisms in place for policy coherence" }]
            },
            {
                id: "17.15",
                description: "Respect national leadership to implement policies for sustainable development",
                indicators: [{ id: "17.15.1", description: "Extent of use of country-owned results frameworks" }]
            },
            {
                id: "17.16",
                description: "Enhance the global partnership for sustainable development",
                indicators: [{ id: "17.16.1", description: "Progress in multi-stakeholder development partnerships" }]
            },
            {
                id: "17.17",
                description: "Encourage effective partnerships",
                indicators: [{ id: "17.17.1", description: "Amount of US$ committed to public-private partnerships" }]
            },
            {
                id: "17.18",
                description: "Enhance availability of reliable data",
                indicators: [
                    { id: "17.18.1", description: "Statistical capacity (composite indicator score)" },
                    { id: "17.18.2", description: "Number of countries with national statistical legislation" },
                    { id: "17.18.3", description: "Number of countries with national statistical plan" }
                ]
            },
            {
                id: "17.19",
                description: "Further develop measurements of progress",
                indicators: [
                    { id: "17.19.1", description: "Dollar value of all resources made available for statistical capacity building" },
                    { id: "17.19.2", description: "Countries that have conducted a population and housing census in the last 10 years" }
                ]
            }
        ]
    },
];
