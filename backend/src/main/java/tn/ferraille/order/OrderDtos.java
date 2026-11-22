package tn.ferraille.order;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import tn.ferraille.payment.PaymentMethod;
import tn.ferraille.shipping.Carrier;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class OrderDtos {

    private OrderDtos() {
    }

    public record CreateOrderRequest(
            @NotNull Long listingId,
            @NotNull Carrier carrier,
            @NotNull PaymentMethod paymentMethod,
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Pattern(regexp = "^[+0-9 ]{8,20}$", message = "Numéro de téléphone invalide") String phone,
            @NotBlank @Size(max = 200) String address,
            @NotBlank @Size(max = 80) String city,
            @Size(max = 10) String postalCode) {
    }

    public record DisputeRequest(@NotBlank @Size(max = 140) String reason) {
    }

    public record StatusUpdateRequest(@NotNull OrderStatus status, @Size(max = 80) String location) {
    }

    public record ResolveDisputeRequest(boolean refundBuyer) {
    }

    public record EventDto(OrderStatus status, String label, String location, Instant createdAt) {

        public static EventDto from(OrderEvent e) {
            return new EventDto(e.getStatus(), e.getLabel(), e.getLocation(), e.getCreatedAt());
        }
    }

    public record OrderSummary(Long id, String reference, Long listingId, String listingTitle, String coverPhoto,
                               BigDecimal total, BigDecimal sellerNet, OrderStatus status, Carrier carrier,
                               String counterpart, Instant createdAt) {
    }

    public record OrderDetail(Long id, String reference, Long listingId, String listingTitle, String coverPhoto,
                              String sellerName, String sellerCity, String buyerName, Carrier carrier, String carrierLabel,
                              PaymentMethod paymentMethod, BigDecimal itemPrice, BigDecimal shippingFee,
                              BigDecimal protectionFee, BigDecimal codFee, BigDecimal total, BigDecimal commission,
                              BigDecimal sellerNet, OrderStatus status, String trackingNumber, String shipFullName,
                              String shipPhone, String shipAddress, String shipCity, String shipPostalCode,
                              Instant createdAt, Instant deliveredAt, Instant autoConfirmAt, boolean viewerIsBuyer,
                              boolean viewerIsSeller, List<EventDto> events) {
    }
}
