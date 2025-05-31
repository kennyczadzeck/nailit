import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Clean existing data
  await prisma.mLFeedback.deleteMany()
  await prisma.timelineEntry.deleteMany()
  await prisma.flaggedItem.deleteMany()
  await prisma.emailSettings.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  // Create user
  const user = await prisma.user.create({
    data: {
      email: 'john.homeowner@example.com',
      name: 'John Homeowner',
    },
  })

  console.log('👤 Created user:', user.email)

  // Create project
  const project = await prisma.project.create({
    data: {
      name: 'Kitchen Renovation',
      description: 'Complete kitchen remodel including new cabinets, countertops, appliances, and flooring',
      status: 'ACTIVE',
      startDate: new Date('2024-01-15'),
      contractor: 'Mike Johnson Construction',
      budget: 75000,
      address: '123 Main St, Anytown, CA 90210',
      userId: user.id,
    },
  })

  console.log('🏠 Created project:', project.name)

  // Create email settings
  await prisma.emailSettings.create({
    data: {
      projectId: project.id,
      gmailConnected: true,
      monitoringEnabled: true,
      notificationsEnabled: true,
      weeklyReports: true,
      highPriorityAlerts: true,
    },
  })

  console.log('📧 Created email settings')

  // Create flagged items
  const flaggedItems = await Promise.all([
    prisma.flaggedItem.create({
      data: {
        title: 'Cabinet Hardware Update',
        description: 'Contractor provided details about cabinet hardware specifications and costs',
        impact: 'Budget impact of $1,200',
        category: 'COST',
        emailFrom: 'contractor@mikejohnson.com',
        emailSubject: 'Kitchen Hardware Selection Update',
        emailDate: new Date('2024-01-20T14:30:00'),
        originalEmail: `Hi John,

I wanted to update you on the cabinet hardware selection. After reviewing your preferences and the cabinet style, I recommend upgrading to the brushed brass handles and hinges we discussed.

Here's the breakdown:
- Cabinet handles (24 pieces): $45 each = $1,080
- Hinges (18 pairs): $8 each = $144
- Installation hardware: $76

Total additional cost: $1,200

This upgrade will really enhance the overall look and feel of your kitchen. The quality is significantly better than the standard hardware included in our original quote.

Let me know if you'd like to proceed with this upgrade.

Best regards,
Mike Johnson`,
        aiConfidence: 0.85,
        detectedChanges: ['Hardware specification details', 'Cost implications identified', 'Finish options discussed'],
        needsEmailResponse: true,
        status: 'PENDING',
        projectId: project.id,
      },
    }),
    prisma.flaggedItem.create({
      data: {
        title: 'Countertop Installation Update',
        description: 'Updated timeline information for granite countertop installation',
        impact: 'Installation timing update',
        category: 'SCHEDULE',
        emailFrom: 'info@graniteplus.com',
        emailSubject: 'Countertop Template and Installation Schedule',
        emailDate: new Date('2024-01-19T09:15:00'),
        originalEmail: `Dear John,

This is to confirm that we have scheduled your granite countertop template for Tuesday, February 6th between 9 AM and 12 PM.

Following the template, installation will be scheduled for the following week, tentatively Friday, February 9th. We'll confirm the exact time closer to the date.

Please ensure that:
- Cabinets are fully installed and level
- Plumbing rough-in is complete
- Area is clear for our team to work

If you have any questions about the timeline, please don't hesitate to reach out.

Thanks,
Sarah Chen
Granite Plus Solutions`,
        aiConfidence: 0.62,
        detectedChanges: ['Installation schedule information', 'Supplier timing details', 'Related task implications'],
        needsEmailResponse: false,
        status: 'PENDING',
        projectId: project.id,
      },
    }),
    prisma.flaggedItem.create({
      data: {
        title: 'Electrical Requirements Update',
        description: 'Details about electrical panel specifications for appliances',
        impact: 'Electrical work specifications',
        category: 'SCOPE',
        emailFrom: 'tom@brightelectrical.com',
        emailSubject: 'Kitchen Electrical Requirements - Panel Upgrade',
        emailDate: new Date('2024-01-18T16:45:00'),
        originalEmail: `Hi John,

After reviewing the specifications for your new appliances, I need to discuss an important electrical requirement.

Your new induction cooktop requires a 240V/40A dedicated circuit, and your current electrical panel doesn't have the capacity for this addition. We'll need to upgrade your panel to accommodate this and future electrical needs.

Scope of work:
- Upgrade main panel from 100A to 200A service
- Install new 240V circuit for induction cooktop
- Add GFCI protection for countertop outlets
- Update kitchen lighting circuits to code

This wasn't included in our original scope, but it's necessary for your appliance requirements and current electrical code compliance.

I'll send over a detailed proposal tomorrow.

Best,
Tom Rodriguez
Bright Electrical Services`,
        aiConfidence: 0.91,
        detectedChanges: ['Electrical specifications detailed', 'Panel requirements clarified', 'Inspection requirements noted'],
        needsEmailResponse: true,
        status: 'PENDING',
        projectId: project.id,
      },
    }),
    prisma.flaggedItem.create({
      data: {
        title: 'Project Update from General Contractor',
        description: 'General contractor sent update about project status with multiple aspects mentioned',
        impact: 'Multiple areas potentially affected',
        category: 'UNCLASSIFIED',
        emailFrom: 'mike@mikejohnson.com',
        emailSubject: 'Weekly Project Update - Week 1',
        emailDate: new Date('2024-01-17T17:30:00'),
        originalEmail: `Hi John,

Here's your weekly project update:

Progress this week:
- Demolition completed on schedule
- Discovered some water damage behind the sink area (minor, we can handle this)
- Ordered your appliances - delivery scheduled for week 3
- Started rough plumbing work

Upcoming week:
- Electrical rough-in begins Monday
- Drywall delivery Tuesday
- Flooring materials arriving Wednesday

A few items to discuss:
- The water damage will add about 2 days to our timeline
- We found the original hardwood extends under the cabinets (this could be good news for your budget if you want to refinish instead of replace)
- Your tile selection is back-ordered 2 weeks - we may need to look at alternatives

Overall, we're still on track for completion by March 15th with these minor adjustments.

Let me know if you have any questions.

Best regards,
Mike Johnson`,
        aiConfidence: 0.0,
        detectedChanges: ['Multiple project aspects mentioned', 'Unclear primary impact area', 'Requires manual classification'],
        needsEmailResponse: false,
        status: 'PENDING',
        projectId: project.id,
      },
    }),
  ])

  console.log('🚩 Created flagged items:', flaggedItems.length)

  // Create some ML feedback entries
  await Promise.all([
    prisma.mLFeedback.create({
      data: {
        feedbackType: 'POSITIVE',
        confidence: 0.85,
        userAction: 'confirm',
        emailContent: 'Previous cost change email that was correctly identified',
        detectedPatterns: ['cost increase', 'additional charges', 'upgrade'],
        projectId: project.id,
      },
    }),
    prisma.mLFeedback.create({
      data: {
        feedbackType: 'NEGATIVE',
        confidence: 0.73,
        userAction: 'ignore',
        emailContent: 'False positive - was just a general update',
        detectedPatterns: ['timeline', 'schedule'],
        projectId: project.id,
      },
    }),
  ])

  console.log('🤖 Created ML feedback entries')

  console.log('✅ Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 