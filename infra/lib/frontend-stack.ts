import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';

export class FrontendStack extends cdk.Stack {
    public readonly prodBucket: s3.Bucket;
    public readonly nonProdBucket: s3.Bucket;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // --- Production (Placeholder) ---
        // For this task, we focus on non-prod / dev usage as requested.
        this.prodBucket = new s3.Bucket(this, 'ProdWebsiteBucket', {
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            autoDeleteObjects: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
        });

        // --- Non-Production (S3 Static Website Hosting) ---
        this.nonProdBucket = new s3.Bucket(this, 'NonProdWebsiteBucket', {
            websiteIndexDocument: 'index.html',
            publicReadAccess: true, // Allow public read access for website hosting
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

        // --- Outputs ---
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
        ]);
    }
}
