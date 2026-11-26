import { CakePreview } from "@/components/cake-preview";

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-800 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold tracking-widest text-rose-700">CakeCanvas</p>
        <h1 className="mt-3 text-3xl font-bold">ケーキを、あなたらしく。</h1>
        <p className="mt-3 text-stone-600">チョコケーキと絞りクリームの3Dプレビュー</p>
        <CakePreview />
      </div>
    </main>
  );
}
