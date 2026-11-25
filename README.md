# FareWatch

FareWatch is a **serverless** web application for tracking flight routes, storing price history, and receiving alerts when a fare falls below a user's target price.

> Full-stack project built with React, AWS Lambda, API Gateway, DynamoDB, Cognito, SNS, and AWS SAM.

## Features

- Manual flight price checks.
- Automatic tracking of up to 20 routes per user.
- Price history containing up to 500 checks per route.
- Purchase recommendation: **BUY_NOW**, **WAIT**, or **HOLD**.
- Email alerts when the target price is reached or a fare drops by 15% or more.
- Authentication with Amazon Cognito.
- React dashboard with demo mode that requires no AWS account.

> Prices currently come from a deterministic simulator. The `backend/src/lib/provider.py` module can be replaced with a real flight API such as Amadeus.

## Architecture

```text
React / Vite
     |
     | Bearer JWT
     v
API Gateway HTTP API
     |
     +--> Cognito JWT Authorizer
     |
     +--> AWS Lambda (5 REST routes)
              |
              v
          DynamoDB
       /       |        \
      /        |         \
     v         v          v
  DynamoDB  Scheduler   Table/GSI
   Stream      Lambda
      |           |
      v           |
 Lambda Alerter <-+
      |
      +--> SNS --> Email
      |
      +--> CloudWatch / SQS DLQ
```

### AWS resources

| Component | Purpose |
|---|---|
| API Gateway HTTP API | Exposes protected REST routes and applies request throttling |
| Amazon Cognito | User registration, sign-in, and JWT issuance |
| AWS Lambda | Runs the API, scheduled checks, and alert processing |
| Amazon DynamoDB | Stores users, routes, and price history |
| DynamoDB Streams | Triggers alert logic when prices change |
| Amazon SNS | Sends price alert emails |
| Amazon SQS | Stores failed alert events |
| Amazon CloudWatch | Logs, metrics, tracing, and alarms |
| AWS SAM | Describes and deploys the infrastructure as code |

## API

All routes require a Cognito JWT that is validated by API Gateway.

| Method | Route | Lambda | Description |
|---|---|---|---|
| `POST` | `/watches` | `create_watch` | Creates a route |
| `GET` | `/watches` | `list_watches` | Lists the authenticated user's routes |
| `GET` | `/watches/{id}` | `get_watch` | Retrieves a route, history, and recommendation |
| `DELETE` | `/watches/{id}` | `delete_watch` | Deletes a route |
| `POST` | `/watches/{id}/check` | `check_now` | Manually checks the route's price |

## Data model

The project uses a DynamoDB single-table design:

```text
PK = USER#<sub>, SK = WATCH#<id>  -> route information
PK = WATCH#<id>, SK = PRICE#<ts>  -> price history entry
```

The partition key uses the `sub` identifier from Cognito. This provides per-user data isolation in every operation.

## Security

- Cognito JWT validation on every route through API Gateway.
- User-specific data isolation.
- IATA code, date, and price validation.
- Maximum of 20 routes per user.
- Maximum of one manual check per minute and route.
- Managed encryption for DynamoDB, SNS, and SQS.
- DynamoDB Point-in-Time Recovery enabled.
- Per-function IAM policies defined through AWS SAM.
- API Gateway throttling with a burst limit of 50 and a rate limit of 20 requests per second.
- AWS X-Ray tracing enabled.

## Scalability and resilience

- DynamoDB `PAY_PER_REQUEST` billing.
- Key-based queries and a GSI instead of full table scans.
- TTL to remove expired history records.
- Reserved concurrency for the scheduled checker Lambda.
- Parallel processing limited to 10 tasks.
- DynamoDB Streams configured with batches of 50 records.
- Partial batch failure handling using `ReportBatchItemFailures`.
- Up to 3 retries, with failed messages sent to SQS.
- ARM64 Lambda architecture for lower cost and improved efficiency.
- CloudWatch alarm for scheduled checker failures.

## Requirements

- Python 3.12+
- Node.js 18+
- AWS CLI configured
- AWS SAM CLI
- AWS account with permission to use Cognito, API Gateway, Lambda, DynamoDB, SNS, SQS, and CloudWatch

## Run locally

### Backend

```bash
cd backend
python3 -m unittest discover -s tests -t .
```

The tests cover route validation, target prices, price drops, recommendations, and the price simulator.

### Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Without environment variables configured, the application starts in **demo mode** and does not require an AWS account.

### Build the dashboard

```bash
cd dashboard
npm install
npm run build
```

The production build is generated in `dashboard/dist/`.

## Deploy to AWS

Run the following commands from the `backend` directory:

```bash
cd backend
sam build
sam deploy --guided
```

The guided deployment requests:

- AWS region.
- Stack name.
- Email subscriber for SNS alerts.
- Schedule expression for the checker. The default is `rate(1 hour)`.
- Confirmation of the required IAM permissions.

After deployment, SAM provides:

- `ApiUrl`
- `UserPoolId`
- `UserPoolClientId`

## Connect the dashboard to AWS

Copy `dashboard/.env.example` to `dashboard/.env` and enter the deployment values:

```dotenv
VITE_API_URL=https://xxxxx.execute-api.<region>.amazonaws.com
VITE_REGION=<region>
VITE_USER_POOL_CLIENT_ID=<client-id>
```

Restart the Vite server after modifying the environment file.

Before receiving emails, confirm the subscription sent by Amazon SNS to the address configured as `AlertEmail`.

## Publish to GitHub

From the project root:

```bash
git init
git add .
git commit -m "Initial commit: FareWatch serverless application"
git branch -M main
git remote add origin https://github.com/Robbhedonic/farewatch-serverless.git
git push -u origin main
```

If the repository already exists:

```bash
git remote set-url origin https://github.com/Robbhedonic/farewatch-serverless.git
git push -u origin main
```

## Project structure

```text
farewatch/
├── backend/
│   ├── src/
│   │   ├── functions/       # Lambda handlers
│   │   └── lib/             # Database, HTTP, business, and provider logic
│   ├── tests/               # Unit tests
│   ├── template.yaml        # AWS SAM infrastructure
│   └── requirements.txt
├── dashboard/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── Home.jsx
│   │   ├── api.js
│   │   └── styles.css
│   └── package.json
└── README.md
```

## Tests

Run:

```bash
cd backend
python3 -m unittest discover -s tests -t .
```

Expected result:

```text
Ran 9 tests

OK
```

## Technologies

- React 18
- Vite 5
- Python 3.12
- AWS Lambda
- API Gateway HTTP API
- Amazon Cognito
- Amazon DynamoDB
- DynamoDB Streams
- Amazon SNS
- Amazon SQS
- Amazon CloudWatch
- AWS SAM

## Author

Robbhedonic

Repository: https://github.com/Robbhedonic/farewatch-serverless
