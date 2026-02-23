import { PERMISSIONS } from "@/lib/auth/permissions";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // ============================================================================
  // STEP 1: SEED ROLES
  // ============================================================================
  console.log("\n📋 Seeding roles...");

  const roles = [
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
      permissions: 
      [
          PERMISSIONS.DRUGS_READ,
          PERMISSIONS.STORES_READ,
          PERMISSIONS.INVENTORY_READ,
          PERMISSIONS.INVENTORY_WRITE,
          PERMISSIONS.INVENTORY_TRANSFER,
          PERMISSIONS.INVENTORY_ADJUST,
          PERMISSIONS.BATCHES_READ,
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
      displayName: "receiving Manager",
      description: "Manages receiving and quality control of incoming drugs",
      permissions: 
      [
          PERMISSIONS.DRUGS_READ,
          PERMISSIONS.SUPPLIERS_READ,
          PERMISSIONS.STORES_READ,
          PERMISSIONS.INVENTORY_READ,
          PERMISSIONS.GRN_CREATE,
          PERMISSIONS.GRN_READ,
          PERMISSIONS.GRN_UPDATE,
          PERMISSIONS.BATCHES_READ,
          PERMISSIONS.BATCHES_CREATE,
        ],
      isSystem: true,
      isActive: true,
    },
    {
      name: "dispatch_officer",
      displayName: "Dispatch Officer",
      description: "Manages dispatching of drugs to facilities and customers",
      permissions: 
      [
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
      permissions: 
      [
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

  for (const roleData of roles) {
    const existingRole = await prisma.role.findUnique({
      where: { name: roleData.name },
    });

    if (existingRole) {
      console.log(`   ⏭️  Role '${roleData.name}' already exists, skipping...`);
    } else {
      await prisma.role.create({
        data: roleData,
      });
      console.log(`   ✅ Created role: ${roleData.displayName}`);
    }
  }

  // ============================================================================
  // STEP 2: SEED ADMIN USER
  // ============================================================================
  console.log("\n👤 Seeding admin user...");

  const adminRole = await prisma.role.findFirst({
    where: { name: "admin" },
  });

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
    console.log(`   🔑 Password: Admin@123`);
  }

  // ============================================================================
  // STEP 3: SEED DRUG CATEGORIES (Optional but recommended)
  // ============================================================================
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

  for (const categoryData of categories) {
    const existingCategory = await prisma.drugCategory.findUnique({
      where: { name: categoryData.name },
    });

    if (existingCategory) {
      console.log(
        `   ⏭️  Category '${categoryData.name}' already exists, skipping...`,
      );
    } else {
      await prisma.drugCategory.create({
        data: categoryData,
      });
      console.log(`   ✅ Created category: ${categoryData.name}`);
    }
  }

  // ============================================================================
  // STEP 4: SEED STORES (Optional but recommended)
  // ============================================================================
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

  for (const storeData of stores) {
    const existingStore = await prisma.store.findUnique({
      where: { code: storeData.code },
    });

    if (existingStore) {
      console.log(
        `   ⏭️  Store '${storeData.name}' already exists, skipping...`,
      );
    } else {
      await prisma.store.create({
        data: storeData,
      });
      console.log(`   ✅ Created store: ${storeData.name}`);
    }
  }

  // ============================================================================
  // STEP 5: SEED SYSTEM CONFIGURATIONS
  // ============================================================================
  console.log("\n⚙️  Seeding system configurations...");

  const configs = [
    {
      key: "expiry_warning_days",
      value: 90,
      category: "business_rules",
      description: "Number of days before expiry to trigger warnings",
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

  for (const configData of configs) {
    const existingConfig = await prisma.systemConfiguration.findUnique({
      where: { key: configData.key },
    });

    if (existingConfig) {
      console.log(
        `   ⏭️  Config '${configData.key}' already exists, skipping...`,
      );
    } else {
      await prisma.systemConfiguration.create({
        data: configData,
      });
      console.log(`   ✅ Created config: ${configData.key}`);
    }
  }

  console.log("\n✨ Database seeding completed successfully!");
  console.log("\n📝 Summary:");
  console.log("   • Roles: 6 system roles created");
  console.log("   • Users: 1 admin user created");
  console.log("   • Email: muthungavictor@zetech.ac.ke");
  console.log("   • Password: Admin@123");
  console.log("   • Drug Categories: 8 categories created");
  console.log("   • Stores: 3 stores created");
  console.log("   • System Configs: 6 configurations created");
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
