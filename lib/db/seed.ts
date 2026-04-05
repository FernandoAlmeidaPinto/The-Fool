import { connectDB } from "./mongoose";
import { Profile } from "@/lib/profiles/model";
import { ALL_PERMISSIONS, PERMISSIONS } from "@/lib/permissions/constants";

async function seed() {
  await connectDB();

  console.log("Seeding profiles...");

  await Profile.findOneAndUpdate(
    { slug: "admin" },
    {
      name: "Admin",
      slug: "admin",
      description: "Full platform access",
      permissions: ALL_PERMISSIONS,
    },
    { upsert: true, new: true }
  );
  console.log("  ✓ admin profile");

  await Profile.findOneAndUpdate(
    { slug: "free_tier" },
    {
      name: "Free Tier",
      slug: "free_tier",
      description: "Basic free access",
      permissions: [PERMISSIONS.READINGS_VIEW, PERMISSIONS.READINGS_CREATE],
    },
    { upsert: true, new: true }
  );
  console.log("  ✓ free_tier profile");

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
