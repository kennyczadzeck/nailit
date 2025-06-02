"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmplifyStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const amplify = __importStar(require("aws-cdk-lib/aws-amplify"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
class AmplifyStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Amplify Service Role
        const amplifyRole = new iam.Role(this, 'AmplifyServiceRole', {
            assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify'),
            ],
        });
        // Amplify App
        this.app = new amplify.CfnApp(this, 'NailItApp', {
            name: 'nailit',
            repository: props.repositoryUrl,
            accessToken: props.accessToken,
            platform: 'WEB_COMPUTE',
            iamServiceRole: amplifyRole.roleArn,
            // Build Settings (equivalent to amplify.yml)
            buildSpec: JSON.stringify({
                version: 1,
                frontend: {
                    phases: {
                        preBuild: {
                            commands: [
                                'echo "Environment variables check..."',
                                'echo "DATABASE_URL exists:" $DATABASE_URL',
                                'echo "DATABASE_MIGRATION_URL exists:" $DATABASE_MIGRATION_URL',
                                'echo "NEXTAUTH_URL exists:" $NEXTAUTH_URL',
                                // Environment detection logic
                                'if [[ "$DATABASE_URL" == *"misty-frog"* ]]; then',
                                '  echo "🚀 PRODUCTION ENVIRONMENT - Formal migration workflow"',
                                '  export ENVIRONMENT="production"',
                                'elif [[ "$DATABASE_URL" == *"raspy-sound"* ]]; then',
                                '  echo "🧪 STAGING ENVIRONMENT - Formal migration workflow"',
                                '  export ENVIRONMENT="staging"',
                                'elif [[ "$DATABASE_URL" == *"still-paper"* ]]; then',
                                '  echo "🛠️ DEVELOPMENT ENVIRONMENT - Rapid iteration workflow"',
                                '  export ENVIRONMENT="development"',
                                'else',
                                '  echo "❓ UNKNOWN ENVIRONMENT - Defaulting to production workflow"',
                                '  export ENVIRONMENT="production"',
                                'fi',
                                'npm install --legacy-peer-deps',
                                // Environment-specific database strategy
                                'if [[ "$ENVIRONMENT" == "development" ]]; then',
                                '  echo "Pushing schema changes to development database..."',
                                '  npx prisma db push --accept-data-loss',
                                'else',
                                '  echo "Running Prisma migrations ($ENVIRONMENT)..."',
                                '  npx prisma migrate deploy',
                                'fi',
                                'echo "Generating Prisma client..."',
                                'npx prisma generate',
                            ],
                        },
                        build: {
                            commands: ['npm run build -- --no-lint'],
                        },
                    },
                    artifacts: {
                        baseDirectory: '.next',
                        files: ['**/*'],
                    },
                },
            }),
            // Environment Variables (common to all branches)
            environmentVariables: [
                { name: 'AMPLIFY_MONOREPO_APP_ROOT', value: '.' },
                { name: 'AMPLIFY_DIFF_DEPLOY', value: 'false' },
                { name: '_LIVE_UPDATES', value: '[{"name":"Next.js SSR Streaming","pkg":"next","type":"framework","version":"latest"}]' },
            ],
        });
        // Create branches for each environment
        this.branches = {};
        Object.entries(props.environments).forEach(([envName, config]) => {
            const branch = new amplify.CfnBranch(this, `${envName}Branch`, {
                appId: this.app.attrAppId,
                branchName: config.branchName,
                // Environment-specific variables
                environmentVariables: Object.entries(config.environmentVariables).map(([key, value]) => ({
                    name: key,
                    value: value,
                })),
                // Branch configuration
                enableAutoBuild: true,
                enablePullRequestPreview: envName !== 'production',
                framework: 'Next.js - SSR',
                stage: envName === 'production' ? 'PRODUCTION' : 'DEVELOPMENT',
            });
            this.branches[envName] = branch;
            // TODO: Custom domain configuration (disabled for now due to CDK version compatibility)
            // if (props.domainName && config.subdomain) {
            //   new amplify.CfnDomainAssociation(this, `${envName}Domain`, {
            //     appId: this.app.attrAppId,
            //     domainName: props.domainName,
            //     subDomainSettings: [
            //       {
            //         branchName: config.branchName,
            //         prefix: config.subdomain,
            //       },
            //     ],
            //   });
            // }
        });
        // Outputs
        new cdk.CfnOutput(this, 'AmplifyAppId', {
            value: this.app.attrAppId,
            description: 'Amplify App ID',
        });
        Object.entries(this.branches).forEach(([envName, branch]) => {
            new cdk.CfnOutput(this, `${envName}BranchUrl`, {
                value: `https://${branch.branchName}.${this.app.attrDefaultDomain}`,
                description: `${envName} environment URL`,
            });
        });
    }
}
exports.AmplifyStack = AmplifyStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW1wbGlmeS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2FtcGxpZnktc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsaUVBQW1EO0FBQ25ELHlEQUEyQztBQWdCM0MsTUFBYSxZQUFhLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFJekMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF3QjtRQUNoRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qix1QkFBdUI7UUFDdkIsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUMzRCxTQUFTLEVBQUUsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsdUJBQXVCLENBQUM7WUFDNUQsZUFBZSxFQUFFO2dCQUNmLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsNkJBQTZCLENBQUM7YUFDMUU7U0FDRixDQUFDLENBQUM7UUFFSCxjQUFjO1FBQ2QsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRTtZQUMvQyxJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRSxLQUFLLENBQUMsYUFBYTtZQUMvQixXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7WUFDOUIsUUFBUSxFQUFFLGFBQWE7WUFDdkIsY0FBYyxFQUFFLFdBQVcsQ0FBQyxPQUFPO1lBRW5DLDZDQUE2QztZQUM3QyxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDeEIsT0FBTyxFQUFFLENBQUM7Z0JBQ1YsUUFBUSxFQUFFO29CQUNSLE1BQU0sRUFBRTt3QkFDTixRQUFRLEVBQUU7NEJBQ1IsUUFBUSxFQUFFO2dDQUNSLHVDQUF1QztnQ0FDdkMsMkNBQTJD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QUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLEVBQUUsRUFBRTtZQUMxRCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEdBQUcsT0FBTyxXQUFXLEVBQUU7Z0JBQzdDLEtBQUssRUFBRSxXQUFXLE1BQU0sQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRTtnQkFDbkUsV0FBVyxFQUFFLEdBQUcsT0FBTyxrQkFBa0I7YUFDMUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFuSUQsb0NBbUlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGFtcGxpZnkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFtcGxpZnknO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmludGVyZmFjZSBBbXBsaWZ5U3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgcmVwb3NpdG9yeVVybDogc3RyaW5nO1xuICBhY2Nlc3NUb2tlbjogc3RyaW5nOyAvLyBHaXRIdWIgcGVyc29uYWwgYWNjZXNzIHRva2VuXG4gIGRvbWFpbk5hbWU/OiBzdHJpbmc7IC8vIE9wdGlvbmFsIGN1c3RvbSBkb21haW5cbiAgZW52aXJvbm1lbnRzOiB7XG4gICAgW2tleTogc3RyaW5nXToge1xuICAgICAgYnJhbmNoTmFtZTogc3RyaW5nO1xuICAgICAgZW52aXJvbm1lbnRWYXJpYWJsZXM6IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH07XG4gICAgICBzdWJkb21haW4/OiBzdHJpbmc7XG4gICAgfTtcbiAgfTtcbn1cblxuZXhwb3J0IGNsYXNzIEFtcGxpZnlTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBhcHA6IGFtcGxpZnkuQ2ZuQXBwO1xuICBwdWJsaWMgcmVhZG9ubHkgYnJhbmNoZXM6IHsgW2tleTogc3RyaW5nXTogYW1wbGlmeS5DZm5CcmFuY2ggfTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQW1wbGlmeVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIEFtcGxpZnkgU2VydmljZSBSb2xlXG4gICAgY29uc3QgYW1wbGlmeVJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0FtcGxpZnlTZXJ2aWNlUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdhbXBsaWZ5LmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FkbWluaXN0cmF0b3JBY2Nlc3MtQW1wbGlmeScpLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIEFtcGxpZnkgQXBwXG4gICAgdGhpcy5hcHAgPSBuZXcgYW1wbGlmeS5DZm5BcHAodGhpcywgJ05haWxJdEFwcCcsIHtcbiAgICAgIG5hbWU6ICduYWlsaXQnLFxuICAgICAgcmVwb3NpdG9yeTogcHJvcHMucmVwb3NpdG9yeVVybCxcbiAgICAgIGFjY2Vzc1Rva2VuOiBwcm9wcy5hY2Nlc3NUb2tlbixcbiAgICAgIHBsYXRmb3JtOiAnV0VCX0NPTVBVVEUnLFxuICAgICAgaWFtU2VydmljZVJvbGU6IGFtcGxpZnlSb2xlLnJvbGVBcm4sXG4gICAgICBcbiAgICAgIC8vIEJ1aWxkIFNldHRpbmdzIChlcXVpdmFsZW50IHRvIGFtcGxpZnkueW1sKVxuICAgICAgYnVpbGRTcGVjOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHZlcnNpb246IDEsXG4gICAgICAgIGZyb250ZW5kOiB7XG4gICAgICAgICAgcGhhc2VzOiB7XG4gICAgICAgICAgICBwcmVCdWlsZDoge1xuICAgICAgICAgICAgICBjb21tYW5kczogW1xuICAgICAgICAgICAgICAgICdlY2hvIFwiRW52aXJvbm1lbnQgdmFyaWFibGVzIGNoZWNrLi4uXCInLFxuICAgICAgICAgICAgICAgICdlY2hvIFwiREFUQUJBU0VfVVJMIGV4aXN0czpcIiAkREFUQUJBU0VfVVJMJyxcbiAgICAgICAgICAgICAgICAnZWNobyBcIkRBVEFCQVNFX01JR1JBVElPTl9VUkwgZXhpc3RzOlwiICREQVRBQkFTRV9NSUdSQVRJT05fVVJMJywgXG4gICAgICAgICAgICAgICAgJ2VjaG8gXCJORVhUQVVUSF9VUkwgZXhpc3RzOlwiICRORVhUQVVUSF9VUkwnLFxuICAgICAgICAgICAgICAgIC8vIEVudmlyb25tZW50IGRldGVjdGlvbiBsb2dpY1xuICAgICAgICAgICAgICAgICdpZiBbWyBcIiREQVRBQkFTRV9VUkxcIiA9PSAqXCJtaXN0eS1mcm9nXCIqIF1dOyB0aGVuJyxcbiAgICAgICAgICAgICAgICAnICBlY2hvIFwi8J+agCBQUk9EVUNUSU9OIEVOVklST05NRU5UIC0gRm9ybWFsIG1pZ3JhdGlvbiB3b3JrZmxvd1wiJyxcbiAgICAgICAgICAgICAgICAnICBleHBvcnQgRU5WSVJPTk1FTlQ9XCJwcm9kdWN0aW9uXCInLFxuICAgICAgICAgICAgICAgICdlbGlmIFtbIFwiJERBVEFCQVNFX1VSTFwiID09ICpcInJhc3B5LXNvdW5kXCIqIF1dOyB0aGVuJyxcbiAgICAgICAgICAgICAgICAnICBlY2hvIFwi8J+nqiBTVEFHSU5HIEVOVklST05NRU5UIC0gRm9ybWFsIG1pZ3JhdGlvbiB3b3JrZmxvd1wiJywgXG4gICAgICAgICAgICAgICAgJyAgZXhwb3J0IEVOVklST05NRU5UPVwic3RhZ2luZ1wiJyxcbiAgICAgICAgICAgICAgICAnZWxpZiBbWyBcIiREQVRBQkFTRV9VUkxcIiA9PSAqXCJzdGlsbC1wYXBlclwiKiBdXTsgdGhlbicsXG4gICAgICAgICAgICAgICAgJyAgZWNobyBcIvCfm6DvuI8gREVWRUxPUE1FTlQgRU5WSVJPTk1FTlQgLSBSYXBpZCBpdGVyYXRpb24gd29ya2Zsb3dcIicsXG4gICAgICAgICAgICAgICAgJyAgZXhwb3J0IEVOVklST05NRU5UPVwiZGV2ZWxvcG1lbnRcIicsXG4gICAgICAgICAgICAgICAgJ2Vsc2UnLFxuICAgICAgICAgICAgICAgICcgIGVjaG8gXCLinZMgVU5LTk9XTiBFTlZJUk9OTUVOVCAtIERlZmF1bHRpbmcgdG8gcHJvZHVjdGlvbiB3b3JrZmxvd1wiJyxcbiAgICAgICAgICAgICAgICAnICBleHBvcnQgRU5WSVJPTk1FTlQ9XCJwcm9kdWN0aW9uXCInLFxuICAgICAgICAgICAgICAgICdmaScsXG4gICAgICAgICAgICAgICAgJ25wbSBpbnN0YWxsIC0tbGVnYWN5LXBlZXItZGVwcycsXG4gICAgICAgICAgICAgICAgLy8gRW52aXJvbm1lbnQtc3BlY2lmaWMgZGF0YWJhc2Ugc3RyYXRlZ3lcbiAgICAgICAgICAgICAgICAnaWYgW1sgXCIkRU5WSVJPTk1FTlRcIiA9PSBcImRldmVsb3BtZW50XCIgXV07IHRoZW4nLFxuICAgICAgICAgICAgICAgICcgIGVjaG8gXCJQdXNoaW5nIHNjaGVtYSBjaGFuZ2VzIHRvIGRldmVsb3BtZW50IGRhdGFiYXNlLi4uXCInLFxuICAgICAgICAgICAgICAgICcgIG5weCBwcmlzbWEgZGIgcHVzaCAtLWFjY2VwdC1kYXRhLWxvc3MnLFxuICAgICAgICAgICAgICAgICdlbHNlJyxcbiAgICAgICAgICAgICAgICAnICBlY2hvIFwiUnVubmluZyBQcmlzbWEgbWlncmF0aW9ucyAoJEVOVklST05NRU5UKS4uLlwiJywgXG4gICAgICAgICAgICAgICAgJyAgbnB4IHByaXNtYSBtaWdyYXRlIGRlcGxveScsXG4gICAgICAgICAgICAgICAgJ2ZpJyxcbiAgICAgICAgICAgICAgICAnZWNobyBcIkdlbmVyYXRpbmcgUHJpc21hIGNsaWVudC4uLlwiJyxcbiAgICAgICAgICAgICAgICAnbnB4IHByaXNtYSBnZW5lcmF0ZScsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICAgICAgY29tbWFuZHM6IFsnbnBtIHJ1biBidWlsZCAtLSAtLW5vLWxpbnQnXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICBhcnRpZmFjdHM6IHtcbiAgICAgICAgICAgIGJhc2VEaXJlY3Rvcnk6ICcubmV4dCcsXG4gICAgICAgICAgICBmaWxlczogWycqKi8qJ10sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pLFxuICAgICAgXG4gICAgICAvLyBFbnZpcm9ubWVudCBWYXJpYWJsZXMgKGNvbW1vbiB0byBhbGwgYnJhbmNoZXMpXG4gICAgICBlbnZpcm9ubWVudFZhcmlhYmxlczogW1xuICAgICAgICB7IG5hbWU6ICdBTVBMSUZZX01PTk9SRVBPX0FQUF9ST09UJywgdmFsdWU6ICcuJyB9LFxuICAgICAgICB7IG5hbWU6ICdBTVBMSUZZX0RJRkZfREVQTE9ZJywgdmFsdWU6ICdmYWxzZScgfSxcbiAgICAgICAgeyBuYW1lOiAnX0xJVkVfVVBEQVRFUycsIHZhbHVlOiAnW3tcIm5hbWVcIjpcIk5leHQuanMgU1NSIFN0cmVhbWluZ1wiLFwicGtnXCI6XCJuZXh0XCIsXCJ0eXBlXCI6XCJmcmFtZXdvcmtcIixcInZlcnNpb25cIjpcImxhdGVzdFwifV0nIH0sXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIGJyYW5jaGVzIGZvciBlYWNoIGVudmlyb25tZW50XG4gICAgdGhpcy5icmFuY2hlcyA9IHt9O1xuICAgIFxuICAgIE9iamVjdC5lbnRyaWVzKHByb3BzLmVudmlyb25tZW50cykuZm9yRWFjaCgoW2Vudk5hbWUsIGNvbmZpZ10pID0+IHtcbiAgICAgIGNvbnN0IGJyYW5jaCA9IG5ldyBhbXBsaWZ5LkNmbkJyYW5jaCh0aGlzLCBgJHtlbnZOYW1lfUJyYW5jaGAsIHtcbiAgICAgICAgYXBwSWQ6IHRoaXMuYXBwLmF0dHJBcHBJZCxcbiAgICAgICAgYnJhbmNoTmFtZTogY29uZmlnLmJyYW5jaE5hbWUsXG4gICAgICAgIFxuICAgICAgICAvLyBFbnZpcm9ubWVudC1zcGVjaWZpYyB2YXJpYWJsZXNcbiAgICAgICAgZW52aXJvbm1lbnRWYXJpYWJsZXM6IE9iamVjdC5lbnRyaWVzKGNvbmZpZy5lbnZpcm9ubWVudFZhcmlhYmxlcykubWFwKChba2V5LCB2YWx1ZV0pID0+ICh7XG4gICAgICAgICAgbmFtZToga2V5LFxuICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgfSkpLFxuICAgICAgICBcbiAgICAgICAgLy8gQnJhbmNoIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgZW5hYmxlQXV0b0J1aWxkOiB0cnVlLFxuICAgICAgICBlbmFibGVQdWxsUmVxdWVzdFByZXZpZXc6IGVudk5hbWUgIT09ICdwcm9kdWN0aW9uJyxcbiAgICAgICAgZnJhbWV3b3JrOiAnTmV4dC5qcyAtIFNTUicsXG4gICAgICAgIHN0YWdlOiBlbnZOYW1lID09PSAncHJvZHVjdGlvbicgPyAnUFJPRFVDVElPTicgOiAnREVWRUxPUE1FTlQnLFxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIHRoaXMuYnJhbmNoZXNbZW52TmFtZV0gPSBicmFuY2g7XG4gICAgICBcbiAgICAgIC8vIFRPRE86IEN1c3RvbSBkb21haW4gY29uZmlndXJhdGlvbiAoZGlzYWJsZWQgZm9yIG5vdyBkdWUgdG8gQ0RLIHZlcnNpb24gY29tcGF0aWJpbGl0eSlcbiAgICAgIC8vIGlmIChwcm9wcy5kb21haW5OYW1lICYmIGNvbmZpZy5zdWJkb21haW4pIHtcbiAgICAgIC8vICAgbmV3IGFtcGxpZnkuQ2ZuRG9tYWluQXNzb2NpYXRpb24odGhpcywgYCR7ZW52TmFtZX1Eb21haW5gLCB7XG4gICAgICAvLyAgICAgYXBwSWQ6IHRoaXMuYXBwLmF0dHJBcHBJZCxcbiAgICAgIC8vICAgICBkb21haW5OYW1lOiBwcm9wcy5kb21haW5OYW1lLFxuICAgICAgLy8gICAgIHN1YkRvbWFpblNldHRpbmdzOiBbXG4gICAgICAvLyAgICAgICB7XG4gICAgICAvLyAgICAgICAgIGJyYW5jaE5hbWU6IGNvbmZpZy5icmFuY2hOYW1lLFxuICAgICAgLy8gICAgICAgICBwcmVmaXg6IGNvbmZpZy5zdWJkb21haW4sXG4gICAgICAvLyAgICAgICB9LFxuICAgICAgLy8gICAgIF0sXG4gICAgICAvLyAgIH0pO1xuICAgICAgLy8gfVxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBbXBsaWZ5QXBwSWQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5hcHAuYXR0ckFwcElkLFxuICAgICAgZGVzY3JpcHRpb246ICdBbXBsaWZ5IEFwcCBJRCcsXG4gICAgfSk7XG5cbiAgICBPYmplY3QuZW50cmllcyh0aGlzLmJyYW5jaGVzKS5mb3JFYWNoKChbZW52TmFtZSwgYnJhbmNoXSkgPT4ge1xuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgYCR7ZW52TmFtZX1CcmFuY2hVcmxgLCB7XG4gICAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke2JyYW5jaC5icmFuY2hOYW1lfS4ke3RoaXMuYXBwLmF0dHJEZWZhdWx0RG9tYWlufWAsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgJHtlbnZOYW1lfSBlbnZpcm9ubWVudCBVUkxgLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn0gIl19