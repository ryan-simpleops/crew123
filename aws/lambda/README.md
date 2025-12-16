# Crew123 Lambda Functions

AWS Lambda functions for SMS processing and cascade logic.

## Functions

### 1. crew123-send-sms
Sends SMS via AWS SNS. Can be invoked directly for testing.

**Trigger:** Direct invocation
**Runtime:** Node.js 20.x
**Timeout:** 10 seconds
**Memory:** 128 MB

**Environment Variables:**
- `AWS_REGION`: us-west-1
- `SNS_PHONE_NUMBER`: +12175823786

**IAM Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["sns:Publish"],
      "Resource": "*"
    }
  ]
}
```

---

### 2. crew123-process-queue
Processes pending SMS messages from database queue.

**Trigger:** EventBridge (every 1 minute)
**Runtime:** Node.js 20.x
**Timeout:** 60 seconds
**Memory:** 256 MB

**Environment Variables:**
- `AWS_REGION`: us-west-1
- `DATABASE_URL`: postgresql://postgres.tuumiszlzfnjggslictz:[password]@aws-0-us-west-2.pooler.supabase.com:6543/postgres

**IAM Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["sns:Publish"],
      "Resource": "*"
    }
  ]
}
```

---

### 3. crew123-handle-sms-webhook
Handles incoming SMS responses from crew members.

**Trigger:** SNS Topic Subscription
**Runtime:** Node.js 20.x
**Timeout:** 30 seconds
**Memory:** 256 MB

**Environment Variables:**
- `DATABASE_URL`: postgresql://postgres.tuumiszlzfnjggslictz:[password]@aws-0-us-west-2.pooler.supabase.com:6543/postgres

**IAM Permissions:** None (database only)

---

### 4. crew123-check-deadlines
Checks for expired offers and triggers cascade.

**Trigger:** EventBridge (every 1 minute)
**Runtime:** Node.js 20.x
**Timeout:** 60 seconds
**Memory:** 256 MB

**Environment Variables:**
- `DATABASE_URL`: postgresql://postgres.tuumiszlzfnjggslictz:[password]@aws-0-us-west-2.pooler.supabase.com:6543/postgres

**IAM Permissions:** None (database only)

---

## Deployment

### Step 1: Install Dependencies

```bash
cd aws/lambda/crew123-send-sms && npm install && cd ../../..
cd aws/lambda/crew123-process-queue && npm install && cd ../../..
cd aws/lambda/crew123-handle-sms-webhook && npm install && cd ../../..
cd aws/lambda/crew123-check-deadlines && npm install && cd ../../..
```

### Step 2: Create Deployment Packages

```bash
cd aws/lambda/crew123-send-sms
zip -r ../crew123-send-sms.zip .
cd ..

cd crew123-process-queue
zip -r ../crew123-process-queue.zip .
cd ..

cd crew123-handle-sms-webhook
zip -r ../crew123-handle-sms-webhook.zip .
cd ..

cd crew123-check-deadlines
zip -r ../crew123-check-deadlines.zip .
cd ..
```

### Step 3: Create IAM Role

Create an IAM role named `crew123-lambda-role` with:
- Trust relationship: Lambda service
- Policies:
  - AWSLambdaBasicExecutionRole (CloudWatch Logs)
  - Custom policy for SNS (see above)

### Step 4: Deploy Lambda Functions

```bash
# crew123-send-sms
aws lambda create-function \
  --function-name crew123-send-sms \
  --runtime nodejs20.x \
  --role arn:aws:iam::641550531825:role/crew123-lambda-role \
  --handler index.handler \
  --zip-file fileb://crew123-send-sms.zip \
  --timeout 10 \
  --memory-size 128 \
  --region us-west-1 \
  --environment Variables="{AWS_REGION=us-west-1,SNS_PHONE_NUMBER=+12175823786}"

# crew123-process-queue
aws lambda create-function \
  --function-name crew123-process-queue \
  --runtime nodejs20.x \
  --role arn:aws:iam::641550531825:role/crew123-lambda-role \
  --handler index.handler \
  --zip-file fileb://crew123-process-queue.zip \
  --timeout 60 \
  --memory-size 256 \
  --region us-west-1 \
  --environment Variables="{AWS_REGION=us-west-1,DATABASE_URL=postgresql://postgres.tuumiszlzfnjggslictz:[password]@aws-0-us-west-2.pooler.supabase.com:6543/postgres}"

# crew123-handle-sms-webhook
aws lambda create-function \
  --function-name crew123-handle-sms-webhook \
  --runtime nodejs20.x \
  --role arn:aws:iam::641550531825:role/crew123-lambda-role \
  --handler index.handler \
  --zip-file fileb://crew123-handle-sms-webhook.zip \
  --timeout 30 \
  --memory-size 256 \
  --region us-west-1 \
  --environment Variables="{DATABASE_URL=postgresql://postgres.tuumiszlzfnjggslictz:[password]@aws-0-us-west-2.pooler.supabase.com:6543/postgres}"

# crew123-check-deadlines
aws lambda create-function \
  --function-name crew123-check-deadlines \
  --runtime nodejs20.x \
  --role arn:aws:iam::641550531825:role/crew123-lambda-role \
  --handler index.handler \
  --zip-file fileb://crew123-check-deadlines.zip \
  --timeout 60 \
  --memory-size 256 \
  --region us-west-1 \
  --environment Variables="{DATABASE_URL=postgresql://postgres.tuumiszlzfnjggslictz:[password]@aws-0-us-west-2.pooler.supabase.com:6543/postgres}"
```

### Step 5: Set Up EventBridge Triggers

```bash
# Create EventBridge rule for process-queue (every 1 minute)
aws events put-rule \
  --name crew123-process-queue-trigger \
  --schedule-expression "rate(1 minute)" \
  --region us-west-1

# Add Lambda permission
aws lambda add-permission \
  --function-name crew123-process-queue \
  --statement-id AllowEventBridge \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-west-1:641550531825:rule/crew123-process-queue-trigger \
  --region us-west-1

# Add target
aws events put-targets \
  --rule crew123-process-queue-trigger \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-west-1:641550531825:function:crew123-process-queue" \
  --region us-west-1

# Same for check-deadlines
aws events put-rule \
  --name crew123-check-deadlines-trigger \
  --schedule-expression "rate(1 minute)" \
  --region us-west-1

aws lambda add-permission \
  --function-name crew123-check-deadlines \
  --statement-id AllowEventBridge \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-west-1:641550531825:rule/crew123-check-deadlines-trigger \
  --region us-west-1

aws events put-targets \
  --rule crew123-check-deadlines-trigger \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-west-1:641550531825:function:crew123-check-deadlines" \
  --region us-west-1
```

### Step 6: Set Up SNS Webhook

Configure AWS SNS to send incoming SMS to the webhook Lambda:

1. In AWS SNS Console, go to your phone number
2. Under "Two-way SMS", enable incoming messages
3. Set SNS Topic for incoming messages
4. Subscribe `crew123-handle-sms-webhook` Lambda to that topic

---

## Testing

### Test send-sms directly:
```bash
aws lambda invoke \
  --function-name crew123-send-sms \
  --payload '{"phone": "+15551234567", "message": "Test message"}' \
  --region us-west-1 \
  response.json
```

### Test process-queue:
```bash
aws lambda invoke \
  --function-name crew123-process-queue \
  --payload '{}' \
  --region us-west-1 \
  response.json
```

### Monitor logs:
```bash
aws logs tail /aws/lambda/crew123-process-queue --follow --region us-west-1
```

---

## Updates

To update a function:
```bash
cd aws/lambda/crew123-process-queue
zip -r ../crew123-process-queue.zip .
cd ..

aws lambda update-function-code \
  --function-name crew123-process-queue \
  --zip-file fileb://crew123-process-queue.zip \
  --region us-west-1
```
