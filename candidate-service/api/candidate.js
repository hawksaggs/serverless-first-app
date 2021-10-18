"use strict";

const uuid = require("uuid");
const AWS = require("aws-sdk");

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.submit = async (event) => {
  const requestBody = JSON.parse(event.body) || {};
  const fullname = requestBody.fullname;
  const email = requestBody.email;
  const experience = requestBody.experience;

  if (
    typeof fullname !== "string" ||
    typeof email !== "string" ||
    typeof experience !== "number"
  ) {
    console.error("Validation Failed");
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Couldn't submit candidate because of validation errors.",
      }),
    };
  }

  return submitCandidateP(candidateInfo(fullname, email, experience))
    .then((res) => {
      // console.log("candidate data: ", res);
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `Sucessfully submitted candidate with email ${email}`,
          candidateId: res.id,
        }),
      };
    })
    .catch((err) => {
      console.log(err);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: `Unable to submit candidate with email ${email}`,
        }),
      };
    });

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};

module.exports.list = (event) => {
  var params = {
    TableName: process.env.CANDIDATE_TABLE,
    ProjectionExpression: "id, fullname, email",
  };

  console.log("Scanning Candidate table.");
  return dynamoDb
    .scan(params)
    .promise()
    .then((data) => {
      console.log("Scan succeeded.", data.Items);
      return {
        statusCode: 200,
        body: JSON.stringify({
          candidates: data.Items,
        }),
      };
    })
    .catch((err) => {
      console.log("Scan failed to load data. Error JSON:");
      return {
        statusCode: 400,
        message: JSON.stringify(err, null, 2),
      };
    });
};

module.exports.get = (event) => {
  const params = {
    TableName: process.env.CANDIDATE_TABLE,
    Key: {
      id: event.pathParameters.id,
    },
  };

  return dynamoDb
    .get(params)
    .promise()
    .then((result) => {
      return {
        statusCode: 200,
        body: JSON.stringify(result.Item),
      };
    })
    .catch((error) => {
      console.error(error);
      return {
        statusCode: 200,
        message: "Couldn't fetch candidate",
      };
    });
};

const submitCandidateP = (candidate) => {
  console.log("Submitting candidate");
  const candidateInfo = {
    TableName: process.env.CANDIDATE_TABLE,
    Item: candidate,
  };
  // console.log("candidateInfo: ", candidateInfo);
  // console.log(dynamoDb);
  return dynamoDb
    .put(candidateInfo)
    .promise()
    .then((res) => {
      // console.log('res: ', res);
      return candidate;
    })
    .catch((err) => console.error(err));
};

const candidateInfo = (fullname, email, experience) => {
  const timestamp = new Date().getTime();
  return {
    id: uuid.v1(),
    fullname: fullname,
    email: email,
    experience: experience,
    submittedAt: timestamp,
    updatedAt: timestamp,
  };
};
