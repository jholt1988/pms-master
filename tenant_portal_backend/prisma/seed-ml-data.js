import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ML training data...');

  const properties = await prisma.property.findMany();

  const propertyUpdates = [
    {
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      propertyType: 'Apartment',
      yearBuilt: 2015,
      bedrooms: 2.5,
      bathrooms: 2,
      minRent: 3200,
      maxRent: 4200,
      description: 'Modern units near Civic Center with premium amenities.',
      tags: ['downtown', 'premium'],
    },
    {
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      propertyType: 'Apartment',
      yearBuilt: 2010,
      bedrooms: 1.8,
      bathrooms: 1.5,
      minRent: 2500,
      maxRent: 3400,
      description: 'Boutique building in Hollywood with walkable retail.',
      tags: ['hollywood', 'walkable'],
    },
    {
      city: 'San Diego',
      state: 'CA',
      zipCode: '92101',
      propertyType: 'Condo',
      yearBuilt: 2018,
      bedrooms: 2,
      bathrooms: 2,
      minRent: 2800,
      maxRent: 3600,
      description: 'Luxury units in Gaslamp Quarter with rooftop decks.',
      tags: ['gaslamp', 'luxury'],
    },
  ];

  for (let i = 0; i < properties.length && i < propertyUpdates.length; i++) {
    await prisma.property.update({
      where: { id: properties[i].id },
      data: propertyUpdates[i],
    });
    console.log(`Updated property ${properties[i].id} - ${properties[i].name}`);
  }

  const units = await prisma.unit.findMany();

  const unitNames = ['Unit 301', 'Unit 202', 'Unit 505', 'Unit 104', 'Unit 411', 'Unit 606'];

  for (let i = 0; i < units.length; i++) {
    const name = unitNames[i % unitNames.length];
    await prisma.unit.update({
      where: { id: units[i].id },
      data: {
        name,
      },
    });
    console.log(`Updated unit ${units[i].id} - ${name}`);
  }

  console.log('ML training data seeded successfully!');
  console.log(`   - Updated ${properties.length} properties`);
  console.log(`   - Updated ${units.length} units`);
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
