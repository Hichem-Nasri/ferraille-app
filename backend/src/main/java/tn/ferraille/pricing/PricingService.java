package tn.ferraille.pricing;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.ferraille.common.Money;
import tn.ferraille.config.FerrailleProperties;
import tn.ferraille.payment.PaymentMethod;
import tn.ferraille.shipping.Carrier;
import tn.ferraille.shipping.ShippingService;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class PricingService {

    public record SellerQuote(BigDecimal price, BigDecimal commissionRate, BigDecimal commission, BigDecimal sellerNet) {
    }

    public record CheckoutQuote(BigDecimal itemPrice, BigDecimal shippingFee, BigDecimal protectionFee,
                                BigDecimal codFee, BigDecimal total, BigDecimal commission, BigDecimal sellerNet) {
    }

    private final FerrailleProperties properties;
    private final ShippingService shippingService;

    public SellerQuote sellerQuote(BigDecimal price) {
        BigDecimal p = Money.of(price);
        BigDecimal commission = Money.of(p.multiply(properties.commissionRate()));
        return new SellerQuote(p, properties.commissionRate(), commission, p.subtract(commission));
    }

    public CheckoutQuote checkoutQuote(BigDecimal price, Carrier carrier, PaymentMethod method) {
        SellerQuote seller = sellerQuote(price);
        BigDecimal shipping = shippingService.option(carrier).fee();
        BigDecimal protection = Money.of(properties.protectionFee());
        BigDecimal cod = method == PaymentMethod.A_LA_LIVRAISON ? Money.of(properties.cashOnDeliveryFee()) : Money.zero();
        BigDecimal total = seller.price().add(shipping).add(protection).add(cod);
        return new CheckoutQuote(seller.price(), shipping, protection, cod, total, seller.commission(), seller.sellerNet());
    }
}
