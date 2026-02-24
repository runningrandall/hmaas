import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as path from 'path';

interface PropertyLambdasProps {
  table: dynamodb.Table;
  eventBus: events.EventBus;
  dlq: sqs.Queue;
}

export class PropertyLambdas extends cdk.NestedStack {
  // Property
  public readonly createProperty: nodejs.NodejsFunction;
  public readonly getProperty: nodejs.NodejsFunction;
  public readonly listPropertiesByCustomer: nodejs.NodejsFunction;
  public readonly updateProperty: nodejs.NodejsFunction;
  public readonly deleteProperty: nodejs.NodejsFunction;
  // PropertyService
  public readonly createPropertyService: nodejs.NodejsFunction;
  public readonly getPropertyService: nodejs.NodejsFunction;
  public readonly listPropertyServices: nodejs.NodejsFunction;
  public readonly updatePropertyService: nodejs.NodejsFunction;
  public readonly deletePropertyService: nodejs.NodejsFunction;
  // Cost
  public readonly createCost: nodejs.NodejsFunction;
  public readonly listCosts: nodejs.NodejsFunction;
  public readonly deleteCost: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: PropertyLambdasProps) {
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

    this.createProperty = createLambda('createProperty', 'properties/create.ts');
    this.getProperty = createLambda('getProperty', 'properties/get.ts');
    this.listPropertiesByCustomer = createLambda('listPropertiesByCustomer', 'properties/listByCustomer.ts');
    this.updateProperty = createLambda('updateProperty', 'properties/update.ts');
    this.deleteProperty = createLambda('deleteProperty', 'properties/delete.ts');

    this.createPropertyService = createLambda('createPropertyService', 'propertyServices/create.ts');
    this.getPropertyService = createLambda('getPropertyService', 'propertyServices/get.ts');
    this.listPropertyServices = createLambda('listPropertyServices', 'propertyServices/listByProperty.ts');
    this.updatePropertyService = createLambda('updatePropertyService', 'propertyServices/update.ts');
    this.deletePropertyService = createLambda('deletePropertyService', 'propertyServices/delete.ts');

    this.createCost = createLambda('createCost', 'costs/create.ts');
    this.listCosts = createLambda('listCosts', 'costs/listByService.ts');
    this.deleteCost = createLambda('deleteCost', 'costs/delete.ts');
  }
}
