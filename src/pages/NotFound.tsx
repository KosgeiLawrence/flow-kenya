import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-mesh p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="glass-card rounded-2xl p-10 text-center max-w-md w-full"
      >
        <h1 className="mb-2 text-6xl font-display font-bold text-gradient-gold">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">Oops! Page not found</p>
        <Button asChild>
          <Link to="/"><Home className="mr-2 h-4 w-4" /> Return to Home</Link>
        </Button>
      </motion.div>
    </div>
  );
};

export default NotFound;
