import billingDocumentHandler from "./billing-document.js";

export default function invoicePdfAlias(request, response) {
  request.query = { ...(request.query || {}), type: "invoice" };
  return billingDocumentHandler(request, response);
}
