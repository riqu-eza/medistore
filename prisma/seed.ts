import { PERMISSIONS } from "@/lib/auth/permissions";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// ============================================================================
// ROLE DEFINITIONS
// Edit permissions here — the seed will add/remove them automatically
// ============================================================================

const ROLE_DEFINITIONS = [
  {
    name: "admin",
    displayName: "System Administrator",
    description: "Full system access with all permissions",
    permissions: [PERMISSIONS.ALL],
    isSystem: true,
    isActive: true,
  },
  {
    name: "inventory_officer",
    displayName: "Inventory Officer",
    description: "Manages inventory, GRNs, and orders",
    permissions: [
      PERMISSIONS.DRUGS_READ,
      PERMISSIONS.STORES_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_WRITE,
      PERMISSIONS.INVENTORY_TRANSFER,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.BATCHES_READ,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.ORDERS_APPROVE,
      PERMISSIONS.ORDERS_ALLOCATE,
      PERMISSIONS.ORDERS_CANCEL,
      PERMISSIONS.DISPATCH_READ,
      PERMISSIONS.REPORTS_VIEW,
    ],
    isSystem: true,
    isActive: true,
  },
  {
    name: "store_manager",
    displayName: "Store Keeper",
    description: "Manages store operations and inventory",
    permissions: [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.DRUGS_READ,
      PERMISSIONS.SUPPLIERS_READ,
      PERMISSIONS.STORES_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_WRITE,
      PERMISSIONS.INVENTORY_TRANSFER,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.GRN_READ,
      PERMISSIONS.GRN_APPROVE,
      PERMISSIONS.BATCHES_READ,
      PERMISSIONS.BATCHES_QUARANTINE,
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.ORDERS_CREATE,
      PERMISSIONS.ORDERS_UPDATE,
      PERMISSIONS.ORDERS_APPROVE,
      PERMISSIONS.ORDERS_ALLOCATE,
      PERMISSIONS.DISPATCH_READ,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.AUDIT_VIEW,
    ],
    isSystem: true,
    isActive: true,
  },
  {
    name: "receiving_officer",
    displayName: "Receiving Manager",
    description: "Manages receiving and quality control of incoming drugs",
    permissions: [
      PERMISSIONS.DRUGS_READ,
      PERMISSIONS.SUPPLIERS_READ,
      PERMISSIONS.STORES_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.GRN_CREATE,
      PERMISSIONS.GRN_READ,
      PERMISSIONS.GRN_UPDATE,
      PERMISSIONS.GRN_APPROVE,
      PERMISSIONS.BATCHES_READ,
      PERMISSIONS.BATCHES_CREATE,
      PERMISSIONS.INVENTORY_TRANSFER,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.AUDIT_VIEW,
    ],
    isSystem: true,
    isActive: true,
  },
  {
    name: "dispatch_officer",
    displayName: "Dispatch Officer",
    description: "Manages dispatching of drugs to facilities and customers",
    permissions: [
      PERMISSIONS.DRUGS_READ,
      PERMISSIONS.STORES_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.DISPATCH_CREATE,
      PERMISSIONS.DISPATCH_READ,
      PERMISSIONS.DISPATCH_UPDATE,
      PERMISSIONS.DISPATCH_CONFIRM,
      PERMISSIONS.BATCHES_READ,
    ],
    isSystem: true,
    isActive: true,
  },
  {
    name: "auditor",
    displayName: "Auditor",
    description: "View-only access for auditing purposes",
    permissions: [
      PERMISSIONS.DRUGS_READ,
      PERMISSIONS.SUPPLIERS_READ,
      PERMISSIONS.STORES_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.GRN_READ,
      PERMISSIONS.BATCHES_READ,
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.DISPATCH_READ,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.AUDIT_EXPORT,
      PERMISSIONS.ANALYTICS_VIEW,
    ],
    isSystem: true,
    isActive: true,
  },
];

// ============================================================================
// HELPER: sync permissions — adds new ones, removes revoked ones
// ============================================================================

async function syncRolePermissions(
  roleName: string,
  desiredPermissions: string[],
  currentPermissions: string[],
): Promise<{ added: string[]; removed: string[] }> {
  const desiredSet = new Set(desiredPermissions);
  const currentSet = new Set(currentPermissions);

  const added = desiredPermissions.filter((p) => !currentSet.has(p));
  const removed = currentPermissions.filter((p) => !desiredSet.has(p));

  if (added.length === 0 && removed.length === 0) {
    console.log(`   ✅ [${roleName}] Permissions already in sync — no changes`);
    return { added: [], removed: [] };
  }

  if (added.length > 0) {
    console.log(`   ➕ [${roleName}] Adding ${added.length} permission(s):`);
    added.forEach((p) => console.log(`      + ${p}`));
  }

  if (removed.length > 0) {
    console.log(
      `   ➖ [${roleName}] Removing ${removed.length} permission(s):`,
    );
    removed.forEach((p) => console.log(`      - ${p}`));
  }

  return { added, removed };
}

// ============================================================================
// MAIN SEED
// ============================================================================

async function main() {
  console.log("🌱 Starting database seed...");

  // --------------------------------------------------------------------------
  // STEP 1: SEED / SYNC ROLES & PERMISSIONS
  // --------------------------------------------------------------------------
  console.log("\n📋 Seeding roles and syncing permissions...");

  for (const roleData of ROLE_DEFINITIONS) {
    // Fetch current state from DB (if it exists)
    const existing = await prisma.role.findUnique({
      where: { name: roleData.name },
    });

    if (existing) {
      // Role exists — compute permission diff
      const currentPerms = (existing.permissions as string[]) ?? [];
      const { added, removed } = await syncRolePermissions(
        roleData.name,
        roleData.permissions,
        currentPerms,
      );

      const hasChanges = added.length > 0 || removed.length > 0;

      if (hasChanges) {
        await prisma.role.update({
          where: { name: roleData.name },
          data: {
            displayName: roleData.displayName,
            description: roleData.description,
            permissions: roleData.permissions, // full replacement with desired set
            isSystem: roleData.isSystem,
            isActive: roleData.isActive,
          },
        });
        console.log(`   💾 [${roleData.name}] Saved updated permissions`);
      } else {
        // Still update non-permission fields in case they changed
        await prisma.role.update({
          where: { name: roleData.name },
          data: {
            displayName: roleData.displayName,
            description: roleData.description,
            isSystem: roleData.isSystem,
            isActive: roleData.isActive,
          },
        });
      }
    } else {
      // Role does not exist — create from scratch
      await prisma.role.create({ data: roleData });
      console.log(
        `   🆕 [${roleData.name}] Created with ${roleData.permissions.length} permission(s)`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // STEP 2: WARN ABOUT ROLES IN DB THAT ARE NO LONGER IN DEFINITIONS
  // --------------------------------------------------------------------------
  console.log("\n🔍 Checking for orphaned roles...");

  const definedNames = new Set(ROLE_DEFINITIONS.map((r) => r.name));
  const allDbRoles = await prisma.role.findMany({
    select: { name: true, isSystem: true },
  });

  for (const dbRole of allDbRoles) {
    if (!definedNames.has(dbRole.name)) {
      console.warn(
        `   ⚠️  Role '${dbRole.name}' exists in DB but is NOT in ROLE_DEFINITIONS.` +
          (dbRole.isSystem
            ? " It is a system role — skipping auto-delete. Remove manually if intended."
            : " Consider removing it if it is no longer needed."),
      );
    }
  }

  // --------------------------------------------------------------------------
  // STEP 3: SEED ADMIN USER
  // --------------------------------------------------------------------------
  console.log("\n👤 Seeding admin user...");

  const adminRole = await prisma.role.findFirst({ where: { name: "admin" } });

  if (!adminRole) {
    throw new Error(
      "Admin role not found after seeding. Something went wrong.",
    );
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { email: "muthungavictor@zetech.ac.ke" },
  });

  if (existingAdmin) {
    console.log("   ⏭️  Admin user already exists, skipping...");
  } else {
    const passwordHash = await hash("Admin@123", 12);
    const admin = await prisma.user.create({
      data: {
        email: "muthungavictor@zetech.ac.ke",
        name: "System Administrator",
        passwordHash,
        roleId: adminRole.id,
        isActive: true,
        mfaEnabled: false,
        passwordChangedAt: new Date(),
        lastPasswordChange: new Date(),
      },
    });
    console.log(`   ✅ Admin user created: ${admin.email}`);
    console.log(`   🔑 Default password: Admin@123`);
  }

  // --------------------------------------------------------------------------
  // STEP 4: SEED DRUG CATEGORIES
  // --------------------------------------------------------------------------
  console.log("\n🏷️  Seeding drug categories...");

  const categories = [
    {
      name: "Antibiotics",
      code: "ANTIBI",
      categoryType: "therapeutic",
      description: "Antimicrobial agents for bacterial infections",
      isActive: true,
    },
    {
      name: "Analgesics",
      code: "ANALG",
      categoryType: "therapeutic",
      description: "Pain relief medications",
      isActive: true,
    },
    {
      name: "Antipyretics",
      code: "ANTIPY",
      categoryType: "therapeutic",
      description: "Fever reducing medications",
      isActive: true,
    },
    {
      name: "Antihypertensives",
      code: "ANTIHYP",
      categoryType: "therapeutic",
      description: "Blood pressure control medications",
      isActive: true,
    },
    {
      name: "Antidiabetics",
      code: "ANTIDIAB",
      categoryType: "therapeutic",
      description: "Diabetes management medications",
      isActive: true,
    },
    {
      name: "Cold Storage",
      code: "COLD",
      categoryType: "storage",
      description: "Requires refrigeration (2-8°C)",
      isActive: true,
    },
    {
      name: "General Storage",
      code: "GENERAL",
      categoryType: "storage",
      description: "Room temperature storage",
      isActive: true,
    },
    {
      name: "Controlled Substances",
      code: "CONTROLLED",
      categoryType: "storage",
      description: "Controlled drugs requiring special handling",
      isActive: true,
    },
  ];

  for (const cat of categories) {
    const existing = await prisma.drugCategory.findUnique({
      where: { name: cat.name },
    });
    if (existing) {
      console.log(`   ⏭️  Category '${cat.name}' already exists, skipping...`);
    } else {
      await prisma.drugCategory.create({ data: cat });
      console.log(`   ✅ Created category: ${cat.name}`);
    }
  }

  // --------------------------------------------------------------------------
  // STEP 5: SEED STORES
  // --------------------------------------------------------------------------
  console.log("\n🏪 Seeding stores...");

  const stores = [
    {
      name: "Main Pharmacy Store",
      code: "MAIN-001",
      storeType: "general",
      allowsControlled: true,
      allowsDispatch: true,
      isReceivingZone: true,
      isActive: true,
      temperatureMin: 15,
      temperatureMax: 25,
      humidityMin: 40,
      humidityMax: 60,
    },
    {
      name: "Cold Storage Room",
      code: "COLD-001",
      storeType: "cold",
      allowsControlled: false,
      allowsDispatch: true,
      isReceivingZone: false,
      isActive: true,
      temperatureMin: 2,
      temperatureMax: 8,
      humidityMin: 40,
      humidityMax: 60,
    },
    {
      name: "Controlled Substances Vault",
      code: "CTRL-001",
      storeType: "controlled",
      allowsControlled: true,
      allowsDispatch: true,
      isReceivingZone: false,
      isActive: true,
      temperatureMin: 15,
      temperatureMax: 25,
    },
  ];

  for (const store of stores) {
    const existing = await prisma.store.findUnique({
      where: { code: store.code },
    });
    if (existing) {
      console.log(`   ⏭️  Store '${store.name}' already exists, skipping...`);
    } else {
      await prisma.store.create({ data: store });
      console.log(`   ✅ Created store: ${store.name}`);
    }
  }

  // --------------------------------------------------------------------------
  // STEP 6: SEED SYSTEM CONFIGURATIONS
  // --------------------------------------------------------------------------
  console.log("\n⚙️  Seeding system configurations...");

  const configs = [
    {
      key: "expiry_warning_days",
      value: 90,
      category: "business_rules",
      description: "Days before expiry to trigger warnings",
      dataType: "number",
      isSystem: false,
    },
    {
      key: "low_stock_threshold",
      value: 10,
      category: "business_rules",
      description: "Minimum quantity threshold for low stock alerts",
      dataType: "number",
      isSystem: false,
    },
    {
      key: "temperature_alert_min",
      value: 15,
      category: "monitoring",
      description: "Minimum temperature for general storage (°C)",
      dataType: "number",
      isSystem: false,
    },
    {
      key: "temperature_alert_max",
      value: 25,
      category: "monitoring",
      description: "Maximum temperature for general storage (°C)",
      dataType: "number",
      isSystem: false,
    },
    {
      key: "enable_email_notifications",
      value: true,
      category: "notifications",
      description: "Enable email notifications",
      dataType: "boolean",
      isSystem: false,
    },
    {
      key: "enable_sms_notifications",
      value: false,
      category: "notifications",
      description: "Enable SMS notifications",
      dataType: "boolean",
      isSystem: false,
    },
  ];

  for (const config of configs) {
    const existing = await prisma.systemConfiguration.findUnique({
      where: { key: config.key },
    });
    if (existing) {
      console.log(`   ⏭️  Config '${config.key}' already exists, skipping...`);
    } else {
      await prisma.systemConfiguration.create({ data: config });
      console.log(`   ✅ Created config: ${config.key}`);
    }
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n✨ Database seeding completed successfully!");
  console.log("\n📝 Summary:");
  console.log("   • Roles:           6 system roles synced");
  console.log("   • Users:           1 admin user");
  console.log("   • Email:           muthungavictor@zetech.ac.ke");
  console.log("   • Password:        Admin@123");
  console.log("   • Drug Categories: 8 categories");
  console.log("   • Stores:          3 stores");
  console.log("   • System Configs:  6 configurations");
  console.log("\n⚠️  IMPORTANT: Change the admin password after first login!");
}

main()
  .catch((e) => {
    console.error("\n❌ Error during seeding:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
