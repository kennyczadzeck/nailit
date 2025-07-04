#!/usr/bin/env npx tsx

/**
 * Migration Script: Fix Email Message Foreign Key References
 * 
 * This script identifies and fixes email messages that reference:
 * 1. Non-existent project IDs
 * 2. Non-existent user IDs
 * 
 * It provides options to:
 * - Report issues (dry run)
 * - Fix by updating to valid references
 * - Fix by removing invalid references
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface MigrationOptions {
  dryRun?: boolean
  autoFix?: boolean
  targetProjectId?: string // Project to migrate orphaned emails to
  targetUserId?: string    // User to migrate orphaned emails to
}

async function main() {
  const args = process.argv.slice(2)
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    autoFix: args.includes('--fix'),
    targetProjectId: args.find(arg => arg.startsWith('--target-project='))?.split('=')[1],
    targetUserId: args.find(arg => arg.startsWith('--target-user='))?.split('=')[1]
  }

  console.log('🔍 Email Message FK Reference Migration Tool')
  console.log('===========================================')
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : (options.autoFix ? 'FIX' : 'REPORT ONLY')}`)
  console.log('')

  try {
    await analyzeAndFixReferences(options)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

async function analyzeAndFixReferences(options: MigrationOptions) {
  // Get all current valid IDs
  const validUsers = await prisma.user.findMany({ select: { id: true, email: true } })
  const validProjects = await prisma.project.findMany({ 
    select: { id: true, name: true, userId: true } 
  })
  
  const validUserIds = new Set(validUsers.map(u => u.id))
  const validProjectIds = new Set(validProjects.map(p => p.id))

  console.log(`📊 Database State:`)
  console.log(`   Valid Users: ${validUsers.length}`)
  console.log(`   Valid Projects: ${validProjects.length}`)
  console.log('')

  // Get all email messages
  const allEmails = await prisma.emailMessage.findMany({
    select: {
      id: true,
      messageId: true,
      subject: true,
      userId: true,
      projectId: true,
      createdAt: true
    }
  })

  console.log(`📧 Email Messages: ${allEmails.length} total`)
  console.log('')

  // Identify issues
  const invalidUserRefs: typeof allEmails = []
  const invalidProjectRefs: typeof allEmails = []

  allEmails.forEach(email => {
    if (!validUserIds.has(email.userId)) {
      invalidUserRefs.push(email)
    }
    if (email.projectId && !validProjectIds.has(email.projectId)) {
      invalidProjectRefs.push(email)
    }
  })

  // Report findings
  console.log(`🚨 Issues Found:`)
  console.log(`   Invalid User References: ${invalidUserRefs.length}`)
  console.log(`   Invalid Project References: ${invalidProjectRefs.length}`)
  console.log('')

  if (invalidUserRefs.length > 0) {
    console.log(`❌ Emails with invalid user references:`)
    invalidUserRefs.forEach(email => {
      console.log(`   - ${email.messageId}: ${email.subject?.substring(0, 50)}... -> userId: ${email.userId}`)
    })
    console.log('')
  }

  if (invalidProjectRefs.length > 0) {
    console.log(`❌ Emails with invalid project references:`)
    invalidProjectRefs.forEach(email => {
      console.log(`   - ${email.messageId}: ${email.subject?.substring(0, 50)}... -> projectId: ${email.projectId}`)
    })
    console.log('')
  }

  // Show valid options for migration
  if (invalidUserRefs.length > 0 || invalidProjectRefs.length > 0) {
    console.log(`✅ Available migration targets:`)
    console.log(`   Users:`)
    validUsers.forEach(user => {
      console.log(`     - ${user.id}: ${user.email}`)
    })
    console.log(`   Projects:`)
    validProjects.forEach(project => {
      console.log(`     - ${project.id}: ${project.name}`)
    })
    console.log('')
  }

  // Handle fixes if requested
  if (options.autoFix && !options.dryRun) {
    let fixedCount = 0

    // Fix invalid user references
    if (invalidUserRefs.length > 0) {
      if (options.targetUserId) {
        if (!validUserIds.has(options.targetUserId)) {
          throw new Error(`Target user ID ${options.targetUserId} is not valid`)
        }
        
        console.log(`🔧 Fixing ${invalidUserRefs.length} invalid user references...`)
        for (const email of invalidUserRefs) {
          await prisma.emailMessage.update({
            where: { id: email.id },
            data: { userId: options.targetUserId }
          })
          console.log(`   ✅ Fixed ${email.messageId}`)
          fixedCount++
        }
      } else {
        console.log(`⚠️  Cannot fix user references: --target-user=<id> required`)
      }
    }

    // Fix invalid project references
    if (invalidProjectRefs.length > 0) {
      if (options.targetProjectId) {
        if (!validProjectIds.has(options.targetProjectId)) {
          throw new Error(`Target project ID ${options.targetProjectId} is not valid`)
        }
        
        console.log(`🔧 Fixing ${invalidProjectRefs.length} invalid project references...`)
        for (const email of invalidProjectRefs) {
          await prisma.emailMessage.update({
            where: { id: email.id },
            data: { projectId: options.targetProjectId }
          })
          console.log(`   ✅ Fixed ${email.messageId}`)
          fixedCount++
        }
      } else {
        // Option to set to null (unassigned)
        console.log(`🔧 Setting ${invalidProjectRefs.length} invalid project references to NULL...`)
        for (const email of invalidProjectRefs) {
          await prisma.emailMessage.update({
            where: { id: email.id },
            data: { projectId: null }
          })
          console.log(`   ✅ Unassigned ${email.messageId}`)
          fixedCount++
        }
      }
    }

    console.log(`✅ Migration completed: ${fixedCount} records fixed`)
  }

  // Provide usage instructions if issues found but not fixing
  if ((invalidUserRefs.length > 0 || invalidProjectRefs.length > 0) && !options.autoFix) {
    console.log(`💡 To fix these issues, run:`)
    console.log(`   # Dry run to see what would be changed:`)
    console.log(`   npx tsx scripts/migrate-email-project-references.ts --dry-run --fix`)
    console.log(``)
    console.log(`   # Fix invalid user references (pick a valid user ID):`)
    console.log(`   npx tsx scripts/migrate-email-project-references.ts --fix --target-user=<valid-user-id>`)
    console.log(``)
    console.log(`   # Fix invalid project references (pick a valid project ID or let them be unassigned):`)
    console.log(`   npx tsx scripts/migrate-email-project-references.ts --fix --target-project=<valid-project-id>`)
    console.log(`   # OR set invalid project references to null:`)
    console.log(`   npx tsx scripts/migrate-email-project-references.ts --fix`)
    console.log('')
  }

  if (invalidUserRefs.length === 0 && invalidProjectRefs.length === 0) {
    console.log(`✅ No FK constraint issues found! All email messages have valid references.`)
  }
}

if (require.main === module) {
  main()
} 