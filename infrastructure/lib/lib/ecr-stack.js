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
exports.EcrStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ecr = __importStar(require("aws-cdk-lib/aws-ecr"));
class EcrStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { environment, envConfig } = props;
        // =================================
        // ECR REPOSITORY
        // =================================
        this.repository = new ecr.Repository(this, 'NailItRepository', {
            repositoryName: `nailit-${envConfig.resourceSuffix}`,
            imageScanOnPush: true,
            lifecycleRules: [
                {
                    // Keep last 10 images
                    maxImageCount: 10,
                    rulePriority: 2,
                    description: 'Keep last 10 images',
                },
                {
                    // Delete untagged images after 1 day - this rule must have highest priority
                    maxImageAge: cdk.Duration.days(1),
                    rulePriority: 1,
                    description: 'Delete untagged images after 1 day',
                    tagStatus: ecr.TagStatus.UNTAGGED,
                },
            ],
        });
        // =================================
        // OUTPUTS
        // =================================
        new cdk.CfnOutput(this, 'RepositoryUri', {
            value: this.repository.repositoryUri,
            description: 'ECR Repository URI',
            exportName: `NailIt-${envConfig.resourceSuffix}-RepositoryUri`,
        });
        new cdk.CfnOutput(this, 'RepositoryArn', {
            value: this.repository.repositoryArn,
            description: 'ECR Repository ARN',
            exportName: `NailIt-${envConfig.resourceSuffix}-RepositoryArn`,
        });
        // =================================
        // TAGS
        // =================================
        cdk.Tags.of(this).add('Project', 'NailIt');
        cdk.Tags.of(this).add('Environment', environment);
        cdk.Tags.of(this).add('ManagedBy', 'CDK');
        cdk.Tags.of(this).add('Component', 'ECR');
    }
}
exports.EcrStack = EcrStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWNyLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vZWNyLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHlEQUEyQztBQVUzQyxNQUFhLFFBQVMsU0FBUSxHQUFHLENBQUMsS0FBSztJQUdyQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW9CO1FBQzVELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRXpDLG9DQUFvQztRQUNwQyxpQkFBaUI7UUFDakIsb0NBQW9DO1FBRXBDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUM3RCxjQUFjLEVBQUUsVUFBVSxTQUFTLENBQUMsY0FBYyxFQUFFO1lBQ3BELGVBQWUsRUFBRSxJQUFJO1lBQ3JCLGNBQWMsRUFBRTtnQkFDZDtvQkFDRSxzQkFBc0I7b0JBQ3RCLGFBQWEsRUFBRSxFQUFFO29CQUNqQixZQUFZLEVBQUUsQ0FBQztvQkFDZixXQUFXLEVBQUUscUJBQXFCO2lCQUNuQztnQkFDRDtvQkFDRSw0RUFBNEU7b0JBQzVFLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQ2pDLFlBQVksRUFBRSxDQUFDO29CQUNmLFdBQVcsRUFBRSxvQ0FBb0M7b0JBQ2pELFNBQVMsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVE7aUJBQ2xDO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCxvQ0FBb0M7UUFDcEMsVUFBVTtRQUNWLG9DQUFvQztRQUVwQyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN2QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhO1lBQ3BDLFdBQVcsRUFBRSxvQkFBb0I7WUFDakMsVUFBVSxFQUFFLFVBQVUsU0FBUyxDQUFDLGNBQWMsZ0JBQWdCO1NBQy9ELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3ZDLEtBQUssRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWE7WUFDcEMsV0FBVyxFQUFFLG9CQUFvQjtZQUNqQyxVQUFVLEVBQUUsVUFBVSxTQUFTLENBQUMsY0FBYyxnQkFBZ0I7U0FDL0QsQ0FBQyxDQUFDO1FBRUgsb0NBQW9DO1FBQ3BDLE9BQU87UUFDUCxvQ0FBb0M7UUFFcEMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMzQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2xELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDMUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM1QyxDQUFDO0NBQ0Y7QUF6REQsNEJBeURDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGVjciBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNyJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5pbnRlcmZhY2UgRWNyU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcbiAgZW52Q29uZmlnOiB7XG4gICAgcmVzb3VyY2VTdWZmaXg6IHN0cmluZztcbiAgfTtcbn1cblxuZXhwb3J0IGNsYXNzIEVjclN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IHJlcG9zaXRvcnk6IGVjci5SZXBvc2l0b3J5O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBFY3JTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB7IGVudmlyb25tZW50LCBlbnZDb25maWcgfSA9IHByb3BzO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gRUNSIFJFUE9TSVRPUllcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIHRoaXMucmVwb3NpdG9yeSA9IG5ldyBlY3IuUmVwb3NpdG9yeSh0aGlzLCAnTmFpbEl0UmVwb3NpdG9yeScsIHtcbiAgICAgIHJlcG9zaXRvcnlOYW1lOiBgbmFpbGl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fWAsXG4gICAgICBpbWFnZVNjYW5PblB1c2g6IHRydWUsXG4gICAgICBsaWZlY3ljbGVSdWxlczogW1xuICAgICAgICB7XG4gICAgICAgICAgLy8gS2VlcCBsYXN0IDEwIGltYWdlc1xuICAgICAgICAgIG1heEltYWdlQ291bnQ6IDEwLFxuICAgICAgICAgIHJ1bGVQcmlvcml0eTogMixcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0tlZXAgbGFzdCAxMCBpbWFnZXMnLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgLy8gRGVsZXRlIHVudGFnZ2VkIGltYWdlcyBhZnRlciAxIGRheSAtIHRoaXMgcnVsZSBtdXN0IGhhdmUgaGlnaGVzdCBwcmlvcml0eVxuICAgICAgICAgIG1heEltYWdlQWdlOiBjZGsuRHVyYXRpb24uZGF5cygxKSxcbiAgICAgICAgICBydWxlUHJpb3JpdHk6IDEsXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdEZWxldGUgdW50YWdnZWQgaW1hZ2VzIGFmdGVyIDEgZGF5JyxcbiAgICAgICAgICB0YWdTdGF0dXM6IGVjci5UYWdTdGF0dXMuVU5UQUdHRUQsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gT1VUUFVUU1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1JlcG9zaXRvcnlVcmknLCB7XG4gICAgICB2YWx1ZTogdGhpcy5yZXBvc2l0b3J5LnJlcG9zaXRvcnlVcmksXG4gICAgICBkZXNjcmlwdGlvbjogJ0VDUiBSZXBvc2l0b3J5IFVSSScsXG4gICAgICBleHBvcnROYW1lOiBgTmFpbEl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fS1SZXBvc2l0b3J5VXJpYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSZXBvc2l0b3J5QXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMucmVwb3NpdG9yeS5yZXBvc2l0b3J5QXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdFQ1IgUmVwb3NpdG9yeSBBUk4nLFxuICAgICAgZXhwb3J0TmFtZTogYE5haWxJdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tUmVwb3NpdG9yeUFybmAsXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBUQUdTXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ1Byb2plY3QnLCAnTmFpbEl0Jyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdFbnZpcm9ubWVudCcsIGVudmlyb25tZW50KTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ01hbmFnZWRCeScsICdDREsnKTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ0NvbXBvbmVudCcsICdFQ1InKTtcbiAgfVxufSAiXX0=