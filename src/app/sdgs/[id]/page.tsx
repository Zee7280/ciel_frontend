import { sdgDetailedData } from '@/utils/sdgDetailedData';
import { notFound } from 'next/navigation';
import SDGClient from './SDGClient';

export default async function SDGPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const sdg = sdgDetailedData.find(s => s.id === id);

    if (!sdg) {
        notFound();
    }

    return <SDGClient sdg={sdg} />;
}

// Generate static routes for all 17 SDGs at build time
export function generateStaticParams() {
    return sdgDetailedData.map((sdg) => ({
        id: sdg.id,
    }));
}
