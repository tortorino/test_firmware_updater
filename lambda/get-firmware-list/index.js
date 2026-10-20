import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

// Initialize clients
const ssm = new SSMClient({ region: "eu-central-1" });
const s3Client = new S3Client({ region: "eu-central-1" });

// Firmware S3 prefix per device type
const FIRMWARE_PREFIXES = {
  TSA: "",
  TMA: "TMA/",
};

// Helper to get SSM parameter values
const getParam = async (name, withDecryption = false) => {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: withDecryption,
  });
  const response = await ssm.send(command);
  return response.Parameter?.Value;
};

// Main Lambda handler
export const handler = async (event) => {
  // Fetch parameters from SSM
  const CLIENT_URL = await getParam("/firmwareUpdater/client_url");
  const S3_FIRMWARE_STORAGE = await getParam("/firmwareUpdater/s3_firmware_storage");

  // Define CORS and response headers
  const headers = {
    "Access-Control-Allow-Origin": CLIENT_URL,
    "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  try {
    // Get Cognito user claims
    const claims = event.requestContext.authorizer?.claims;
    if (!claims?.email) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const userEmail = claims.email;
    const userGroups = claims["cognito:groups"]?.split(",") || [];
    const requiredGroups = ["verified", "can-update-firmware"];

    // Check access
    const hasAccess = requiredGroups.every((group) => userGroups.includes(group));
    if (!hasAccess) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "Unauthorized access" }),
      };
    }

    // Simple logging
    console.log(`User Email: ${userEmail}`);
    console.log(`User Groups: ${userGroups.join(", ")}`);

    const deviceType = event.queryStringParameters?.deviceType || "TSA";
    if (!Object.hasOwn(FIRMWARE_PREFIXES, deviceType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Unknown device type." }),
      };
    }
    const prefix = FIRMWARE_PREFIXES[deviceType];

    // We'll list objects from the S3_FIRMWARE_STORAGE bucket.
    // The "/" delimiter keeps TSA (bucket root) from listing files under other device prefixes.
    const bucket = S3_FIRMWARE_STORAGE;
    const listCommand = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, Delimiter: "/" });

    try {
      const data = await s3Client.send(listCommand);
      const objects = (data.Contents?.map((obj) => obj.Key.slice(prefix.length)) || []).filter(Boolean);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(objects),
      };
    } catch (err) {
      const message = `Error listing objects from bucket "${bucket}". Check the bucket name, region, and Lambda IAM permissions.`;
      console.error(`[ERROR] ${message}`, err);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: message }),
      };
    }

  } catch (error) {
    console.error("[ERROR] Unexpected error: ", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "An unexpected error occurred." }),
    };
  }
};
