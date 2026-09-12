import { SpacePage } from "@/components/spaces/space-page";

export default async function Page({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await params;
  return <SpacePage spaceId={spaceId} />;
}
