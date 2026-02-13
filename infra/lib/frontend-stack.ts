import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';

export class FrontendStack extends cdk.Stack {
    public readonly prodBucket: s3.Bucket;
    public readonly nonProdBucket: s3.Bucket;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // ... existing buckets ...

        // --- Production (Placeholder) ---
        this.prodBucket = new s3.Bucket(this, 'ProdWebsiteBucket', {
            // ... existing config ...
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            autoDeleteObjects: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
        });

        // --- Non-Production (S3 Static Website Hosting) ---
        this.nonProdBucket = new s3.Bucket(this, 'NonProdWebsiteBucket', {
            // ... existing config ...
            websiteIndexDocument: 'index.html',
            publicReadAccess: true,
            blockPublicAccess: new s3.BlockPublicAccess({
                blockPublicAcls: false,
                ignorePublicAcls: false,
                blockPublicPolicy: false,
                restrictPublicBuckets: false,
            }),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.GET],
                    allowedOrigins: ['*'],
                    allowedHeaders: ['*'],
                }
            ]
        });

        // --- Deployment ---
        new s3deploy.BucketDeployment(this, 'DeployWebsite', {
            sources: [s3deploy.Source.asset(path.join(__dirname, '../../frontend/out'))],
            destinationBucket: this.nonProdBucket,
            prune: true, // Remove files that are no longer in the build
        });

        // ... existing outputs and suppressions ...
        new cdk.CfnOutput(this, 'ProdBucketName', { value: this.prodBucket.bucketName });

        new cdk.CfnOutput(this, 'NonProdBucketName', { value: this.nonProdBucket.bucketName });
        new cdk.CfnOutput(this, 'NonProdWebsiteUrl', {
            value: this.nonProdBucket.bucketWebsiteUrl,
            description: 'URL for the S3 static website'
        });

        NagSuppressions.addStackSuppressions(this, [
            { id: 'AwsSolutions-S1', reason: 'Server access logging not required for dev' },
            { id: 'AwsSolutions-S10', reason: 'S3 website hosting uses HTTP' },
            { id: 'AwsSolutions-S5', reason: 'Public read access required for static website hosting' },
            { id: 'AwsSolutions-S2', reason: 'Public access required for static website hosting' },
            { id: 'AwsSolutions-L1', reason: 'BucketDeployment custom resource' },
            { id: 'AwsSolutions-IAM5', reason: 'BucketDeployment needs wildcard permissions' },
            { id: 'AwsSolutions-IAM4', reason: 'BucketDeployment uses managed policy' },
        ]);
    }
}
