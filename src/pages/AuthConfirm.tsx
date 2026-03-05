import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";

const AuthConfirm = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-6" />
        <h1 className="text-3xl font-display font-bold text-foreground mb-3">
          Email Confirmed!
        </h1>
        <p className="text-muted-foreground text-lg mb-2">
          Your email has been successfully verified.
        </p>
        <p className="text-muted-foreground mb-8">
          Redirecting to login in{" "}
          <span className="font-semibold text-foreground">{countdown}</span>{" "}
          seconds...
        </p>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Preparing your login...</span>
        </div>
      </div>
    </div>
  );
};

export default AuthConfirm;
