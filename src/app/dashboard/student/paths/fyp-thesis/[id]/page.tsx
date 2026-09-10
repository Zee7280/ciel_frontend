"use client";

import { useParams } from "next/navigation";
import FypV9Workspace from "../FypV9Workspace";

export default function FypThesisWorkspacePage() {
    const params = useParams<{ id: string }>();
    return <FypV9Workspace id={params.id} />;
}
