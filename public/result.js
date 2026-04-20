(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // node_modules/@adyen/adyen-web/dist/es/adyen.css
  var init_adyen = __esm({
    "node_modules/@adyen/adyen-web/dist/es/adyen.css"() {
    }
  });

  // src/client/result.js
  var require_result = __commonJS({
    "src/client/result.js"() {
      init_adyen();
      var params = new URLSearchParams(window.location.search);
      var redirectResult = params.get("redirectResult");
      var sessionId = params.get("sessionId") || sessionStorage.getItem("adyen_sessionId");
      var icons = {
        Authorised: "\u2705",
        Refused: "\u274C",
        Cancelled: "\u{1F6AB}",
        Pending: "\u23F3",
        Received: "\u{1F4E9}",
        Error: "\u26A0\uFE0F"
      };
      function showResult(resultCode, details) {
        document.getElementById("result-icon").textContent = icons[resultCode] || icons.Error;
        document.getElementById("result-title").textContent = resultCode === "Authorised" ? "Payment Successful" : resultCode === "Refused" ? "Payment Refused" : resultCode === "Cancelled" ? "Payment Cancelled" : `Payment ${resultCode || "Unknown"}`;
        document.getElementById("result-title").className = `result-title status-${resultCode === "Authorised" ? "authorised" : resultCode === "Refused" ? "refused" : "pending"}`;
        document.getElementById("result-code").textContent = resultCode || "UNKNOWN";
        document.getElementById("result-details").textContent = JSON.stringify(details, null, 2);
      }
      async function handleRedirectResult() {
        if (!sessionId) {
          showResult("Error", { message: "No sessionId in URL" });
          return;
        }
        if (!redirectResult) {
          showResult("Error", { message: "No redirectResult in URL" });
          return;
        }
        try {
          const res = await fetch("/api/payments/details", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ redirectResult })
          });
          const data = await res.json();
          if (!res.ok) {
            showResult("Error", data);
            return;
          }
          showResult(data.resultCode, data.details);
        } catch (err) {
          console.error("Redirect handling failed:", err);
          showResult("Error", { message: err.message });
        }
      }
      handleRedirectResult();
    }
  });
  require_result();
})();
