import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from "react-markdown";

interface NavItem {
  id: string;
  label: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface DashboardChatbotProps {
  role: string;
  navItems: NavItem[];
  onNavigate: (panelId: string) => void;
}

const DashboardChatbot = ({ role, navItems, onNavigate }: DashboardChatbotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const extractNavigation = (content: string): { cleanContent: string; panelId: string | null } => {
    const navMatch = content.match(/\[\[NAVIGATE:([^\]]+)\]\]/);
    const cleanContent = content.replace(/\[\[NAVIGATE:[^\]]+\]\]/g, "").trim();
    return { cleanContent, panelId: navMatch ? navMatch[1] : null };
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("dashboard-chat", {
        body: {
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          role,
          navItems: navItems.map((n) => ({ id: n.id, label: n.label })),
          userId: user?.id,
        },
      });

      if (error) throw error;

      const { cleanContent, panelId } = extractNavigation(data.content);

      setMessages((prev) => [...prev, { role: "assistant", content: cleanContent }]);

      if (panelId) {
        setTimeout(() => onNavigate(panelId), 800);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    "Show me my analytics",
    "How do I add an expense?",
    "Summarize my recent activity",
  ];

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center",
          "bg-primary text-primary-foreground shadow-lg",
          "hover:scale-105 active:scale-95",
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isOpen && "rotate-90"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)]",
            "h-[520px] max-h-[calc(100vh-160px)]",
            "rounded-2xl overflow-hidden flex flex-col",
            "bg-[rgba(18,18,22,0.95)] backdrop-blur-[20px]",
            "border border-[rgba(255,255,255,0.12)]",
            "shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
            "animate-in slide-in-from-bottom-4 fade-in duration-300"
          )}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.08)] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">Duara AI Assistant</h3>
              <p className="text-xs text-muted-foreground">Ask anything about your dashboard</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    Hi! I'm your Duara AI assistant. I can help you navigate your dashboard, analyze your data, and answer questions. Try asking me something!
                  </div>
                </div>
                <div className="space-y-2 pl-10">
                  {quickActions.map((action) => (
                    <button
                      key={action}
                      onClick={() => {
                        setMessages([{ role: "user", content: action }]);
                        setIsLoading(true);
                        supabase.functions.invoke("dashboard-chat", {
                          body: {
                            messages: [{ role: "user", content: action }],
                            role,
                            navItems: navItems.map((n) => ({ id: n.id, label: n.label })),
                            userId: user?.id,
                          },
                        }).then(({ data, error }) => {
                          if (error) throw error;
                          const { cleanContent, panelId } = extractNavigation(data.content);
                          setMessages((prev) => [...prev, { role: "assistant", content: cleanContent }]);
                          if (panelId) setTimeout(() => onNavigate(panelId), 800);
                        }).catch(() => {
                          setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error." }]);
                        }).finally(() => setIsLoading(false));
                      }}
                      className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-muted-foreground hover:bg-[rgba(255,255,255,0.08)] hover:text-foreground transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex items-start gap-3", msg.role === "user" && "flex-row-reverse")}>
                <div
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                    msg.role === "assistant" ? "bg-primary/20" : "bg-secondary/20"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="w-4 h-4 text-primary" />
                  ) : (
                    <User className="w-4 h-4 text-secondary" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] text-sm rounded-xl px-3.5 py-2.5 leading-relaxed",
                    msg.role === "assistant"
                      ? "bg-[rgba(255,255,255,0.06)] text-foreground"
                      : "bg-primary/20 text-foreground"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5 [&_table]:text-xs [&_th]:p-1.5 [&_td]:p-1.5 [&_strong]:text-foreground [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-[rgba(255,255,255,0.06)] rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[rgba(255,255,255,0.08)]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                disabled={isLoading}
                className={cn(
                  "flex-1 h-10 rounded-xl px-4 text-sm",
                  "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)]",
                  "text-foreground placeholder:text-muted-foreground",
                  "focus:outline-none focus:border-[rgba(255,255,255,0.15)] focus:ring-2 focus:ring-primary/20",
                  "transition-all duration-300",
                  "disabled:opacity-50"
                )}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="h-10 w-10 rounded-xl shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default DashboardChatbot;
