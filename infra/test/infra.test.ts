
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { InfraStack } from '../lib/infra-stack';
import { AuthStack } from '../lib/auth-stack';
import { FrontendStack } from '../lib/frontend-stack';

test('Infra Stack Created', () => {
    const app = new cdk.App({
        context: { 'aws:cdk:bundling-stacks': [] },
    });
    const authStack = new AuthStack(app, 'AuthStack', {
        stageName: 'test',
    });
    const infraStack = new InfraStack(app, 'InfraStack', {
        auth: authStack,
        stageName: 'test',
    });

    const template = Template.fromStack(infraStack);

    // Verify DynamoDB Table
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
    template.hasResourceProperties('AWS::DynamoDB::Table', {
        BillingMode: 'PAY_PER_REQUEST',
    });

    // Verify API Gateway
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'Versa-Api-test',
    });

    // Verify nested stacks are created (7: lookup, customer, property, plan, workforce, billing, organization)
    template.resourceCountIs('AWS::CloudFormation::Stack', 7);
});

test('Auth Stack Created', () => {
    const app = new cdk.App({
        context: { 'aws:cdk:bundling-stacks': [] },
    });
    const authStack = new AuthStack(app, 'AuthStack', {
        stageName: 'test',
    });
    const template = Template.fromStack(authStack);

    // Verify User Pool
    template.hasResourceProperties('AWS::Cognito::UserPool', {
        AutoVerifiedAttributes: ['email'],
    });

    // Verify User Pool Client
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        ClientName: 'frontend-client',
    });

    // Verify 6 groups (SuperAdmin, Admin, Manager, User, Servicer, Customer)
    template.resourceCountIs('AWS::Cognito::UserPoolGroup', 6);

    // Verify SuperAdmin group exists
    template.hasResourceProperties('AWS::Cognito::UserPoolGroup', {
        GroupName: 'SuperAdmin',
    });

    // Verify Pre Token Generation Lambda exists
    template.resourceCountIs('AWS::Lambda::Function', 1);
});

test('Frontend Stack Created', () => {
    const app = new cdk.App({
        context: { 'aws:cdk:bundling-stacks': [] },
    });
    const frontendStack = new FrontendStack(app, 'FrontendStack', {
        stageName: 'test',
    });
    const template = Template.fromStack(frontendStack);

    // Verify single S3 bucket
    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'versa-frontend-test',
    });

    // Verify single CloudFront distribution
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
});
