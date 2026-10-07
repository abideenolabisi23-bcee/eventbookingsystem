const refundFoodPayment = async (payment, reason) => {
  try {
    // =====================================
    // ALREADY REFUNDED
    // =====================================

    if (payment.status === "refunded") {
      return {
        success: true,
        message: "Payment already refunded",
        payment
      };
    }

    // =====================================
    // REFUND ALREADY IN PROGRESS
    // =====================================

    if (payment.status === "refund_pending") {
      return {
        success: true,
        message: "Refund is already being processed",
        payment
      };
    }

    // =====================================
    // ONLY PAID PAYMENTS CAN BE REFUNDED
    // =====================================

    if (payment.status !== "paid") {
      return {
        success: false,
        message: "Only a paid payment can be refunded"
      };
    }

    /*
      Mark refund as pending BEFORE contacting Paystack.

      Paystack can send the refund.pending webhook
      immediately, so our database should already know
      that this payment is entering the refund process.
    */

    payment.status = "refund_pending";
    payment.refundAmount = payment.amount;
    payment.refundReason = reason;

    await payment.save();

    // =====================================
    // SEND REFUND REQUEST TO PAYSTACK
    // =====================================

    const response = await fetch(
      "https://api.paystack.co/refund",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          transaction: payment.reference,

          // Paystack expects kobo
          amount: Math.round(
            payment.amount * 100
          )
        })
      }
    );

    const result = await response.json();

    // =====================================
    // PAYSTACK REJECTED REFUND
    // =====================================

    if (!response.ok || !result.status) {
      /*
        Paystack did not accept the refund,
        so return the payment to paid.
      */

      payment.status = "paid";
      payment.refundAmount = 0;
      payment.refundReference = null;
      payment.refundReason = null;

      await payment.save();

      return {
        success: false,
        message:
          result.message ||
          "Unable to initialize refund"
      };
    }

    // =====================================
    // REFUND ACCEPTED
    // =====================================

    payment.refundReference =
      result.data?.reference ||
      result.data?.refund_reference ||
      result.data?.id?.toString() ||
      null;

    await payment.save();

    return {
      success: true,
      message: "Refund initiated successfully",
      payment
    };

  } catch (error) {
    console.log("FOOD REFUND ERROR:", error);

    /*
      We do NOT automatically change the payment
      back to paid here.

      A network error does not necessarily mean
      Paystack rejected the refund. Paystack may
      have received it already.
    */

    return {
      success: false,
      message:
        "Cannot process food refund at this time"
    };
  }
};

module.exports = refundFoodPayment;