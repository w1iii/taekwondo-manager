import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-12 relative bg-[#f2f2f2]"
      style={{
        backgroundImage:
          "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC6efS3trwhCrV5AtGG0Y4ATFcN1Fuq0KqOwW97vA-lrR1UZdn9BP4_u7JtJOIH8HOZTz6NUgky-wNKhtcIqoBXp3pGrBAjde26ujdG7ajCNtw_g1WtCc1dMI3MFZ4bx0rTk2cNtUfoT90_oq8idg-IoKwLcE6ZyPCWvSoQGam7EkVLs73zgGwR93VNj_EZXDGvA-238pj2dsAG2Y2w552zhhhGFlF4jTi-LRKCu1gsCmq05XdGnrGryzEnkozfNsaN5A')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-black/60 z-0" />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <Logo />
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
