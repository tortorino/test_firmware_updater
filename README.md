# Guide for the First Run
++qqww
## What Needs to Be Cleared Before Starting

1. **API Gateway:**
    - `archer-api`
2. **DynamoDB Tables:**
    - `magic_link`
3. **S3 Buckets:**
    - `archer-firmware-storage`
    - `archer-firmware-temporary-storage`
    - `archer-firmware-updater-terraform-state`
    - `archer-lambda-storage`
4. **Parameter Store:**
    - `/firmwareUpdater/auth_token_secret_key`
    - `/firmwareUpdater/client_url`
    - `/firmwareUpdater/cognito_client_id`
    - `/firmwareUpdater/cognito_user_pool`
    - `/firmwareUpdater/email_recipient`
    - `/firmwareUpdater/email_sender`
    - `/firmwareUpdater/magic_link_dynamoDB_table_name`
    - `/firmwareUpdater/recaptcha_secret_key`
    - `/firmwareUpdater/s3_firmware_storage`
    - `/firmwareUpdater/s3_firmware_temporary_storage`
5. **Lambda Functions:**
    - `firmware-updater-full`
    - `get-firmware-list`
    - `refresh-tokens`
    - `request-for-access`
    - `firmware-updater-only-firmware`
    - `start-auth`
    - `start-verify`
    - `create-magic-link`
    - `verify-auth-token`
    - `firmware-updater-only-settings`
    - `define-magic-link`
6. **Cognito:**
    - `firmware-updater-cognito-pool`
7. **IAM Roles:**
    - `amplify-service-role`
    - `lambda-role-create-magic-link`
    - `lambda-role-define-magic-link`
    - `lambda-role-firmware-updater-full`
    - `lambda-role-firmware-updater-only-firmware`
    - `lambda-role-firmware-updater-only-settings`
    - `lambda-role-get-firmware-list`
    - `lambda-role-refresh-tokens`
    - `lambda-role-request-for-access`
    - `lambda-role-start-auth`
    - `lambda-role-start-verify`
    - `lambda-role-verify-auth-token`

---

## Primary Setup

1. **Create an S3 Bucket for Terraform State**  
   Manually create an S3 bucket named `archer-firmware-updater-terraform-state`. The Terraform state will be stored here.

2. **Add Keys to GitHub Secrets**
    1. **ACCESS_TOKEN_GITHUB**  
       Generate a personal access token in your GitHub account (refer to [AWS Amplify docs](https://docs.aws.amazon.com/amplify/latest/userguide/setting-up-GitHub-access.html) for details).
    2. **AUTH_TOKEN_SECRET_KEY**  
       A key used for decrypting the token during login. Must be at least 10 characters long (e.g., `123apodemus456`).
    3. **AWS_ACCESS_KEY**
    4. **AWS_SECRET_ACCESS_KEY**
    5. **EMAIL_RECIPIENT**  
       The email address that will receive requests for access.
    6. **EMAIL_SENDER**  
       The email address that will send the login links.
    7. **RECAPTCHA_SECRET_KEY**  
       Needed for reCAPTCHA v3. You can use any string for testing.

3. **Merge the Pull Request**  
   Wait for the GitHub Actions workflow to complete.

4. **Configure Amplify and reCAPTCHA**
    1. Open [AWS Amplify](https://eu-central-1.console.aws.amazon.com/amplify/apps), find your app (e.g., `Firmware-updater-v2`), and copy the domain.
    2. Go to [Google reCAPTCHA](https://cloud.google.com/security/products/recaptcha) to create a pair of keys.
    3. In the repository, update `client/src/App.tsx` → `RECAPTCHA_SITE_KEY` with the new site key.
    4. Store `RECAPTCHA_SECRET_KEY` in your GitHub secrets.

5. **Push the Code to `main` Again**

6. **Add Users in Cognito**  
   Add the necessary users in the Cognito User Pool and assign them to the required groups.

7. **If You Encounter CORS Errors**  
   In API Gateway (`archer-api`), click **Deploy API** → **stage: prod**.
8. Set all firmware file to s3/archer-firmware-storage

---

## Device Types (TSA / TMA)

The app has a **TSA / TMA** tab. Both build the same packages; they differ only in the KMS key used to sign `identity.jwt` and in where their firmware lives:

| Device type | Signing key (KMS) | Firmware location in `archer-firmware-storage` |
|---|---|---|
| TSA | `19e81f01-07aa-4ec6-b16b-371f3a8e46dd` | bucket root: `<deviceClass>::<version>` |
| TMA | alias `alias/archer-firmware-updater-tma-key` | `TMA/<deviceClass>::<version>` |

The Lambdas are allowed to sign with whichever key carries the `alias/archer-firmware-updater-tma-key` alias, so no code or IAM change is needed once the key exists.

### Importing the TMA private key into KMS

The key must be RSA, and its size must match `--key-spec` below (`RSA_2048`, `RSA_3072` or `RSA_4096`). It is used with `RSASSA_PKCS1_V1_5_SHA_256` (RS256), just like the TSA key. See [AWS: Importing key material](https://docs.aws.amazon.com/kms/latest/developerguide/importing-keys.html).

```sh
# 1. Create an empty key and give it the alias
aws kms create-key --origin EXTERNAL --key-spec RSA_2048 --key-usage SIGN_VERIFY \
  --description "Firmware updater TMA signing key" --region eu-central-1
aws kms create-alias --alias-name alias/archer-firmware-updater-tma-key --target-key-id <KeyId> --region eu-central-1

# 2. Get the wrapping key and import token
aws kms get-parameters-for-import --key-id <KeyId> --region eu-central-1 \
  --wrapping-algorithm RSA_AES_KEY_WRAP_SHA_256 --wrapping-key-spec RSA_4096 > params.json
jq -r .PublicKey params.json | base64 -d > wrapping-key.der
jq -r .ImportToken params.json | base64 -d > import-token.bin

# 3. Wrap the private key (PKCS#8 DER) with a one-time AES key (needs OpenSSL 3)
openssl pkcs8 -topk8 -inform PEM -outform DER -nocrypt -in tma-private.pem -out private-key.der
openssl rand -out aes-key.bin 32
openssl enc -id-aes256-wrap-pad -K "$(xxd -p < aes-key.bin | tr -d '\n')" -iv A65959A6 \
  -in private-key.der -out key-material-wrapped.bin
openssl pkeyutl -encrypt -in aes-key.bin -out aes-key-wrapped.bin -inkey wrapping-key.der -keyform DER -pubin \
  -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -pkeyopt rsa_mgf1_md:sha256
cat aes-key-wrapped.bin key-material-wrapped.bin > encrypted-key-material.bin

# 4. Import, then delete all the local files above (they include the private key)
aws kms import-key-material --key-id <KeyId> --region eu-central-1 \
  --encrypted-key-material fileb://encrypted-key-material.bin --import-token fileb://import-token.bin \
  --expiration-model KEY_MATERIAL_DOES_NOT_EXPIRE
```

To check the import, compare `aws kms get-public-key --key-id alias/archer-firmware-updater-tma-key` with the public key the TMA devices trust.

----------_____сс
йй
