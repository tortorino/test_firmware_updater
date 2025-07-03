import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { KMSClient, SignCommand } from '@aws-sdk/client-kms';
import base64url from 'base64url';
import crypto from 'crypto';
import tar from 'tar-stream';
import { PassThrough } from 'stream';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const ssm = new SSMClient({ region: "eu-central-1" });
const s3Client = new S3Client({ region: "eu-central-1" });
const kmsClient = new KMSClient({ region: "eu-central-1" });

const keyArn = 'arn:aws:kms:eu-central-1:784089697996:key/19e81f01-07aa-4ec6-b16b-371f3a8e46dd';

const getParam = async (name, withDecryption = false) => {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: withDecryption,
  });

  const response = await ssm.send(command);
  return response.Parameter?.Value;
};

// Converts a stream to a buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Computes SHA-256 hash for integrity verification
function computeSHA256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Signs JWT using AWS KMS
async function sign(headers, payload) {
  payload.iat = Math.floor(Date.now() / 1000);

  const tokenComponents = {
    header: base64url(JSON.stringify(headers)),
    payload: base64url(JSON.stringify(payload)),
  };

  const message = Buffer.from(tokenComponents.header + "." + tokenComponents.payload);

  const { Signature } = await kmsClient.send(new SignCommand({
    Message: message,
    KeyId: keyArn,
    SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256',
    MessageType: 'RAW'
  }));

  // Manual base64url encoding
  tokenComponents.signature = Buffer.from(Signature).toString("base64")
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

  return tokenComponents.header + "." + tokenComponents.payload + "." + tokenComponents.signature;
}

// Uploads file to S3 and returns a signed URL
async function uploadToS3(key, buffer, bucket) {
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: "application/x-tar",
  }));

  return getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseContentDisposition: 'attachment; filename="S10.upg"',
      }),
      { expiresIn: 300 }
  );
}

// Lambda handler
export const handler = async (event) => {
  const CLIENT_URL = await getParam("/firmwareUpdater/client_url");
  const S3_FIRMWARE_TEMPORARY_STORAGE = await getParam("/firmwareUpdater/s3_firmware_temporary_storage");
  const S3_FIRMWARE_STORAGE = await getParam("/firmwareUpdater/s3_firmware_storage");

  const headers = {
    "Access-Control-Allow-Origin": CLIENT_URL,
    "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  try {
    const claims = event.requestContext.authorizer?.claims;
    if (!claims?.email) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const userGroups = claims["cognito:groups"]?.split(',') || [];
    const requiredGroups = ['verified', 'can-update-firmware'];

    const hasAccess = requiredGroups.every(group => userGroups.includes(group));
    if (!hasAccess) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "Unauthorized access" }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const itemKey = body.Firmware;

    if (!itemKey) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Firmware key is required in the request." }),
      };
    }

    const [deviceClass, firmwareVersion] = itemKey.split('::');

    if (!firmwareVersion) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid firmware key format." }),
      };
    }

    // Download firmware from S3
    const data = await s3Client.send(new GetObjectCommand({
      Bucket: S3_FIRMWARE_STORAGE,
      Key: itemKey
    }));

    const fileBuffer = await streamToBuffer(data.Body);
    const checksum = computeSHA256(fileBuffer);

    // Create JWT
    const jwt = await sign(
        { alg: "RS256", typ: "JWT" },
        { checksum, firmwareVersion, deviceClass }
    );

    // Create TAR using PassThrough stream
    const pack = tar.pack();
    const pass = new PassThrough();
    pack.pipe(pass);

    pack.entry({ name: 'payload.7z', size: fileBuffer.length }, fileBuffer);
    pack.entry({ name: 'identity.jwt', size: jwt.length }, jwt, (err) => {
      if (err) throw err;
      pack.finalize();
    });

    const chunks = [];
    for await (const chunk of pass) {
      chunks.push(chunk);
    }
    const tarBuffer = Buffer.concat(chunks);

    // Upload TAR to S3 under firmwareFull/{uuid}/S10.upg
    const fileKey = `firmwareFull/${body.uuid}/S10.upg`;
    const downloadUrl = await uploadToS3(fileKey, tarBuffer, S3_FIRMWARE_TEMPORARY_STORAGE);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ downloadUrl }),
    };

  } catch (err) {
    console.error("❌ Error processing firmware archive:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal Server Error",
        details: err.message
      }),
    };
  }
};
