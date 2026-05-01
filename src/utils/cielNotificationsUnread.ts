/** Dispatched on `window` when dashboard chrome learns the unread inbox count (student/partner/faculty). */
export const CIEL_NOTIFICATIONS_UNREAD_EVENT = "ciel_notifications_unread" as const;

export type CielNotificationsUnreadEventDetail = {
    count: number;
};

/** Updates sidebar + header badges without waiting for the poll interval. */
export function broadcastUnreadNotificationsCount(count: number) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
        new CustomEvent<CielNotificationsUnreadEventDetail>(CIEL_NOTIFICATIONS_UNREAD_EVENT, {
            detail: { count },
        }),
    );
}
