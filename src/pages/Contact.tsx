import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MapPin, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@duaraflow.co.ke",
    href: "mailto:hello@duaraflow.co.ke",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+254 700 123 456",
    href: "tel:+254700123456",
  },
  {
    icon: MapPin,
    label: "Office",
    value: "Nairobi Garage, Ngong Road, Nairobi, Kenya",
    href: "#",
  },
];

const Contact = () => {
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success("Message sent! We'll get back to you within 24 hours.");
      (e.target as HTMLFormElement).reset();
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-5xl py-28 md:py-36">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl mb-3">
          Get in Touch
        </h1>
        <p className="text-muted-foreground mb-14 max-w-xl">
          Have questions about Duara Flow? Want to partner with us or join the
          platform? We'd love to hear from you.
        </p>

        <div className="grid gap-12 md:grid-cols-5">
          {/* Contact form */}
          <div className="md:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Jane Wanjiku" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="jane@example.com" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="Partnership inquiry" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us how we can help..."
                  rows={6}
                  required
                />
              </div>

              <Button type="submit" disabled={sending} className="gap-2">
                {sending ? "Sending…" : "Send Message"}
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>

          {/* Contact info sidebar */}
          <div className="md:col-span-2 space-y-8">
            <div className="rounded-xl border border-border bg-card p-6 space-y-6">
              {contactInfo.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-start gap-4 group"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {item.label}
                    </p>
                    <p className="text-sm text-foreground mt-0.5">{item.value}</p>
                  </div>
                </a>
              ))}
            </div>

            <div className="rounded-xl bg-hero p-6">
              <h3 className="font-display text-lg font-semibold text-primary-foreground mb-2">
                Join the Movement
              </h3>
              <p className="text-sm text-primary-foreground/70 mb-4">
                Ready to digitize your waste value chain? Sign up today and start making an impact.
              </p>
              <Button variant="hero" size="sm" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
