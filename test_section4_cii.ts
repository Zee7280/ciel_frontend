
import { calculateSection4CII, Section4CIIInput } from './src/utils/reportQuality';

const testCases: { name: string; input: Section4CIIInput; expectedQuality: string }[] = [
    {
        name: "Minimal Implementation",
        input: {
            activities: [{ type: 'Awareness Session', delivery_mode: 'In-person', sessions: 1 }],
            outputs: [{ type: 'People reached', count: 5 }],
            primary_change_area: 'Health & Wellbeing',
            beneficiary_categories: ['Youth (18–29)'],
            total_beneficiaries: 5,
            total_sessions: 1,
            isTeam: false,
            engagementProfile: {
                totalVerifiedStudentHours: 2,
                numContributors: 1,
                avgHoursPerContributor: 2
            },
            section3Intent: "I plan to raise awareness about health."
        },
        expectedQuality: "Minimal"
    },
    {
        name: "Strong Implementation",
        input: {
            activities: [
                { type: 'Training / Workshop', delivery_mode: 'In-person', sessions: 4 },
                { type: 'Service Delivery', delivery_mode: 'Field-based', sessions: 4 }
            ],
            outputs: [
                { type: 'People trained', count: 50 },
                { type: 'Services delivered', count: 100 },
                { type: 'People reached', count: 200 }
            ],
            primary_change_area: 'Education & Skills',
            beneficiary_categories: ['Rural Communities', 'Women'],
            total_beneficiaries: 200,
            total_sessions: 8,
            isTeam: true,
            team_contributions: [
                { member_id: '1', name: 'Alice', role: 'Lead', hours: 20, sessions: 8, beneficiaries: 100 },
                { member_id: '2', name: 'Bob', role: 'Support', hours: 20, sessions: 8, beneficiaries: 100 }
            ],
            engagementProfile: {
                totalVerifiedStudentHours: 40,
                numContributors: 2,
                avgHoursPerContributor: 20
            },
            section3Intent: "Providing training and delivery services for education and skills enhancement."
        },
        expectedQuality: "Highly Structured"
    }
];

testCases.forEach(tc => {
    console.log(`Running test case: ${tc.name}`);
    const result = calculateSection4CII(tc.input);
    console.log(`Final Score: ${result.finalScore}`);
    console.log(`Quality Level: ${result.qualityLevel}`);
    console.log(`Justification Length: ${result.justification.split(' ').length} words`);
    console.log(`Justification: ${result.justification}`);
    console.log('-'.repeat(30));
});
