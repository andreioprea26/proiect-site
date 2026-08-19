import { SessionControls } from "./session-controls";

type HomePageProps = {
  searchParams: Promise<{ logout?: string | string[] }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const { logout } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-amber-50 px-6 text-stone-800">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Brand Handmade</h1>
        <p className="mt-4 text-lg text-stone-600">
          Magazinul este în pregătire.
        </p>
        {logout === "error" ? (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
            Deconectarea nu a putut fi finalizată. Încearcă din nou.
          </p>
        ) : null}
        <SessionControls />
      </div>
    </main>
  );
}
