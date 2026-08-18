import Link from "next/link";

export const metadata = { title: "Contact Us" };

const contactMethods = [
  {
    icon: "call",
    label: "Phone",
    value: "+1 (555) 123-4567",
    href: "tel:+15551234567",
  },
  {
    icon: "mail",
    label: "Email",
    value: "support@tkdarena.example",
    href: "mailto:support@tkdarena.example",
  },
];

const socials = [
  {
    icon: "facebook",
    label: "Facebook",
    value: "facebook.com/tkdarena",
    href: "https://facebook.com/tkdarena",
  },
  {
    icon: "instagram",
    label: "Instagram",
    value: "@tkdarena",
    href: "https://instagram.com/tkdarena",
  },
];

export default function ContactPage() {
  return (
    <div className="bg-[#f2f2f2] text-navy-cool min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 animate-kenburns motion-reduce:animate-none"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC6efS3trwhCrV5AtGG0Y4ATFcN1Fuq0KqOwW97vA-lrR1UZdn9BP4_u7JtJOIH8HOZTz6NUgky-wNKhtcIqoBXp3pGrBAjde26ujdG7ajCNtw_g1WtCc1dMI3MFZ4bx0rTk2cNtUfoT90_oq8idg-IoKwLcE6ZyPCWvSoQGam7EkVLs73zgGwR93VNj_EZXDGvA-238pj2dsAG2Y2w552zhhhGFlF4jTi-LRKCu1gsCmq05XdGnrGryzEnkozfNsaN5A')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      </div>
      <div className="absolute inset-0 bg-black/60 z-0" />

      <nav className="relative z-20 w-full px-6 md:px-12 py-8 flex justify-between items-center text-white">
        <div className="flex justify-between items-center w-full max-w-[1600px] mx-auto">
          <Link
            className="flex items-center gap-2 text-xl font-bold text-white tracking-tight"
            href="/"
          >
            <span className="material-symbols-outlined text-action-redwood">
              sports_martial_arts
            </span>
            TKD ARENA
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-white/80 hover:text-white transition-colors px-4 py-2"
          >
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex-grow flex items-center justify-center p-4 md:p-8 lg:p-12">
        <div className="w-full max-w-[1280px] py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-md">
              Contact Us
            </h1>
            <p className="text-lg text-surface-macadamia max-w-2xl mx-auto">
              Questions about registration, events, or billing? Reach out — our
              team is happy to help.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {contactMethods.map(({ icon, label, value, href }) => (
              <a
                key={label}
                href={href}
                className="bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-lg flex flex-col gap-4 card-hover hover:bg-white/15 hover:border-white/25 hover:shadow-2xl hover:shadow-black/30"
              >
                <div className="text-action-redwood">
                  <span className="material-symbols-outlined text-[36px]">
                    {icon}
                  </span>
                </div>
                <div>
                  <h2 className="text-white text-xl font-semibold">{label}</h2>
                  <p className="text-surface-macadamia mt-1">{value}</p>
                </div>
              </a>
            ))}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Follow us</h2>
            <div className="flex flex-wrap gap-6">
              {socials.map(({ icon, label, value, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-lg text-white hover:bg-white/15 hover:border-white/25 hover:shadow-xl hover:shadow-black/30 transition-all"
                >
                  <span className="material-symbols-outlined text-[20px] text-action-redwood">
                    {icon}
                  </span>
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-sm text-surface-macadamia">{value}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-20 w-full py-8 px-6 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-[1280px] mx-auto w-full opacity-70 hover:opacity-100 transition-opacity text-white">
          <p className="text-xs tracking-wider uppercase">
            &copy; 2026 TKD ARENA Taekwondo Systems
          </p>
          <div className="flex gap-6">
            <Link
              className="text-xs hover:text-white/80 hover:underline transition-all uppercase tracking-wider"
              href="/"
            >
              Home
            </Link>
            <Link
              className="text-xs hover:text-white/80 hover:underline transition-all uppercase tracking-wider"
              href="/contact"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
