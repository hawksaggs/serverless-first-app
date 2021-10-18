const ApiContracts = require("authorizenet").APIContracts;
const ApiControllers = require("authorizenet").APIControllers;

const { validateForm } = require("../lib");

module.exports.checkout = (event) => {
  const requestBody = JSON.parse(event.body) || {};
  const validationErrors = validateForm(requestBody);

  if (validationErrors.length > 0) {
    return { statusCode: 400, errors: validationErrors };
  }

  const { cc, cvv, expire, amount } = requestBody;

  const merchantAuthenticationType =
    new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(process.env.AUTHORIZE_LOGIN_ID);
  merchantAuthenticationType.setTransactionKey(
    process.env.AUTHORIZE_TRANSACTION_KEY
  );

  const creditCard = new ApiContracts.CreditCardType();
  creditCard.setCardNumber(cc);
  creditCard.setExpirationDate(expire);
  creditCard.setCardCode(cvv);

  const paymentType = new ApiContracts.PaymentType();
  paymentType.setCreditCard(creditCard);

  const transactionSetting = new ApiContracts.SettingType();
  transactionSetting.setSettingName("recurringBilling");
  transactionSetting.setSettingValue("false");

  const transactionSettingList = [];
  transactionSettingList.push(transactionSetting);

  const transactionSettings = new ApiContracts.ArrayOfSetting();
  transactionSettings.setSetting(transactionSettingList);

  const transactionRequestType = new ApiContracts.TransactionRequestType();
  transactionRequestType.setTransactionType(
    ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION
  );
  transactionRequestType.setPayment(paymentType);
  transactionRequestType.setAmount(amount);
  transactionRequestType.setTransactionSettings(transactionSettings);

  const createRequest = new ApiContracts.CreateTransactionRequest();
  createRequest.setMerchantAuthentication(merchantAuthenticationType);
  createRequest.setTransactionRequest(transactionRequestType);

  const ctrl = new ApiControllers.CreateTransactionController(
    createRequest.getJSON()
  );

  return new Promise((resolve, reject) => {
    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new ApiContracts.CreateTransactionResponse(apiResponse);

      console.log("response: " + JSON.stringify(response, null, 2));

      if (response !== null) {
        if (
          response.getMessages().getResultCode() ===
          ApiContracts.MessageTypeEnum.OK
        ) {
          if (response.getTransactionResponse().getMessages() !== null) {
            resolve(response);
            // res.json({ success: 'Transaction was successful.' });
          } else {
            if (response.getTransactionResponse().getErrors() !== null) {
              let code = response
                .getTransactionResponse()
                .getErrors()
                .getError()[0]
                .getErrorCode();
              let text = response
                .getTransactionResponse()
                .getErrors()
                .getError()[0]
                .getErrorText();
              reject(`${code}: ${text}`);
              // res.json({
              //     error: `${code}: ${text}`
              // });
            } else {
              reject("Transaction failed");
              // res.json({ error: 'Transaction failed.' });
            }
          }
        } else {
          if (
            response.getTransactionResponse() !== null &&
            response.getTransactionResponse().getErrors() !== null
          ) {
            let code = response
              .getTransactionResponse()
              .getErrors()
              .getError()[0]
              .getErrorCode();
            let text = response
              .getTransactionResponse()
              .getErrors()
              .getError()[0]
              .getErrorText();
            reject(`${code}: ${text}`);
            // res.json({
            //     error: `${code}: ${text}`
            // });
          } else {
            let code = response.getMessages().getMessage()[0].getCode();
            let text = response.getMessages().getMessage()[0].getText();
            reject(`${code}: ${text}`);
            // res.json({
            //     error: `${code}: ${text}`
            // });
          }
        }
      } else {
        reject("No response");
        // res.json({ error: 'No response.' });
      }
    });
  })
    .then((response) => {
      console.log("Response: ", response);
      return {
        statusCode: 200,
        body: JSON.stringify({ body: response }),
      };
    })
    .catch((err) => {
      return { statusCode: 400, body: JSON.stringify({ error: err }) };
    });
};
