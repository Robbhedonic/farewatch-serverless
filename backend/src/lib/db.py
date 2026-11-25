import os
import boto3

# Single-table design: PK=USER#<sub>, SK=WATCH#<id> | PK=WATCH#<id>, SK=PRICE#<ts>
table = boto3.resource("dynamodb").Table(os.environ.get("TABLE", "local"))
