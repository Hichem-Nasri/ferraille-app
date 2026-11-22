package tn.ferraille;

import org.junit.jupiter.api.Test;
import tn.ferraille.config.FerrailleProperties;
import tn.ferraille.config.FerrailleProperties.CarrierSettings;
import tn.ferraille.payment.PaymentMethod;
import tn.ferraille.pricing.PricingService;
import tn.ferraille.shipping.AramexShippingProvider;
import tn.ferraille.shipping.Carrier;
import tn.ferraille.shipping.LaPosteShippingProvider;
import tn.ferraille.shipping.ShippingService;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class PricingServiceTest {

    private final FerrailleProperties properties = new FerrailleProperties(
            new BigDecimal("0.10"), new BigDecimal("4.000"), new BigDecimal("2.000"), 48, "./uploads", false,
            List.of("http://localhost:4200"), null, null,
            new FerrailleProperties.Jwt("x".repeat(64), 60),
            Map.of(Carrier.ARAMEX, new CarrierSettings("Aramex", new BigDecimal("8.000"), 1, 2),
                    Carrier.LA_POSTE, new CarrierSettings("La Poste", new BigDecimal("7.000"), 2, 3)));

    private final PricingService pricing = new PricingService(properties,
            new ShippingService(List.of(new AramexShippingProvider(), new LaPosteShippingProvider()), properties));

    @Test
    void sellerReceivesPriceMinusCommission() {
        var quote = pricing.sellerQuote(new BigDecimal("180"));
        assertThat(quote.commission()).isEqualByComparingTo("18.000");
        assertThat(quote.sellerNet()).isEqualByComparingTo("162.000");
    }

    @Test
    void checkoutAddsShippingAndProtection() {
        var quote = pricing.checkoutQuote(new BigDecimal("180"), Carrier.ARAMEX, PaymentMethod.CARTE);
        assertThat(quote.total()).isEqualByComparingTo("192.000");
        assertThat(quote.codFee()).isEqualByComparingTo("0");
    }

    @Test
    void cashOnDeliveryAddsFee() {
        var quote = pricing.checkoutQuote(new BigDecimal("95"), Carrier.LA_POSTE, PaymentMethod.A_LA_LIVRAISON);
        assertThat(quote.total()).isEqualByComparingTo("108.000");
    }
}
