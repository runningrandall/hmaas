#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { InfraStack } from '../lib/infra-stack';
import { AuthStack } from '../lib/auth-stack';

const app = new cdk.App();

// Define env to be used for both stacks
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };

const authStack = new AuthStack(app, 'AuthStack', { env });

new InfraStack(app, 'InfraStack', {
  env,
  auth: authStack,
});
