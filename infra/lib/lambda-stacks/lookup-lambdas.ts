import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as path from 'path';

interface LookupLambdasProps {
  table: dynamodb.Table;
  eventBus: events.EventBus;
  dlq: sqs.Queue;
}

export class LookupLambdas extends cdk.NestedStack {
  // PropertyType
  public readonly createPropertyType: nodejs.NodejsFunction;
  public readonly getPropertyType: nodejs.NodejsFunction;
  public readonly listPropertyTypes: nodejs.NodejsFunction;
  public readonly updatePropertyType: nodejs.NodejsFunction;
  public readonly deletePropertyType: nodejs.NodejsFunction;
  // ServiceType
  public readonly createServiceType: nodejs.NodejsFunction;
  public readonly getServiceType: nodejs.NodejsFunction;
  public readonly listServiceTypes: nodejs.NodejsFunction;
  public readonly updateServiceType: nodejs.NodejsFunction;
  public readonly deleteServiceType: nodejs.NodejsFunction;
  // CostType
  public readonly createCostType: nodejs.NodejsFunction;
  public readonly getCostType: nodejs.NodejsFunction;
  public readonly listCostTypes: nodejs.NodejsFunction;
  public readonly updateCostType: nodejs.NodejsFunction;
  public readonly deleteCostType: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: LookupLambdasProps) {
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

    this.createPropertyType = createLambda('createPropertyType', 'propertyTypes/create.ts');
    this.getPropertyType = createLambda('getPropertyType', 'propertyTypes/get.ts');
    this.listPropertyTypes = createLambda('listPropertyTypes', 'propertyTypes/list.ts');
    this.updatePropertyType = createLambda('updatePropertyType', 'propertyTypes/update.ts');
    this.deletePropertyType = createLambda('deletePropertyType', 'propertyTypes/delete.ts');

    this.createServiceType = createLambda('createServiceType', 'serviceTypes/create.ts');
    this.getServiceType = createLambda('getServiceType', 'serviceTypes/get.ts');
    this.listServiceTypes = createLambda('listServiceTypes', 'serviceTypes/list.ts');
    this.updateServiceType = createLambda('updateServiceType', 'serviceTypes/update.ts');
    this.deleteServiceType = createLambda('deleteServiceType', 'serviceTypes/delete.ts');

    this.createCostType = createLambda('createCostType', 'costTypes/create.ts');
    this.getCostType = createLambda('getCostType', 'costTypes/get.ts');
    this.listCostTypes = createLambda('listCostTypes', 'costTypes/list.ts');
    this.updateCostType = createLambda('updateCostType', 'costTypes/update.ts');
    this.deleteCostType = createLambda('deleteCostType', 'costTypes/delete.ts');
  }
}
