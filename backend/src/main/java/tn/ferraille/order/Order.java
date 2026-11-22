package tn.ferraille.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import tn.ferraille.listing.Listing;
import tn.ferraille.payment.PaymentMethod;
import tn.ferraille.shipping.Carrier;
import tn.ferraille.user.User;

import java.math.BigDecimal;
import java.time.Instant;

@Entity(name = "PurchaseOrder")
@Table(name = "orders")
@Getter
@Setter
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "listing_id", nullable = false)
    private Listing listing;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Carrier carrier;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false)
    private PaymentMethod paymentMethod;

    @Column(name = "payment_reference")
    private String paymentReference;

    @Column(name = "item_price", nullable = false, precision = 12, scale = 3)
    private BigDecimal itemPrice;

    @Column(name = "shipping_fee", nullable = false, precision = 12, scale = 3)
    private BigDecimal shippingFee;

    @Column(name = "protection_fee", nullable = false, precision = 12, scale = 3)
    private BigDecimal protectionFee;

    @Column(name = "cod_fee", nullable = false, precision = 12, scale = 3)
    private BigDecimal codFee;

    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal commission;

    @Column(name = "seller_net", nullable = false, precision = 12, scale = 3)
    private BigDecimal sellerNet;

    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal total;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @Column(name = "tracking_number")
    private String trackingNumber;

    @Column(name = "ship_full_name", nullable = false)
    private String shipFullName;

    @Column(name = "ship_phone", nullable = false)
    private String shipPhone;

    @Column(name = "ship_address", nullable = false)
    private String shipAddress;

    @Column(name = "ship_city", nullable = false)
    private String shipCity;

    @Column(name = "ship_postal_code")
    private String shipPostalCode;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
