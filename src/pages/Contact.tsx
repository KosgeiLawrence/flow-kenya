import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Recycle, Mail, Phone, MapPin, Send, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Footer } from "@/components/CTASection";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const contactInfo = [
  { icon: Mail, label: "Email", value: "hello@duaraflow.co.ke", href: "mailto:hello@duaraflow.co.ke", description: "Send us an email anytime" },
  { icon: Phone, label: "Phone", value: "+254 741 027 140", href: "tel:+254741027140", description: "Mon-Fri, 8am to 6pm EAT" },
  { icon: MapPin, label: "Office", value: "Nairobi, Kenya", href: null, description: "Visit our headquarters" },
];

const Contact = () => {
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const { error } = await supabase.from("contact_messages").insert({
      full_name: formData.get("name") as string,
      email: formData.get("email") as string,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
    });
    setSending(false);
    if (error) { toast.error("Failed to send message. Please try again."); }
    else { toast.success("Message sent! We'll get back to you shortly."); form.reset(); }
  };

  return (
    <div className="min-h-screen bg-mesh">
      {/* Header */}
      <header className="border-b border-border/50 glass-strong sticky top-0 z-30">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary transition-all duration-300 group-hover:scale-110">
              <Recycle className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">Duara Flow</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
          </Button>
        </div>
      </header>

      <main className="container max-w-6xl py-16 md:py-24 px-4">
        {/* Hero heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-6">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">We'd love to hear from you</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Get in Touch
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            Have questions about Duara Flow? Reach out and our team will respond within 24 hours.
          </p>
        </motion.div>

        {/* Contact cards row */}
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          {contactInfo.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
              className="glass-card rounded-2xl p-6 text-center group hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex h-12 w-12 mx-auto mb-4 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">{item.label}</p>
              {item.href ? (
                <a href={item.href} className="text-foreground font-semibold hover:text-primary transition-smooth block mb-1">
                  {item.value}
                </a>
              ) : (
                <p className="text-foreground font-semibold mb-1">{item.value}</p>
              )}
              <p className="text-xs text-muted-foreground/70">{item.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Form section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <div className="glass-card rounded-2xl p-8 md:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Send className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Send us a message</h2>
                <p className="text-sm text-muted-foreground">Fill out the form below and we'll get back to you</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" placeholder="Jane Wanjiku" required className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" name="email" type="email" placeholder="jane@example.com" required className="h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" placeholder="How can we help?" required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" placeholder="Tell us more about your inquiry..." rows={5} required className="resize-none" />
              </div>
              <Button type="submit" className="w-full h-12 text-base font-medium" disabled={sending}>
                {sending ? "Sending…" : <><Send className="mr-2 h-4 w-4" /> Send Message</>}
              </Button>
            </form>

            <div className="flex items-center justify-center gap-2 mt-6 pt-5 border-t border-border/50">
              <Clock className="h-4 w-4 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground/70">We typically respond within 24 hours</p>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
