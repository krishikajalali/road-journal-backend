import prisma from '../src/config/prisma';

async function main() {
  try {
    const entry = await prisma.journalEntry.findUnique({ where: { dayNumber: 1 } });
    if (!entry) {
      console.log('No entry found for dayNumber 1. Nothing deleted.');
      return;
    }

    console.log('Found entry for day 1:', {
      id: entry.id,
      dayNumber: entry.dayNumber,
      tripDate: entry.tripDate,
      title: entry.title,
      imageUrl: entry.imageUrl,
    });

    await prisma.journalEntry.delete({ where: { id: entry.id } });
    console.log('Deleted day 1 entry successfully.');
  } catch (error) {
    console.error('Error deleting day 1 entry:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
