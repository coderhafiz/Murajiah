import Image from "next/image";

export default function LogoPreview() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-8">
      <div className="w-full max-w-4xl aspect-square relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 flex items-center justify-center">
        <Image
          src="/logo.svg"
          alt="Murajiah Logo Full Size"
          fill
          className="object-contain p-12"
          priority
        />
      </div>
    </div>
  );
}
