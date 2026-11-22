package tn.ferraille.payment;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

@Component
public class SimulatedPaymentGateway implements PaymentGateway {

    @Override
    public PaymentResult authorize(String orderReference, PaymentMethod method, BigDecimal amount) {
        if (method == PaymentMethod.A_LA_LIVRAISON) {
            return new PaymentResult(true, "COD-" + orderReference, "Paiement à la livraison");
        }
        return new PaymentResult(true, "SIM-" + UUID.randomUUID(), "Paiement simulé accepté");
    }

    @Override
    public PaymentResult refund(String paymentReference, BigDecimal amount) {
        return new PaymentResult(true, paymentReference, "Remboursement simulé");
    }
}
