const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MESSAGE = process.env.A09_MESSAGE;
if (!MESSAGE) throw new Error('A09_MESSAGE required');

(async()=>{
  const msg = await prisma.message.findFirst({
    where: { content: MESSAGE },
    orderBy: { createdAt: 'desc' },
  });
  if(!msg) throw new Error('Message not found');

  const event = await prisma.milAuditEvent.findFirst({
    where: {
      module: 'MESSAGING',
      action: 'MESSAGE_SENT',
      entityType: 'Message',
      entityId: String(msg.id),
    },
    orderBy: { createdAt: 'desc' },
  });

  const md = event?.metadata || {};
  console.log(JSON.stringify({
    messageId: msg.id,
    conversationId: msg.conversationId,
    hasMetadata: !!event,
    audit: event ? {
      id: event.id,
      hasAttachments: md.hasAttachments,
      attachmentCount: md.attachmentCount,
      attachmentUrls: md.attachmentUrls,
    } : null
  }, null, 2));

  await prisma.$disconnect();
})();