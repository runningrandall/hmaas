import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as path from 'path';

interface CustomerLambdasProps {
  table: dynamodb.Table;
  eventBus: events.EventBus;
  dlq: sqs.Queue;
}

export class CustomerLambdas extends cdk.NestedStack {
  // Customer
  public readonly createCustomer: nodejs.NodejsFunction;
  public readonly getCustomer: nodejs.NodejsFunction;
  public readonly listCustomers: nodejs.NodejsFunction;
  public readonly updateCustomer: nodejs.NodejsFunction;
  public readonly deleteCustomer: nodejs.NodejsFunction;
  public readonly getCustomerAccount: nodejs.NodejsFunction;
  // Delegate
  public readonly createDelegate: nodejs.NodejsFunction;
  public readonly listDelegates: nodejs.NodejsFunction;
  public readonly deleteDelegate: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: CustomerLambdasProps) {
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

    this.createCustomer = createLambda('createCustomer', 'customers/create.ts');
    this.getCustomer = createLambda('getCustomer', 'customers/get.ts');
    this.listCustomers = createLambda('listCustomers', 'customers/list.ts');
    this.updateCustomer = createLambda('updateCustomer', 'customers/update.ts');
    this.deleteCustomer = createLambda('deleteCustomer', 'customers/delete.ts');
    this.getCustomerAccount = createLambda('getCustomerAccount', 'customers/getAccount.ts');

    this.createDelegate = createLambda('createDelegate', 'delegates/create.ts');
    this.listDelegates = createLambda('listDelegates', 'delegates/list.ts');
    this.deleteDelegate = createLambda('deleteDelegate', 'delegates/delete.ts');
  }
}
