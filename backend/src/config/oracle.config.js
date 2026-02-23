module.exports = {
  baseURL: process.env.ORACLE_BASE_URL,
  username: process.env.ORACLE_USERNAME,
  password: process.env.ORACLE_PASSWORD,
  soapURL: process.env.ORACLE_SOAP_URL,
  timeout: 20000 // 20 seconds production safety
};