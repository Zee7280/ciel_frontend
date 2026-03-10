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

export const sdgDetailedData: SDG[] = [
    {
        id: "1",
        number: 1,
        title: "No Poverty",
        description: "End poverty in all its forms everywhere",
        color: "#E5243B",
        targets: [
            {
                id: "1.1",
                description: "By 2030, eradicate extreme poverty for all people everywhere, currently measured as people living on less than $1.25 a day",
                indicators: [{ id: "1.1.1", description: "Proportion of the population living below the international poverty line, by sex, age, employment status and geographic location (urban/rural)" }]
            },
            {
                id: "1.2",
                description: "By 2030, reduce at least by half the proportion of men, women and children of all ages living in poverty in all its dimensions according to national definitions",
                indicators: [
                    { id: "1.2.1", description: "Proportion of population living below the national poverty line, by sex and age" },
                    { id: "1.2.2", description: "Proportion of men, women and children of all ages living in poverty in all its dimensions according to national definitions" }
                ]
            },
            {
                id: "1.3",
                description: "Implement nationally appropriate social protection systems and measures for all, including floors, and by 2030 achieve substantial coverage of the poor and the vulnerable",
                indicators: [{ id: "1.3.1", description: "Proportion of population covered by social protection floors/systems, by sex, distinguishing children, unemployed persons, older persons, persons with disabilities, pregnant women, newborns, work-injury victims and the poor and the vulnerable" }]
            },
            {
                id: "1.4",
                description: "By 2030, ensure that all men and women, in particular the poor and the vulnerable, have equal rights to economic resources, as well as access to basic services, ownership and control over land and other forms of property, inheritance, natural resources, appropriate new technology and financial services, including microfinance",
                indicators: [
                    { id: "1.4.1", description: "Proportion of population living in households with access to basic services" },
                    { id: "1.4.2", description: "Proportion of total adult population with secure tenure rights to land, (a) with legally recognized documentation, and (b) who perceive their rights to land as secure, by sex and type of tenure" }
                ]
            },
            {
                id: "1.5",
                description: "By 2030, build the resilience of the poor and those in vulnerable situations and reduce their exposure and vulnerability to climate-related extreme events and other economic, social and environmental shocks and disasters",
                indicators: [
                    { id: "1.5.1", description: "Number of deaths, missing persons and directly affected persons attributed to disasters per 100,000 population" },
                    { id: "1.5.2", description: "Direct economic loss attributed to disasters in relation to global gross domestic product (GDP)" },
                    { id: "1.5.3", description: "Number of countries that adopt and implement national disaster risk reduction strategies in line with the Sendai Framework for Disaster Risk Reduction 2015–2030" },
                    { id: "1.5.4", description: "Proportion of local governments that adopt and implement local disaster risk reduction strategies in line with national disaster risk reduction strategies" }
                ]
            },
            {
                id: "1.a",
                description: "Ensure significant mobilization of resources from a variety of sources, including through enhanced development cooperation, in order to provide adequate and predictable means for developing countries, in particular least developed countries, to implement programmes and policies to end poverty in all its dimensions",
                indicators: [
                    { id: "1.a.1", description: "Total official development assistance grants from all donors that focus on poverty reduction as a share of the recipient country’s gross national income" },
                    { id: "1.a.2", description: "Proportion of total government spending on essential services (education, health and social protection)" }
                ]
            },
            {
                id: "1.b",
                description: "Create sound policy frameworks at the national, regional and international levels, based on pro-poor and gender-sensitive development strategies, to support accelerated investment in poverty eradication actions",
                indicators: [{ id: "1.b.1", description: "Pro-poor public social spending" }]
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
                description: "By 2030, end hunger and ensure access by all people, in particular the poor and people in vulnerable situations, including infants, to safe, nutritious and sufficient food all year round",
                indicators: [
                    { id: "2.1.1", description: "Prevalence of undernourishment" },
                    { id: "2.1.2", description: "Prevalence of moderate or severe food insecurity in the population, based on the Food Insecurity Experience Scale (FIES)" }
                ]
            },
            {
                id: "2.2",
                description: "By 2030, end all forms of malnutrition, including achieving, by 2025, the internationally agreed targets on stunting and wasting in children under 5 years of age, and address the nutritional needs of adolescent girls, pregnant and lactating women and older persons",
                indicators: [
                    { id: "2.2.1", description: "Prevalence of stunting (height for age < –2 standard deviation from the median of the World Health Organization (WHO) Child Growth Standards) among children under 5 years of age" },
                    { id: "2.2.2", description: "Prevalence of malnutrition (weight for height > +2 or < –2 standard deviation from the median of the WHO Child Growth Standards) among children under 5 years of age, by type (wasting and overweight)" },
                    { id: "2.2.3", description: "Prevalence of anaemia in women aged 15 to 49 years, by pregnancy status (percentage)" },
                    { id: "2.2.4", description: "Prevalence of minimum dietary diversity, by population group (children aged 6 to 23.9 months and non-pregnant women aged 15 to 49 years)" }
                ]
            },
            {
                id: "2.3",
                description: "By 2030, double the agricultural productivity and incomes of small-scale food producers, in particular women, indigenous peoples, family farmers, pastoralists and fishers, including through secure and equal access to land, other productive resources and inputs, knowledge, financial services, markets and opportunities for value addition and non-farm employment",
                indicators: [
                    { id: "2.3.1", description: "Volume of production per labour unit by classes of farming/pastoral/forestry enterprise size" },
                    { id: "2.3.2", description: "Average income of small-scale food producers, by sex and indigenous status" }
                ]
            },
            {
                id: "2.4",
                description: "By 2030, ensure sustainable food production systems and implement resilient agricultural practices that increase productivity and production, that help maintain ecosystems, that strengthen capacity for adaptation to climate change, extreme weather, drought, flooding and other disasters and that progressively improve land and soil quality",
                indicators: [
                    { id: "2.4.1", description: "Proportion of agricultural area under productive and sustainable agriculture" }
                ]
            },
            {
                id: "2.5",
                description: "By 2020, maintain the genetic diversity of seeds, cultivated plants and farmed and domesticated animals and their related wild species, including through soundly managed and diversified seed and plant banks at the national, regional and international levels, and promote access to and fair and equitable sharing of benefits arising from the utilization of genetic resources and associated traditional knowledge, as internationally agreed",
                indicators: [
                    { id: "2.5.1", description: "Number of (a) plant and (b) animal genetic resources for food and agriculture secured in either medium- or long-term conservation facilities" },
                    { id: "2.5.2", description: "Proportion of local and transboundary breeds classified as being at risk of extinction" }
                ]
            },
            {
                id: "2.a",
                description: "Increase investment, including through enhanced international cooperation, in rural infrastructure, agricultural research and extension services, technology development and plant and livestock gene banks in order to enhance agricultural productive capacity in developing countries, in particular least developed countries",
                indicators: [
                    { id: "2.a.1", description: "The agriculture orientation index for government expenditures" },
                    { id: "2.a.2", description: "Total official flows (official development assistance plus other official flows) to the agriculture sector" }
                ]
            },
            {
                id: "2.b",
                description: "Correct and prevent trade restrictions and distortions in world agricultural markets, including through the parallel elimination of all forms of agricultural export subsidies and all export measures with equivalent effect, in accordance with the mandate of the Doha Development Round",
                indicators: [
                    { id: "2.b.1", description: "Agricultural export subsidies" }
                ]
            },
            {
                id: "2.c",
                description: "Adopt measures to ensure the proper functioning of food commodity markets and their derivatives and facilitate timely access to market information, including on food reserves, in order to help limit extreme food price volatility",
                indicators: [
                    { id: "2.c.1", description: "Indicator of food price anomalies" }
                ]
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
                description: "By 2030, reduce the global maternal mortality ratio to less than 70 per 100,000 live births",
                indicators: [
                    { id: "3.1.1", description: "Maternal mortality ratio" },
                    { id: "3.1.2", description: "Proportion of births attended by skilled health personnel" }
                ]
            },
            {
                id: "3.2",
                description: "By 2030, end preventable deaths of newborns and children under 5 years of age, with all countries aiming to reduce neonatal mortality to at least as low as 12 per 1,000 live births and under‑5 mortality to at least as low as 25 per 1,000 live births",
                indicators: [
                    { id: "3.2.1", description: "Under‑5 mortality rate" },
                    { id: "3.2.2", description: "Neonatal mortality rate" }
                ]
            },
            {
                id: "3.3",
                description: "By 2030, end the epidemics of AIDS, tuberculosis, malaria and neglected tropical diseases and combat hepatitis, water‑borne diseases and other communicable diseases",
                indicators: [
                    { id: "3.3.1", description: "Number of new HIV infections per 1,000 uninfected population, by sex, age and key populations" },
                    { id: "3.3.2", description: "Tuberculosis incidence per 100,000 population" },
                    { id: "3.3.3", description: "Malaria incidence per 1,000 population" },
                    { id: "3.3.4", description: "Hepatitis B incidence per 100,000 population" },
                    { id: "3.3.5", description: "Number of people requiring interventions against neglected tropical diseases" }
                ]
            },
            {
                id: "3.4",
                description: "By 2030, reduce by one third premature mortality from non‑communicable diseases through prevention and treatment and promote mental health and well‑being",
                indicators: [
                    { id: "3.4.1", description: "Mortality rate attributed to cardiovascular disease, cancer, diabetes or chronic respiratory disease" },
                    { id: "3.4.2", description: "Suicide mortality rate" }
                ]
            },
            {
                id: "3.5",
                description: "Strengthen the prevention and treatment of substance abuse, including narcotic drug abuse and harmful use of alcohol",
                indicators: [
                    { id: "3.5.1", description: "Coverage of treatment interventions (pharmacological, psychosocial and rehabilitation and aftercare services) for substance use disorders" },
                    { id: "3.5.2", description: "Alcohol per capita consumption (aged 15 years and older) within a calendar year in litres of pure alcohol" }
                ]
            },
            {
                id: "3.6",
                description: "By 2020, halve the number of global deaths and injuries from road traffic accidents",
                indicators: [
                    { id: "3.6.1", description: "Death rate due to road traffic injuries" }
                ]
            },
            {
                id: "3.7",
                description: "By 2030, ensure universal access to sexual and reproductive health‑care services, including for family planning, information and education, and the integration of reproductive health into national strategies and programmes",
                indicators: [
                    { id: "3.7.1", description: "Proportion of women of reproductive age (aged 15–49 years) who have their need for family planning satisfied with modern methods" },
                    { id: "3.7.2", description: "Adolescent birth rate (aged 10–14 years; aged 15–19 years) per 1,000 women in that age group" }
                ]
            },
            {
                id: "3.8",
                description: "Achieve universal health coverage, including financial risk protection, access to quality essential health‑care services and access to safe, effective, quality and affordable essential medicines and vaccines for all",
                indicators: [
                    { id: "3.8.1", description: "Coverage of essential health services" },
                    { id: "3.8.2", description: "Proportion of population with large household expenditures on health as a share of total household expenditure or income" }
                ]
            },
            {
                id: "3.9",
                description: "By 2030, substantially reduce the number of deaths and illnesses from hazardous chemicals and air, water and soil pollution and contamination",
                indicators: [
                    { id: "3.9.1", description: "Mortality rate attributed to household and ambient air pollution" },
                    { id: "3.9.2", description: "Mortality rate attributed to unsafe water, unsafe sanitation and lack of hygiene (exposure to unsafe Water, Sanitation and Hygiene for All (WASH) services)" },
                    { id: "3.9.3", description: "Mortality rate attributed to unintentional poisoning" }
                ]
            },
            {
                id: "3.a",
                description: "Strengthen the implementation of the World Health Organization Framework Convention on Tobacco Control in all countries, as appropriate",
                indicators: [
                    { id: "3.a.1", description: "Age-standardized prevalence of current tobacco use among persons aged 15 years and older" }
                ]
            },
            {
                id: "3.b",
                description: "Support the research and development of vaccines and medicines for the communicable and non‑communicable diseases that primarily affect developing countries, provide access to affordable essential medicines and vaccines, in accordance with the Doha Declaration on the TRIPS Agreement and Public Health, which affirms the right of developing countries to use to the full the provisions in the Agreement on Trade‑Related Aspects of Intellectual Property Rights regarding flexibilities to protect public health, and, in particular, provide access to medicines for all",
                indicators: [
                    { id: "3.b.1", description: "Proportion of the target population covered by all vaccines included in their national programme" },
                    { id: "3.b.2", description: "Total net official development assistance to medical research and basic health sectors" },
                    { id: "3.b.3", description: "Health product access index" }
                ]
            },
            {
                id: "3.c",
                description: "Substantially increase health financing and the recruitment, development, training and retention of the health workforce in developing countries, especially in least developed countries and small island developing States",
                indicators: [
                    { id: "3.c.1", description: "Health worker density and distribution" }
                ]
            },
            {
                id: "3.d",
                description: "Strengthen the capacity of all countries, in particular developing countries, for early warning, risk reduction and management of national and global health risks",
                indicators: [
                    { id: "3.d.1", description: "International Health Regulations (IHR) capacity and health emergency preparedness" },
                    { id: "3.d.2", description: "Percentage of bloodstream infections due to selected antimicrobial-resistant organisms" }
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
                description: "By 2030, ensure that all girls and boys complete free, equitable and quality primary and secondary education leading to relevant and effective learning outcomes",
                indicators: [
                    { id: "4.1.1", description: "Proportion of children and young people (a) in grades 2/3; (b) at the end of primary; and (c) at the end of lower secondary achieving at least a minimum proficiency level in (i) reading and (ii) mathematics, by sex" },
                    { id: "4.1.2", description: "Completion rate (primary education, lower secondary education, upper secondary education)" }
                ]
            },
            {
                id: "4.2",
                description: "By 2030, ensure that all girls and boys have access to quality early childhood development, care and pre‑primary education so that they are ready for primary education",
                indicators: [
                    { id: "4.2.1", description: "Proportion of children aged 24–59 months who are developmentally on track in health, learning and psychosocial well‑being, by sex" },
                    { id: "4.2.2", description: "Participation rate in organized learning (one year before the official primary entry age), by sex" }
                ]
            },
            {
                id: "4.3",
                description: "By 2030, ensure equal access for all women and men to affordable and quality technical, vocational and tertiary education, including university",
                indicators: [
                    { id: "4.3.1", description: "Participation rate of youth and adults in formal and non‑formal education and training in the previous 12 months, by sex" }
                ]
            },
            {
                id: "4.4",
                description: "By 2030, substantially increase the number of youth and adults who have relevant skills, including technical and vocational skills, for employment, decent jobs and entrepreneurship",
                indicators: [
                    { id: "4.4.1", description: "Proportion of youth and adults with information and communications technology (ICT) skills, by type of skill" }
                ]
            },
            {
                id: "4.5",
                description: "By 2030, eliminate gender disparities in education and ensure equal access to all levels of education and vocational training for the vulnerable, including persons with disabilities, indigenous peoples and children in vulnerable situations",
                indicators: [
                    { id: "4.5.1", description: "Parity indices (female/male, rural/urban, bottom/top wealth quintile and others such as disability status, indigenous peoples and conflict‑affected, as data become available) for all education indicators on this list that can be disaggregated" }
                ]
            },
            {
                id: "4.6",
                description: "By 2030, ensure that all youth and a substantial proportion of adults, both men and women, achieve literacy and numeracy",
                indicators: [
                    { id: "4.6.1", description: "Youth/adult literacy rate" }
                ]
            },
            {
                id: "4.7",
                description: "By 2030, ensure that all learners acquire the knowledge and skills needed to promote sustainable development, including, among others, through education for sustainable development and sustainable lifestyles, human rights, gender equality, promotion of a culture of peace and non‑violence, global citizenship and appreciation of cultural diversity and of culture’s contribution to sustainable development",
                indicators: [
                    { id: "4.7.1", description: "Extent to which (i) global citizenship education and (ii) education for sustainable development are mainstreamed in (a) national education policies; (b) curricula; (c) teacher education; and (d) student assessment" }
                ]
            },
            {
                id: "4.a",
                description: "Build and upgrade education facilities that are child, disability and gender sensitive and provide safe, non‑violent, inclusive and effective learning environments for all",
                indicators: [
                    { id: "4.a.1", description: "Proportion of schools offering basic services, by type of service" }
                ]
            },
            {
                id: "4.b",
                description: "By 2020, substantially expand globally the number of scholarships available to developing countries, in particular least developed countries, small island developing States and African countries, for enrollment in higher education, including vocational training and information and communications technology, technical, engineering and scientific programmes, in developed countries and other developing countries",
                indicators: [
                    { id: "4.b.1", description: "Volume of official development assistance flows for scholarships" }
                ]
            },
            {
                id: "4.c",
                description: "By 2030, substantially increase the supply of qualified teachers, including through international cooperation for teacher training in developing countries, especially least developed countries and small island developing States",
                indicators: [
                    { id: "4.c.1", description: "Proportion of teachers with the minimum required qualifications, by education level" }
                ]
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
                description: "End all forms of discrimination against all women and girls everywhere",
                indicators: [
                    { id: "5.1.1", description: "Whether or not legal frameworks are in place to promote, enforce and monitor equality and non‑discrimination on the basis of sex" }
                ]
            },
            {
                id: "5.2",
                description: "Eliminate all forms of violence against all women and girls in the public and private spheres, including trafficking and sexual and other types of exploitation",
                indicators: [
                    { id: "5.2.1", description: "Proportion of ever‑partnered women and girls aged 15 years and older subjected to physical, sexual or psychological violence by a current or former intimate partner in the previous 12 months, by form of violence and by age" },
                    { id: "5.2.2", description: "Proportion of women and girls aged 15 years and older subjected to sexual violence by persons other than an intimate partner in the previous 12 months, by age and place of occurrence" }
                ]
            },
            {
                id: "5.3",
                description: "Eliminate all harmful practices, such as child, early and forced marriage and female genital mutilation",
                indicators: [
                    { id: "5.3.1", description: "Proportion of women aged 20–24 years who were married or in a union before age 15 and before age 18" },
                    { id: "5.3.2", description: "Proportion of girls and women aged 15–49 years who have undergone female genital mutilation, by age" }
                ]
            },
            {
                id: "5.4",
                description: "Recognize and value unpaid care and domestic work through the provision of public services, infrastructure and social protection policies and the promotion of shared responsibility within the household and the family as nationally appropriate",
                indicators: [
                    { id: "5.4.1", description: "Proportion of time spent on unpaid domestic and care work, by sex, age and location" }
                ]
            },
            {
                id: "5.5",
                description: "Ensure women’s full and effective participation and equal opportunities for leadership at all levels of decision‑making in political, economic and public life",
                indicators: [
                    { id: "5.5.1", description: "Proportion of seats held by women in (a) national parliaments and (b) local governments" },
                    { id: "5.5.2", description: "Proportion of women in managerial positions" }
                ]
            },
            {
                id: "5.6",
                description: "Ensure universal access to sexual and reproductive health and reproductive rights as agreed in accordance with the Programme of Action of the International Conference on Population and Development and the Beijing Platform for Action and the outcome documents of their review conferences",
                indicators: [
                    { id: "5.6.1", description: "Proportion of women aged 15–49 years who make their own informed decisions regarding sexual relations, contraceptive use and reproductive health care" },
                    { id: "5.6.2", description: "Number of countries with laws and regulations that guarantee full and equal access to women and men aged 15 years and older to sexual and reproductive health care, information and education" }
                ]
            },
            {
                id: "5.a",
                description: "Undertake reforms to give women equal rights to economic resources, as well as access to ownership and control over land and other forms of property, financial services, inheritance and natural resources, in accordance with national laws",
                indicators: [
                    { id: "5.a.1", description: "(a) Proportion of total agricultural population with ownership or secure rights over agricultural land, by sex; and (b) share of women among owners or rights‑bearers of agricultural land, by type of tenure" },
                    { id: "5.a.2", description: "Proportion of countries where the legal framework (including customary law) guarantees women’s equal rights to land ownership and/or control" }
                ]
            },
            {
                id: "5.b",
                description: "Enhance the use of enabling technology, in particular information and communications technology, to promote the empowerment of women",
                indicators: [
                    { id: "5.b.1", description: "Proportion of individuals who own a mobile telephone, by sex" }
                ]
            },
            {
                id: "5.c",
                description: "Adopt and strengthen sound policies and enforceable legislation for the promotion of gender equality and the empowerment of all women and girls at all levels",
                indicators: [
                    { id: "5.c.1", description: "Proportion of countries with systems to track and make public allocations for gender equality and women’s empowerment" }
                ]
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
                description: "By 2030, achieve universal and equitable access to safe and affordable drinking water for all",
                indicators: [
                    { id: "6.1.1", description: "Proportion of population using safely managed drinking water services" }
                ]
            },
            {
                id: "6.2",
                description: "By 2030, achieve access to adequate and equitable sanitation and hygiene for all and end open defecation, paying special attention to the needs of women and girls and those in vulnerable situations",
                indicators: [
                    { id: "6.2.1", description: "Proportion of population using (a) safely managed sanitation services and (b) a hand‑washing facility with soap and water" }
                ]
            },
            {
                id: "6.3",
                description: "By 2030, improve water quality by reducing pollution, eliminating dumping and minimizing release of hazardous chemicals and materials, halving the proportion of untreated wastewater and substantially increasing recycling and safe reuse globally",
                indicators: [
                    { id: "6.3.1", description: "Proportion of domestic and industrial wastewater flows safely treated" },
                    { id: "6.3.2", description: "Proportion of bodies of water with good ambient water quality" }
                ]
            },
            {
                id: "6.4",
                description: "By 2030, substantially increase water-use efficiency across all sectors and ensure sustainable withdrawals and supply of freshwater to address water scarcity and substantially reduce the number of people suffering from water scarcity",
                indicators: [
                    { id: "6.4.1", description: "Change in water-use efficiency over time" },
                    { id: "6.4.2", description: "Level of water stress: freshwater withdrawal as a proportion of available freshwater resources" }
                ]
            },
            {
                id: "6.5",
                description: "By 2030, implement integrated water resources management at all levels, including through transboundary cooperation as appropriate",
                indicators: [
                    { id: "6.5.1", description: "Degree of integrated water resources management implementation (0–100)" },
                    { id: "6.5.2", description: "Proportion of transboundary basin area with an operational arrangement for water cooperation" }
                ]
            },
            {
                id: "6.6",
                description: "By 2020, protect and restore water‑related ecosystems, including mountains, forests, wetlands, rivers, aquifers and lakes",
                indicators: [
                    { id: "6.6.1", description: "Change in the extent of water-related ecosystems over time" }
                ]
            },
            {
                id: "6.a",
                description: "By 2030, expand international cooperation and capacity-building support to developing countries in water- and sanitation-related activities and programmes, including water harvesting, desalination, water efficiency, wastewater treatment, recycling and reuse technologies",
                indicators: [
                    { id: "6.a.1", description: "Amount of water- and sanitation-related official development assistance that is part of a government‑coordinated spending plan" }
                ]
            },
            {
                id: "6.b",
                description: "Support and strengthen the participation of local communities in improving water and sanitation management",
                indicators: [
                    { id: "6.b.1", description: "Proportion of local administrative units with established and operational policies and procedures for participation of local communities in water and sanitation management" }
                ]
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
                description: "By 2030, ensure universal access to affordable, reliable and modern energy services",
                indicators: [
                    { id: "7.1.1", description: "Proportion of population with access to electricity" },
                    { id: "7.1.2", description: "Proportion of population with primary reliance on clean fuels and technology" }
                ]
            },
            {
                id: "7.2",
                description: "By 2030, increase substantially the share of renewable energy in the global energy mix",
                indicators: [
                    { id: "7.2.1", description: "Renewable energy share in the total final energy consumption" }
                ]
            },
            {
                id: "7.3",
                description: "By 2030, double the global rate of improvement in energy efficiency",
                indicators: [
                    { id: "7.3.1", description: "Energy intensity measured in terms of primary energy and GDP" }
                ]
            },
            {
                id: "7.a",
                description: "By 2030, enhance international cooperation to facilitate access to clean energy research and technology, including renewable energy, energy efficiency and advanced and cleaner fossil‑fuel technology, and promote investment in energy infrastructure and clean energy technology",
                indicators: [
                    { id: "7.a.1", description: "International financial flows to developing countries in support of clean energy research and development and renewable energy production, including in hybrid systems" }
                ]
            },
            {
                id: "7.b",
                description: "By 2030, expand infrastructure and upgrade technology for supplying modern and sustainable energy services for all in developing countries, in particular least developed countries, small island developing States and landlocked developing countries, in accordance with their respective programmes of support",
                indicators: [
                    { id: "7.b.1", description: "Installed renewable energy-generating capacity in developing and developed countries (in watts per capita)" }
                ]
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
                description: "Sustain per capita economic growth in accordance with national circumstances and, in particular, at least 7 per cent gross domestic product growth per annum in the least developed countries",
                indicators: [{ id: "8.1.1", description: "Annual growth rate of real GDP per capita" }]
            },
            {
                id: "8.2",
                description: "Achieve higher levels of economic productivity through diversification, technological upgrading and innovation, including through a focus on high‑value added and labour-intensive sectors",
                indicators: [{ id: "8.2.1", description: "Annual growth rate of real GDP per employed person" }]
            },
            {
                id: "8.3",
                description: "Promote development-oriented policies that support productive activities, decent job creation, entrepreneurship, creativity and innovation, and encourage the formalization and growth of micro-, small- and medium-sized enterprises, including through access to financial services",
                indicators: [{ id: "8.3.1", description: "Proportion of informal employment in total employment, by sector and sex" }]
            },
            {
                id: "8.4",
                description: "Improve progressively, through 2030, global resource efficiency in consumption and production and endeavour to decouple economic growth from environmental degradation, in accordance with the 10‑Year Framework of Programmes on Sustainable Consumption and Production, with developed countries taking the lead",
                indicators: [
                    { id: "8.4.1", description: "Material footprint, material footprint per capita, and material footprint per GDP" },
                    { id: "8.4.2", description: "Domestic material consumption, domestic material consumption per capita, and domestic material consumption per GDP" }
                ]
            },
            {
                id: "8.5",
                description: "By 2030, achieve full and productive employment and decent work for all women and men, including for young people and persons with disabilities, and equal pay for work of equal value",
                indicators: [
                    { id: "8.5.1", description: "Average hourly earnings of employees, by sex, age, occupation and persons with disabilities" },
                    { id: "8.5.2", description: "Unemployment rate, by sex, age and persons with disabilities" }
                ]
            },
            {
                id: "8.6",
                description: "By 2020, substantially reduce the proportion of youth not in employment, education or training",
                indicators: [{ id: "8.6.1", description: "Proportion of youth (aged 15–24 years) not in education, employment or training" }]
            },
            {
                id: "8.7",
                description: "Take immediate and effective measures to eradicate forced labour, end modern slavery and human trafficking and secure the prohibition and elimination of the worst forms of child labour, including recruitment and use of child soldiers, and by 2025 end child labour in all its forms",
                indicators: [{ id: "8.7.1", description: "Proportion and number of children aged 5–17 years engaged in child labour, by sex and age" }]
            },
            {
                id: "8.8",
                description: "Protect labour rights and promote safe and secure working environments for all workers, including migrant workers, in particular women migrants, and those in precarious employment",
                indicators: [
                    { id: "8.8.1", description: "Fatal and non-fatal occupational injuries per 100,000 workers, by sex and migrant status" },
                    { id: "8.8.2", description: "Level of national compliance with labour rights (freedom of association and collective bargaining) based on International Labour Organization (ILO) textual sources and national legislation, by sex and migrant status" }
                ]
            },
            {
                id: "8.9",
                description: "By 2030, devise and implement policies to promote sustainable tourism that creates jobs and promotes local culture and products",
                indicators: [
                    { id: "8.9.1", description: "Tourism direct GDP as a proportion of total GDP and in growth rate" },
                    { id: "8.9.2", description: "Employed persons in the tourism industries" }
                ]
            },
            {
                id: "8.10",
                description: "Strengthen the capacity of domestic financial institutions to encourage and expand access to banking, insurance and financial services for all",
                indicators: [
                    { id: "8.10.1", description: "(a) Number of commercial bank branches per 100,000 adults and (b) number of automated teller machines (ATMs) per 100,000 adults" },
                    { id: "8.10.2", description: "Proportion of adults (15 years and older) with an account at a bank or other financial institution or with a mobile-money-service provider" }
                ]
            },
            {
                id: "8.a",
                description: "Increase Aid for Trade support for developing countries, in particular least developed countries, including through the Enhanced Integrated Framework for Trade‑related Technical Assistance to Least Developed Countries",
                indicators: [{ id: "8.a.1", description: "Aid for Trade commitments and disbursements" }]
            },
            {
                id: "8.b",
                description: "By 2020, develop and operationalize a global strategy for youth employment and implement the Global Jobs Pact of the International Labour Organization",
                indicators: [{ id: "8.b.1", description: "Existence of a developed and operationalized national strategy for youth employment, as a distinct strategy or as part of a national employment strategy" }]
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
                description: "Develop quality, reliable, sustainable and resilient infrastructure, including regional and transborder infrastructure, to support economic development and human well‑being, with a focus on affordable and equitable access for all",
                indicators: [
                    { id: "9.1.1", description: "Proportion of the rural population who live within 2 km of an all-season road" },
                    { id: "9.1.2", description: "Passenger and freight volumes, by mode of transport" }
                ]
            },
            {
                id: "9.2",
                description: "Promote inclusive and sustainable industrialization and, by 2030, significantly raise industry’s share of employment and gross domestic product, in line with national circumstances, and double its share in least developed countries",
                indicators: [
                    { id: "9.2.1", description: "Manufacturing value added as a proportion of GDP and per capita" },
                    { id: "9.2.2", description: "Manufacturing employment as a proportion of total employment" }
                ]
            },
            {
                id: "9.3",
                description: "Increase the access of small-scale industrial and other enterprises, in particular in developing countries, to financial services, including affordable credit, and their integration into value chains and markets",
                indicators: [
                    { id: "9.3.1", description: "Proportion of small-scale industries in total industry value added, based on (a) international classification and (b) national classifications" },
                    { id: "9.3.2", description: "Proportion of small-scale industries with a loan or line of credit" }
                ]
            },
            {
                id: "9.4",
                description: "By 2030, upgrade infrastructure and retrofit industries to make them sustainable, with increased resource‑use efficiency and greater adoption of clean and environmentally sound technologies and industrial processes, with all countries taking action in accordance with their respective capabilities",
                indicators: [{ id: "9.4.1", description: "CO₂ emission per unit of value added" }]
            },
            {
                id: "9.5",
                description: "Enhance scientific research, upgrade the technological capabilities of industrial sectors in all countries, in particular developing countries, including, by 2030, encouraging innovation and substantially increasing the number of research and development workers per 1 million people and public and private research and development spending",
                indicators: [
                    { id: "9.5.1", description: "Research and development expenditure as a proportion of GDP" },
                    { id: "9.5.2", description: "Researchers (in full-time equivalent) per million inhabitants" }
                ]
            },
            {
                id: "9.a",
                description: "Facilitate sustainable and resilient infrastructure development in developing countries through enhanced financial, technological and technical support to African countries, least developed countries, landlocked developing countries and small island developing States",
                indicators: [{ id: "9.a.1", description: "Total official international support (official development assistance plus other official flows) to infrastructure" }]
            },
            {
                id: "9.b",
                description: "Support domestic technology development, research and innovation in developing countries, including by ensuring a conducive policy environment for, inter alia, industrial diversification and value addition to commodities",
                indicators: [{ id: "9.b.1", description: "Proportion of medium and high-tech industry value added in total value added" }]
            },
            {
                id: "9.c",
                description: "Significantly increase access to information and communications technology and strive to provide universal and affordable access to the Internet in least developed countries by 2020",
                indicators: [{ id: "9.c.1", description: "Proportion of population covered by a mobile network, by technology" }]
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
                description: "By 2030, progressively achieve and sustain income growth of the bottom 40 per cent of the population at a rate higher than the national average",
                indicators: [{ id: "10.1.1", description: "Growth rates of household expenditure or income per capita among the bottom 40 per cent of the population and the total population" }]
            },
            {
                id: "10.2",
                description: "By 2030, empower and promote the social, economic and political inclusion of all, irrespective of age, sex, disability, race, ethnicity, origin, religion or economic or other status",
                indicators: [{ id: "10.2.1", description: "Proportion of people living below 50 per cent of median income, by sex, age and persons with disabilities" }]
            },
            {
                id: "10.3",
                description: "Ensure equal opportunity and reduce inequalities of outcome, including by eliminating discriminatory laws, policies and practices and promoting appropriate legislation, policies and action in this regard",
                indicators: [{ id: "10.3.1", description: "Proportion of population reporting having personally felt discriminated against or harassed in the previous 12 months on the basis of a ground of discrimination prohibited under international human rights law" }]
            },
            {
                id: "10.4",
                description: "Adopt policies, especially fiscal, wage and social protection policies, and progressively achieve greater equality",
                indicators: [
                    { id: "10.4.1", description: "Labour share of GDP" },
                    { id: "10.4.2", description: "Redistributive impact of fiscal policy on the Gini index" }
                ]
            },
            {
                id: "10.5",
                description: "Improve the regulation and monitoring of global financial markets and institutions and strengthen the implementation of such regulations",
                indicators: [{ id: "10.5.1", description: "Financial Soundness Indicators" }]
            },
            {
                id: "10.6",
                description: "Ensure enhanced representation and voice for developing countries in decision-making in global international economic and financial institutions in order to deliver more effective, credible, accountable and legitimate institutions",
                indicators: [{ id: "10.6.1", description: "Proportion of members and voting rights of developing countries in international organizations" }]
            },
            {
                id: "10.7",
                description: "Facilitate orderly, safe, regular and responsible migration and mobility of people, including through the implementation of planned and well‑managed migration policies",
                indicators: [
                    { id: "10.7.1", description: "Recruitment cost borne by employee as a proportion of monthly income earned in country of destination" },
                    { id: "10.7.2", description: "Proportion of countries with migration policies that facilitate orderly, safe, regular and responsible migration and mobility of people" },
                    { id: "10.7.3", description: "Number of people who died or disappeared in the process of migration towards an international destination" },
                    { id: "10.7.4", description: "Proportion of the population who are refugees, by country of origin" }
                ]
            },
            {
                id: "10.a",
                description: "Implement the principle of special and differential treatment for developing countries, in particular least developed countries, in accordance with World Trade Organization agreements",
                indicators: [{ id: "10.a.1", description: "Proportion of tariff lines applied to imports from least developed countries and developing countries with zero-tariff" }]
            },
            {
                id: "10.b",
                description: "Encourage official development assistance and financial flows, including foreign direct investment, to States where the need is greatest, in particular least developed countries, African countries, small island developing States and landlocked developing countries, in accordance with their national plans and programmes",
                indicators: [{ id: "10.b.1", description: "Total resource flows for development (e.g. official development assistance, foreign direct investment and other flows)" }]
            },
            {
                id: "10.c",
                description: "By 2030, reduce to less than 3 per cent the transaction costs of migrant remittances and eliminate remittance corridors with costs higher than 5 per cent",
                indicators: [{ id: "10.c.1", description: "Remittance costs as a proportion of the amount remitted" }]
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
                description: "By 2030, ensure access for all to adequate, safe and affordable housing and basic services and upgrade slums",
                indicators: [{ id: "11.1.1", description: "Proportion of urban population living in slums, informal settlements or inadequate housing" }]
            },
            {
                id: "11.2",
                description: "By 2030, provide access to safe, affordable, accessible and sustainable transport systems for all, improving road safety, notably by expanding public transport, with special attention to the needs of those in vulnerable situations, women, children, persons with disabilities and older persons",
                indicators: [{ id: "11.2.1", description: "Proportion of population that has convenient access to public transport, by sex, age and persons with disabilities" }]
            },
            {
                id: "11.3",
                description: "By 2030, enhance inclusive and sustainable urbanization and capacity for participatory, integrated and sustainable human settlement planning and management in all countries",
                indicators: [
                    { id: "11.3.1", description: "Ratio of land consumption rate to population growth rate" },
                    { id: "11.3.2", description: "Proportion of cities with a direct participation structure of civil society in urban planning and management that operate regularly and democratically" }
                ]
            },
            {
                id: "11.4",
                description: "Strengthen efforts to protect and safeguard the world’s cultural and natural heritage",
                indicators: [{ id: "11.4.1", description: "Total per capita expenditure on the preservation, protection and conservation of all cultural and natural heritage, by source of funding (public, private), type of heritage (cultural, natural) and level of government (national, regional, and local/municipal)" }]
            },
            {
                id: "11.5",
                description: "By 2030, significantly reduce the number of deaths and the number of people affected and substantially decrease the direct economic losses relative to global gross domestic product caused by disasters, including water‑related disasters, with a focus on protecting the poor and people in vulnerable situations",
                indicators: [
                    { id: "11.5.1", description: "Number of deaths, missing persons and directly affected persons attributed to disasters per 100,000 population" },
                    { id: "11.5.2", description: "Direct economic loss attributed to disasters in relation to global gross domestic product (GDP)" },
                    { id: "11.5.3", description: "(a) Damage to critical infrastructure and (b) number of disruptions to basic services, attributed to disasters" }
                ]
            },
            {
                id: "11.6",
                description: "By 2030, reduce the adverse per capita environmental impact of cities, including by paying special attention to air quality and municipal and other waste management",
                indicators: [
                    { id: "11.6.1", description: "Proportion of municipal solid waste collected and managed in controlled facilities out of total municipal waste generated, by cities" },
                    { id: "11.6.2", description: "Annual mean levels of fine particulate matter (e.g. PM2.5 and PM10) in cities (population weighted)" }
                ]
            },
            {
                id: "11.7",
                description: "By 2030, provide universal access to safe, inclusive and accessible, green and public spaces, in particular for women and children, older persons and persons with disabilities",
                indicators: [
                    { id: "11.7.1", description: "Average share of the built-up area of cities that is open space for public use for all, by sex, age and persons with disabilities" },
                    { id: "11.7.2", description: "Proportion of persons victim of non-sexual or sexual harassment, by sex, age, disability status and place of occurrence, in the previous 12 months" }
                ]
            },
            {
                id: "11.a",
                description: "Support positive economic, social and environmental links between urban, peri-urban and rural areas by strengthening national and regional development planning",
                indicators: [{ id: "11.a.1", description: "Number of countries that have national urban policies or regional development plans that (a) respond to population dynamics; (b) ensure balanced territorial development; and (c) increase local fiscal space" }]
            },
            {
                id: "11.b",
                description: "By 2020, substantially increase the number of cities and human settlements adopting and implementing integrated policies and plans towards inclusion, resource efficiency, mitigation and adaptation to climate change, resilience to disasters, and develop and implement, in line with the Sendai Framework for Disaster Risk Reduction 2015–2030, holistic disaster risk management at all levels",
                indicators: [
                    { id: "11.b.1", description: "Number of countries that adopt and implement national disaster risk reduction strategies in line with the Sendai Framework for Disaster Risk Reduction 2015–2030" },
                    { id: "11.b.2", description: "Proportion of local governments that adopt and implement local disaster risk reduction strategies in line with national disaster risk reduction strategies" }
                ]
            },
            {
                id: "11.c",
                description: "Support least developed countries, including through financial and technical assistance, in building sustainable and resilient buildings utilizing local materials",
                indicators: [{ id: "11.c.1", description: "Total official development assistance and other official flows in support of urban infrastructure or urban infrastructure projects, by sector" }]
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
                description: "Implement the 10‑Year Framework of Programmes on Sustainable Consumption and Production Patterns, all countries taking action, with developed countries taking the lead, taking into account the development and capabilities of developing countries",
                indicators: [{ id: "12.1.1", description: "Number of countries developing, adopting or implementing policy instruments aimed at supporting the shift to sustainable consumption and production" }]
            },
            {
                id: "12.2",
                description: "By 2030, achieve the sustainable management and efficient use of natural resources",
                indicators: [
                    { id: "12.2.1", description: "Material footprint, material footprint per capita, and material footprint per GDP" },
                    { id: "12.2.2", description: "Domestic material consumption, domestic material consumption per capita, and domestic material consumption per GDP" }
                ]
            },
            {
                id: "12.3",
                description: "By 2030, halve per capita global food waste at the retail and consumer levels and reduce food losses along production and supply chains, including post-harvest losses",
                indicators: [{ id: "12.3.1", description: "(a) Food loss index and (b) food waste index" }]
            },
            {
                id: "12.4",
                description: "By 2020, achieve the environmentally sound management of chemicals and all wastes throughout their life cycle, in accordance with agreed international frameworks, and significantly reduce their release to air, water and soil in order to minimize their adverse impacts on human health and the environment",
                indicators: [
                    { id: "12.4.1", description: "Number of parties to international multilateral environmental agreements on hazardous waste and other chemicals that meet their commitments and obligations in transmitting information as required by each relevant agreement" },
                    { id: "12.4.2", description: "(a) Hazardous waste generated per capita; and (b) proportion of hazardous waste treated, by type of treatment" }
                ]
            },
            {
                id: "12.5",
                description: "By 2030, substantially reduce waste generation through prevention, reduction, recycling and reuse",
                indicators: [{ id: "12.5.1", description: "National recycling rate, tons of material recycled" }]
            },
            {
                id: "12.6",
                description: "Encourage companies, especially large and transnational companies, to adopt sustainable practices and to integrate sustainability information into their reporting cycle",
                indicators: [{ id: "12.6.1", description: "Number of companies publishing sustainability reports" }]
            },
            {
                id: "12.7",
                description: "Promote public procurement practices that are sustainable, in accordance with national policies and priorities",
                indicators: [{ id: "12.7.1", description: "Number of countries implementing sustainable public procurement policies and action plans" }]
            },
            {
                id: "12.8",
                description: "By 2030, ensure that people everywhere have the relevant information and awareness for sustainable development and lifestyles in harmony with nature",
                indicators: [{ id: "12.8.1", description: "Extent to which (i) global citizenship education and (ii) education for sustainable development are mainstreamed in (a) national education policies; (b) curricula; (c) teacher education; and (d) student assessment" }]
            },
            {
                id: "12.a",
                description: "Support developing countries to strengthen their scientific and technological capacity to move towards more sustainable patterns of consumption and production",
                indicators: [{ id: "12.a.1", description: "Installed renewable energy-generating capacity in developing and developed countries (in watts per capita)" }]
            },
            {
                id: "12.b",
                description: "Develop and implement tools to monitor sustainable development impacts for sustainable tourism that creates jobs and promotes local culture and products",
                indicators: [{ id: "12.b.1", description: "Implementation of standard accounting tools to monitor the economic and environmental aspects of tourism sustainability" }]
            },
            {
                id: "12.c",
                description: "Rationalize inefficient fossil-fuel subsidies that encourage wasteful consumption by removing market distortions, in accordance with national circumstances, including by restructuring taxation and phasing out those harmful subsidies, where they exist, to reflect their environmental impacts, taking fully into account the specific needs and conditions of developing countries and minimizing the possible adverse impacts on their development in a manner that protects the poor and the affected communities",
                indicators: [{ id: "12.c.1", description: "Amount of fossil-fuel subsidies (production and consumption) per unit of GDP" }]
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
                description: "Strengthen resilience and adaptive capacity to climate-related hazards and natural disasters in all countries",
                indicators: [
                    { id: "13.1.1", description: "Number of deaths, missing persons and directly affected persons attributed to disasters per 100,000 population" },
                    { id: "13.1.2", description: "Number of countries that adopt and implement national disaster risk reduction strategies in line with the Sendai Framework for Disaster Risk Reduction 2015–2030" },
                    { id: "13.1.3", description: "Proportion of local governments that adopt and implement local disaster risk reduction strategies in line with national disaster risk reduction strategies" }
                ]
            },
            {
                id: "13.2",
                description: "Integrate climate change measures into national policies, strategies and planning",
                indicators: [
                    { id: "13.2.1", description: "Number of countries with nationally determined contributions, long-term strategies, national adaptation plans and adaptation communications, as reported to the secretariat of the United Nations Framework Convention on Climate Change" },
                    { id: "13.2.2", description: "Total greenhouse gas emissions per year" }
                ]
            },
            {
                id: "13.3",
                description: "Improve education, awareness-raising and human and institutional capacity on climate change mitigation, adaptation, impact reduction and early warning",
                indicators: [{ id: "13.3.1", description: "Extent to which (i) global citizenship education and (ii) education for sustainable development are mainstreamed in (a) national education policies; (b) curricula; (c) teacher education; and (d) student assessment" }]
            },
            {
                id: "13.a",
                description: "Implement the commitment undertaken by developed-country parties to the United Nations Framework Convention on Climate Change to a goal of mobilizing jointly $100 billion annually by 2020 from all sources to address the needs of developing countries in the context of meaningful mitigation actions and transparency on implementation and fully operationalize the Green Climate Fund through its capitalization as soon as possible",
                indicators: [{ id: "13.a.1", description: "Amounts provided and mobilized in United States dollars per year in relation to the continued existing collective mobilization goal of the $100 billion commitment through to 2025" }]
            },
            {
                id: "13.b",
                description: "Promote mechanisms for raising capacity for effective climate change-related planning and management in least developed countries and small island developing States, including focusing on women, youth and local and marginalized communities",
                indicators: [{ id: "13.b.1", description: "Number of least developed countries and small island developing States with nationally determined contributions, long-term strategies, national adaptation plans and adaptation communications, as reported to the secretariat of the United Nations Framework Convention on Climate Change" }]
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
                description: "By 2025, prevent and significantly reduce marine pollution of all kinds, in particular from land-based activities, including marine debris and nutrient pollution",
                indicators: [{ id: "14.1.1", description: "(a) Index of coastal eutrophication; and (b) plastic debris density" }]
            },
            {
                id: "14.2",
                description: "By 2020, sustainably manage and protect marine and coastal ecosystems to avoid significant adverse impacts, including by strengthening their resilience, and take action for their restoration in order to achieve healthy and productive oceans",
                indicators: [{ id: "14.2.1", description: "Number of countries using ecosystem-based approaches to managing marine areas" }]
            },
            {
                id: "14.3",
                description: "Minimize and address the impacts of ocean acidification, including through enhanced scientific cooperation at all levels",
                indicators: [{ id: "14.3.1", description: "Average marine acidity (pH) measured at agreed suite of representative sampling stations" }]
            },
            {
                id: "14.4",
                description: "By 2020, effectively regulate harvesting and end overfishing, illegal, unreported and unregulated fishing and destructive fishing practices and implement science‑based management plans, in order to restore fish stocks in the shortest time feasible, at least to levels that can produce maximum sustainable yield as determined by their biological characteristics",
                indicators: [{ id: "14.4.1", description: "Proportion of fish stocks within biologically sustainable levels" }]
            },
            {
                id: "14.5",
                description: "By 2020, conserve at least 10 per cent of coastal and marine areas, consistent with national and international law and based on the best available scientific information",
                indicators: [{ id: "14.5.1", description: "Coverage of protected areas in relation to marine areas" }]
            },
            {
                id: "14.6",
                description: "By 2020, prohibit certain forms of fisheries subsidies which contribute to overcapacity and overfishing, eliminate subsidies that contribute to illegal, unreported and unregulated fishing and refrain from introducing new such subsidies, recognizing that appropriate and effective special and differential treatment for developing and least developed countries should be an integral part of the World Trade Organization fisheries subsidies negotiation",
                indicators: [{ id: "14.6.1", description: "Degree of implementation of international instruments aiming to combat illegal, unreported and unregulated fishing" }]
            },
            {
                id: "14.7",
                description: "By 2030, increase the economic benefits to small island developing States and least developed countries from the sustainable use of marine resources, including through sustainable management of fisheries, aquaculture and tourism",
                indicators: [{ id: "14.7.1", description: "Sustainable fisheries as a proportion of GDP in small island developing States, least developed countries and all countries" }]
            },
            {
                id: "14.a",
                description: "Increase scientific knowledge, develop research capacity and transfer marine technology, taking into account the Intergovernmental Oceanographic Commission Criteria and Guidelines on the Transfer of Marine Technology, in order to improve ocean health and to enhance the contribution of marine biodiversity to the development of developing countries, in particular small island developing States and least developed countries",
                indicators: [{ id: "14.a.1", description: "Proportion of total research budget allocated to research in the field of marine technology" }]
            },
            {
                id: "14.b",
                description: "Provide access for small-scale artisanal fishers to marine resources and markets",
                indicators: [{ id: "14.b.1", description: "Degree of application of a legal/regulatory/policy/institutional framework which recognizes and protects access rights for small-scale fisheries" }]
            },
            {
                id: "14.c",
                description: "Enhance the conservation and sustainable use of oceans and their resources by implementing international law as reflected in the United Nations Convention on the Law of the Sea, which provides the legal framework for the conservation and sustainable use of oceans and their resources, as recalled in paragraph 158 of “The future we want”",
                indicators: [{ id: "14.c.1", description: "Number of countries making progress in ratifying, accepting and implementing through legal, policy and institutional frameworks, ocean‑related instruments that implement international law, as reflected in the United Nations Convention on the Law of the Sea, for the conservation and sustainable use of the oceans and their resources" }]
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
                description: "By 2020, ensure the conservation, restoration and sustainable use of terrestrial and inland freshwater ecosystems and their services, in particular forests, wetlands, mountains and drylands, in line with obligations under international agreements",
                indicators: [
                    { id: "15.1.1", description: "Forest area as a proportion of total land area" },
                    { id: "15.1.2", description: "Proportion of important sites for terrestrial and freshwater biodiversity that are covered by protected areas, by ecosystem type" }
                ]
            },
            {
                id: "15.2",
                description: "By 2020, promote the implementation of sustainable management of all types of forests, halt deforestation, restore degraded forests and substantially increase afforestation and reforestation globally",
                indicators: [{ id: "15.2.1", description: "Progress towards sustainable forest management" }]
            },
            {
                id: "15.3",
                description: "By 2030, combat desertification, restore degraded land and soil, including land affected by desertification, drought and floods, and strive to achieve a land degradation-neutral world",
                indicators: [{ id: "15.3.1", description: "Proportion of land that is degraded over total land area" }]
            },
            {
                id: "15.4",
                description: "By 2030, ensure the conservation of mountain ecosystems, including their biodiversity, in order to enhance their capacity to provide benefits that are essential for sustainable development",
                indicators: [
                    { id: "15.4.1", description: "Coverage by protected areas of important sites for mountain biodiversity" },
                    { id: "15.4.2", description: "(a) Mountain Green Cover Index and (b) proportion of degraded mountain land" }
                ]
            },
            {
                id: "15.5",
                description: "Take urgent and significant action to reduce the degradation of natural habitats, halt the loss of biodiversity and, by 2020, protect and prevent the extinction of threatened species",
                indicators: [{ id: "15.5.1", description: "Red List Index" }]
            },
            {
                id: "15.6",
                description: "Promote fair and equitable sharing of the benefits arising from the utilization of genetic resources and promote appropriate access to such resources, as internationally agreed",
                indicators: [{ id: "15.6.1", description: "Number of countries that have adopted legislative, administrative and policy frameworks to ensure fair and equitable sharing of benefits" }]
            },
            {
                id: "15.7",
                description: "Take urgent action to end poaching and trafficking of protected species of flora and fauna and address both demand and supply of illegal wildlife products",
                indicators: [{ id: "15.7.1", description: "Proportion of traded wildlife that was poached or illicitly trafficked" }]
            },
            {
                id: "15.8",
                description: "By 2020, introduce measures to prevent the introduction and significantly reduce the impact of invasive alien species on land and water ecosystems and control or eradicate the priority species",
                indicators: [{ id: "15.8.1", description: "Proportion of countries adopting relevant national legislation and adequately resourcing the prevention or control of invasive alien species" }]
            },
            {
                id: "15.9",
                description: "By 2020, integrate ecosystem and biodiversity values into national and local planning, development processes, poverty reduction strategies and accounts",
                indicators: [{ id: "15.9.1", description: "(a) Number of countries that have established national targets in accordance with or similar to Kunming–Montreal Global Biodiversity Framework Target 14 in their national biodiversity strategy and action plans and the progress reported towards these targets; and (b) integration of biodiversity into national accounting and reporting systems, defined as implementation of the System of Environmental-Economic Accounting" }]
            },
            {
                id: "15.a",
                description: "Mobilize and significantly increase financial resources from all sources to conserve and sustainably use biodiversity and ecosystems",
                indicators: [{ id: "15.a.1", description: "(a) Official development assistance on conservation and sustainable use of biodiversity; and (b) revenue generated and finance mobilized from biodiversity-relevant economic instruments" }]
            },
            {
                id: "15.b",
                description: "Mobilize significant resources from all sources and at all levels to finance sustainable forest management and provide adequate incentives to developing countries to advance such management, including for conservation and reforestation",
                indicators: [{ id: "15.b.1", description: "(a) Official development assistance on conservation and sustainable use of biodiversity; and (b) revenue generated and finance mobilized from biodiversity-relevant economic instruments" }]
            },
            {
                id: "15.c",
                description: "Enhance global support for efforts to combat poaching and trafficking of protected species, including by increasing the capacity of local communities to pursue sustainable livelihood opportunities",
                indicators: [{ id: "15.c.1", description: "Proportion of traded wildlife that was poached or illicitly trafficked" }]
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
                description: "Significantly reduce all forms of violence and related death rates everywhere",
                indicators: [
                    { id: "16.1.1", description: "Number of victims of intentional homicide per 100,000 population, by sex and age" },
                    { id: "16.1.2", description: "Conflict-related deaths per 100,000 population, by sex, age and cause" },
                    { id: "16.1.3", description: "Proportion of population subjected to (a) physical violence, (b) psychological violence and/or (c) sexual violence in the previous 12 months" },
                    { id: "16.1.4", description: "Proportion of population that feel safe walking alone around the area they live after dark" }
                ]
            },
            {
                id: "16.2",
                description: "End abuse, exploitation, trafficking and all forms of violence against and torture of children",
                indicators: [
                    { id: "16.2.1", description: "Proportion of children aged 1–17 years who experienced any physical punishment and/or psychological aggression by caregivers in the past month" },
                    { id: "16.2.2", description: "Number of victims of human trafficking per 100,000 population, by sex, age and form of exploitation" },
                    { id: "16.2.3", description: "Proportion of young women and men aged 18–29 years who experienced sexual violence by age 18" }
                ]
            },
            {
                id: "16.3",
                description: "Promote the rule of law at the national and international levels and ensure equal access to justice for all",
                indicators: [
                    { id: "16.3.1", description: "Proportion of victims of (a) physical, (b) psychological and/or (c) sexual violence in the previous 12 months who reported their victimization to competent authorities or other officially recognized conflict resolution mechanisms" },
                    { id: "16.3.2", description: "Unsentenced detainees as a proportion of overall prison population" },
                    { id: "16.3.3", description: "Proportion of the population who have experienced a dispute in the past two years and who accessed a formal or informal dispute resolution mechanism, by type of mechanism" }
                ]
            },
            {
                id: "16.4",
                description: "By 2030, significantly reduce illicit financial and arms flows, strengthen the recovery and return of stolen assets and combat all forms of organized crime",
                indicators: [
                    { id: "16.4.1", description: "Total value of inward and outward illicit financial flows (in current United States dollars)" },
                    { id: "16.4.2", description: "Proportion of seized, found or surrendered arms whose illicit origin or context has been traced or established by a competent authority in line with international instruments" }
                ]
            },
            {
                id: "16.5",
                description: "Substantially reduce corruption and bribery in all their forms",
                indicators: [
                    { id: "16.5.1", description: "Proportion of persons who had at least one contact with a public official and who paid a bribe to a public official, or were asked for a bribe by those public officials, during the previous 12 months" },
                    { id: "16.5.2", description: "Proportion of businesses that had at least one contact with a public official and that paid a bribe to a public official, or were asked for a bribe by those public officials during the previous 12 months" }
                ]
            },
            {
                id: "16.6",
                description: "Develop effective, accountable and transparent institutions at all levels",
                indicators: [
                    { id: "16.6.1", description: "Primary government expenditures as a proportion of original approved budget, by sector (or by budget codes or similar)" },
                    { id: "16.6.2", description: "Proportion of population satisfied with their last experience of public services" }
                ]
            },
            {
                id: "16.7",
                description: "Ensure responsive, inclusive, participatory and representative decision-making at all levels",
                indicators: [
                    { id: "16.7.1", description: "Proportions of positions in national and local institutions, including (a) the legislatures; (b) the public service; and (c) the judiciary, compared to national distributions, by sex, age, persons with disabilities and population groups" },
                    { id: "16.7.2", description: "Proportion of population who believe decision-making is inclusive and responsive, by sex, age, disability and population group" }
                ]
            },
            {
                id: "16.8",
                description: "Broaden and strengthen the participation of developing countries in the institutions of global governance",
                indicators: [{ id: "16.8.1", description: "Proportion of members and voting rights of developing countries in international organizations" }]
            },
            {
                id: "16.9",
                description: "By 2030, provide legal identity for all, including birth registration",
                indicators: [{ id: "16.9.1", description: "Proportion of children under 5 years of age whose births have been registered with a civil authority, by age" }]
            },
            {
                id: "16.10",
                description: "Ensure public access to information and protect fundamental freedoms, in accordance with national legislation and international agreements",
                indicators: [
                    { id: "16.10.1", description: "Number of verified cases of killing, kidnapping, enforced disappearance, arbitrary detention and torture of journalists, associated media personnel, trade unionists and human rights advocates in the previous 12 months" },
                    { id: "16.10.2", description: "Number of countries that adopt and implement constitutional, statutory and/or policy guarantees for public access to information" }
                ]
            },
            {
                id: "16.a",
                description: "Strengthen relevant national institutions, including through international cooperation, for building capacity at all levels, in particular in developing countries, to prevent violence and combat terrorism and crime",
                indicators: [{ id: "16.a.1", description: "Existence of independent national human rights institutions in compliance with the Paris Principles" }]
            },
            {
                id: "16.b",
                description: "Promote and enforce non-discriminatory laws and policies for sustainable development",
                indicators: [{ id: "16.b.1", description: "Proportion of population reporting having personally felt discriminated against or harassed in the previous 12 months on the basis of a ground of discrimination prohibited under international human rights law" }]
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
                description: "Strengthen domestic resource mobilization, including through international support to developing countries, to improve domestic capacity for tax and other revenue collection",
                indicators: [
                    { id: "17.1.1", description: "Total government revenue as a proportion of GDP, by source" },
                    { id: "17.1.2", description: "Proportion of domestic budget funded by domestic taxes" }
                ]
            },
            {
                id: "17.2",
                description: "Developed countries to implement fully their official development assistance commitments, including the commitment by many developed countries to achieve the target of 0.7 per cent of gross national income for official development assistance (ODA/GNI) to developing countries and 0.15 to 0.20 per cent of ODA/GNI to least developed countries; ODA providers are encouraged to consider setting a target to provide at least 0.20 per cent of ODA/GNI to least developed countries",
                indicators: [{ id: "17.2.1", description: "Net official development assistance, total and to least developed countries, as a proportion of the OECD Development Assistance Committee donors’ gross national income (GNI)" }]
            },
            {
                id: "17.3",
                description: "Mobilize additional financial resources for developing countries from multiple sources",
                indicators: [
                    { id: "17.3.1", description: "Additional financial resources mobilized for developing countries from multiple sources" },
                    { id: "17.3.2", description: "Volume of remittances (in United States dollars) as a proportion of total GDP" }
                ]
            },
            {
                id: "17.4",
                description: "Assist developing countries in attaining long-term debt sustainability through coordinated policies aimed at fostering debt financing, debt relief and debt restructuring, as appropriate, and address the external debt of highly indebted poor countries to reduce debt distress",
                indicators: [{ id: "17.4.1", description: "Debt service as a proportion of exports of goods, services and primary income" }]
            },
            {
                id: "17.5",
                description: "Adopt and implement investment promotion regimes for least developed countries",
                indicators: [{ id: "17.5.1", description: "Number of countries that adopt and implement investment promotion regimes for developing countries, including the least developed countries" }]
            },
            {
                id: "17.6",
                description: "Enhance North–South, South–South and triangular regional and international cooperation on and access to science, technology and innovation and enhance knowledge‑sharing on mutually agreed terms, including through improved coordination among existing mechanisms, in particular at the United Nations level, and through a global technology facilitation mechanism",
                indicators: [{ id: "17.6.1", description: "Fixed broadband subscriptions per 100 inhabitants, by speed" }]
            },
            {
                id: "17.7",
                description: "Promote the development, transfer, dissemination and diffusion of environmentally sound technologies to developing countries on favourable terms, including on concessional and preferential terms, as mutually agreed",
                indicators: [{ id: "17.7.1", description: "Total amount of funding for developing and developed countries to promote the development, transfer, dissemination and diffusion of environmentally sound technologies" }]
            },
            {
                id: "17.8",
                description: "Fully operationalize the technology bank and science, technology and innovation capacity-building mechanism for least developed countries by 2017 and enhance the use of enabling technology, in particular information and communications technology",
                indicators: [{ id: "17.8.1", description: "Proportion of individuals using the Internet" }]
            },
            {
                id: "17.9",
                description: "Enhance international support for implementing effective and targeted capacity-building in developing countries to support national plans to implement all the Sustainable Development Goals, including through North–South, South–South and triangular cooperation",
                indicators: [{ id: "17.9.1", description: "Dollar value of official development assistance committed to developing countries" }]
            },
            {
                id: "17.10",
                description: "Promote a universal, rules-based, open, non‑discriminatory and equitable multilateral trading system under the World Trade Organization, including through the conclusion of negotiations under the Doha Development Agenda",
                indicators: [{ id: "17.10.1", description: "Worldwide weighted tariff-average" }]
            },
            {
                id: "17.a",
                description: "Strengthen the global partnership for sustainable development, complemented by multi-stakeholder partnerships that mobilize and share knowledge, expertise, technology and financial resources, to support the achievement of the Sustainable Development Goals in all countries, in particular developing countries",
                indicators: [{ id: "17.a.1", description: "Amount in United States dollars committed to public–private partnerships for infrastructure" }]
            },
            {
                id: "17.11",
                description: "Significantly increase the exports of developing countries, in particular with a view to doubling the least developed countries’ share of global exports by 2020",
                indicators: [{ id: "17.11.1", description: "Developing countries’ and least developed countries’ share of global exports" }]
            },
            {
                id: "17.12",
                description: "Realize timely implementation of duty-free and quota-free market access on a lasting basis for all least developed countries, consistent with World Trade Organization decisions, including by ensuring that preferential rules of origin applicable to imports from least developed countries are transparent and simple, and contribute to facilitating market access",
                indicators: [{ id: "17.12.1", description: "Weighted average tariffs faced by developing countries, least developed countries and small island developing States" }]
            },
            {
                id: "17.13",
                description: "Enhance global macroeconomic stability, including through policy coordination and policy coherence",
                indicators: [{ id: "17.13.1", description: "Macroeconomic Dashboard" }]
            },
            {
                id: "17.14",
                description: "Enhance policy coherence for sustainable development",
                indicators: [{ id: "17.14.1", description: "Number of countries with mechanisms in place to enhance policy coherence of sustainable development" }]
            },
            {
                id: "17.15",
                description: "Respect each country’s policy space and leadership to establish and implement policies for poverty eradication and sustainable development",
                indicators: [{ id: "17.15.1", description: "Extent of use of country-owned results frameworks and planning tools by providers of development cooperation" }]
            },
            {
                id: "17.16",
                description: "Enhance the Global Partnership for Sustainable Development, complemented by multi-stakeholder partnerships that mobilize and share knowledge, expertise, technology and financial resources, to support the achievement of the Sustainable Development Goals in all countries, in particular developing countries",
                indicators: [{ id: "17.16.1", description: "Number of countries reporting progress in multi-stakeholder development effectiveness monitoring frameworks that support the achievement of the Sustainable Development Goals" }]
            },
            {
                id: "17.17",
                description: "Encourage and promote effective public, public–private and civil society partnerships, building on the experience and resourcing strategies of partnerships",
                indicators: [{ id: "17.17.1", description: "Amount in United States dollars committed to public–private partnerships for infrastructure" }]
            },
            {
                id: "17.18",
                description: "By 2020, enhance capacity-building support to developing countries, including for least developed countries and small island developing States, to increase significantly the availability of high-quality, timely and reliable data disaggregated by income, gender, age, race, ethnicity, migratory status, disability, geographic location and other characteristics relevant in national contexts",
                indicators: [
                    { id: "17.18.1", description: "Statistical capacity indicators for Sustainable Development Goal monitoring" },
                    { id: "17.18.2", description: "Number of countries that have national statistical legislation that complies with the Fundamental Principles of Official Statistics" },
                    { id: "17.18.3", description: "Number of countries with a national statistical plan that is fully funded and under implementation, by source of funding" }
                ]
            },
            {
                id: "17.19",
                description: "By 2030, build on existing initiatives to develop measurements of progress on sustainable development that complement gross domestic product, and support statistical capacity-building in developing countries",
                indicators: [
                    { id: "17.19.1", description: "Dollar value of all resources made available to strengthen statistical capacity in developing countries" },
                    { id: "17.19.2", description: "Proportion of countries that (a) have conducted at least one population and housing census in the last 10 years; and (b) have achieved 100 per cent birth registration and 80 per cent death registration" }
                ]
            }
        ]
    },
];
