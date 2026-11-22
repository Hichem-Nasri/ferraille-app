package tn.ferraille.payment;

import java.math.BigDecimal;

public interface PaymentGateway {

    PaymentResult authorize(String orderReference, PaymentMethod method, BigDecimal amount);

    PaymentResult refund(String paymentReference, BigDecimal amount);
}
