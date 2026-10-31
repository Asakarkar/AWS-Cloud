import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import { config } from '../config.js';
import type { CloudWatchResult } from '../types.js';

export const getReplicaLagMetric = async (): Promise<CloudWatchResult> => {
  const { region, accessKeyId, secretAccessKey, replicaInstanceIdentifier } = config.aws;

  if (!region || !replicaInstanceIdentifier) {
    return {
      available: false,
      metricName: 'ReplicaLag',
      message: 'AWS monitoring is unavailable because no region or replica instance identifier was configured.'
    };
  }

  if (!accessKeyId || !secretAccessKey) {
    return {
      available: false,
      metricName: 'ReplicaLag',
      message: 'AWS monitoring is unavailable because static credentials are not configured. Prefer IAM-based credentials.'
    };
  }

  try {
    const client = new CloudWatchClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });

    const command = new GetMetricStatisticsCommand({
      Namespace: 'AWS/RDS',
      MetricName: 'ReplicaLag',
      Dimensions: [
        {
          Name: 'DBInstanceIdentifier',
          Value: replicaInstanceIdentifier
        }
      ],
      StartTime: new Date(Date.now() - 60 * 60 * 1000),
      EndTime: new Date(),
      Period: 60,
      Statistics: ['Average']
    });

    const response = await client.send(command);
    const datapoints = response.Datapoints ?? [];

    if (!datapoints.length) {
      return {
        available: false,
        metricName: 'ReplicaLag',
        instanceIdentifier: replicaInstanceIdentifier,
        message: 'No valid CloudWatch data was returned yet. Reporting can lag behind the replica state.'
      };
    }

    datapoints.sort((a, b) => Number(b.Timestamp ?? 0) - Number(a.Timestamp ?? 0));
    const latest = datapoints[0];

    return {
      available: true,
      metricName: 'ReplicaLag',
      instanceIdentifier: replicaInstanceIdentifier,
      value: latest.Average ?? null,
      timestamp: latest.Timestamp ? latest.Timestamp.toISOString() : undefined,
      unit: latest.Unit ?? 'Seconds',
      message: 'Latest CloudWatch ReplicaLag measurement retrieved successfully.'
    };
  } catch (error) {
    return {
      available: false,
      metricName: 'ReplicaLag',
      instanceIdentifier: replicaInstanceIdentifier,
      message: error instanceof Error ? error.message : 'CloudWatch metric retrieval failed.'
    };
  }
};
