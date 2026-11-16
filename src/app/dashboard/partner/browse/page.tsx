import ExploreOpportunitiesView from "@/components/opportunities/ExploreOpportunitiesView";

/** Browse Opportunities inside the dashboard: the published Community Service list, view only. */
export default function DashboardBrowseOpportunitiesPage() {
    return (
        <div className="mx-auto max-w-[1600px]">
            <ExploreOpportunitiesView variant="dashboard" />
        </div>
    );
}
