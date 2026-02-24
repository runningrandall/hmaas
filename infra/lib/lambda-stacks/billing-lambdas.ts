import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as path from 'path';

interface BillingLambdasProps {
  table: dynamodb.Table;
  eventBus: events.EventBus;
  dlq: sqs.Queue;
}

export class BillingLambdas extends cdk.NestedStack {
  // Invoice
  public readonly createInvoice: nodejs.NodejsFunction;
  public readonly getInvoice: nodejs.NodejsFunction;
  public readonly listInvoices: nodejs.NodejsFunction;
  public readonly updateInvoice: nodejs.NodejsFunction;
  // PaymentMethod
  public readonly createPaymentMethod: nodejs.NodejsFunction;
  public readonly listPaymentMethods: nodejs.NodejsFunction;
  public readonly deletePaymentMethod: nodejs.NodejsFunction;
  // InvoiceSchedule
  public readonly createInvoiceSchedule: nodejs.NodejsFunction;
  public readonly listInvoiceSchedules: nodejs.NodejsFunction;
  public readonly updateInvoiceSchedule: nodejs.NodejsFunction;
  public readonly deleteInvoiceSchedule: nodejs.NodejsFunction;
  // Pay
  public readonly createPay: nodejs.NodejsFunction;
  public readonly listPay: nodejs.NodejsFunction;
  public readonly updatePay: nodejs.NodejsFunction;
  public readonly deletePay: nodejs.NodejsFunction;
  // PaySchedule
  public readonly createPaySchedule: nodejs.NodejsFunction;
  public readonly getPaySchedule: nodejs.NodejsFunction;
  public readonly listPaySchedules: nodejs.NodejsFunction;
  public readonly updatePaySchedule: nodejs.NodejsFunction;
  public readonly deletePaySchedule: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: BillingLambdasProps) {
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

    this.createInvoice = createLambda('createInvoice', 'invoices/create.ts');
    this.getInvoice = createLambda('getInvoice', 'invoices/get.ts');
    this.listInvoices = createLambda('listInvoices', 'invoices/list.ts');
    this.updateInvoice = createLambda('updateInvoice', 'invoices/update.ts');

    this.createPaymentMethod = createLambda('createPaymentMethod', 'paymentMethods/create.ts');
    this.listPaymentMethods = createLambda('listPaymentMethods', 'paymentMethods/list.ts');
    this.deletePaymentMethod = createLambda('deletePaymentMethod', 'paymentMethods/delete.ts');

    this.createInvoiceSchedule = createLambda('createInvoiceSchedule', 'invoiceSchedules/create.ts');
    this.listInvoiceSchedules = createLambda('listInvoiceSchedules', 'invoiceSchedules/list.ts');
    this.updateInvoiceSchedule = createLambda('updateInvoiceSchedule', 'invoiceSchedules/update.ts');
    this.deleteInvoiceSchedule = createLambda('deleteInvoiceSchedule', 'invoiceSchedules/delete.ts');

    this.createPay = createLambda('createPay', 'pay/create.ts');
    this.listPay = createLambda('listPay', 'pay/list.ts');
    this.updatePay = createLambda('updatePay', 'pay/update.ts');
    this.deletePay = createLambda('deletePay', 'pay/delete.ts');

    this.createPaySchedule = createLambda('createPaySchedule', 'paySchedules/create.ts');
    this.getPaySchedule = createLambda('getPaySchedule', 'paySchedules/get.ts');
    this.listPaySchedules = createLambda('listPaySchedules', 'paySchedules/list.ts');
    this.updatePaySchedule = createLambda('updatePaySchedule', 'paySchedules/update.ts');
    this.deletePaySchedule = createLambda('deletePaySchedule', 'paySchedules/delete.ts');
  }
}
