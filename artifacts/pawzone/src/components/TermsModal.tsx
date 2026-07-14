import { useEffect, useRef } from "react";
import { X, FileText, ChevronLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalLock } from "@/components/ModalLock";

type Role = "buyer" | "seller" | "transporter";

const TERMS: Record<Role, { title: string; sections: { heading: string; body: string[] }[] }> = {
  buyer: {
    title: "PawZone Buyer Terms and Conditions",
    sections: [
      {
        heading: "",
      body: [
          "By creating a Buyer account on PawZone, you confirm that you have read, understood, and agree to be bound by these Terms & Conditions. If you do not agree, you must not register or use the platform.",
          "These terms apply exclusively to buyers (individuals or organisations purchasing pets) on the PawZone marketplace.",
        ],
      },
      {
        heading: "1. Eligibility",
        body: [
          "1.1 The Buyer must be at least 18 years of age to register and purchase animals through PawZone.",
          "1.2 The Buyer shall provide accurate, complete, and truthful information during registration.",
          "1.3 The Buyer shall verify their mobile number through OTP before accessing Buyer services.",
          "1.4 The Buyer shall maintain the confidentiality of their account credentials.",
          "1.5 The Buyer shall be solely responsible for all activities performed using their account.",
          "1.6 Creating multiple Buyer accounts for fraudulent purposes is strictly prohibited.",
          "1.7 PawZone reserves the right to suspend, restrict, or terminate any Buyer account found providing false information.",
        ],
      },
      {
        heading: "2. Geographic Availability",
        body: [
          "2.1 PawZone services are initially available only within the State of Kerala, India.",
          "2.2 Buyers attempting to access services from outside the supported region may be placed on a waiting list until services become available in their area.",
          "2.3 PawZone does not guarantee availability of listings in every district or city",
        ],
      },
      {
        heading: "3. Animal Welfare Responsibility",
        body: [
          "3.1 The Buyer acknowledges that purchasing an animal is a long-term responsibility.",

          "3.2 The Buyer agrees to provide proper food, shelter, medical care, exercise, and affection to every animal purchased.",

          "3.3 The Buyer shall not purchase an animal with the intention of abandonment, neglect, abuse, or illegal breeding.",

          "3.4 Any evidence of animal cruelty may result in immediate suspension of the Buyer's account and may be reported to the appropriate authorities.",

          "3.5 PawZone reserves the right to deny service to any Buyer suspected of endangering animal welfare.",
        ],
      },
      {
        heading: "4. Browsing Listings",
        body: [
          "4.1 Buyers are responsible for carefully reviewing all listing details before placing an order.",

          "4.2 Buyers should verify the pet's age, breed, gender, health condition, vaccination status, and seller information before purchasing.",

          "4.3 Buyers acknowledge that images and videos are provided by Sellers and may vary slightly from the actual appearance due to lighting, growth, or natural changes.",

          "4.4 Buyers should contact the Seller through PawZone whenever clarification is required before ordering.",
        ],
      },
      {
        heading: "5. Placing an Order",
        body: [
          "5.1 An order shall be considered a purchase request until confirmed according to PawZone procedures.",

          "5.2 Upon placing an order, the requested pet may be temporarily reserved for a limited period as defined by PawZone's inventory management policy.",

          "5.3 Orders placed after the platform's designated late-night cut-off time may remain pending until business hours for Seller confirmation.",

          "5.4 Buyers shall ensure that all delivery information is accurate before confirming an order.",

          "5.5 Orders cannot be transferred to another person without prior approval from PawZone.",
        ],
      },
      {
        heading: "7. Disputes",
        body: [
          "If you have a dispute with a seller regarding a pet's condition or any order issue, you may raise a dispute through the PawZone platform within 24 hours of delivery confirmation.",
          "PawZone admin will mediate disputes and their decision shall be final.",
        ],
      },
      {
        heading: "8. Limitation of Liability",
        body: [
          "PawZone is a marketplace platform and is not liable for the health, temperament, or quality of any pet listed by sellers.",
          "PawZone shall not be held liable for any indirect, incidental, or consequential loss arising from the use of the platform.",
        ],
      },
      {
        heading: "9. Privacy",
        body: [
          "Your personal information is collected and used in accordance with PawZone's Privacy Policy. We do not sell your personal data to third parties.",
          "Your delivery address and contact details may be shared with the assigned transporter solely for the purpose of completing your delivery.",
        ],
      },
      {
        heading: "10. Amendments",
        body: [
          "PawZone reserves the right to update these Terms & Conditions at any time. Continued use of the platform after changes constitutes acceptance of the revised terms.",
          "For questions, contact us at support@pawzone.in.",
        ],
      },
    ],
  },

  seller: {
    title: "Seller Terms & Conditions",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        body: [
          "By registering as a Seller on PawZone, you agree to comply fully with these Seller Terms & Conditions. Non-compliance may result in listing removal, account suspension, or permanent banning.",
          "Seller accounts are subject to admin verification and approval before access to the seller dashboard is granted.",
        ],
      },
      {
        heading: "2. Eligibility & Verification",
        body: [
          "You must be at least 18 years old and a resident or registered entity in Kerala, India.",
          "You must upload a valid Government-issued Photo ID (Aadhaar, Voter ID, Passport, or Driving Licence) during registration.",
          "PawZone reserves the right to reject any registration without providing a reason.",
        ],
      },
      {
        heading: "3. Listing Standards",
        body: [
          "You may list only legally owned pets. Listing wild, protected, or trafficked animals is strictly prohibited and will result in immediate account termination and reporting to law enforcement.",
          "All listings must include accurate descriptions, genuine photographs, correct pricing, and honest health status.",
          "The PetCode assigned to each listing must accurately represent the specific animal being sold.",
          "You are responsible for keeping listing availability (male/female quantities) up to date.",
        ],
      },
      {
        heading: "4. Health & Documentation",
        body: [
          "Pets listed on PawZone must be in good health at the time of sale. Any known health conditions must be clearly disclosed in the listing.",
          "You are encouraged to provide vaccination records and health certificates for pets where applicable.",
          "Selling sick, injured, or malnourished animals is prohibited.",
        ],
      },
      {
        heading: "5. Pricing & Platform Fees",
        body: [
          "You set your own pet prices. PawZone deducts a platform facilitation fee of ₹20 for orders above ₹100 and ₹5 for orders ₹100 or below from your payouts.",
          "Payouts are processed after successful delivery confirmation and admin verification.",
          "Attempting to conduct transactions outside of PawZone to avoid platform fees is a violation of these terms.",
        ],
      },
      {
        heading: "6. Order Fulfilment",
        body: [
          "Once an order is confirmed and payment is verified, you must prepare the pet for pickup by the assigned transporter at your registered pickup town.",
          "Sellers must cooperate with the transporter for a timely handover, including providing a pickup video confirmation.",
          "Failure to fulfil confirmed orders without valid reason may result in penalties and account suspension.",
        ],
      },
      {
        heading: "7. Prohibited Activities",
        body: [
          "Listing animals protected under the Wildlife Protection Act, 1972 or CITES is strictly prohibited.",
          "Creating duplicate listings, price manipulation, or fraudulent activity will result in immediate account termination.",
          "Fake reviews, misrepresentation of pet breed, age, or health, and any deceptive practice are prohibited.",
        ],
      },
      {
        heading: "8. Disputes & Returns",
        body: [
          "If a buyer raises a dispute, you must cooperate with PawZone's dispute resolution process. PawZone's decision shall be final and binding.",
          "In cases of misrepresented listings, refunds may be processed at PawZone's discretion.",
        ],
      },
      {
        heading: "9. Compliance with Law",
        body: [
          "You are solely responsible for compliance with all applicable laws relating to animal ownership, trade, transport, and taxation.",
          "PawZone does not accept any liability for a seller's legal non-compliance.",
        ],
      },
      {
        heading: "10. Termination",
        body: [
          "PawZone may suspend or terminate your seller account at any time if these terms are breached.",
          "Upon termination, any outstanding payouts may be forfeited if the termination is due to fraudulent or illegal activity.",
        ],
      },
    ],
  },

  transporter: {
    title: "Transporter Terms & Conditions",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        body: [
          "By registering as a Transporter on PawZone, you agree to comply with these Transporter Terms & Conditions. Non-compliance may result in route removal, account suspension, or permanent banning.",
          "Transporter accounts require admin verification and approval before dashboard access is granted.",
        ],
      },
      {
        heading: "2. Eligibility & Verification",
        body: [
          "You must be at least 18 years old and hold a valid Indian driving licence.",
          "You must upload your vehicle's RC Book (Registration Certificate) and a Government-issued Photo ID during registration.",
          "Your vehicle must be road-worthy, insured, and legally compliant with all Motor Vehicle Act requirements.",
        ],
      },
      {
        heading: "3. Route Registration",
        body: [
          "You must accurately register your daily routes including all district and town stops. The route data is used to match you with eligible orders.",
          "Routes must reflect your actual planned travel. Registering false or speculative routes to gain order priority is prohibited.",
          "You may operate multiple routes across different days, but each route must be accurate for that day.",
        ],
      },
      {
        heading: "4. Animal Handling Standards",
        body: [
          "You must handle all animals with care, ensuring they are transported in safe, appropriate, and humane conditions.",
          "Animals must not be left unattended in vehicles for extended periods, especially in high-temperature conditions.",
          "Rough handling, neglect, or cruelty to animals during transit is strictly prohibited and will result in immediate account termination and reporting to authorities.",
          "You are responsible for keeping the animal secure and safe from the point of pickup to delivery.",
        ],
      },
      {
        heading: "5. Pickup & Delivery Process",
        body: [
          "Upon accepting an order, you must record a video at the time of pickup from the seller. This video automatically confirms pickup and marks the order as in-transit.",
          "Delivery must be completed to the buyer's registered delivery town on your route.",
          "Delivery is confirmed by the buyer on the platform. You must cooperate and be available at the agreed delivery point.",
          "If you are unable to complete a delivery, you must notify PawZone support immediately.",
        ],
      },
      {
        heading: "6. Liability",
        body: [
          "You accept full responsibility for the safety and condition of the animal from the point of pickup until delivery confirmation.",
          "Any injury, loss, or death of an animal during transit due to your negligence may result in financial liability and legal action.",
          "PawZone's liability as a platform facilitator does not extend to incidents during transit.",
        ],
      },
      {
        heading: "7. Payment & Payouts",
        body: [
          "Transporter payouts are calculated based on successfully completed deliveries and are processed after delivery confirmation.",
          "Attempting to claim payment for deliveries not completed, or falsifying delivery confirmations, is fraudulent and will result in account termination and legal action.",
        ],
      },
      {
        heading: "8. Conduct & Professionalism",
        body: [
          "You must maintain professional conduct with sellers, buyers, and PawZone staff at all times.",
          "Any harassment, misconduct, or inappropriate behaviour reported by buyers or sellers will be investigated and may result in suspension.",
        ],
      },
      {
        heading: "9. Compliance",
        body: [
          "You must comply with all road traffic laws, vehicle regulations, and animal transport guidelines set by relevant Indian authorities.",
          "You are solely responsible for any traffic violations, accidents, or legal issues arising from your vehicle operation.",
          "PawZone accepts no liability for incidents arising from a transporter's non-compliance with applicable law.",
        ],
      },
      {
        heading: "10. Termination",
        body: [
          "PawZone may terminate your transporter account at any time for breach of these terms, poor performance, or verified misconduct.",
          "Outstanding payouts may be withheld pending investigation in cases of suspected fraud or misuse.",
          "For support or queries, contact us at support@pawzone.in.",
        ],
      },
    ],
  },
};

const ROLE_COLORS: Record<Role, { bg: string; text: string; icon: string }> = {
  buyer: { bg: "bg-teal-600", text: "text-teal-700", icon: "🛒" },
  seller: { bg: "bg-purple-600", text: "text-purple-700", icon: "🏪" },
  transporter: { bg: "bg-blue-600", text: "text-blue-700", icon: "🚚" },
};

export function TermsModal({
  role,
  onClose,
}: {
  role: Role;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { title, sections } = TERMS[role];
  const colors = ROLE_COLORS[role];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <>
      <ModalLock />
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        <div className="relative z-10 w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]">
          {/* Header */}
          <div className={`${colors.bg} rounded-t-3xl sm:rounded-t-2xl px-5 pt-5 pb-4 flex-shrink-0`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                  {colors.icon}
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">{title}</h2>
                  <p className="text-white/70 text-xs mt-0.5">PawZone Kerala — Please read carefully</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors flex-shrink-0 mt-0.5"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-white/80 text-xs">
              <Shield className="w-3.5 h-3.5" />
              <span>Effective date: 1 January 2025 · Last updated: 14 July 2026</span>
            </div>
          </div>

          {/* Scrollable content */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
            {sections.map((section) => (
              <div key={section.heading}>
                <h3 className={`font-bold text-sm mb-2 ${colors.text}`}>{section.heading}</h3>
                <div className="space-y-2">
                  {section.body.map((para, i) => (
                    <p key={i} className="text-sm text-gray-600 leading-relaxed">{para}</p>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
              <strong className="text-gray-700 block mb-1">Governing Law</strong>
              These Terms & Conditions are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Kerala, India.
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-gray-100">
            <Button
              type="button"
              onClick={onClose}
              className="w-full h-12 rounded-xl font-bold flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Sign Up
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
