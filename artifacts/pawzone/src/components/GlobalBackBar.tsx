import { useLocation } from "wouter";
import { BackButton } from "@/components/BackButton";

const DASHBOARD_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/buyer",
  "/seller",
  "/transporter",
  "/admin",
]);

const SELF_HANDLED_PATTERNS = [
  /^\/buyer\/orders$/,
  /^\/seller\/orders$/,
  /^\/seller\/listings$/,
  /^\/seller\/listings\/new$/,
  /^\/seller\/listings\/\d+\/edit$/,
  /^\/seller\/payout$/,
  /^\/transporter\/payout$/,
  /^\/transporter\/add-route$/,
  /^\/transporter\/routes\/new$/,
  /^\/transporter\/routes\/\d+\/edit$/,
  /^\/admin\/orders$/,
  /^\/admin\/users$/,
  /^\/admin\/listings$/,
  /^\/admin\/disputes$/,
  /^\/admin\/alerts$/,
  /^\/admin\/accounting$/,
  /^\/admin\/payments$/,
  /^\/admin\/ledger\/transporter/,
  /^\/admin\/ledger\/seller/,
  /^\/admin\/payouts$/,
  /^\/buyer\/orders\/[^/]+$/,
  /^\/notifications$/,
  /^\/profile$/,
  /^\/settings$/,
  /^\/listings$/,
];

function isSelfHandled(path: string) {
  return SELF_HANDLED_PATTERNS.some(p => p.test(path));
}

export function GlobalBackBar() {
  const [location] = useLocation();
  if (DASHBOARD_PATHS.has(location)) return null;
  if (isSelfHandled(location)) return null;
  return (
    <div className="fixed z-40 pointer-events-none" style={{ top: "calc(4rem + 0.5rem)", left: "1rem" }}>
      <div className="pointer-events-auto">
        <BackButton />
      </div>
    </div>
  );
}
