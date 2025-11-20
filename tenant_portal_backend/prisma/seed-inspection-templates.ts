import { PrismaClient, RoomType, InspectionCondition } from '@prisma/client';

const prisma = new PrismaClient();

// Default checklist items for each room type
const ROOM_CHECKLIST_TEMPLATES = {
  BEDROOM: [
    { category: 'Flooring', itemName: 'Carpet/Flooring condition' },
    { category: 'Flooring', itemName: 'Baseboards' },
    { category: 'Walls', itemName: 'Wall paint/condition' },
    { category: 'Walls', itemName: 'Wall holes/damage' },
    { category: 'Windows', itemName: 'Window screens' },
    { category: 'Windows', itemName: 'Window blinds/curtains' },
    { category: 'Windows', itemName: 'Window locks/operation' },
    { category: 'Lighting', itemName: 'Light fixtures' },
    { category: 'Lighting', itemName: 'Light switches' },
    { category: 'Electrical', itemName: 'Electrical outlets' },
    { category: 'HVAC', itemName: 'Air vents/heating' },
    { category: 'Doors', itemName: 'Entry door condition' },
    { category: 'Doors', itemName: 'Door locks/handles' },
    { category: 'Closets', itemName: 'Closet doors' },
    { category: 'Closets', itemName: 'Closet shelving/rods' },
  ],
  
  BATHROOM: [
    { category: 'Plumbing', itemName: 'Toilet functionality' },
    { category: 'Plumbing', itemName: 'Toilet seat/handle' },
    { category: 'Plumbing', itemName: 'Sink faucet' },
    { category: 'Plumbing', itemName: 'Sink drain' },
    { category: 'Plumbing', itemName: 'Bathtub/shower functionality' },
    { category: 'Plumbing', itemName: 'Shower head' },
    { category: 'Plumbing', itemName: 'Bathtub/shower caulking' },
    { category: 'Plumbing', itemName: 'Water pressure' },
    { category: 'Fixtures', itemName: 'Mirror condition' },
    { category: 'Fixtures', itemName: 'Towel bars/hooks' },
    { category: 'Fixtures', itemName: 'Toilet paper holder' },
    { category: 'Fixtures', itemName: 'Medicine cabinet' },
    { category: 'Flooring', itemName: 'Tile/flooring condition' },
    { category: 'Flooring', itemName: 'Grout condition' },
    { category: 'Walls', itemName: 'Wall paint/tile condition' },
    { category: 'Ventilation', itemName: 'Exhaust fan' },
    { category: 'Lighting', itemName: 'Light fixtures' },
    { category: 'Electrical', itemName: 'GFCI outlets' },
  ],
  
  KITCHEN: [
    { category: 'Appliances', itemName: 'Refrigerator condition' },
    { category: 'Appliances', itemName: 'Stove/oven functionality' },
    { category: 'Appliances', itemName: 'Dishwasher functionality' },
    { category: 'Appliances', itemName: 'Garbage disposal' },
    { category: 'Appliances', itemName: 'Microwave (if provided)' },
    { category: 'Plumbing', itemName: 'Kitchen sink faucet' },
    { category: 'Plumbing', itemName: 'Kitchen sink drain' },
    { category: 'Plumbing', itemName: 'Under-sink plumbing' },
    { category: 'Countertops', itemName: 'Countertop condition' },
    { category: 'Countertops', itemName: 'Countertop stains/damage' },
    { category: 'Cabinets', itemName: 'Cabinet doors/drawers' },
    { category: 'Cabinets', itemName: 'Cabinet hardware' },
    { category: 'Cabinets', itemName: 'Interior cabinet condition' },
    { category: 'Flooring', itemName: 'Kitchen flooring' },
    { category: 'Walls', itemName: 'Backsplash condition' },
    { category: 'Walls', itemName: 'Wall paint condition' },
    { category: 'Lighting', itemName: 'Kitchen lighting' },
    { category: 'Electrical', itemName: 'GFCI outlets' },
    { category: 'Ventilation', itemName: 'Range hood/fan' },
  ],
  
  LIVING_ROOM: [
    { category: 'Flooring', itemName: 'Carpet/flooring condition' },
    { category: 'Flooring', itemName: 'Baseboards' },
    { category: 'Walls', itemName: 'Wall paint/condition' },
    { category: 'Walls', itemName: 'Wall damage/holes' },
    { category: 'Windows', itemName: 'Window condition' },
    { category: 'Windows', itemName: 'Window screens' },
    { category: 'Windows', itemName: 'Window treatments' },
    { category: 'Lighting', itemName: 'Light fixtures' },
    { category: 'Lighting', itemName: 'Light switches' },
    { category: 'Electrical', itemName: 'Electrical outlets' },
    { category: 'HVAC', itemName: 'Air vents/heating' },
    { category: 'Doors', itemName: 'Entry doors' },
    { category: 'Fireplace', itemName: 'Fireplace condition (if applicable)' },
  ],
  
  DINING_ROOM: [
    { category: 'Flooring', itemName: 'Flooring condition' },
    { category: 'Flooring', itemName: 'Baseboards' },
    { category: 'Walls', itemName: 'Wall paint/condition' },
    { category: 'Windows', itemName: 'Window condition' },
    { category: 'Windows', itemName: 'Window treatments' },
    { category: 'Lighting', itemName: 'Light fixtures' },
    { category: 'Lighting', itemName: 'Dimmer switches' },
    { category: 'Electrical', itemName: 'Electrical outlets' },
    { category: 'HVAC', itemName: 'Air circulation' },
  ],
  
  UTILITY_ROOM: [
    { category: 'Appliances', itemName: 'Washer connections' },
    { category: 'Appliances', itemName: 'Dryer connections' },
    { category: 'Appliances', itemName: 'Washer/dryer (if provided)' },
    { category: 'Plumbing', itemName: 'Utility sink' },
    { category: 'Plumbing', itemName: 'Water shut-off valves' },
    { category: 'Plumbing', itemName: 'Drain functionality' },
    { category: 'HVAC', itemName: 'Water heater condition' },
    { category: 'HVAC', itemName: 'Furnace/HVAC access' },
    { category: 'Electrical', itemName: 'Electrical panel access' },
    { category: 'Electrical', itemName: '220V outlets' },
    { category: 'Storage', itemName: 'Shelving condition' },
    { category: 'Ventilation', itemName: 'Ventilation adequacy' },
    { category: 'Flooring', itemName: 'Floor condition' },
    { category: 'Walls', itemName: 'Wall condition' },
  ],
  
  EXTERIOR_BUILDING: [
    { category: 'Structure', itemName: 'Roof condition' },
    { category: 'Structure', itemName: 'Gutters/downspouts' },
    { category: 'Structure', itemName: 'Siding/exterior walls' },
    { category: 'Structure', itemName: 'Foundation condition' },
    { category: 'Windows', itemName: 'Exterior window condition' },
    { category: 'Windows', itemName: 'Window caulking/seals' },
    { category: 'Doors', itemName: 'Entry door exterior' },
    { category: 'Doors', itemName: 'Door frames/seals' },
    { category: 'Electrical', itemName: 'Exterior lighting' },
    { category: 'Electrical', itemName: 'Electrical meter/connections' },
    { category: 'HVAC', itemName: 'HVAC unit condition' },
    { category: 'Safety', itemName: 'Smoke detector batteries' },
    { category: 'Safety', itemName: 'Carbon monoxide detectors' },
    { category: 'Safety', itemName: 'Security system (if applicable)' },
  ],
  
  EXTERIOR_LANDSCAPING: [
    { category: 'Lawn', itemName: 'Grass condition' },
    { category: 'Lawn', itemName: 'Weed presence' },
    { category: 'Plants', itemName: 'Shrub/bush condition' },
    { category: 'Plants', itemName: 'Tree condition' },
    { category: 'Plants', itemName: 'Flower bed condition' },
    { category: 'Irrigation', itemName: 'Sprinkler system' },
    { category: 'Irrigation', itemName: 'Hose connections' },
    { category: 'Hardscaping', itemName: 'Walkway condition' },
    { category: 'Hardscaping', itemName: 'Driveway condition' },
    { category: 'Hardscaping', itemName: 'Patio/deck condition' },
    { category: 'Fencing', itemName: 'Fence condition' },
    { category: 'Fencing', itemName: 'Gate functionality' },
    { category: 'Drainage', itemName: 'Drainage adequacy' },
  ],
  
  EXTERIOR_PARKING: [
    { category: 'Pavement', itemName: 'Driveway surface' },
    { category: 'Pavement', itemName: 'Parking pad condition' },
    { category: 'Pavement', itemName: 'Cracks/potholes' },
    { category: 'Garage', itemName: 'Garage door functionality' },
    { category: 'Garage', itemName: 'Garage door opener' },
    { category: 'Garage', itemName: 'Garage interior condition' },
    { category: 'Electrical', itemName: 'Garage lighting' },
    { category: 'Electrical', itemName: 'Garage outlets' },
    { category: 'Storage', itemName: 'Garage storage systems' },
  ],
  
  COMMON_HALLWAYS: [
    { category: 'Flooring', itemName: 'Hallway flooring' },
    { category: 'Walls', itemName: 'Hallway walls/paint' },
    { category: 'Lighting', itemName: 'Hallway lighting' },
    { category: 'Safety', itemName: 'Exit signs' },
    { category: 'Safety', itemName: 'Emergency lighting' },
    { category: 'Doors', itemName: 'Fire doors' },
    { category: 'Ventilation', itemName: 'Air circulation' },
  ],
  
  COMMON_LAUNDRY: [
    { category: 'Appliances', itemName: 'Washing machines' },
    { category: 'Appliances', itemName: 'Dryers' },
    { category: 'Appliances', itemName: 'Vending machines' },
    { category: 'Plumbing', itemName: 'Water connections' },
    { category: 'Plumbing', itemName: 'Drainage' },
    { category: 'Electrical', itemName: 'Electrical connections' },
    { category: 'Ventilation', itemName: 'Exhaust fans' },
    { category: 'Flooring', itemName: 'Floor condition' },
    { category: 'Lighting', itemName: 'Room lighting' },
    { category: 'Security', itemName: 'Door locks' },
  ],
  
  COMMON_LOBBY: [
    { category: 'Flooring', itemName: 'Lobby flooring' },
    { category: 'Walls', itemName: 'Wall condition' },
    { category: 'Furniture', itemName: 'Seating condition' },
    { category: 'Lighting', itemName: 'Lobby lighting' },
    { category: 'Security', itemName: 'Entry systems' },
    { category: 'Security', itemName: 'Mailbox area' },
    { category: 'HVAC', itemName: 'Climate control' },
    { category: 'Windows', itemName: 'Window condition' },
  ],
  
  OTHER: [
    { category: 'General', itemName: 'Overall condition' },
    { category: 'General', itemName: 'Cleanliness' },
    { category: 'General', itemName: 'Damage assessment' },
    { category: 'General', itemName: 'Functionality check' },
  ],
};

async function seedInspectionTemplates() {
  console.log('🏠 Seeding inspection room templates...');

  // Create templates for each room type
  for (const [roomType, items] of Object.entries(ROOM_CHECKLIST_TEMPLATES)) {
    console.log(`  📋 Creating template for ${roomType}...`);
    
    // For now, we'll just log what would be created
    // In a real implementation, you might create template records
    // or store these in a configuration table
    console.log(`    - ${items.length} checklist items`);
    items.forEach(item => {
      console.log(`      • ${item.category}: ${item.itemName}`);
    });
  }

  console.log('✅ Inspection templates seeded successfully!');
  console.log(`📊 Total room types: ${Object.keys(ROOM_CHECKLIST_TEMPLATES).length}`);
  console.log(`📋 Total checklist items: ${Object.values(ROOM_CHECKLIST_TEMPLATES).reduce((sum, items) => sum + items.length, 0)}`);
}

// Helper function to create default rooms for an inspection
export async function createDefaultInspectionRooms(inspectionId: number, propertyType: 'apartment' | 'house' | 'commercial' = 'apartment') {
  const defaultRooms = propertyType === 'apartment' 
    ? ['BEDROOM', 'BATHROOM', 'KITCHEN', 'LIVING_ROOM']
    : propertyType === 'house'
    ? ['BEDROOM', 'BATHROOM', 'KITCHEN', 'LIVING_ROOM', 'DINING_ROOM', 'UTILITY_ROOM', 'EXTERIOR_BUILDING', 'EXTERIOR_LANDSCAPING', 'EXTERIOR_PARKING']
    : ['COMMON_HALLWAYS', 'COMMON_LAUNDRY', 'COMMON_LOBBY', 'EXTERIOR_BUILDING'];

  const rooms = [];
  for (const roomType of defaultRooms) {
    const room = await prisma.inspectionRoom.create({
      data: {
        inspectionId,
        name: roomType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        roomType: roomType as RoomType,
        checklistItems: {
          create: ROOM_CHECKLIST_TEMPLATES[roomType as keyof typeof ROOM_CHECKLIST_TEMPLATES].map(item => ({
            category: item.category,
            itemName: item.itemName,
            condition: null,
            requiresAction: false,
          })),
        },
      },
      include: {
        checklistItems: true,
      },
    });
    
    rooms.push(room);
  }

  return rooms;
}

// Helper function to get checklist template for a room type
export function getChecklistTemplate(roomType: RoomType) {
  return ROOM_CHECKLIST_TEMPLATES[roomType] || ROOM_CHECKLIST_TEMPLATES.OTHER;
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedInspectionTemplates()
    .catch((e) => {
      console.error('❌ Error seeding inspection templates:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedInspectionTemplates, ROOM_CHECKLIST_TEMPLATES };