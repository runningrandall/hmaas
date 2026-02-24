import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as path from 'path';

interface PlanLambdasProps {
  table: dynamodb.Table;
  eventBus: events.EventBus;
  dlq: sqs.Queue;
}

export class PlanLambdas extends cdk.NestedStack {
  // Plan
  public readonly createPlan: nodejs.NodejsFunction;
  public readonly getPlan: nodejs.NodejsFunction;
  public readonly listPlans: nodejs.NodejsFunction;
  public readonly updatePlan: nodejs.NodejsFunction;
  public readonly deletePlan: nodejs.NodejsFunction;
  // PlanService
  public readonly createPlanService: nodejs.NodejsFunction;
  public readonly listPlanServices: nodejs.NodejsFunction;
  public readonly deletePlanService: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: PlanLambdasProps) {
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

    this.createPlan = createLambda('createPlan', 'plans/create.ts');
    this.getPlan = createLambda('getPlan', 'plans/get.ts');
    this.listPlans = createLambda('listPlans', 'plans/list.ts');
    this.updatePlan = createLambda('updatePlan', 'plans/update.ts');
    this.deletePlan = createLambda('deletePlan', 'plans/delete.ts');

    this.createPlanService = createLambda('createPlanService', 'planServices/create.ts');
    this.listPlanServices = createLambda('listPlanServices', 'planServices/list.ts');
    this.deletePlanService = createLambda('deletePlanService', 'planServices/delete.ts');
  }
}
