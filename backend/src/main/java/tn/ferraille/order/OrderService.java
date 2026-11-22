package tn.ferraille.order;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.ferraille.common.ApiException;
import tn.ferraille.common.PageResponse;
import tn.ferraille.config.FerrailleProperties;
import tn.ferraille.listing.Listing;
import tn.ferraille.listing.ListingService;
import tn.ferraille.listing.ListingStatus;
import tn.ferraille.order.OrderDtos.CreateOrderRequest;
import tn.ferraille.order.OrderDtos.EventDto;
import tn.ferraille.order.OrderDtos.OrderDetail;
import tn.ferraille.order.OrderDtos.OrderSummary;
import tn.ferraille.payment.PaymentGateway;
import tn.ferraille.payment.PaymentMethod;
import tn.ferraille.payment.PaymentResult;
import tn.ferraille.pricing.PricingService;
import tn.ferraille.pricing.PricingService.CheckoutQuote;
import tn.ferraille.shipping.ShipmentRequest;
import tn.ferraille.shipping.ShipmentResult;
import tn.ferraille.shipping.ShippingService;
import tn.ferraille.user.User;
import tn.ferraille.user.UserRepository;
import tn.ferraille.wallet.WalletService;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final OrderRepository orderRepository;
    private final OrderEventRepository eventRepository;
    private final ListingService listingService;
    private final UserRepository userRepository;
    private final PricingService pricingService;
    private final ShippingService shippingService;
    private final PaymentGateway paymentGateway;
    private final WalletService walletService;
    private final FerrailleProperties properties;

    @Transactional
    public OrderDetail create(Long buyerId, CreateOrderRequest request) {
        User buyer = userRepository.findById(buyerId).orElseThrow(() -> ApiException.notFound("Utilisateur introuvable"));
        Listing listing = listingService.require(request.listingId());
        if (listing.getStatus() != ListingStatus.ACTIVE) {
            throw ApiException.conflict("Cette pièce n'est plus disponible");
        }
        if (listing.getSeller().getId().equals(buyerId)) {
            throw ApiException.badRequest("Tu ne peux pas acheter ta propre annonce");
        }

        CheckoutQuote quote = pricingService.checkoutQuote(listing.getPrice(), request.carrier(), request.paymentMethod());
        String reference = newReference();
        PaymentResult payment = paymentGateway.authorize(reference, request.paymentMethod(), quote.total());
        if (!payment.success()) {
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "Paiement refusé : " + payment.message());
        }

        Order order = new Order();
        order.setReference(reference);
        order.setListing(listing);
        order.setBuyer(buyer);
        order.setSeller(listing.getSeller());
        order.setCarrier(request.carrier());
        order.setPaymentMethod(request.paymentMethod());
        order.setPaymentReference(payment.reference());
        order.setItemPrice(quote.itemPrice());
        order.setShippingFee(quote.shippingFee());
        order.setProtectionFee(quote.protectionFee());
        order.setCodFee(quote.codFee());
        order.setCommission(quote.commission());
        order.setSellerNet(quote.sellerNet());
        order.setTotal(quote.total());
        order.setStatus(OrderStatus.PAID);
        order.setShipFullName(request.fullName().trim());
        order.setShipPhone(request.phone().trim());
        order.setShipAddress(request.address().trim());
        order.setShipCity(request.city().trim());
        order.setShipPostalCode(request.postalCode());
        orderRepository.save(order);

        listing.setStatus(ListingStatus.RESERVED);
        walletService.recordPendingSale(order);
        String label = request.paymentMethod() == PaymentMethod.A_LA_LIVRAISON
                ? "Commande confirmée · paiement à la livraison"
                : "Paiement sécurisé reçu";
        addEvent(order, OrderStatus.PAID, label, null);
        return toDetail(order, buyerId, false);
    }

    @Transactional
    public OrderDetail ship(Long sellerId, Long orderId) {
        Order order = require(orderId);
        if (!order.getSeller().getId().equals(sellerId)) {
            throw ApiException.forbidden("Cette commande ne t'appartient pas");
        }
        if (order.getStatus() != OrderStatus.PAID) {
            throw ApiException.conflict("Cette commande a déjà été expédiée");
        }
        User seller = order.getSeller();
        ShipmentResult shipment = shippingService.createShipment(order.getCarrier(), new ShipmentRequest(
                order.getReference(), seller.getDisplayName(), seller.getPhone(),
                order.getListing().getCity(), order.getShipFullName(), order.getShipPhone(),
                order.getShipAddress(), order.getShipCity(), order.getShipPostalCode()));
        order.setTrackingNumber(shipment.trackingNumber());
        order.setStatus(OrderStatus.SHIPPED);
        String carrierLabel = shippingService.option(order.getCarrier()).label();
        addEvent(order, OrderStatus.SHIPPED, "Colis remis à " + carrierLabel, order.getListing().getCity());
        return toDetail(order, sellerId, false);
    }

    @Transactional
    public OrderDetail updateDeliveryStatus(Long orderId, OrderStatus status, String location) {
        Order order = require(orderId);
        if (status != OrderStatus.IN_TRANSIT && status != OrderStatus.DELIVERED) {
            throw ApiException.badRequest("Statut de livraison invalide");
        }
        if (!order.getStatus().isInDelivery() || order.getStatus() == OrderStatus.DELIVERED) {
            throw ApiException.conflict("La commande n'est pas en cours de livraison");
        }
        order.setStatus(status);
        if (status == OrderStatus.DELIVERED) {
            order.setDeliveredAt(Instant.now());
            addEvent(order, status, "Colis livré", location != null ? location : order.getShipCity());
        } else {
            addEvent(order, status, "En route vers " + order.getShipCity(), location);
        }
        return toDetail(order, null, true);
    }

    @Transactional
    public OrderDetail confirm(Long buyerId, Long orderId) {
        Order order = require(orderId);
        if (!order.getBuyer().getId().equals(buyerId)) {
            throw ApiException.forbidden("Cette commande ne t'appartient pas");
        }
        if (!order.getStatus().isInDelivery()) {
            throw ApiException.conflict("Cette commande ne peut pas être confirmée");
        }
        complete(order, "Réception confirmée · vendeur payé");
        return toDetail(order, buyerId, false);
    }

    @Transactional
    public OrderDetail dispute(Long buyerId, Long orderId, String reason) {
        Order order = require(orderId);
        if (!order.getBuyer().getId().equals(buyerId)) {
            throw ApiException.forbidden("Cette commande ne t'appartient pas");
        }
        if (!order.getStatus().isInDelivery()) {
            throw ApiException.conflict("Impossible de signaler un problème sur cette commande");
        }
        order.setStatus(OrderStatus.DISPUTED);
        addEvent(order, OrderStatus.DISPUTED, "Problème signalé : " + reason.trim(), null);
        return toDetail(order, buyerId, false);
    }

    @Transactional
    public OrderDetail cancel(Long userId, Long orderId) {
        Order order = require(orderId);
        boolean involved = order.getBuyer().getId().equals(userId) || order.getSeller().getId().equals(userId);
        if (!involved) {
            throw ApiException.forbidden("Cette commande ne t'appartient pas");
        }
        if (order.getStatus() != OrderStatus.PAID) {
            throw ApiException.conflict("La commande est déjà expédiée");
        }
        refund(order, OrderStatus.CANCELLED, "Commande annulée · remboursement effectué");
        return toDetail(order, userId, false);
    }

    @Transactional
    public OrderDetail resolveDispute(Long orderId, boolean refundBuyer) {
        Order order = require(orderId);
        if (order.getStatus() != OrderStatus.DISPUTED) {
            throw ApiException.conflict("Aucun litige en cours");
        }
        if (refundBuyer) {
            refund(order, OrderStatus.REFUNDED, "Litige résolu · acheteur remboursé");
        } else {
            complete(order, "Litige résolu · vendeur payé");
        }
        return toDetail(order, null, true);
    }

    @Transactional
    public int autoCompleteDelivered() {
        Instant limit = Instant.now().minus(properties.autoConfirmHours(), ChronoUnit.HOURS);
        List<Order> orders = orderRepository.findByStatusAndDeliveredAtBefore(OrderStatus.DELIVERED, limit);
        orders.forEach(o -> complete(o, "Confirmation automatique · vendeur payé"));
        return orders.size();
    }

    @Transactional(readOnly = true)
    public OrderDetail get(Long userId, boolean admin, Long orderId) {
        Order order = require(orderId);
        boolean involved = order.getBuyer().getId().equals(userId) || order.getSeller().getId().equals(userId);
        if (!involved && !admin) {
            throw ApiException.forbidden("Cette commande ne t'appartient pas");
        }
        return toDetail(order, userId, admin);
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummary> mine(Long userId, String role, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size);
        boolean asSeller = "seller".equalsIgnoreCase(role);
        Page<Order> orders = asSeller
                ? orderRepository.findBySellerIdOrderByCreatedAtDesc(userId, pageable)
                : orderRepository.findByBuyerIdOrderByCreatedAtDesc(userId, pageable);
        return PageResponse.of(orders, o -> toSummary(o, asSeller));
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummary> byStatus(OrderStatus status, int page, int size) {
        return PageResponse.of(orderRepository.findByStatusOrderByCreatedAtDesc(status, PageRequest.of(page, size)),
                o -> toSummary(o, false));
    }

    private void complete(Order order, String label) {
        order.setStatus(OrderStatus.COMPLETED);
        order.setCompletedAt(Instant.now());
        order.getListing().setStatus(ListingStatus.SOLD);
        walletService.releaseSale(order);
        addEvent(order, OrderStatus.COMPLETED, label, null);
    }

    private void refund(Order order, OrderStatus finalStatus, String label) {
        if (order.getPaymentMethod() != PaymentMethod.A_LA_LIVRAISON) {
            paymentGateway.refund(order.getPaymentReference(), order.getTotal());
        }
        order.setStatus(finalStatus);
        order.getListing().setStatus(ListingStatus.ACTIVE);
        walletService.cancelSale(order);
        addEvent(order, finalStatus, label, null);
    }

    private void addEvent(Order order, OrderStatus status, String label, String location) {
        eventRepository.save(new OrderEvent(order, status, label, location));
    }

    private Order require(Long id) {
        return orderRepository.findById(id).orElseThrow(() -> ApiException.notFound("Commande introuvable"));
    }

    private String newReference() {
        String reference;
        do {
            reference = "FR-" + (100000 + RANDOM.nextInt(900000));
        } while (orderRepository.existsByReference(reference));
        return reference;
    }

    private OrderSummary toSummary(Order o, boolean asSeller) {
        Listing l = o.getListing();
        return new OrderSummary(o.getId(), o.getReference(), l.getId(), l.getTitle(),
                l.getPhotos().isEmpty() ? null : l.getPhotos().get(0), o.getTotal(), o.getSellerNet(),
                o.getStatus(), o.getCarrier(),
                asSeller ? o.getBuyer().getFullName() : o.getSeller().getDisplayName(), o.getCreatedAt());
    }

    private OrderDetail toDetail(Order o, Long viewerId, boolean admin) {
        Listing l = o.getListing();
        boolean isBuyer = viewerId != null && o.getBuyer().getId().equals(viewerId);
        boolean isSeller = viewerId != null && o.getSeller().getId().equals(viewerId);
        boolean showAddress = isBuyer || isSeller || admin;
        Instant autoConfirmAt = o.getDeliveredAt() != null
                ? o.getDeliveredAt().plus(properties.autoConfirmHours(), ChronoUnit.HOURS)
                : null;
        List<EventDto> events = eventRepository.findByOrderIdOrderByCreatedAtAscIdAsc(o.getId()).stream()
                .map(EventDto::from).toList();
        return new OrderDetail(o.getId(), o.getReference(), l.getId(), l.getTitle(),
                l.getPhotos().isEmpty() ? null : l.getPhotos().get(0),
                o.getSeller().getDisplayName(), l.getCity(), o.getBuyer().getFullName(),
                o.getCarrier(), shippingService.option(o.getCarrier()).label(), o.getPaymentMethod(),
                o.getItemPrice(), o.getShippingFee(), o.getProtectionFee(), o.getCodFee(), o.getTotal(),
                isBuyer ? null : o.getCommission(), isBuyer ? null : o.getSellerNet(),
                o.getStatus(), o.getTrackingNumber(),
                showAddress ? o.getShipFullName() : null, showAddress ? o.getShipPhone() : null,
                showAddress ? o.getShipAddress() : null, o.getShipCity(),
                showAddress ? o.getShipPostalCode() : null,
                o.getCreatedAt(), o.getDeliveredAt(), autoConfirmAt, isBuyer, isSeller, events);
    }
}
