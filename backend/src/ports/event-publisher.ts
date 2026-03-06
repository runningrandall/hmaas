export interface EventPublisher {
    publish(eventName: string, payload: unknown): Promise<void>;
}
