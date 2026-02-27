import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { NagSuppressions } from 'cdk-nag';

interface FrontendStackProps extends cdk.StackProps {
    stageName: string;
}

export class FrontendStack extends cdk.Stack {
    public readonly bucket: s3.Bucket;
    public readonly distribution: cloudfront.Distribution;

    constructor(scope: Construct, id: string, props: FrontendStackProps) {
        super(scope, id, props);

        const isProd = props.stageName === 'prod';

        // --- Security Headers ---
        const securityHeaders = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
            securityHeadersBehavior: {
                strictTransportSecurity: {
                    accessControlMaxAge: cdk.Duration.days(365),
                    includeSubdomains: true,
                    preload: true,
                    override: true,
                },
                contentTypeOptions: { override: true },
                frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
                xssProtection: { protection: true, modeBlock: true, override: true },
                referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
                contentSecurityPolicy: {
                    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:;",
                    override: true,
                },
            },
        });

        // --- S3 Bucket ---
        this.bucket = new s3.Bucket(this, 'WebsiteBucket', {
            bucketName: `versa-frontend-${props.stageName}`,
            removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: !isProd,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
        });

        // --- URL Rewrite Function ---
        // Next.js static export generates .html files (e.g., api-docs.html).
        // This function rewrites clean URLs like /api-docs to /api-docs.html
        // so S3 can serve the correct file.
        const urlRewriteFunction = new cloudfront.Function(this, 'UrlRewriteFunction', {
            code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    if (uri.endsWith('/')) {
        request.uri += 'index.html';
    } else if (!uri.includes('.')) {
        request.uri += '.html';
    }
    return request;
}
            `.trim()),
            runtime: cloudfront.FunctionRuntime.JS_2_0,
        });

        // --- CloudFront Distribution ---
        this.distribution = new cloudfront.Distribution(this, 'Distribution', {
            defaultBehavior: {
                origin: new origins.S3Origin(this.bucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
                compress: true,
                responseHeadersPolicy: securityHeaders,
                functionAssociations: [{
                    function: urlRewriteFunction,
                    eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
                }],
            },
            defaultRootObject: 'index.html',
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(0),
                },
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(0),
                },
            ],
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        });

        // --- Outputs ---
        new cdk.CfnOutput(this, 'BucketName', { value: this.bucket.bucketName });
        new cdk.CfnOutput(this, 'DistributionId', { value: this.distribution.distributionId });
        new cdk.CfnOutput(this, 'DistributionDomain', { value: this.distribution.distributionDomainName });

        NagSuppressions.addStackSuppressions(this, [
            { id: 'AwsSolutions-S1', reason: 'S3 access logging not required for dev stage' },
            { id: 'AwsSolutions-S10', reason: 'SSL enforcement not required for dev stage S3 buckets' },
            { id: 'AwsSolutions-CFR1', reason: 'Geo restrictions not required for dev stage' },
            { id: 'AwsSolutions-CFR2', reason: 'WAF not required for dev CloudFront distributions' },
            { id: 'AwsSolutions-CFR3', reason: 'CloudFront access logging not required for dev stage' },
            { id: 'AwsSolutions-CFR4', reason: 'Default CloudFront certificate acceptable for dev stage' },
            { id: 'AwsSolutions-CFR7', reason: 'OAC configuration not required for dev stage' },
        ], true);
    }
}
