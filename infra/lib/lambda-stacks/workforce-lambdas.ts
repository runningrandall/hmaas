import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as path from 'path';

interface WorkforceLambdasProps {
  table: dynamodb.Table;
  eventBus: events.EventBus;
  dlq: sqs.Queue;
}

export class WorkforceLambdas extends cdk.NestedStack {
  // Employee
  public readonly createEmployee: nodejs.NodejsFunction;
  public readonly getEmployee: nodejs.NodejsFunction;
  public readonly listEmployees: nodejs.NodejsFunction;
  public readonly updateEmployee: nodejs.NodejsFunction;
  public readonly deleteEmployee: nodejs.NodejsFunction;
  // Servicer
  public readonly createServicer: nodejs.NodejsFunction;
  public readonly getServicer: nodejs.NodejsFunction;
  public readonly updateServicer: nodejs.NodejsFunction;
  // Capability
  public readonly createCapability: nodejs.NodejsFunction;
  public readonly listCapabilities: nodejs.NodejsFunction;
  public readonly deleteCapability: nodejs.NodejsFunction;
  // ServiceSchedule
  public readonly createServiceSchedule: nodejs.NodejsFunction;
  public readonly getServiceSchedule: nodejs.NodejsFunction;
  public readonly listServiceSchedules: nodejs.NodejsFunction;
  public readonly updateServiceSchedule: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: WorkforceLambdasProps) {
    super(scope, id);

    const backendPath = path.join(__dirname, '../../../backend/src/handlers');
    const commonProps = {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      environment: {
        TABLE_NAME: props.table.tableName,
        EVENT_BUS_NAME: props.eventBus.eventBusName,
      },
      bundling: { minify: true, sourceMap: true },
      tracing: lambda.Tracing.ACTIVE,
      deadLetterQueue: props.dlq,
    };

    const createLambda = (lambdaId: string, entry: string) => {
      const fn = new nodejs.NodejsFunction(this, lambdaId, { entry: path.join(backendPath, entry), ...commonProps });
      props.table.grantReadWriteData(fn);
      props.eventBus.grantPutEventsTo(fn);
      return fn;
    };

    this.createEmployee = createLambda('createEmployee', 'employees/create.ts');
    this.getEmployee = createLambda('getEmployee', 'employees/get.ts');
    this.listEmployees = createLambda('listEmployees', 'employees/list.ts');
    this.updateEmployee = createLambda('updateEmployee', 'employees/update.ts');
    this.deleteEmployee = createLambda('deleteEmployee', 'employees/delete.ts');

    this.createServicer = createLambda('createServicer', 'servicers/create.ts');
    this.getServicer = createLambda('getServicer', 'servicers/get.ts');
    this.updateServicer = createLambda('updateServicer', 'servicers/update.ts');

    this.createCapability = createLambda('createCapability', 'capabilities/create.ts');
    this.listCapabilities = createLambda('listCapabilities', 'capabilities/list.ts');
    this.deleteCapability = createLambda('deleteCapability', 'capabilities/delete.ts');

    this.createServiceSchedule = createLambda('createServiceSchedule', 'serviceSchedules/create.ts');
    this.getServiceSchedule = createLambda('getServiceSchedule', 'serviceSchedules/get.ts');
    this.listServiceSchedules = createLambda('listServiceSchedules', 'serviceSchedules/list.ts');
    this.updateServiceSchedule = createLambda('updateServiceSchedule', 'serviceSchedules/update.ts');
  }
}
