export interface DashboardStats {
    activeCourses: number;
    impactPoints: number;
    projectsCompleted: number;
    hoursVolunteered: number;
}

export interface ActiveProject {
    id: string;
    title: string;
    category: string;
    assignedAt: string;
    status: string;
    progress: number;
}

export interface Deadline {
    id: string;
    title: string;
    date: string;
    type: string;
}

export interface DashboardData {
    stats: DashboardStats;
    activeProjects: ActiveProject[];
    deadlines: Deadline[];
}
