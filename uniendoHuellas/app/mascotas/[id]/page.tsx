import { Suspense } from 'react';
import PetDetailClient from '@/components/PetDetailClient';
import { PETS_DATA } from '@/data/pets';

export function generateStaticParams() {
  const ids = [
    ...PETS_DATA.map((pet) => pet.id),
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
  ];
  return ids.map((id) => ({ id }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

async function PetDetailContent({ params }: PageProps) {
  const { id } = await params;
  const initialPet = PETS_DATA.find((p) => p.id === id) || PETS_DATA[0];
  return <PetDetailClient key={id} pet={initialPet} initialId={id} />;
}

export default function PetDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PetDetailContent params={params} />
    </Suspense>
  );
}
