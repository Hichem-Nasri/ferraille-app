package tn.ferraille.admin;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tn.ferraille.common.PageResponse;
import tn.ferraille.order.OrderDtos.OrderDetail;
import tn.ferraille.order.OrderDtos.OrderSummary;
import tn.ferraille.order.OrderDtos.ResolveDisputeRequest;
import tn.ferraille.order.OrderDtos.StatusUpdateRequest;
import tn.ferraille.order.OrderService;
import tn.ferraille.order.OrderStatus;
import tn.ferraille.wallet.WalletService;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final OrderService orderService;
    private final WalletService walletService;
    private final tn.ferraille.user.UserRepository userRepository;
    private final tn.ferraille.listing.ListingRepository listingRepository;

    public record AdminUser(Long id, String fullName, String email, String phone, String whatsapp, String facebookUrl,
                            String city, String sellerType, String shopName, String role, boolean facebook,
                            long activeListings, boolean verified, java.time.Instant createdAt) {
    }

    @PostMapping("/users/{id}/verified")
    @org.springframework.transaction.annotation.Transactional
    public java.util.Map<String, Boolean> toggleVerified(@org.springframework.web.bind.annotation.PathVariable Long id) {
        var u = userRepository.findById(id).orElseThrow(() -> tn.ferraille.common.ApiException.notFound("Utilisateur introuvable"));
        u.setVerified(!u.isVerified());
        return java.util.Map.of("verified", u.isVerified());
    }

    @PostMapping("/listings/{id}/featured")
    @org.springframework.transaction.annotation.Transactional
    public java.util.Map<String, Boolean> toggleFeatured(@org.springframework.web.bind.annotation.PathVariable Long id) {
        var l = listingRepository.findById(id).orElseThrow(() -> tn.ferraille.common.ApiException.notFound("Annonce introuvable"));
        l.setFeatured(!l.isFeatured());
        return java.util.Map.of("featured", l.isFeatured());
    }

    @PostMapping("/listings/{id}/archive")
    @org.springframework.transaction.annotation.Transactional
    public java.util.Map<String, Boolean> archive(@org.springframework.web.bind.annotation.PathVariable Long id) {
        var l = listingRepository.findById(id).orElseThrow(() -> tn.ferraille.common.ApiException.notFound("Annonce introuvable"));
        l.setStatus(tn.ferraille.listing.ListingStatus.ARCHIVED);
        l.setFeatured(false);
        return java.util.Map.of("archived", true);
    }

    @GetMapping("/users")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public java.util.List<AdminUser> users() {
        return userRepository.findAll(org.springframework.data.domain.Sort.by("createdAt").descending()).stream()
                .map(u -> new AdminUser(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getWhatsapp(),
                        u.getFacebookUrl(), u.getCity(), u.getSellerType().name(), u.getShopName(), u.getRole().name(),
                        u.getFacebookId() != null,
                        listingRepository.countBySellerIdAndStatus(u.getId(), tn.ferraille.listing.ListingStatus.ACTIVE),
                        u.isVerified(), u.getCreatedAt()))
                .toList();
    }

    @GetMapping("/orders")
    public PageResponse<OrderSummary> orders(@RequestParam OrderStatus status,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return orderService.byStatus(status, Math.max(page, 0), Math.min(Math.max(size, 1), 100));
    }

    @PostMapping("/orders/{id}/delivery-status")
    public OrderDetail deliveryStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateRequest request) {
        return orderService.updateDeliveryStatus(id, request.status(), request.location());
    }

    @PostMapping("/orders/{id}/resolve")
    public OrderDetail resolve(@PathVariable Long id, @RequestBody ResolveDisputeRequest request) {
        return orderService.resolveDispute(id, request.refundBuyer());
    }

    @GetMapping("/payouts")
    public PageResponse<WalletService.TransactionDto> payouts(@RequestParam(defaultValue = "0") int page,
                                                              @RequestParam(defaultValue = "20") int size) {
        return walletService.pendingPayouts(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
    }

    @PostMapping("/payouts/{id}/paid")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void payoutPaid(@PathVariable Long id) {
        walletService.markPayoutPaid(id);
    }
}
