package tn.ferraille.pricing;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tn.ferraille.common.ApiException;
import tn.ferraille.listing.ListingRepository;
import tn.ferraille.payment.PaymentMethod;
import tn.ferraille.shipping.Carrier;

import java.math.BigDecimal;

@RestController
@RequiredArgsConstructor
public class PricingController {

    private final PricingService pricingService;
    private final ListingRepository listingRepository;

    @org.springframework.beans.factory.annotation.Value("#{'${ferraille.payment-methods:A_LA_LIVRAISON}'.split(',')}")
    private java.util.List<PaymentMethod> enabledPaymentMethods;

    @GetMapping("/api/pricing/payment-methods")
    public java.util.List<PaymentMethod> paymentMethods() {
        return enabledPaymentMethods;
    }

    @GetMapping("/api/pricing/seller")
    public PricingService.SellerQuote seller(@RequestParam BigDecimal price) {
        if (price.signum() <= 0) {
            throw ApiException.badRequest("Prix invalide");
        }
        return pricingService.sellerQuote(price);
    }

    @GetMapping("/api/pricing/checkout")
    public PricingService.CheckoutQuote checkout(@RequestParam Long listingId,
                                                 @RequestParam Carrier carrier,
                                                 @RequestParam(defaultValue = "A_LA_LIVRAISON") PaymentMethod paymentMethod) {
        BigDecimal price = listingRepository.findById(listingId)
                .orElseThrow(() -> ApiException.notFound("Annonce introuvable"))
                .getPrice();
        return pricingService.checkoutQuote(price, carrier, paymentMethod);
    }
}
