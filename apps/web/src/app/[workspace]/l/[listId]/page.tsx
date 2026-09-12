import { ListPage } from "@/components/lists/list-page";

export default async function Page({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  return <ListPage listId={listId} />;
}
