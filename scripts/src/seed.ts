import { db, usersTable, listingsTable, transporterRoutesTable } from "@workspace/db";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "pawzone_salt").digest("hex");
}

function generatePetCode(): string {
  return "PET" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function seed() {
  console.log("Seeding database...");

  const existing = await db.select().from(usersTable);
  if (existing.length > 0) {
    console.log("Database already has users, skipping seed.");
    process.exit(0);
  }

  // Create admin
  const [admin] = await db.insert(usersTable).values({
    role: "admin",
    name: "PawZone Admin",
    email: "admin@pawzone.internal",
    passwordHash: hashPassword("PawZone2005"),
    status: "approved",
    city: "Kochi",
  }).returning();
  console.log("Created admin:", admin.id);

  // Create buyer
  const [buyer] = await db.insert(usersTable).values({
    role: "buyer",
    name: "Arun Kumar",
    email: "arun@example.com",
    phone: "9876543210",
    passwordHash: hashPassword("test123"),
    status: "approved",
    city: "Kochi",
    address: "MG Road, Kochi",
    state: "Kerala",
    pincode: "682001",
    country: "India",
    deliveryPoints: ["Kochi", "Ernakulam"],
  }).returning();
  console.log("Created buyer:", buyer.id);

  // Create seller
  const [seller] = await db.insert(usersTable).values({
    role: "seller",
    name: "Rajan Nair",
    email: "rajan@example.com",
    phone: "9876541234",
    passwordHash: hashPassword("seller123"),
    status: "approved",
    city: "Thrissur",
    address: "Round South, Thrissur",
    state: "Kerala",
    pincode: "680001",
    country: "India",
    sellerId: "SEL001",
    sellerScore: 4.8,
    platformSharePercent: 10,
    deliveryPoints: ["Thrissur"],
  }).returning();
  console.log("Created seller:", seller.id);

  // Create transporter
  const [transporter] = await db.insert(usersTable).values({
    role: "transporter",
    name: "Saji Mathew",
    email: "saji@example.com",
    phone: "9876549876",
    passwordHash: hashPassword("transport123"),
    status: "approved",
    city: "Kochi",
    address: "Vytilla, Kochi",
    state: "Kerala",
    pincode: "682019",
    country: "India",
    deliveryPoints: ["Kochi", "Thrissur", "Ernakulam"],
  }).returning();
  console.log("Created transporter:", transporter.id);

  // Create transporter route
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  for (const day of days) {
    await db.insert(transporterRoutesTable).values({
      transporterId: transporter.id,
      dayOfWeek: day,
      startCity: "Thrissur",
      endCity: "Kochi",
      startTime: "08:00",
      endTime: "12:00",
      stops: ["Thrissur", "Chalakudy", "Ernakulam", "Kochi"],
      active: true,
    });
  }
  console.log("Created transporter routes");

  // Create listings
  const listingsData = [
    {
      sellerId: seller.id,
      category: "dogs" as const,
      breed: "Golden Retriever",
      price: 25000,
      quantity: 3,
      availableQuantity: 3,
      maleQuantity: 2,
      femaleQuantity: 1,
      vaccinated: true,
      vaccinationDetails: "All core vaccines done (Parvo, Distemper, Hepatitis)",
      photos: [],
      description: "Beautiful, healthy Golden Retriever puppies from champion bloodline. Very friendly and good with kids.",
      status: "approved" as const,
      petCode: generatePetCode(),
      address: "Round South, Thrissur",
      city: "Thrissur",
    },
    {
      sellerId: seller.id,
      category: "dogs" as const,
      breed: "Labrador Retriever",
      price: 18000,
      quantity: 2,
      availableQuantity: 2,
      maleQuantity: 1,
      femaleQuantity: 1,
      vaccinated: true,
      vaccinationDetails: "Fully vaccinated with health certificate",
      photos: [],
      description: "Pure breed Labrador puppies, excellent temperament. Great family dogs.",
      status: "approved" as const,
      petCode: generatePetCode(),
      address: "Round South, Thrissur",
      city: "Thrissur",
    },
    {
      sellerId: seller.id,
      category: "cats" as const,
      breed: "Persian",
      price: 12000,
      quantity: 4,
      availableQuantity: 4,
      maleQuantity: 2,
      femaleQuantity: 2,
      vaccinated: true,
      vaccinationDetails: "Vaccinated and dewormed",
      photos: [],
      description: "Adorable Persian kittens with long silky fur. Very calm and affectionate.",
      status: "approved" as const,
      petCode: generatePetCode(),
      address: "Round South, Thrissur",
      city: "Thrissur",
    },
    {
      sellerId: seller.id,
      category: "birds" as const,
      breed: "African Grey Parrot",
      price: 35000,
      quantity: 2,
      availableQuantity: 2,
      maleQuantity: 1,
      femaleQuantity: 1,
      vaccinated: false,
      photos: [],
      description: "Highly intelligent African Grey parrots. These birds can learn hundreds of words.",
      status: "approved" as const,
      petCode: generatePetCode(),
      address: "Round South, Thrissur",
      city: "Thrissur",
    },
    {
      sellerId: seller.id,
      category: "dogs" as const,
      breed: "German Shepherd",
      price: 22000,
      quantity: 2,
      availableQuantity: 2,
      maleQuantity: 1,
      femaleQuantity: 1,
      vaccinated: true,
      vaccinationDetails: "All vaccines completed",
      photos: [],
      description: "Strong and intelligent German Shepherd puppies. Perfect for families and as guard dogs.",
      status: "approved" as const,
      petCode: generatePetCode(),
      address: "Round South, Thrissur",
      city: "Thrissur",
    },
    {
      sellerId: seller.id,
      category: "fish" as const,
      breed: "Arowana",
      price: 8000,
      quantity: 5,
      availableQuantity: 5,
      maleQuantity: 3,
      femaleQuantity: 2,
      vaccinated: false,
      photos: [],
      description: "Premium Silver Arowana fish, healthy and active. Brings good luck according to Feng Shui.",
      status: "approved" as const,
      petCode: generatePetCode(),
      address: "Round South, Thrissur",
      city: "Thrissur",
    },
    {
      sellerId: seller.id,
      category: "cats" as const,
      breed: "Siamese",
      price: 9000,
      quantity: 3,
      availableQuantity: 3,
      maleQuantity: 1,
      femaleQuantity: 2,
      vaccinated: true,
      vaccinationDetails: "Vaccinated and dewormed",
      photos: [],
      description: "Beautiful Siamese kittens with striking blue eyes. Very vocal and loving companions.",
      status: "approved" as const,
      petCode: generatePetCode(),
      address: "Round South, Thrissur",
      city: "Thrissur",
    },
    {
      sellerId: seller.id,
      category: "birds" as const,
      breed: "Budgerigar",
      price: 1500,
      quantity: 10,
      availableQuantity: 10,
      maleQuantity: 5,
      femaleQuantity: 5,
      vaccinated: false,
      photos: [],
      description: "Colorful and cheerful budgerigars. Great starter birds for beginners.",
      status: "approved" as const,
      petCode: generatePetCode(),
      address: "Round South, Thrissur",
      city: "Thrissur",
    },
  ];

  for (const listing of listingsData) {
    await db.insert(listingsTable).values(listing);
  }
  console.log("Created", listingsData.length, "listings");

  console.log("\nSeed complete!");
  console.log("Demo credentials:");
  console.log("  Admin:       PAWZONE_A2005 / PawZone2005");
  console.log("  Buyer:       arun@example.com / test123");
  console.log("  Seller:      rajan@example.com / seller123");
  console.log("  Transporter: saji@example.com / transport123");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
