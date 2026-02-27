import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as path from 'path';

export interface LambdaDefinition {
  id: string;
  entry: string;
}

interface LambdaStackProps {
  table: dynamodb.Table;
  eventBus: events.EventBus;
  dlq: sqs.Queue;
  stageName: string;
  lambdas: LambdaDefinition[];
}

export class LambdaStack extends cdk.NestedStack {
  public readonly functions: Record<string, nodejs.NodejsFunction> = {};

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id);

    const backendPath = path.join(__dirname, '../../backend/src/handlers');
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

    for (const def of props.lambdas) {
      const fn = new nodejs.NodejsFunction(this, def.id, {
        functionName: `Versa-${def.id}-${props.stageName}`,
        entry: path.join(backendPath, def.entry),
        ...commonProps,
      });
      props.table.grantReadWriteData(fn);
      props.eventBus.grantPutEventsTo(fn);
      this.functions[def.id] = fn;
    }
  }
}
